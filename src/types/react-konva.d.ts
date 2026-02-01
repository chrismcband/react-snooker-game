declare module 'react-konva' {
  import { Component } from 'react';
  
  export interface StageProps {
    width: number;
    height: number;
    children?: React.ReactNode;
  }
  
  export interface LayerProps {
    x?: number;
    y?: number;
    children?: React.ReactNode;
    onMouseDown?: (e: any) => void;
    onMouseMove?: (e: any) => void;
    onMouseUp?: (e: any) => void;
    onMouseLeave?: (e: any) => void;
  }
  
  export interface CircleProps {
    x: number;
    y: number;
    radius: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    draggable?: boolean;
    visible?: boolean;
    onDragMove?: (e: any) => void;
    onDragEnd?: (e: any) => void;
    dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
    opacity?: number;
    onMouseDown?: (e: any) => void;
    onMouseMove?: (e: any) => void;
    onMouseUp?: (e: any) => void;
    onMouseLeave?: (e: any) => void;
    listening?: boolean;
    opacity?: number;
  }
  
  export interface RectProps {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    onMouseDown?: (e: any) => void;
    onMouseMove?: (e: any) => void;
    onMouseUp?: (e: any) => void;
    onMouseLeave?: (e: any) => void;
    listening?: boolean;
  }
  
  export interface ArcProps {
    x: number;
    y: number;
    innerRadius: number;
    outerRadius: number;
    angle: number;
    rotation: number;
    stroke: string;
    strokeWidth?: number;
    fill?: string | null;
    opacity?: number;
    listening?: boolean;
  }
  
  export interface LineProps {
    points: number[];
    stroke: string;
    strokeWidth?: number;
    opacity?: number;
    dash?: number[];
    lineCap?: string;
    listening?: boolean;
  }
  
  export interface GroupProps extends LayerProps {
    listening?: boolean;
  }
  
  export class Stage extends Component<StageProps> {}
  export class Layer extends Component<LayerProps> {}
  export class Circle extends Component<CircleProps> {}
  export class Rect extends Component<RectProps> {}
  export class Arc extends Component<ArcProps> {}
  export class Line extends Component<LineProps> {}
  export class Group extends Component<GroupProps> {}
}