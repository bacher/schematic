export type GameId = `g${number}`;

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
  isInputVector: boolean;
  isOutputVector: boolean;
};
