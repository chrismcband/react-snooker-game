import React from 'react';
import { Circle } from 'react-konva';
import { Ball as BallType } from '../types/Ball';

interface BallProps {
  ball: BallType;
  onPositionUpdate?: (id: string, x: number, y: number) => void;
}

export const Ball: React.FC<BallProps> = ({ ball, onPositionUpdate }) => {
  const handleDragEnd = (e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();
    
    if (onPositionUpdate) {
      onPositionUpdate(ball.id, newX, newY);
    }
  };

  return (
    <Circle
      key={ball.id}
      x={ball.x}
      y={ball.y}
      radius={ball.radius}
      fill={ball.color}
      stroke={ball.type === 'cue' ? '#000000' : '#FFFFFF'}
      strokeWidth={1}
      draggable={false} // Disable dragging, use CueController for movement
      onDragEnd={handleDragEnd}
      visible={!ball.isPocketed}
    />
  );
};