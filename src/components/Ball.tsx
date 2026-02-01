import React from 'react';
import { Circle } from 'react-konva';
import { Ball as BallType } from '../types/Ball';

interface BallProps {
  ball: BallType;
  onPositionUpdate?: (id: string, x: number, y: number) => void;
  draggable?: boolean;
  onDragEnd?: () => void;
}

export const Ball: React.FC<BallProps> = ({ ball, onPositionUpdate, draggable = false, onDragEnd }) => {
  const handleDrag = (e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();
    
    if (onPositionUpdate) {
      onPositionUpdate(ball.id, newX, newY);
    }
  };

  const handleDragEnd = (e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();
    
    if (onPositionUpdate) {
      onPositionUpdate(ball.id, newX, newY);
    }
    if (onDragEnd) {
      onDragEnd();
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
      draggable={draggable} 
      onDragMove={handleDrag}
      onDragEnd={handleDragEnd}
      visible={!ball.isPocketed}
    />
  );
};