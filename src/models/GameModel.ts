import { pick, defaults, without, last } from 'lodash-es';
import im from 'immer';
import memoize from 'memoize-one';
import shallowequal from 'shallowequal';

import {
  Connection,
  Coords,
  Cursor,
  Element,
  ElementId,
  ElementType,
  GameId,
  ObjectType,
  Options,
  Point,
} from 'common/types';
import {
  defaultOptions,
  elementsDescriptions,
  ICON_SIZE,
  PIN_DOT_RADIUS,
} from 'common/data';
import { rotate, subtract } from 'utils/trigano';
import { getNodesSimulationState } from 'utils/simulation';
import { useForceUpdate } from 'hooks/useForceUpdate';
import { useHandler } from 'hooks/useHandler';

type HoverElement =
  | {
      type: ObjectType.ELEMENT;
      elId: ElementId;
      activePin: { index: number } | undefined;
    }
  | {
      type: ObjectType.CONNECTION;
      connectionIndex: number;
    };

type FocusElement =
  | {
      type: ObjectType.ELEMENT;
      elId: ElementId;
    }
  | {
      type: ObjectType.CONNECTION;
      connectionIndex: number;
    };

type WireElement = {
  elId: ElementId;
  pinIndex: number;
  pullPos: Point | undefined;
};

type ElementPointer = {
  elId: ElementId;
};

type MouseState = {
  isMouseDown: boolean;
};

type PanState = {
  isPan: boolean;
};

function dropIndex<T>(items: T[], dropIndex: number): T[] {
  return items.filter((value, index) => index !== dropIndex);
}

function getGameIdStorageKey(gameId: GameId): string {
  return `sch_game_${gameId}`;
}

export type GameModelState = {
  elements: Element[];
  connections: Connection[];
  inputSignals: boolean[];
  pos: Point;
  options: Options;
  hoverElement: HoverElement | undefined;
  focusElement: FocusElement | undefined;
  wireElement: WireElement | undefined;
  movingElement: ElementPointer | undefined;
  panState: PanState;
  cursor: Cursor | undefined;
};

function watch(
  target: GameModel,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = function watch(...args: unknown[]) {
    if (!(this instanceof GameModel)) {
      throw new Error();
    }

    let iAmWatcher = false;

    if (!this.underWatch) {
      iAmWatcher = true;
      this.underWatch = true;
    }

    const before = this.getState();
    const results = originalMethod.apply(this, args);

    if (iAmWatcher) {
      if (!this.needTriggerUpdate) {
        const after = this.getState();
        this.needTriggerUpdate = before !== after;
      }

      if (this.needTriggerUpdate) {
        this.needTriggerUpdate = false;
        this.triggerUpdate();
      }

      this.underWatch = false;
    }

    return results;
  };
}

function draw(
  target: GameModel,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = function draw(...args: unknown[]) {
    if (!(this instanceof GameModel)) {
      throw new Error();
    }

    const results = originalMethod.apply(this, args);

    if (this.underWatch) {
      this.needTriggerUpdate = true;
    } else {
      this.triggerUpdate();
    }

    return results;
  };
}

export class GameModel {
  public static createEmptyModel(gameId: GameId): GameModel {
    return new GameModel({
      gameId,
      pos: { x: 0, y: 0 },
      elements: [],
      connections: [],
      inputSignals: [],
      options: defaultOptions,
    });
  }

  protected static getLoadedState(gameId: GameId) {
    const json = localStorage.getItem(getGameIdStorageKey(gameId));

    if (!json) {
      throw new Error('No saved game');
    }

    const {
      pos,
      elements,
      inputSignals,
      connections,
      options: savedOptions,
    } = JSON.parse(json);

    const optionsNames = Object.keys(defaultOptions);
    const options = defaults(pick(savedOptions, optionsNames), defaultOptions);

    return {
      gameId,
      pos,
      elements,
      connections,
      inputSignals,
      options,
    };
  }

  public static checkSavedGame(gameId: GameId): boolean {
    const json = localStorage.getItem(getGameIdStorageKey(gameId));
    return Boolean(json);
  }

  public static loadGame(gameId: GameId): GameModel {
    return new GameModel(GameModel.getLoadedState(gameId));
  }

  public underWatch = false;
  public needTriggerUpdate = false;

  private gameId: GameId;
  private drawHandler?: () => void;

