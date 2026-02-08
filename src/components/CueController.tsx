import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Line, Circle, Group, Rect } from 'react-konva';
import { BALL_PROPERTIES, TABLE_DIMENSIONS } from '../utils/constants';

// Space allocated on each side of the table for cue stick rendering
const CUE_RENDERING_SPACE = 300;

interface CueControllerProps {
  cueBallX: number;
  cueBallY: number;
  onShoot: (power: number, angle: number) => void;
  disabled?: boolean;
  isAiTurn?: boolean;
  aiShot?: { angle: number; power: number } | null;
  stageRef: React.RefObject<any>;
  scale?: number;
  cueRenderingSpace?: number;
}

export const CueController: React.FC<CueControllerProps> = ({
  cueBallX,
  cueBallY,
  onShoot,
  disabled = false,
  isAiTurn = false,
  aiShot = null,
  stageRef,
  scale = 1,
  cueRenderingSpace = 300,
}) => {
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);
  
  // Animation state for AI
  const [aiAnimPhase, setAiAnimPhase] = useState<'idle' | 'aiming' | 'charging' | 'releasing'>('idle');
  
  // Track which AI shot is currently being executed to prevent double-firing
  const aiShotIdRef = useRef<string | null>(null);
  
   // Track initial mouse/touch position when user starts charging
   const initialMousePosRef = useRef<{ x: number; y: number } | null>(null);
   const isTouchRef = useRef<boolean>(false);

    // Use refs to track latest values for the window event listeners to avoid closure issues
    const stateRef = useRef({ isCharging, power, angle, disabled, isAiTurn });
    useEffect(() => {
      stateRef.current = { isCharging, power, angle, disabled, isAiTurn };
    }, [isCharging, power, angle, disabled, isAiTurn]);

  // Reset controller state when it's no longer AI turn (turn switched to player)
  useEffect(() => {
    if (!isAiTurn) {
      setIsCharging(false);
      setPower(0);
      // Keep angle as is for smooth aiming
    }
  }, [isAiTurn]);

  const handleMouseDown = (e: any) => {
    console.log('CueController: MouseDown (Konva event)');
    if (disabled || isAiTurn) {
      console.log('CueController: Disabled or AI turn', { disabled, isAiTurn });
      return;
    }
    setIsCharging(true);
  };

  const handleMouseUpLocal = useCallback(() => {
    const { power, angle, isCharging } = stateRef.current;
    console.log('CueController: MouseUp', { power, angle, isCharging });
    if (disabled || !isCharging || isAiTurn) return;
    
    if (power > 0.5) {
      console.log('CueController: Shooting', { power, angle });
      onShoot(power, angle);
    }
    
    setIsCharging(false);
    setPower(0);
    initialMousePosRef.current = null; // Reset initial position
  }, [disabled, isAiTurn, onShoot]);

    // Use window events to capture mouse movement even outside the canvas
    useEffect(() => {
      const handleWindowMouseMove = (e: MouseEvent) => {
        const { disabled, isAiTurn, isCharging, angle: currentAngle } = stateRef.current;
        // Don't process mouse move if disabled or it's AI turn
        if (disabled || isAiTurn || !stageRef.current) return;
        
        const container = stageRef.current.container();
        if (!container) return;
        const rect = container.getBoundingClientRect();
        
        // Get mouse position relative to container
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // The parent div has a CSS scale transform, so we need to account for that
        // Unscale the coordinates to get Stage coordinates
        const pos = {
          x: screenX / scale,
          y: screenY / scale
        };
        
        // Convert from Stage coordinates to Layer coordinates
        // The layer is positioned at (cueRenderingSpace + frameWidth) in Stage coords
        const layerX = cueRenderingSpace + TABLE_DIMENSIONS.frameWidth;
        const layerY = cueRenderingSpace + TABLE_DIMENSIONS.frameWidth;
        const stageX = pos.x - layerX;
        const stageY = pos.y - layerY;
      
      const dx = stageX - cueBallX;
      const dy = stageY - cueBallY;
      
       if (!isCharging) {
         // Angle points from cursor TO ball
         const newAngle = Math.atan2(-dy, -dx);
         setAngle(newAngle);
       } else if (initialMousePosRef.current) {
         // Calculate power based on distance from initial mouse position
         const maxPower = 30;
         
         // Calculate distance from initial click position to current position
         const initialX = initialMousePosRef.current.x;
         const initialY = initialMousePosRef.current.y;
         
         const dragDx = pos.x - initialX;
         const dragDy = pos.y - initialY;
         
         // aim vector (the direction the cue is pointing)
         const aimX = Math.cos(currentAngle);
         const aimY = Math.sin(currentAngle);
         
         // Project the drag vector onto the aim direction (opposite direction)
         // Positive pullDist = dragging away from ball (increasing power)
         const pullDist = (dragDx * -aimX + dragDy * -aimY);
         
         // Convert drag distance to power (10 pixels = 1 power unit)
         const calculatedPower = Math.min(Math.max(pullDist / 10, 0), maxPower);
         setPower(calculatedPower);
       }
    };

    const handleWindowMouseDown = (e: MouseEvent) => {
      if (stateRef.current.disabled || stateRef.current.isAiTurn || !stageRef.current) return;
      
      const container = stageRef.current.container();
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      // Account for CSS scale and convert to Stage coordinates
      initialMousePosRef.current = {
        x: screenX / scale,
        y: screenY / scale
      };
      
      setIsCharging(true);
      setPower(0); // Start with 0 power
    };

     const handleWindowMouseUp = () => {
       if (stateRef.current.isCharging && !stateRef.current.disabled && !stateRef.current.isAiTurn) {
         handleMouseUpLocal();
       }
     };

     const handleWindowTouchStart = (e: TouchEvent) => {
       if (stateRef.current.disabled || stateRef.current.isAiTurn || !stageRef.current) return;
       
       const touch = e.touches[0];
       if (!touch) return;
       
       const container = stageRef.current.container();
       if (!container) return;
       
       const rect = container.getBoundingClientRect();
       const screenX = touch.clientX - rect.left;
       const screenY = touch.clientY - rect.top;
       
       // Account for CSS scale and convert to Stage coordinates
       initialMousePosRef.current = {
         x: screenX / scale,
         y: screenY / scale
       };
       
       isTouchRef.current = true;
       setIsCharging(true);
       setPower(0); // Start with 0 power
       e.preventDefault();
     };

     const handleWindowTouchMove = (e: TouchEvent) => {
       const { disabled, isAiTurn, isCharging, angle: currentAngle } = stateRef.current;
       if (disabled || isAiTurn || !stageRef.current || !isTouchRef.current) return;
       
       const touch = e.touches[0];
       if (!touch) return;
       
       const container = stageRef.current.container();
       if (!container) return;
       const rect = container.getBoundingClientRect();
       
       // Get touch position relative to container
       const screenX = touch.clientX - rect.left;
       const screenY = touch.clientY - rect.top;
       
       // The parent div has a CSS scale transform, so we need to account for that
       // Unscale the coordinates to get Stage coordinates
       const pos = {
         x: screenX / scale,
         y: screenY / scale
       };
       
       // Convert from Stage coordinates to Layer coordinates
       // The layer is positioned at (cueRenderingSpace + frameWidth) in Stage coords
       const layerX = cueRenderingSpace + TABLE_DIMENSIONS.frameWidth;
       const layerY = cueRenderingSpace + TABLE_DIMENSIONS.frameWidth;
       const stageX = pos.x - layerX;
       const stageY = pos.y - layerY;
     
       const dx = stageX - cueBallX;
       const dy = stageY - cueBallY;
       
        if (!isCharging) {
          // Angle points from cursor TO ball
          const newAngle = Math.atan2(-dy, -dx);
          setAngle(newAngle);
        } else if (initialMousePosRef.current) {
          // Calculate power based on distance from initial touch position
          const maxPower = 30;
          
          // Calculate distance from initial touch position to current position
          const initialX = initialMousePosRef.current.x;
          const initialY = initialMousePosRef.current.y;
          
          const dragDx = pos.x - initialX;
          const dragDy = pos.y - initialY;
          
          // aim vector (the direction the cue is pointing)
          const aimX = Math.cos(currentAngle);
          const aimY = Math.sin(currentAngle);
          
          // Project the drag vector onto the aim direction (opposite direction)
          // Positive pullDist = dragging away from ball (increasing power)
          const pullDist = (dragDx * -aimX + dragDy * -aimY);
          
          // Convert drag distance to power (10 pixels = 1 power unit)
          const calculatedPower = Math.min(Math.max(pullDist / 10, 0), maxPower);
          setPower(calculatedPower);
        }
        e.preventDefault();
     };

     const handleWindowTouchEnd = (e: TouchEvent) => {
       if (stateRef.current.isCharging && !stateRef.current.disabled && !stateRef.current.isAiTurn) {
         handleMouseUpLocal();
       }
       isTouchRef.current = false;
       e.preventDefault();
     };

     window.addEventListener('mousedown', handleWindowMouseDown);
     window.addEventListener('mousemove', handleWindowMouseMove);
     window.addEventListener('mouseup', handleWindowMouseUp);
     window.addEventListener('touchstart', handleWindowTouchStart);
     window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
     window.addEventListener('touchend', handleWindowTouchEnd);

     return () => {
       window.removeEventListener('mousedown', handleWindowMouseDown);
       window.removeEventListener('mousemove', handleWindowMouseMove);
       window.removeEventListener('mouseup', handleWindowMouseUp);
       window.removeEventListener('touchstart', handleWindowTouchStart);
       window.removeEventListener('touchmove', handleWindowTouchMove);
       window.removeEventListener('touchend', handleWindowTouchEnd);
     };
   }, [cueBallX, cueBallY, onShoot, stageRef, handleMouseUpLocal, scale, cueRenderingSpace]);

   // AI Animation Logic
   useEffect(() => {
     console.log('AI Animation Check:', { isAiTurn, aiShot: aiShot ? 'present' : 'none', aiAnimPhase });

     // If aiShot was cleared, reset animation phase
     if (!aiShot && aiAnimPhase !== 'idle') {
       console.log('aiShot cleared, resetting animation phase to idle');
       setAiAnimPhase('idle');
       setPower(0);
       return;
     }

     if (isAiTurn && aiShot && aiAnimPhase === 'idle') {
       // Create a stable ID for this shot based on angle and power (no timestamp)
       const shotId = `${aiShot.angle.toFixed(4)}-${aiShot.power.toFixed(4)}`;
       
       // Only proceed if this is a new shot (not already being executed)
       if (aiShotIdRef.current !== shotId) {
         console.log('✓ AI ANIMATION STARTING - shotId:', shotId, 'angle:', aiShot.angle, 'power:', aiShot.power);
         aiShotIdRef.current = shotId;
         setAiAnimPhase('aiming');
         setAngle(aiShot.angle);
         
         setTimeout(() => {
           setAiAnimPhase('charging');
           let currentPower = 0;
           const targetPower = aiShot.power;
           const interval = setInterval(() => {
             currentPower += 0.5;
             setPower(currentPower);
             if (currentPower >= targetPower) {
               clearInterval(interval);
               setTimeout(() => {
                 setAiAnimPhase('releasing');
                 console.log('AI SHOOTING with power:', targetPower, 'angle:', aiShot.angle);
                 onShoot(targetPower, aiShot.angle);
                 // Don't reset animation phase here - let it be reset when aiShot becomes null
               }, 500);
             }
           }, 20);
         }, 1000);
       } else {
         console.log('✗ AI shot already being executed, skipping');
       }
     }
   }, [isAiTurn, aiShot, aiAnimPhase, onShoot]);

  const getCueStickPosition = () => {
    const stickLength = 300;
    const isActuallyCharging = isCharging || aiAnimPhase === 'charging' || aiAnimPhase === 'releasing';
    const stickOffset = BALL_PROPERTIES.radius + 5 + (isActuallyCharging ? power * 3 : 0);
    
    const endX = cueBallX - Math.cos(angle) * stickOffset;
    const endY = cueBallY - Math.sin(angle) * stickOffset;
    const startX = endX - Math.cos(angle) * stickLength;
    const startY = endY - Math.sin(angle) * stickLength;
    
    return { startX, startY, endX, endY };
  };

   const { startX: cueStartX, startY: cueStartY, endX: cueEndX, endY: cueEndY } = getCueStickPosition();

     return (
      <Group>
        {/* DEBUG: Show hit area bounds */}
         {process.env.NODE_ENV === 'development' && (
           <Rect
             x={-CUE_RENDERING_SPACE - TABLE_DIMENSIONS.frameWidth}
             y={-CUE_RENDERING_SPACE - TABLE_DIMENSIONS.frameWidth}
             width={TABLE_DIMENSIONS.width + (TABLE_DIMENSIONS.frameWidth + CUE_RENDERING_SPACE) * 2}
             height={TABLE_DIMENSIONS.height + (TABLE_DIMENSIONS.frameWidth + CUE_RENDERING_SPACE) * 2}
             fill="rgba(0,0,0,0)"
             stroke="rgba(255,255,255,0.1)"
             strokeWidth={1}
             listening={false}
           />
         )}

         {/* Hit area - covers entire stage including area beyond table for cue rendering */}
         <Rect
           x={-CUE_RENDERING_SPACE - TABLE_DIMENSIONS.frameWidth}
           y={-CUE_RENDERING_SPACE - TABLE_DIMENSIONS.frameWidth}
           width={TABLE_DIMENSIONS.width + (TABLE_DIMENSIONS.frameWidth + CUE_RENDERING_SPACE) * 2}
           height={TABLE_DIMENSIONS.height + (TABLE_DIMENSIONS.frameWidth + CUE_RENDERING_SPACE) * 2}
          fill="rgba(0,0,0,0)"
          onMouseDown={handleMouseDown}
          listening={!disabled && !isAiTurn}
        />

      {!disabled && (
        <Line
          points={[cueBallX, cueBallY, cueBallX + Math.cos(angle) * 1000, cueBallY + Math.sin(angle) * 1000]}
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.2}
          dash={[10, 10]}
          listening={false}
        />
      )}
      
      {!disabled && (
        <Group listening={false}>
          <Line
            points={[cueStartX, cueStartY, cueEndX, cueEndY]}
            stroke="#4A2F1B"
            strokeWidth={7}
            lineCap="round"
          />
          <Line
            points={[cueStartX, cueStartY, cueEndX, cueEndY]}
            stroke="#8B4513"
            strokeWidth={5}
            lineCap="round"
          />
          <Line
            points={[
              cueEndX - Math.cos(angle) * 5,
              cueEndY - Math.sin(angle) * 5,
              cueEndX,
              cueEndY
            ]}
            stroke="#FFFFFF"
            strokeWidth={5}
          />
        </Group>
      )}

      {(isCharging || aiAnimPhase === 'charging') && (
        <Circle
          x={cueBallX}
          y={cueBallY}
          radius={BALL_PROPERTIES.radius + power}
          fill="transparent"
          stroke="#FF0000"
          strokeWidth={2}
          opacity={0.5}
          listening={false}
        />
      )}
    </Group>
  );
};