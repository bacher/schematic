import { ElementType, ElementDescription, Options } from './types';

export const ICON_SIZE = 48;
export const FOCUS_SIZE = ICON_SIZE + 4;
export const PIN_DOT_RADIUS = 5;
export const MAX_FPS = 60;
export const AUTO_SAVE_INTERVAL = 2000;
export const ANIMATION_TICK = 500;
export const PREVIEW_WIDTH = 150;
export const PREVIEW_HEIGHT = 100;
export const PREVIEW_ZOOM = 2;

export const elementsDescriptions: Record<ElementType, ElementDescription> = {
  [ElementType.PNP]: {
    pins: [
      { pos: { x: 0.47, y: 0.94 } },
      { pos: { x: -0.07, y: 0.32 } },
      { pos: { x: 1.05, y: 0.32 } },
    ],
  },
  [ElementType.NPN]: {
    pins: [
      { pos: { x: 0.47, y: 1 } },
      { pos: { x: -0.07, y: 0.33 } },
      { pos: { x: 1.05, y: 0.32 } },
    ],
  },
  [ElementType.POWER]: {
    pins: [{ pos: { x: 0.52, y: 0.8 } }],
  },
  [ElementType.GROUND]: {
    pins: [{ pos: { x: 0.46, y: 0.15 } }],
  },
  [ElementType.INPUT]: {
    pins: [{ pos: { x: 0.5, y: 0.8 } }],
  },
  [ElementType.OUTPUT]: {
    pins: [{ pos: { x: 0.2, y: 0.5 } }],
  },
  [ElementType.DOT]: {
    pins: [{ pos: { x: 0.5, y: 0.5 } }],
  },
};

export const defaultOptions: Options = {
  autoSaves: true,
  isInputVector: false,
  isOutputVector: false,
  simulate: false,
  debugDrawId: false,
  debugDrawAxis: false,
  debugShowFps: false,
};
