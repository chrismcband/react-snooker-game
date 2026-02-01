import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Line, Circle, Group, Rect } from 'react-konva';
import { BALL_PROPERTIES, TABLE_DIMENSIONS } from '../utils/constants';

interface CueControllerProps {
  cueBallX: number;
  cueBallY: number;
  onShoot: (power: number, angle: number) => void;
  disabled?: boolean;
  isAiTurn?: boolean;
  aiShot?: { angle: number; power: number } | null;
  stageRef: React.RefObject<any>;
}

export const CueController: React.FC<CueControllerProps> = ({
  cueBallX,
  cueBallY,
  onShoot,
  disabled = false,
  isAiTurn = false,
  aiShot = null,
  stageRef,
}) => {
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);
  
  // Animation state for AI
  const [aiAnimPhase, setAiAnimPhase] = useState<'idle' | 'aiming' | 'charging' | 'releasing'>('idle');
  
  // Track which AI shot is currently being executed to prevent double-firing
  const aiShotIdRef = useRef<string | null>(null);

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
    console.log('CueController: MouseDown');
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
      
      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const stageX = pos.x - TABLE_DIMENSIONS.frameWidth;
      const stageY = pos.y - TABLE_DIMENSIONS.frameWidth;
      
      const dx = stageX - cueBallX;
      const dy = stageY - cueBallY;
      
      if (!isCharging) {
        // Angle points from cursor TO ball
        const newAngle = Math.atan2(-dy, -dx);
        setAngle(newAngle);
      } else {
        const maxPower = 30;
        // aim vector (cursor -> ball)
        const aimX = Math.cos(currentAngle);
        const aimY = Math.sin(currentAngle);
        // pullDist is positive when mouse is pulled AWAY from the ball (opposite of aim)
        const pullDist = (dx * -aimX + dy * -aimY); 
        const calculatedPower = Math.min(Math.max(pullDist / 10, 0), maxPower);
        setPower(calculatedPower);
      }
    };

    const handleWindowMouseUp = () => {
      if (stateRef.current.isCharging && !stateRef.current.disabled && !stateRef.current.isAiTurn) {
        handleMouseUpLocal();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [cueBallX, cueBallY, onShoot, stageRef, handleMouseUpLocal]);

   // AI Animation Logic
   useEffect(() => {
     console.log('AI Animation Check:', { isAiTurn, aiShot: aiShot ? 'present' : 'none', aiAnimPhase });

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
                 // Reset animation phase AFTER calling onShoot
                 setTimeout(() => {
                   setAiAnimPhase('idle');
                   setPower(0);
                   // Don't clear aiShotIdRef here - only clear it when aiShot becomes null
                 }, 100);
               }, 500);
             }
           }, 20);
         }, 1000);
       } else {
         console.log('✗ AI shot already being executed, skipping');
       }
     }
     
     // Clear the shot ID when aiShot is cleared (shot has been fully processed)
     if (!aiShot && aiShotIdRef.current !== null) {
       console.log('Clearing AI shot ID ref');
       aiShotIdRef.current = null;
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
      {/* Hit area */}
      <Rect
        x={-TABLE_DIMENSIONS.frameWidth}
        y={-TABLE_DIMENSIONS.frameWidth}
        width={TABLE_DIMENSIONS.width + TABLE_DIMENSIONS.frameWidth * 2}
        height={TABLE_DIMENSIONS.height + TABLE_DIMENSIONS.frameWidth * 2}
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