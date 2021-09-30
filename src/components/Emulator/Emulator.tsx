import { CSSProperties, MouseEvent, useEffect, useRef, useState } from 'react';

import { useRefState } from 'hooks/useRefState';
import { useForceUpdate } from 'hooks/useForceUpdate';
import { useHandler } from 'hooks/useHandler';
import { useOnChange } from 'hooks/useOnChange';
import { useWindowEvent } from 'hooks/useWindowEvent';
import {
  Coords,
  Element,
  ElementId,
  ElementType,
  GameId,
  GameState,
  Options,
  Point,
} from 'common/types';
import { elementsDescriptions } from 'common/data';
import { getLiteralForSignal } from 'common/common';
import { getCanvasContext } from 'utils/canvas';
import { TruthTable } from 'components/TruthTable';
import { SchemaErrors } from 'components/SchemaErrors';
import { InputSignalsControl } from 'components/InputSignalsControl';

import {
  _App,
  _Button,
  _Canvas,
  _CanvasWrapper,
  _Divider,
  _Info,
  _No,
  _Panel,
  _SimulateButton,
  _Space,
  _Yes,
} from './elements';

const ICON_SIZE = 48;
const FOCUS_SIZE = ICON_SIZE + 4;
const PIN_DOT_RADIUS = 5;

type Cursor =
  | 'move'
  | 'pointer'
  | 'drag'
  | 'grab'
  | 'grabbing'
  | 'cross'
  | undefined;

function subtract(p1: Point, p2: Point): Point {
  return {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
  };
}

function rotate(point: Point, a: number): Point {
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);

  return {
    x: point.x * cosA - point.y * sinA,
    y: point.x * sinA + point.y * cosA,
  };
}

function getNextId(state: GameState): ElementId {
  const lastElement = state.elements[state.elements.length - 1];

  if (!lastElement) {
    return `el1`;
  }

  const match = lastElement.id.match(/^el(\d+)$/);

  if (!match) {
    throw new Error();
  }

  return `el${parseInt(match[1], 10) + 1}`;
}

function yesNo(value: unknown) {
  if (value) {
    return <_Yes>yes</_Yes>;
  }
  return <_No>no</_No>;
}

enum LoadingStatus {
  NONE,
  LOADING,
  DONE,
}

type AssetSet = {
  images: Record<string, HTMLImageElement>;
  status: LoadingStatus;
};

enum NodeType {
  ELEMENT,
  CONNECTION,
}

type Props = {
  gameId: GameId;
};