  private elements: Element[];
  private connections: Connection[];
  private inputSignals: boolean[];
  private pos: Point;
  private options: Options;
  private hoverElement: HoverElement | undefined;
  private focusElement: FocusElement | undefined;
  private wireElement: WireElement | undefined;
  private movingElement: ElementPointer | undefined;
  private mousePos: Point | undefined;
  private mouseState: MouseState;
  private panState: PanState;
  private lastStateSnapshot: GameModelState | undefined;

  public stateListeners: {
    forceUpdate: () => void;
    selector: (state: GameModelState) => unknown;
    lastSelectedValue: unknown | undefined;
    actualSelectedValue: { value: unknown } | undefined;
    isActual: boolean;
  }[];

  private constructor({
    gameId,
    elements,
    connections,
    inputSignals,
    pos,
    options,
  }: {
    gameId: GameId;
    elements: Element[];
    connections: Connection[];
    inputSignals: boolean[];
    pos: Point;
    options: Options;
  }) {
    this.gameId = gameId;

    this.elements = elements;
    this.connections = connections;
    this.inputSignals = inputSignals;
    this.pos = pos;
    this.options = options;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.gameModel = this;

    this.hoverElement = undefined;
    this.focusElement = undefined;
    this.wireElement = undefined;
    this.movingElement = undefined;
    this.mouseState = {
      isMouseDown: false,
    };
    this.panState = {
      isPan: false,
    };
    this.mousePos = undefined;
    this.stateListeners = [];
    this.lastStateSnapshot = undefined;
  }

  public setDrawHandler(drawHandler: (() => void) | undefined) {
    this.drawHandler = drawHandler;
  }

  public saveGame(): void {
    localStorage.setItem(
      getGameIdStorageKey(this.gameId),
      JSON.stringify({
        pos: this.pos,
        elements: this.elements,
        inputSignals: this.inputSignals,
        connections: this.connections,
        options: this.options,
      }),
    );
  }

  public getState(): GameModelState {
    const state = {
      elements: this.elements,
      connections: this.connections,
      inputSignals: this.inputSignals,
      pos: this.pos,
      options: this.options,
      hoverElement: this.hoverElement,
      focusElement: this.focusElement,
      wireElement: this.wireElement,
      movingElement: this.movingElement,
      panState: this.panState,
      cursor: this.getCursor(),
    };

    if (
      !this.lastStateSnapshot ||
      !shallowequal(state, this.lastStateSnapshot)
    ) {
      this.lastStateSnapshot = state;
    }

    return this.lastStateSnapshot;
  }

  @watch
  public deleteElementInFocus(): void {
    const focusTarget = this.focusElement;

    if (!focusTarget) {
      return;
    }

    switch (focusTarget.type) {
      case ObjectType.ELEMENT: {
        this.connections = this.connections.filter(
          ([p1, p2]) =>
            p1.elId !== focusTarget.elId && p2.elId !== focusTarget.elId,
        );

        const element = this.elements.find(({ id }) => id === focusTarget.elId);

        if (!element) {
          throw new Error();
        }

        if (element.type === ElementType.INPUT) {
          const inputIndex = this.elements
            .filter(({ type }) => type === ElementType.INPUT)
            .indexOf(element);

          this.inputSignals = dropIndex(this.inputSignals, inputIndex);
        }

        this.elements = without(this.elements, element);
        break;
      }
      case ObjectType.CONNECTION:
        this.connections = dropIndex(
          this.connections,
          focusTarget.connectionIndex,
        );
        break;
    }

    this.focusElement = undefined;
  }

  @draw
  public updateInputSignals(inputSignals: boolean[]): void {
    this.inputSignals = inputSignals;
  }

  @draw
  public updateOptions(options: Options): void {
    this.options = options;
  }

  public onMouseDown(): void {
    if (this.mouseState.isMouseDown) {
      this.onMouseUp();
    }

    this.mouseState.isMouseDown = true;
  }

