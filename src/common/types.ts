export type GameId = `s${number}`;

export enum ElementType {
  PNP = 'pnp',
  NPN = 'npn',
  POWER = 'power',
  GROUND = 'ground',
  INPUT = 'input',
  OUTPUT = 'output',
  DOT = 'dot',
}

export type Coords = {
  x: number;
  y: number;
};

export type Point = {
  x: number;
  y: number;
};

export type BoxSize = {
  width: number;
  height: number;
};

export type Cursor =
  | 'initial'
  | 'move'
  | 'pointer'
  | 'drag'
  | 'grab'
  | 'grabbing'
  | 'cross';

export enum ObjectType {
  ELEMENT,
  CONNECTION,
  PIN,
}

export type ElementId = `el${number}`;

export type Element = {
  type: ElementType;
  id: ElementId;
  pos: Coords;
};

export type ConnectionPin = { elId: ElementId; pinIndex: number };

export type Connection = [ConnectionPin, ConnectionPin];

export type Pin = {
  pos: Coords;
};

export type ElementDescription = {
  pins: Pin[];
};

export type GameState = {
  elements: Element[];
  connections: Connection[];
};

export type Options = {
  autoSaves: boolean;
  isInputVector: boolean;
  isOutputVector: boolean;
  simulate: boolean;
  debugDrawId: boolean;
  debugDrawAxis: boolean;
  debugShowFps: boolean;
};

export enum LoadingStatus {
  NONE,
  LOADING,
  DONE,
}

export type AssetSet = {
  images: Record<string, HTMLImageElement>;
  status: LoadingStatus;
};

export type Assets = {
  x1: AssetSet;
  x2: AssetSet;
};

export type GameSaveDescriptor = {
  id: GameId;
  title: string;
};