export function Emulator({ gameId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const forceUpdate = useForceUpdate();
  const [cursor, setCursor] = useState<Cursor>();
  const [options, setOptions] = useState<Options>({
    isInputVector: false,
    isOutputVector: false,
    simulate: false,
  });
  const densityFactor = useRefState({ factor: window.devicePixelRatio ?? 1 });

  const size = useRefState({ width: 0, height: 0 });
  const pos = useRefState({ x: 0, y: 0 });
  const assets = useRefState<{
    x1: AssetSet;
    x2: AssetSet;
  }>({
    x1: { images: {}, status: LoadingStatus.NONE },
    x2: { images: {}, status: LoadingStatus.NONE },
  });
  const mousePos = useRefState({ x: 0, y: 0 });
  const hoverElement = useRefState<{
    target:
      | {
          type: NodeType.ELEMENT;
          elId: ElementId;
          activePin: { index: number } | undefined;
        }
      | {
          type: NodeType.CONNECTION;
          connectionIndex: number;
        }
      | undefined;
  }>({
    target: undefined,
  });
  const focusElement = useRefState<{
    target:
      | {
          type: NodeType.ELEMENT;
          elId: ElementId;
        }
      | {
          type: NodeType.CONNECTION;
          connectionIndex: number;
        }
      | undefined;
  }>({ target: undefined });
  const movingElement = useRefState<{
    target: { elId: ElementId } | undefined;
  }>({
    target: undefined,
  });
  const wireElement = useRefState<{
    source: { elId: ElementId; pinIndex: number } | undefined;
  }>({
    source: undefined,
  });
  const state = useRefState<GameState>({
    elements: [],
    connections: [],
  });
  const inputSignalsState = useRefState<{ signals: boolean[] }>({
    signals: [],
  });
  const mouseState = useRefState({ isMouseDown: false });
  const panState = useRefState({ isPan: false });

  function convertScreenCoordsToAppCoords({ x, y }: Coords): Coords {
    return {
      x: x - size.width / 2 - pos.x,
      y: y - size.height / 2 - pos.y,
    };
  }

  let draw: () => void;

  function clearState() {
    pos.x = 0;
    pos.y = 0;
    state.elements = [];
    state.connections = [];
    hoverElement.target = undefined;
    focusElement.target = undefined;
    movingElement.target = undefined;
    wireElement.source = undefined;
    panState.isPan = false;
    mouseState.isMouseDown = false;
  }

  const loadGameState = useHandler(() => {
    const json = localStorage.getItem(`sch_game_${gameId}`);

    if (!json) {
      return;
    }

    const {
      pos: savedPos,
      elements,
      inputSignals,
      connections,
      options: savedOptions,
    } = JSON.parse(json);

    clearState();

    pos.x = savedPos.x;
    pos.y = savedPos.y;
    state.elements = elements;
    if (inputSignals) {
      inputSignalsState.signals = inputSignals;
    } else {
      // TODO: Remove before release
      inputSignalsState.signals = elements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(({ type }: any) => type === ElementType.INPUT)
        .map(() => false);
    }
    state.connections = connections;

    setOptions(savedOptions);

    window.setTimeout(draw, 0);
  });

  useEffect(() => {
    loadGameState();

    const intervalId = window.setInterval(forceUpdate, 500);

    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).state = state;
  }

  const getElById = useHandler((id: ElementId): Element => {
    const el = state.elements.find((el) => el.id === id);

    if (!el) {
      throw new Error('Element not found');
    }

    return el;
  });

  const deleteElementInFocus = useHandler(() => {
    const focusTarget = focusElement.target;

    if (!focusTarget) {
      return;
    }

    let needUpdate = false;

    switch (focusTarget.type) {
      case NodeType.ELEMENT: {
        state.connections = state.connections.filter(
          ([p1, p2]) =>
            p1.elId !== focusTarget.elId && p2.elId !== focusTarget.elId,
        );

        const element = state.elements.find(
          ({ id }) => id === focusTarget.elId,
        );

        if (!element) {
          throw new Error();
        }

        if (element.type === ElementType.INPUT) {
          const inputIndex = state.elements
            .filter(({ type }) => type === ElementType.INPUT)
            .indexOf(element);

          inputSignalsState.signals.splice(inputIndex, 1);
          needUpdate = true;
        }

        state.elements = state.elements.filter((el) => el !== element);
        break;
      }
      case NodeType.CONNECTION:
        state.connections.splice(focusTarget.connectionIndex, 1);
        break;
    }

    focusElement.target = undefined;
    draw();

    if (needUpdate) {
      forceUpdate();
    }
  });

  draw = useHandler(() => {
    if (size.width === 0) {
      return;
    }

    const ctx = getCanvasContext(canvasRef.current);

    actualizeDensityFactor();
    const { factor } = densityFactor;

    const hoverTarget = hoverElement.target;

    ctx.save();
    ctx.clearRect(0, 0, size.width * factor, size.height * factor);

    if (factor !== 1) {
      ctx.scale(factor, factor);
    }

    ctx.translate(
      Math.floor(size.width / 2) + pos.x,
      Math.floor(size.height / 2) + pos.y,
    );

    ctx.save();

    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.moveTo(95, -5);
    ctx.lineTo(100, 0);
    ctx.moveTo(95, 5);
    ctx.lineTo(100, 0);
    ctx.strokeStyle = '#0f0';
    ctx.stroke();
    ctx.fillText('X', 90, 15);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 100);
    ctx.moveTo(-5, 95);
    ctx.lineTo(0, 100);
    ctx.moveTo(5, 95);
    ctx.lineTo(0, 100);
    ctx.strokeStyle = '#00f';
    ctx.stroke();
    ctx.fillText('Y', 12, 90);

    ctx.restore();

    for (const element of state.elements) {
      const { pos } = element;

      const isHover =
        hoverTarget &&
        hoverTarget.type === NodeType.ELEMENT &&
        element.id === hoverTarget.elId;

      const isFocus =
        focusElement.target &&
        focusElement.target.type === NodeType.ELEMENT &&
        focusElement.target.elId === element.id;

      if (isHover || isFocus) {
        ctx.save();

        if (isHover) {
          ctx.strokeStyle = isFocus ? '#7f7fff' : '#e5e5e5';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = '#bebeff';
          ctx.lineWidth = 2;
        }

        ctx.strokeRect(
          pos.x - FOCUS_SIZE / 2,
          pos.y - FOCUS_SIZE / 2,
          FOCUS_SIZE,
          FOCUS_SIZE,
        );
        ctx.restore();
      }
    }

    let index = 0;
    for (const [p1, p2] of state.connections) {
      const el1 = getElById(p1.elId);
      const el2 = getElById(p2.elId);

      const pin1 = elementsDescriptions[el1.type].pins[p1.pinIndex];
      const pin2 = elementsDescriptions[el2.type].pins[p2.pinIndex];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(
        el1.pos.x - ICON_SIZE / 2 + pin1.pos.x * ICON_SIZE,
        el1.pos.y - ICON_SIZE / 2 + pin1.pos.y * ICON_SIZE,
      );
      ctx.lineTo(
        el2.pos.x - ICON_SIZE / 2 + pin2.pos.x * ICON_SIZE,
        el2.pos.y - ICON_SIZE / 2 + pin2.pos.y * ICON_SIZE,
      );

      const isHovered =
        hoverTarget &&
        hoverTarget.type === NodeType.CONNECTION &&
        hoverTarget.connectionIndex === index;

      const isInFocus =
        focusElement.target &&
        focusElement.target.type === NodeType.CONNECTION &&
        focusElement.target.connectionIndex === index;

      ctx.lineWidth = isHovered || isInFocus ? 3 : 2;

      if (isHovered && isInFocus) {
        ctx.strokeStyle = '#8080ff';
      } else if (isInFocus) {
        ctx.strokeStyle = '#bfbfff';
      } else {
        ctx.strokeStyle = '#333';
      }

      ctx.stroke();
      ctx.restore();

      index += 1;
    }

    if (wireElement.source) {
      const { elId, pinIndex } = wireElement.source;
      const el = getElById(elId);

      const { pos } = elementsDescriptions[el.type].pins[pinIndex];

      const x0 = pos.x * ICON_SIZE + el.pos.x - ICON_SIZE / 2;
      const y0 = pos.y * ICON_SIZE + el.pos.y - ICON_SIZE / 2;

      const { x, y } = convertScreenCoordsToAppCoords(mousePos);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#888';
      ctx.stroke();
      ctx.restore();
    }

    for (const element of state.elements) {
      const { type, pos } = element;

      if (type === ElementType.INPUT || type === ElementType.OUTPUT) {
        const char = getLiteralForSignal(
          state.elements.filter((el) => el.type === type),
          element,
          type === ElementType.INPUT
            ? options.isInputVector
            : options.isOutputVector,
        );

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '24px sans-serif';
        if (type === ElementType.INPUT) {
          ctx.fillText(char, pos.x, pos.y - 10);
        } else {
          ctx.fillText(char, pos.x + 6, pos.y);
        }
        ctx.restore();
      } else {
        const [main, fallback]: ['x1', 'x2'] | ['x2', 'x1'] =
          factor > 1.5 ? ['x2', 'x1'] : ['x1', 'x2'];

        const img = assets[main].images[type] ?? assets[fallback].images[type];

        if (img) {
          const x0 = pos.x - ICON_SIZE / 2;
          const y0 = pos.y - ICON_SIZE / 2;

          ctx.drawImage(img, x0, y0, ICON_SIZE, ICON_SIZE);
        }
      }

      const { pins } = elementsDescriptions[type];
      let i = 0;

      for (const pin of pins) {
        const isHovered =
          hoverTarget &&
          hoverTarget.type === NodeType.ELEMENT &&
          hoverTarget.elId === element.id &&
          hoverTarget.activePin &&
          hoverTarget.activePin.index === i;

        const isWire =
          wireElement.source &&
          wireElement.source.elId === element.id &&
          wireElement.source.pinIndex === i;

        ctx.beginPath();
        ctx.arc(
          pos.x + (pin.pos.x - 0.5) * ICON_SIZE,
          pos.y + (pin.pos.y - 0.5) * ICON_SIZE,
          isHovered ? PIN_DOT_RADIUS + 1 : PIN_DOT_RADIUS,
          0,
          Math.PI * 2,
        );
        ctx.closePath();

        if (isHovered || isWire) {
          ctx.save();
          ctx.fillStyle = isWire ? '#d66' : '#66d';
          ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#448';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
        i += 1;
      }
    }

    ctx.restore();

    let currentCursor: Cursor;

    if (wireElement.source) {
      currentCursor = 'pointer';
    } else if (hoverTarget)
      if (hoverTarget.type === NodeType.CONNECTION) {
        currentCursor = 'move';
      } else if (hoverTarget.type === NodeType.ELEMENT) {
        if (hoverTarget.activePin) {
          currentCursor = 'pointer';
        } else {
          currentCursor = 'move';
        }
      } else if (panState.isPan) {
        currentCursor = 'grabbing';
      }

    if (currentCursor !== cursor) {
      setCursor(currentCursor);
    }
  });

  function getConnectionPinPosition({
    elId,
    pinIndex,
  }: {
    elId: ElementId;
    pinIndex: number;
  }): Coords {
    const el = getElById(elId);

    const pin = elementsDescriptions[el.type].pins[pinIndex];

    return {
      x: el.pos.x + (pin.pos.x - 0.5) * ICON_SIZE,
      y: el.pos.y + (pin.pos.y - 0.5) * ICON_SIZE,
    };
  }

  function checkHover(): boolean {
    const { x, y } = convertScreenCoordsToAppCoords(mousePos);
    const hoverTarget = hoverElement.target;

    let flag = false;
    let hoverFound = false;
    let hoverConnectionFound = false;

    for (const element of state.elements) {
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
            !hoverTarget ||
            hoverTarget.type !== NodeType.ELEMENT ||
            hoverTarget.elId !== element.id ||
            hoverTarget.activePin?.index !== pinIndex
          ) {
            hoverElement.target = {
              type: NodeType.ELEMENT,
              elId: element.id,
              activePin: {
                index: pinIndex,
              },
            };
            flag = true;
          }
          hoverFound = true;
          break;
        }
      }
    }

    if (!hoverFound) {
      for (const element of state.elements) {
        const x0 = element.pos.x - ICON_SIZE / 2;
        const y0 = element.pos.y - ICON_SIZE / 2;

        if (x > x0 && x < x0 + ICON_SIZE && y > y0 && y < y0 + ICON_SIZE) {
          // before set check if already hovered
          if (
            !hoverTarget ||
            hoverTarget.type !== NodeType.ELEMENT ||
            hoverTarget.elId !== element.id ||
            hoverTarget.activePin
          ) {
            hoverElement.target = {
              type: NodeType.ELEMENT,
              elId: element.id,
              activePin: undefined,
            };
            flag = true;
          }
          hoverFound = true;
          break;
        }
      }
    }

    if (!hoverFound) {
      for (const connection of state.connections) {
        const [p1, p2] = connection;

        const point1 = getConnectionPinPosition(p1);
        const point2 = getConnectionPinPosition(p2);

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
          const connectionIndex = state.connections.indexOf(connection);

          // before set check if already hovered
          if (
            !hoverTarget ||
            hoverTarget.type !== NodeType.CONNECTION ||
            hoverTarget.connectionIndex !== connectionIndex
          ) {
            hoverElement.target = {
              type: NodeType.CONNECTION,
              connectionIndex,
            };
            flag = true;
          }
          hoverConnectionFound = true;
          break;
        }
      }
    }

    if (!hoverFound && !hoverConnectionFound) {
      if (hoverElement.target) {
        hoverElement.target = undefined;
        flag = true;
      }
    }

    return flag;
  }

  function actualizeDensityFactor() {
    const factor = window.devicePixelRatio ?? 1;

    if (densityFactor.factor !== factor) {
      densityFactor.factor = factor;
      forceUpdate();
    }
  }

  function updateSize() {
    const app = canvasWrapperRef.current;
    const canvas = canvasRef.current;

    if (!app || !canvas) {
      throw new Error();
    }

    if (size.width !== app.clientWidth || size.height !== app.clientHeight) {
      size.width = app.clientWidth;
      size.height = app.clientHeight;

      canvas.width = size.width * densityFactor.factor;
      canvas.height = size.height * densityFactor.factor;

      draw();
    }
  }

  function checkOverlap(point: Coords): boolean {
    for (const { pos } of state.elements) {
      if (
        (pos.x - point.x) ** 2 + (pos.y - point.y) ** 2 <
        (ICON_SIZE / 2) ** 2
      ) {
        return true;
      }
    }

    return false;
  }

  function addElement(type: ElementType) {
    const pos = convertScreenCoordsToAppCoords({
      x: size.width / 2,
      y: size.height / 2,
    });

    while (checkOverlap(pos)) {
      pos.x += ICON_SIZE + 20;
    }

    state.elements.push({
      type,
      id: getNextId(state),
      pos,
    });

    inputSignalsState.signals = [...inputSignalsState.signals, false];
    draw();
  }

  function loadAssets() {
    const is2x = densityFactor.factor > 1.5;

    const assetsSet = assets[is2x ? 'x1' : 'x2'];

    if (assetsSet.status !== LoadingStatus.NONE) {
      return;
    }

    const loadImages = [
      ElementType.PNP,
      ElementType.NPN,
      ElementType.POWER,
      ElementType.GROUND,
    ];

    let remainLoad = loadImages.length;

    function onLoad() {
      remainLoad -= 1;

      if (remainLoad === 0) {
        assetsSet.status = LoadingStatus.DONE;
        draw();
      }
    }

    assetsSet.status = LoadingStatus.LOADING;

    for (const imgName of loadImages) {
      const image = new Image();
      image.src = `assets/${imgName}${is2x ? '@2x' : ''}.png`;
      image.addEventListener('load', () => {
        assetsSet.images[imgName] = image;
        onLoad();
      });
      image.addEventListener('error', onLoad);
    }
  }

  useEffect(() => {
    updateSize();
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOnChange(loadAssets, [densityFactor.factor]);

  useWindowEvent('resize', () => {
    setTimeout(() => {
      actualizeDensityFactor();
      updateSize();
    }, 0);
  });

  useOnChange(draw, [options]);

  function resetCursorState() {
    let needRepaint = false;

    if (mouseState.isMouseDown) {
      mouseState.isMouseDown = false;
    }

    if (movingElement.target) {
      movingElement.target = undefined;
      needRepaint = true;
    }

    if (panState.isPan) {
      panState.isPan = false;
      needRepaint = true;
    }

    if (wireElement.source) {
      wireElement.source = undefined;
      needRepaint = true;
    }

    return needRepaint;
  }

  function startWiring({
    elId,
    pinIndex,
  }: {
    elId: ElementId;
    pinIndex: number;
  }) {
    focusElement.target = { type: NodeType.ELEMENT, elId };
    wireElement.source = {
      elId,
      pinIndex,
    };
  }

  const onMouseUp = useHandler((e?: MouseEvent) => {
    if (e) {
      e.preventDefault();

      if (e.button !== 0) {
        return;
      }
    }

    let needRepaint = false;

    mouseState.isMouseDown = false;

    // TODO: Why focus resetting here?
    if (
      focusElement.target &&
      focusElement.target.type === NodeType.ELEMENT &&
      !wireElement.source &&
      !movingElement.target
    ) {
      focusElement.target = undefined;
      needRepaint = true;
    }

    if (movingElement.target) {
      movingElement.target = undefined;
      needRepaint = true;
    }

    if (panState.isPan) {
      panState.isPan = false;
      needRepaint = true;
    }

    if (wireElement.source) {
      const hoverTarget = hoverElement.target;

      if (
        hoverTarget &&
        hoverTarget.type === NodeType.ELEMENT &&
        hoverTarget.activePin &&
        wireElement.source.elId !== hoverTarget.elId
      ) {
        state.connections.push([
          {
            elId: hoverTarget.elId,
            pinIndex: hoverTarget.activePin.index,
          },
          {
            elId: wireElement.source.elId,
            pinIndex: wireElement.source.pinIndex,
          },
        ]);
      }

      wireElement.source = undefined;
      needRepaint = true;
    } else if (!wireElement.source) {
      const hoverTarget = hoverElement.target;

      if (
        hoverTarget &&
        hoverTarget.type === NodeType.ELEMENT &&
        hoverTarget.activePin
      ) {
        startWiring({
          elId: hoverTarget.elId,
          pinIndex: hoverTarget.activePin.index,
        });
        needRepaint = true;
      }

      if (hoverTarget) {
        if (hoverTarget.type === NodeType.ELEMENT && !hoverTarget.activePin) {
          if (
            !focusElement.target ||
            focusElement.target.type !== NodeType.ELEMENT ||
            focusElement.target.elId !== hoverTarget.elId
          ) {
            focusElement.target = {
              type: NodeType.ELEMENT,
              elId: hoverTarget.elId,
            };
            needRepaint = true;
          }
        } else if (hoverTarget.type === NodeType.CONNECTION) {
          if (
            !focusElement.target ||
            focusElement.target.type !== NodeType.CONNECTION ||
            focusElement.target.connectionIndex !== hoverTarget.connectionIndex
          ) {
            focusElement.target = {
              type: NodeType.CONNECTION,
              connectionIndex: hoverTarget.connectionIndex,
            };
            needRepaint = true;
          }
        }
      }
    }

    if (needRepaint) {
      draw();
    }
  });

  return (
    <_App>
      <_CanvasWrapper ref={canvasWrapperRef}>
        <_Canvas
          ref={canvasRef}
          enableScaling={densityFactor.factor !== 1}
          width={0}
          height={0}
          style={
            {
              '--factor': 1 / densityFactor.factor,
              cursor,
            } as CSSProperties
          }
          onClick={(e) => {
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.preventDefault();

            if (e.button !== 0) {
              return;
            }

            if (mouseState.isMouseDown) {
              onMouseUp();
            }

            mouseState.isMouseDown = true;
          }}
          onMouseMove={(e) => {
            mousePos.x = e.clientX;
            mousePos.y = e.clientY;

            let needRepaint = false;

            if (checkHover()) {
              needRepaint = true;
            }

            const isMoving = Boolean(movingElement.target);
            const hoverTarget = hoverElement.target;

            if (mouseState.isMouseDown) {
              if (
                !isMoving &&
                !wireElement.source &&
                hoverTarget &&
                hoverTarget.type === NodeType.ELEMENT &&
                hoverTarget.activePin
              ) {
                startWiring({
                  elId: hoverTarget.elId,
                  pinIndex: hoverTarget.activePin.index,
                });
                needRepaint = true;
              }

              if (!isMoving && wireElement.source) {
                needRepaint = true;
              }

              if (
                !isMoving &&
                !wireElement.source &&
                hoverTarget &&
                hoverTarget.type === NodeType.ELEMENT
              ) {
                movingElement.target = {
                  elId: hoverTarget.elId,
                };
                focusElement.target = {
                  type: NodeType.ELEMENT,
                  elId: hoverTarget.elId,
                };
                needRepaint = true;
              }

              if (
                !wireElement.source &&
                !movingElement.target &&
                !panState.isPan
              ) {
                panState.isPan = true;
                needRepaint = true;
              }

              if (movingElement.target) {
                const el = getElById(movingElement.target.elId);
                el.pos.x += e.movementX;
                el.pos.y += e.movementY;
              } else if (!wireElement.source) {
                pos.x += e.movementX;
                pos.y += e.movementY;
              }

              needRepaint = true;
            } else {
              if (panState.isPan) {
                panState.isPan = false;
                needRepaint = true;
              }
            }

            if (wireElement.source) {
              needRepaint = true;
            }

            if (needRepaint) {
              draw();
            }
          }}
          onMouseUp={onMouseUp}
          onMouseLeave={() => {
            if (resetCursorState()) {
              draw();
            }
          }}
          onContextMenu={(e) => {
            if (hoverElement.target || wireElement.source || panState.isPan) {
              e.preventDefault();
            }
          }}
        />
      </_CanvasWrapper>
      <_Panel>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.POWER);
          }}
        >
          DD
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.GROUND);
          }}
        >
          GND
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.NPN);
          }}
        >
          npn
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.PNP);
          }}
        >
          pnp
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.INPUT);
          }}
        >
          input
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.OUTPUT);
          }}
        >
          output
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.DOT);
          }}
        >
          dot
        </_Button>
        <_Divider />
        <_Button
          type="button"
          disabled={!focusElement.target}
          onClick={(e) => {
            e.preventDefault();
            deleteElementInFocus();
          }}
        >
          delete
        </_Button>
        <_Divider />
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            loadGameState();
          }}
        >
          Load
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            localStorage.setItem(
              `sch_game_${gameId}`,
              JSON.stringify({
                pos,
                elements: state.elements,
                inputSignals: inputSignalsState.signals,
                connections: state.connections,
                options,
              }),
            );
            // eslint-disable-next-line no-console
            console.info('Saved');
          }}
        >
          Save
        </_Button>
        <_Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            clearState();
            draw();
          }}
        >
          Clear
        </_Button>
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#">
          <_Button type="button">Exit</_Button>
        </a>
      </_Panel>
      <InputSignalsControl
        inputs={inputSignalsState.signals}
        isVector={options.isInputVector}
        onChange={(signals) => {
          inputSignalsState.signals = signals;
          forceUpdate();
        }}
      />
      <_Info>
        <_SimulateButton
          type="button"
          active={options.simulate}
          onClick={(e) => {
            e.preventDefault();

            options.simulate = !options.simulate;
            forceUpdate();
          }}
        >
          {options.simulate ? 'Simulation: ON' : 'Simulation: OFF'}
        </_SimulateButton>
        <TruthTable
          elements={state.elements}
          options={options}
          onOptionsChange={(update) =>
            setOptions({
              ...options,
              ...update,
            })
          }
        />
        <SchemaErrors state={state} />
        <_Space />
        <div>
          <div>elements: {state.elements.length}</div>
          <div>connections: {state.connections.length}</div>
          <div>el moving: {yesNo(movingElement.target)}</div>
          <div>
            el in focus:{' '}
            {yesNo(
              focusElement.target &&
                focusElement.target.type === NodeType.ELEMENT,
            )}
          </div>
          <div>
            conn in focus:{' '}
            {yesNo(
              focusElement.target &&
                focusElement.target.type === NodeType.CONNECTION,
            )}
          </div>
          <div>
            el hover:{' '}
            {yesNo(
              hoverElement.target &&
                hoverElement.target.type === NodeType.ELEMENT,
            )}
          </div>
          <div>
            pin hover:{' '}
            {yesNo(
              hoverElement.target &&
                hoverElement.target.type === NodeType.ELEMENT &&
                hoverElement.target.activePin,
            )}
          </div>
          <div>
            conn hover:{' '}
            {yesNo(
              hoverElement.target &&
                hoverElement.target.type === NodeType.CONNECTION,
            )}
          </div>
          <div>wiring: {yesNo(wireElement.source)}</div>
          <div>drag: {yesNo(panState.isPan)}</div>
          <div>mouse down: {yesNo(mouseState.isMouseDown)}</div>
        </div>
      </_Info>
    </_App>
  );
}
