import React, { useState, useEffect, useRef } from 'react';
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

  // Use refs to track latest values for the window event listeners to avoid closure issues
  const stateRef = useRef({ isCharging, power, angle, disabled, isAiTurn });
  useEffect(() => {
    stateRef.current = { isCharging, power, angle, disabled, isAiTurn };
  }, [isCharging, power, angle, disabled, isAiTurn]);

  const handleMouseDown = () => {
    if (disabled || isAiTurn) return;
    setIsCharging(true);
  };

  const handleMouseUpLocal = useCallback(() => {
    const { power, angle, isCharging } = stateRef.current;
    if (disabled || !isCharging || isAiTurn) return;
    
    if (power > 0.5) {
      onShoot(power, angle);
    }
    
    setIsCharging(false);
    setPower(0);
  }, [disabled, isAiTurn, onShoot]);

  // Use window events to capture mouse movement even outside the canvas
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const { disabled, isAiTurn, isCharging, angle: currentAngle } = stateRef.current;
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
      if (stateRef.current.isCharging) {
        handleMouseUpLocal();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [cueBallX, cueBallY, onShoot, stageRef]);

  // AI Animation Logic
  useEffect(() => {
    if (isAiTurn && aiShot && aiAnimPhase === 'idle') {
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
              onShoot(targetPower, aiShot.angle);
              setAiAnimPhase('idle');
              setPower(0);
            }, 500);
          }
        }, 20);
      }, 1000);
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
        fill="transparent"
        onMouseDown={handleMouseDown}
      />

      {!disabled && (
        <Line
          points={[cueBallX, cueBallY, cueBallX + Math.cos(angle) * 1000, cueBallY + Math.sin(angle) * 1000]}
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.2}
          dash={[10, 10]}
        />
      )}
      
      {!disabled && (
        <Group>
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
        />
      )}
    </Group>
  );
};