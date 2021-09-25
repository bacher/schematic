import { ElementType, ElementDescription } from './types';

export const elementsDescriptions: Record<ElementType, ElementDescription> = {
  pnp: {
    pins: [
      { pos: { x: 0.47, y: 0.94 } },
      { pos: { x: -0.07, y: 0.32 } },
      { pos: { x: 1.05, y: 0.32 } },
    ],
  },
  npn: {
    pins: [
      { pos: { x: 0.47, y: 1 } },
      { pos: { x: -0.07, y: 0.33 } },
      { pos: { x: 1.05, y: 0.32 } },
    ],
  },
  power: {
    pins: [{ pos: { x: 0.52, y: 0.8 } }],
  },
  ground: {
    pins: [{ pos: { x: 0.46, y: 0.15 } }],
  },
  input: {
    pins: [{ pos: { x: 0.5, y: 0.8 } }],
  },
  output: {
    pins: [{ pos: { x: 0.2, y: 0.5 } }],
  },
};
