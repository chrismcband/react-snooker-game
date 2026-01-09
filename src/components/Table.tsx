import React from 'react';
import { Rect, Circle, Line, Arc, Group } from 'react-konva';
import { TABLE_DIMENSIONS, POCKET_POSITIONS, TABLE_MARKINGS } from '../utils/constants';

interface TableProps {
  children?: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children }) => {
  const { width, height, cushionWidth, frameWidth } = TABLE_DIMENSIONS;

  return (
    <Group>
      {/* Wooden Frame */}
      <Rect
        x={-frameWidth}
        y={-frameWidth}
        width={width + frameWidth * 2}
        height={height + frameWidth * 2}
        fill="#5D3A1A" // Dark wood color
        cornerRadius={10}
      />

      {/* Table bed (green felt) */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#357D48" // Classic snooker green
      />

      {/* Cushions */}
      <Group>
        {/* Top cushion */}
        <Rect x={0} y={-cushionWidth} width={width} height={cushionWidth} fill="#2E6B3E" />
        {/* Bottom cushion */}
        <Rect x={0} y={height} width={width} height={cushionWidth} fill="#2E6B3E" />
        {/* Left cushion */}
        <Rect x={-cushionWidth} y={0} width={cushionWidth} height={height} fill="#2E6B3E" />
        {/* Right cushion */}
        <Rect x={width} y={0} width={cushionWidth} height={height} fill="#2E6B3E" />
      </Group>
      
      {/* Baulk line */}
      <Line
        points={[
          TABLE_MARKINGS.baulkLineX, 0,
          TABLE_MARKINGS.baulkLineX, height
        ]}
        stroke="#FFFFFF"
        strokeWidth={1}
        opacity={0.4}
      />
      
      {/* D (semi-circle) */}
      <Arc
        x={TABLE_MARKINGS.baulkLineX}
        y={height / 2}
        innerRadius={0}
        outerRadius={TABLE_MARKINGS.dRadius}
        angle={180}
        rotation={90}
        stroke="#FFFFFF"
        strokeWidth={1}
        fill={undefined}
        opacity={0.4}
      />
      
      {/* Spots */}
      <Circle x={TABLE_MARKINGS.blueSpotX} y={TABLE_MARKINGS.blueSpotY} radius={2} fill="#FFFFFF" opacity={0.3} />
      <Circle x={TABLE_MARKINGS.pinkSpotX} y={TABLE_MARKINGS.pinkSpotY} radius={2} fill="#FFFFFF" opacity={0.3} />
      <Circle x={TABLE_MARKINGS.blackSpotX} y={TABLE_MARKINGS.blackSpotY} radius={2} fill="#FFFFFF" opacity={0.3} />
      <Circle x={TABLE_MARKINGS.baulkLineX} y={height / 2} radius={2} fill="#FFFFFF" opacity={0.3} />
      <Circle x={TABLE_MARKINGS.baulkLineX} y={height / 2 - TABLE_MARKINGS.dRadius} radius={2} fill="#FFFFFF" opacity={0.3} />
      <Circle x={TABLE_MARKINGS.baulkLineX} y={height / 2 + TABLE_MARKINGS.dRadius} radius={2} fill="#FFFFFF" opacity={0.3} />
      
      {/* Pockets */}
      {POCKET_POSITIONS.map(pocket => (
        <Circle
          key={pocket.id}
          x={pocket.x}
          y={pocket.y}
          radius={TABLE_DIMENSIONS.pocketRadius}
          fill="#000000"
        />
      ))}
      
      {/* Render children (balls) on top */}
      {children}
    </Group>
  );
};