  @watch
  public onMouseMove({
    position: { x, y },
    movement: { x: dX, y: dY },
  }: {
    position: Point;
    movement: Point;
  }): void {
    this.mousePos = {
      x,
      y,
    };

    this.checkHover();

    const isMoving = Boolean(this.movingElement);

    if (this.mouseState.isMouseDown) {
      if (
        !isMoving &&
        !this.wireElement &&
        this.hoverElement &&
        this.hoverElement.type === ObjectType.ELEMENT &&
        this.hoverElement.activePin
      ) {
        this.startWiring({
          elId: this.hoverElement.elId,
          pinIndex: this.hoverElement.activePin.index,
        });
      }

      if (
        !isMoving &&
        !this.wireElement &&
        this.hoverElement &&
        this.hoverElement.type === ObjectType.ELEMENT
      ) {
        this.movingElement = {
          elId: this.hoverElement.elId,
        };

        this.focusElement = {
          type: ObjectType.ELEMENT,
          elId: this.hoverElement.elId,
        };
      }

      if (!this.wireElement && !this.movingElement && !this.panState.isPan) {
        this.panState = {
          isPan: true,
        };
      }

      const { movingElement } = this;
      if (movingElement) {
        this.updateElement(movingElement.elId, (el) => {
          el.pos.x += dX;
          el.pos.y += dY;
        });
      } else if (!this.wireElement) {
        this.pos = {
          x: this.pos.x + dX,
          y: this.pos.y + dY,
        };
      }
    } else if (this.panState.isPan) {
      this.panState = {
        isPan: false,
      };
    }

    if (this.wireElement) {
      this.wireElement = im(this.wireElement, (wire) => {
        if (wire.pullPos && this.mousePos) {
          wire.pullPos.x = this.mousePos.x;
          wire.pullPos.y = this.mousePos.y;
        } else {
          wire.pullPos = this.mousePos;
        }
      });
    }
  }

  @watch
  public onMouseUp() {
    this.mouseState = {
      isMouseDown: false,
    };

    // TODO: Why focus resetting here?
    if (
      this.focusElement &&
      this.focusElement.type === ObjectType.ELEMENT &&
      !this.wireElement &&
      !this.movingElement
    ) {
      this.focusElement = undefined;
    }

    if (this.movingElement) {
      this.movingElement = undefined;
    }

    if (this.panState.isPan) {
      this.panState = {
        isPan: false,
      };
    }

    if (this.wireElement) {
      if (
        this.hoverElement &&
        this.hoverElement.type === ObjectType.ELEMENT &&
        this.hoverElement.activePin &&
        this.wireElement.elId !== this.hoverElement.elId
      ) {
        this.connections = [
          ...this.connections,
          [
            {
              elId: this.hoverElement.elId,
              pinIndex: this.hoverElement.activePin.index,
            },
            {
              elId: this.wireElement.elId,
              pinIndex: this.wireElement.pinIndex,
            },
          ],
        ];
      }

      this.wireElement = undefined;
    } else if (!this.wireElement) {
      if (
        this.hoverElement &&
        this.hoverElement.type === ObjectType.ELEMENT &&
        this.hoverElement.activePin
      ) {
        this.startWiring({
          elId: this.hoverElement.elId,
          pinIndex: this.hoverElement.activePin.index,
        });
      }

      if (this.hoverElement) {
        if (
          this.hoverElement.type === ObjectType.ELEMENT &&
          !this.hoverElement.activePin
        ) {
          if (
            !this.focusElement ||
            this.focusElement.type !== ObjectType.ELEMENT ||
            this.focusElement.elId !== this.hoverElement.elId
          ) {
            this.focusElement = {
              type: ObjectType.ELEMENT,
              elId: this.hoverElement.elId,
            };
          }
        } else if (this.hoverElement.type === ObjectType.CONNECTION) {
          if (
            !this.focusElement ||
            this.focusElement.type !== ObjectType.CONNECTION ||
            this.focusElement.connectionIndex !==
              this.hoverElement.connectionIndex
          ) {
            this.focusElement = {
              type: ObjectType.CONNECTION,
              connectionIndex: this.hoverElement.connectionIndex,
            };
          }
        }
      }
    }
  }

  public getCursor(): Cursor {
    const { wireElement, hoverElement, panState } = this;

    if (wireElement) {
      return 'pointer';
    }

    if (hoverElement) {
      if (hoverElement.type === ObjectType.CONNECTION) {
        return 'move';
      }

      if (hoverElement.type === ObjectType.ELEMENT) {
        if (hoverElement.activePin) {
          return 'pointer';
        }

        return 'move';
      }

      if (panState.isPan) {
        return 'grabbing';
      }
    }

    return 'move';
  }

