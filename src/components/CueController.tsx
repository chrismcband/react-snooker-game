import React, { useState } from 'react';
import { Line, Circle, Group } from 'react-konva';
import { BALL_PROPERTIES } from '../utils/constants';

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
  const [isAiming, setIsAiming] = useState(false);
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);

  const handleMouseDown = (e: any) => {
    if (disabled) return;
    
    setIsAiming(true);
  };

  const handleMouseMove = (e: any) => {
    if (!isAiming || disabled) return;
    
    const pos = e.target.getStage().getPointerPosition();
    
    // Calculate power based on distance from cue ball
    const dx = pos.x - cueBallX;
    const dy = pos.y - cueBallY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxPower = 20;
    const calculatedPower = Math.min(distance / 10, maxPower);
    setPower(calculatedPower);
    
    // Calculate angle
    const calculatedAngle = Math.atan2(dy, dx);
    setAngle(calculatedAngle);
  };

  const handleMouseUp = () => {
    if (!isAiming || disabled) return;
    
    if (power > 0.5) { // Minimum power threshold
      onShoot(power, angle);
    }
    
    setIsAiming(false);
    setPower(0);
  };

  // Calculate cue stick position
  const getCueStickPosition = () => {
    const stickLength = 200;
    const stickOffset = 30 + power * 5; // Offset based on power
    
    const endX = cueBallX - Math.cos(angle) * stickOffset;
    const endY = cueBallY - Math.sin(angle) * stickOffset;
    const startX = endX - Math.cos(angle) * stickLength;
    const startY = endY - Math.sin(angle) * stickLength;
    
    return { startX, startY, endX, endY };
  };

  // Calculate power indicator
  const getPowerIndicator = () => {
    const indicatorLength = power * 10;
    const startX = cueBallX;
    const startY = cueBallY;
    const endX = cueBallX + Math.cos(angle) * indicatorLength;
    const endY = cueBallY + Math.sin(angle) * indicatorLength;
    
    return { startX, startY, endX, endY };
  };

  const { startX: cueStartX, startY: cueStartY, endX: cueEndX, endY: cueEndY } = getCueStickPosition();
  const { startX: powerStartX, startY: powerStartY, endX: powerEndX, endY: powerEndY } = getPowerIndicator();

  return (
    <Group>
      {/* Power indicator line */}
      {isAiming && power > 0 && (
        <Line
          points={[powerStartX, powerStartY, powerEndX, powerEndY]}
          stroke="#FF0000"
          strokeWidth={2}
          opacity={0.6}
          dash={[5, 5]}
        />
      )}
      
      {/* Cue stick */}
      {isAiming && !disabled && (
        <>
          <Line
            points={[cueStartX, cueStartY, cueEndX, cueEndY]}
            stroke="#8B4513"
            strokeWidth={8}
            lineCap="round"
          />
          <Line
            points={[cueStartX, cueStartY, cueEndX, cueEndY]}
            stroke="#D2691E"
            strokeWidth={6}
            lineCap="round"
          />
        </>
      )}
      
      {/* Aiming guide when not aiming */}
      {!isAiming && !disabled && (
        <Circle
          x={cueBallX + 20}
          y={cueBallY}
          radius={3}
          fill="#FFFFFF"
          opacity={0.5}
        />
      )}
      
      {/* Invisible hit area for mouse events */}
      <Circle
        x={cueBallX}
        y={cueBallY}
        radius={BALL_PROPERTIES.radius * 3}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </Group>
  );
};