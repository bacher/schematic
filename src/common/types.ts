export enum ElementType {
  PNP = 'pnp',
  NPN = 'npn',
  POWER = 'power',
  GROUND = 'ground',
  INPUT = 'input',
  OUTPUT = 'output',
}

export type Coords = {
  x: number;
  y: number;
};

export type Element = {
  type: ElementType;
  pos: Coords;
};

export type Connection = {
  el1: { el: Element; pinIndex: number };
  el2: { el: Element; pinIndex: number };
};

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
