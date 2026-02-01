import React, { useState } from 'react';
import { Line, Circle, Group, Rect } from 'react-konva';
import { BALL_PROPERTIES, TABLE_DIMENSIONS } from '../utils/constants';

interface CueControllerProps {
  cueBallX: number;
  cueBallY: number;
  onShoot: (power: number, angle: number) => void;
  disabled?: boolean;
}

export const CueController: React.FC<CueControllerProps> = ({
  cueBallX,
  cueBallY,
  onShoot,
  disabled = false,
}) => {
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);

  const handleMouseDown = (e: any) => {
    if (disabled) return;
    setIsCharging(true);
  };

  const handleMouseMove = (e: any) => {
    if (disabled) return;
    
    const pos = e.target.getStage().getPointerPosition();
    // Offset for the layer transformation in Game.tsx
    const stageX = pos.x - TABLE_DIMENSIONS.frameWidth;
    const stageY = pos.y - TABLE_DIMENSIONS.frameWidth;
    
    const dx = stageX - cueBallX;
    const dy = stageY - cueBallY;
    
    if (!isCharging) {
      // Rotate cue around ball
      const newAngle = Math.atan2(dy, dx);
      setAngle(newAngle);
    } else {
      // Charge power based on distance
      // We want to measure distance along the line of aim
      // or just pure distance from ball to mouse.
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxPower = 30;
      
      // Calculate dot product to see if we are pulling away from or pushing towards the aim
      // Vector ball-to-mouse: (dx, dy)
      // Vector ball-to-aim: (cos(angle), sin(angle))
      // But actually, pulling AWAY from aim should increase power.
      // So if mouse is at angle + PI, power should be positive.
      
      const aimX = Math.cos(angle);
      const aimY = Math.sin(angle);
      const pullDist = -(dx * aimX + dy * aimY); // Negative dot product means pulling away
      
      const calculatedPower = Math.min(Math.max(pullDist / 10, 0), maxPower);
      setPower(calculatedPower);
    }
  };

  const handleMouseUp = () => {
    if (disabled || !isCharging) return;
    
    if (power > 0.5) {
      // Shot direction is opposite to where we pull (like a real cue)
      // Actually, standard pool games: you pull back, cue ball goes forward
      // The angle currently points FROM ball TO mouse.
      // So the shot angle should be angle + PI if we pull back.
      // BUT if we just use the current angle as "aim", then we shoot in that direction.
      // Let's assume the user aims by pointing the mouse where they want to hit,
      // then clicks and pulls back.
      onShoot(power, angle);
    }
    
    setIsCharging(false);
    setPower(0);
  };

  // Calculate cue stick position
  const getCueStickPosition = () => {
    const stickLength = 300;
    // When charging, the cue stick pulls back
    const stickOffset = BALL_PROPERTIES.radius + 5 + (isCharging ? power * 2 : 0);
    
    // The cue stick should be on the OPPOSITE side of the aim angle
    const endX = cueBallX - Math.cos(angle) * stickOffset;
    const endY = cueBallY - Math.sin(angle) * stickOffset;
    const startX = endX - Math.cos(angle) * stickLength;
    const startY = endY - Math.sin(angle) * stickLength;
    
    return { startX, startY, endX, endY };
  };

  const { startX: cueStartX, startY: cueStartY, endX: cueEndX, endY: cueEndY } = getCueStickPosition();

  return (
    <Group>
      {/* Invisible hit area covering the whole table area */}
      <Rect
        x={-TABLE_DIMENSIONS.frameWidth}
        y={-TABLE_DIMENSIONS.frameWidth}
        width={TABLE_DIMENSIONS.width + TABLE_DIMENSIONS.frameWidth * 2}
        height={TABLE_DIMENSIONS.height + TABLE_DIMENSIONS.frameWidth * 2}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Aiming line */}
      {!disabled && (
        <Line
          points={[cueBallX, cueBallY, cueBallX + Math.cos(angle) * 1000, cueBallY + Math.sin(angle) * 1000]}
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.2}
          dash={[10, 10]}
        />
      )}
      
      {/* Cue stick */}
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
          {/* Cue tip */}
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

      {/* Power indicator near cue ball */}
      {isCharging && (
        <Circle
          x={cueBallX}
          y={cueBallY}
          radius={BALL_PROPERTIES.radius + power}
          stroke="#FF0000"
          strokeWidth={2}
          opacity={0.5}
        />
      )}
    </Group>
  );
};