  @draw
  public addElement(type: ElementType) {
    const pos = { ...this.pos };

    while (this.checkOverlap(pos)) {
      pos.x += ICON_SIZE + 20;
    }

    this.elements = [
      ...this.elements,
      {
        type,
        id: this.getNextId(),
        pos,
      },
    ];

    this.inputSignals = [...this.inputSignals, false];
  }

  @watch
  private startWiring({
    elId,
    pinIndex,
  }: {
    elId: ElementId;
    pinIndex: number;
  }) {
    this.focusElement = {
      type: ObjectType.ELEMENT,
      elId,
    };

    this.wireElement = {
      elId,
      pinIndex,
      pullPos: this.mousePos,
    };
  }

  @watch
  public resetCursorState(): void {
    this.movingElement = undefined;
    this.wireElement = undefined;

    if (this.mouseState.isMouseDown) {
      this.mouseState = {
        isMouseDown: false,
      };
    }

    if (this.panState.isPan) {
      this.panState = {
        isPan: false,
      };
    }
  }

  public triggerUpdate() {
    if (this.drawHandler) {
      this.drawHandler();
    }

    const state = this.getState();

    for (const listener of this.stateListeners) {
      listener.isActual = false;
    }

    for (const listener of this.stateListeners) {
      if (listener.isActual) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const { forceUpdate, selector, lastSelectedValue } = listener;

      const selectedValue = selector(state);

      if (!shallowequal(selectedValue, lastSelectedValue)) {
        listener.actualSelectedValue = { value: selectedValue };
        forceUpdate();
      }
    }

    for (const listener of this.stateListeners) {
      listener.actualSelectedValue = undefined;
    }
  }

  @draw
  public clearState() {
    this.pos = { x: 0, y: 0 };
    this.elements = [];
    this.connections = [];
    this.inputSignals = [];
    this.hoverElement = undefined;
    this.focusElement = undefined;
    this.movingElement = undefined;
    this.wireElement = undefined;
    this.panState.isPan = false;
    this.mouseState.isMouseDown = false;
  }

  @draw
  public reloadFromSave() {
    try {
      const { elements, connections, pos, options, inputSignals } =
        GameModel.getLoadedState(this.gameId);

      this.clearState();

      this.elements = elements;
      this.connections = connections;
      this.pos = pos;
      this.options = options;
      this.inputSignals = inputSignals;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Can't load state:", error);
    }
  }

  @watch
  private updateElement(
    elId: ElementId,
    callback: (el: Element) => void,
  ): void {
    this.elements = im(this.elements, (elements) => {
      const el = elements.find((el) => el.id === elId);

      if (!el) {
        throw new Error(`Element ${elId} is not found`);
      }

      callback(el);
    });
  }

  @watch
  private checkHover(): void {
    if (!this.mousePos) {
      if (this.hoverElement) {
        this.hoverElement = undefined;
      }
      return;
    }

    const { x, y } = subtract(this.mousePos, this.pos);

    let hoverFound = false;
    let hoverConnectionFound = false;

    for (const element of this.elements) {
      const { pins } = elementsDescriptions[element.type];

      const x0 = element.pos.x - ICON_SIZE / 2;
      const y0 = element.pos.y - ICON_SIZE / 2;

      for (const pin of pins) {
        if (
          (x0 + pin.pos.x * ICON_SIZE - x) ** 2 +
            (y0 + pin.pos.y * ICON_SIZE - y) ** 2 <
          (PIN_DOT_RADIUS + 4) ** 2
        ) {
          const pinIndex = pins.indexOf(pin);

          // before set check if already hovered
          if (
            !this.hoverElement ||
            this.hoverElement.type !== ObjectType.ELEMENT ||
            this.hoverElement.elId !== element.id ||
            this.hoverElement.activePin?.index !== pinIndex
          ) {
            this.hoverElement = {
              type: ObjectType.ELEMENT,
              elId: element.id,
              activePin: {
                index: pinIndex,
              },
            };
          }
          hoverFound = true;
          break;
        }
      }
    }

    if (!hoverFound) {
      for (const element of this.elements) {
        const x0 = element.pos.x - ICON_SIZE / 2;
        const y0 = element.pos.y - ICON_SIZE / 2;

        if (x > x0 && x < x0 + ICON_SIZE && y > y0 && y < y0 + ICON_SIZE) {
          // before set check if already hovered
          if (
            !this.hoverElement ||
            this.hoverElement.type !== ObjectType.ELEMENT ||
            this.hoverElement.elId !== element.id ||
            this.hoverElement.activePin
          ) {
            this.hoverElement = {
              type: ObjectType.ELEMENT,
              elId: element.id,
              activePin: undefined,
            };
          }
          hoverFound = true;
          break;
        }
      }
    }

    if (!hoverFound) {
      for (const connection of this.connections) {
        const [p1, p2] = connection;

        const point1 = this.getConnectionPinPosition(p1);
        const point2 = this.getConnectionPinPosition(p2);

        const shiftedPoint2 = subtract(point2, point1);
        const shiftedMouse = subtract({ x, y }, point1);

        const a = Math.atan2(shiftedPoint2.y, shiftedPoint2.x);

        const rotatedPoint2 = rotate(shiftedPoint2, -a);
        const rotatedMouse = rotate(shiftedMouse, -a);

        const GAP = 10;

        if (
          rotatedMouse.x >= -GAP &&
          rotatedMouse.x <= rotatedPoint2.x + GAP &&
          rotatedMouse.y > -GAP &&
          rotatedMouse.y < GAP
        ) {
          const connectionIndex = this.connections.indexOf(connection);

          // before set check if already hovered
          if (
            !this.hoverElement ||
            this.hoverElement.type !== ObjectType.CONNECTION ||
            this.hoverElement.connectionIndex !== connectionIndex
          ) {
            this.hoverElement = {
              type: ObjectType.CONNECTION,
              connectionIndex,
            };
          }
          hoverConnectionFound = true;
          break;
        }
      }
    }

    if (!hoverFound && !hoverConnectionFound) {
      if (this.hoverElement) {
        this.hoverElement = undefined;
      }
    }
  }

  private getConnectionPinPosition({
    elId,
    pinIndex,
  }: {
    elId: ElementId;
    pinIndex: number;
  }): Coords {
    const el = this.getElById(elId);

    const pin = elementsDescriptions[el.type].pins[pinIndex];

    return {
      x: el.pos.x + (pin.pos.x - 0.5) * ICON_SIZE,
      y: el.pos.y + (pin.pos.y - 0.5) * ICON_SIZE,
    };
  }

  private getElById(id: ElementId): Element {
    const el = this.elements.find((el) => el.id === id);

    if (!el) {
      throw new Error('Element not found');
    }

    return el;
  }

  private checkOverlap(point: Coords): boolean {
    for (const { pos } of this.elements) {
      if (
        (pos.x - point.x) ** 2 + (pos.y - point.y) ** 2 <
        (ICON_SIZE / 2) ** 2
      ) {
        return true;
      }
    }

    return false;
  }

  private getNextId(): ElementId {
    const lastElement = last(this.elements);

    if (!lastElement) {
      return `el1`;
    }

    const match = lastElement.id.match(/^el(\d+)$/);

    if (!match) {
      throw new Error();
    }

    return `el${parseInt(match[1], 10) + 1}`;
  }

  public allowOpenContextMenu(): boolean {
    return !this.hoverElement && !this.wireElement && !this.panState.isPan;
  }

  private getNodesSimulationStateMemoized = memoize(getNodesSimulationState);

  private getSimulation() {
    if (!this.options.simulate) {
      return undefined;
    }

    return this.getNodesSimulationStateMemoized(
      this.elements,
      this.connections,
      this.inputSignals,
    );
  }
}

export function useGameState<T>(
  gameModel: GameModel,
  selector: (gameState: GameModelState) => T,
): T {
  const forceUpdate = useForceUpdate();

  const already = gameModel.stateListeners.find(
    (listener) => listener.forceUpdate === forceUpdate,
  );

  const selectorHandler = useHandler(selector);

  const gameState = gameModel.getState();

  if (already) {
    already.isActual = true;
    let selectedValue;

    if (already.actualSelectedValue) {
      selectedValue = already.actualSelectedValue.value as T;
    } else {
      selectedValue = selectorHandler(gameState);
    }

    already.lastSelectedValue = selectedValue;
    already.isActual = true;

    return selectedValue;
  }

  const selectedValue = selectorHandler(gameState);

  gameModel.stateListeners.push({
    forceUpdate,
    selector: selectorHandler,
    actualSelectedValue: undefined,
    lastSelectedValue: selectedValue,
    isActual: true,
  });

  return selectedValue;
}
