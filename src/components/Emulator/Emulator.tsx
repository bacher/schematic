import { CSSProperties, MouseEvent, useEffect, useRef, useState } from 'react';
import cn from 'classnames';

import { useRefState } from 'hooks/useRefState';
import { useForceUpdate } from 'hooks/useForceUpdate';
import { useHandler } from 'hooks/useHandler';
import { useOnChange } from 'hooks/useOnChange';
import {
  Coords,
  Element,
  ElementId,
  ElementType,
  GameId,
  GameState,
  Options,
} from 'common/types';
import { elementsDescriptions } from 'common/data';
import { getLiteralForSignal } from 'common/common';
import { getCanvasContext } from 'utils/canvas';
import { TruthTable } from 'components/TruthTable';
import { SchemaErrors } from 'components/SchemaErrors';

import styles from './Emulator.module.scss';
import { useWindowEvent } from '../../hooks/useWindowEvent';

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

type HoverTarget = {
  elId: ElementId;
  activePin: { index: number } | undefined;
};

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
    return <span className={styles.yes}>yes</span>;
  }
  return <span className={styles.no}>no</span>;
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
    target: HoverTarget | undefined;
  }>({
    target: undefined,
  });
  const focusElement = useRefState<{ elId: ElementId | undefined }>({
    elId: undefined,
  });
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
  const mouseState = useRefState({ isMouseDown: false, isDrag: false });

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
    focusElement.elId = undefined;
    movingElement.target = undefined;
    wireElement.source = undefined;
    mouseState.isDrag = false;
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
      connections,
      options: savedOptions,
    } = JSON.parse(json);

    clearState();

    pos.x = savedPos.x;
    pos.y = savedPos.y;
    state.elements = elements;
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

  draw = useHandler(() => {
    const ctx = getCanvasContext(canvasRef.current);

    actualizeDensityFactor();
    const { factor } = densityFactor;

    ctx.save();
    ctx.clearRect(0, 0, size.width * factor, size.height * factor);

    if (factor === 1) {
      // used to disable antialiasing for horizontal and vertical lines
      ctx.translate(0.5, 0.5);
    } else {
      ctx.scale(factor, factor);
    }

    ctx.translate(size.width / 2 + pos.x, size.height / 2 + pos.y);

    for (const element of state.elements) {
      const { pos } = element;

      if (element.id === hoverElement.target?.elId) {
        ctx.save();
        ctx.strokeStyle = '#ddf';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          pos.x - FOCUS_SIZE / 2,
          pos.y - FOCUS_SIZE / 2,
          FOCUS_SIZE,
          FOCUS_SIZE,
        );
        ctx.restore();
      } else if (element.id === focusElement.elId) {
        ctx.save();
        ctx.strokeStyle = '#ededf3';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          pos.x - FOCUS_SIZE / 2,
          pos.y - FOCUS_SIZE / 2,
          FOCUS_SIZE,
          FOCUS_SIZE,
        );
        ctx.restore();
      }
    }

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
      ctx.strokeStyle = '#333';
      ctx.stroke();
      ctx.restore();
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
      const activeTarget = hoverElement.target;
      let i = 0;

      for (const pin of pins) {
        const isActive =
          activeTarget &&
          element.id === activeTarget.elId &&
          activeTarget.activePin &&
          activeTarget.activePin.index === i;

        const isWire =
          wireElement.source &&
          wireElement.source.elId === element.id &&
          wireElement.source.pinIndex === i;

        ctx.beginPath();
        ctx.arc(
          pos.x + (pin.pos.x - 0.5) * ICON_SIZE,
          pos.y + (pin.pos.y - 0.5) * ICON_SIZE,
          isActive ? PIN_DOT_RADIUS + 1 : PIN_DOT_RADIUS,
          0,
          Math.PI * 2,
        );
        ctx.closePath();

        if (isActive || isWire) {
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
    } else if (hoverElement.target?.activePin) {
      currentCursor = 'pointer';
    } else if (hoverElement.target) {
      currentCursor = 'move';
    } else if (mouseState.isDrag) {
      currentCursor = 'grabbing';
    }

    if (currentCursor !== cursor) {
      setCursor(currentCursor);
    }
  });

  function checkHover(): boolean {
    const { x, y } = convertScreenCoordsToAppCoords(mousePos);
    const activeTarget = hoverElement.target;

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
          const hoverTarget = hoverElement.target;

          if (
            !hoverTarget ||
            hoverTarget.elId !== element.id ||
            hoverTarget.activePin?.index !== pinIndex
          ) {
            hoverElement.target = {
              elId: element.id,
              activePin: {
                index: pinIndex,
              },
            };
            return true;
          }
          return false;
        }
      }
    }

    for (const element of state.elements) {
      const x0 = element.pos.x - ICON_SIZE / 2;
      const y0 = element.pos.y - ICON_SIZE / 2;

      if (x > x0 && x < x0 + ICON_SIZE && y > y0 && y < y0 + ICON_SIZE) {
        if (
          !activeTarget ||
          activeTarget.elId !== element.id ||
          activeTarget.activePin
        ) {
          hoverElement.target = {
            elId: element.id,
            activePin: undefined,
          };
          return true;
        }
        return false;
      }
    }

    if (hoverElement.target) {
      hoverElement.target = undefined;
      return true;
    }

    return false;
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

    if (mouseState.isDrag) {
      mouseState.isDrag = false;
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
    focusElement.elId = elId;
    wireElement.source = {
      elId,
      pinIndex,
    };
    // state.connections = state.connections.filter(
    //   ([p1, p2]) => p1.elId !== elId && p2.elId !== elId,
    // );
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

    if (focusElement.elId && !wireElement.source && !movingElement.target) {
      focusElement.elId = undefined;
      needRepaint = true;
    }

    if (movingElement.target) {
      movingElement.target = undefined;
      needRepaint = true;
    }

    if (mouseState.isDrag) {
      mouseState.isDrag = false;
      needRepaint = true;
    }

    if (wireElement.source) {
      const activeTarget = hoverElement.target;

      if (
        activeTarget &&
        activeTarget.activePin &&
        wireElement.source.elId !== activeTarget.elId
      ) {
        state.connections.push([
          {
            elId: activeTarget.elId,
            pinIndex: activeTarget.activePin.index,
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

      if (hoverTarget && hoverTarget.activePin) {
        startWiring({
          elId: hoverTarget.elId,
          pinIndex: hoverTarget.activePin.index,
        });
        needRepaint = true;
      }

      if (hoverTarget && !hoverTarget.activePin) {
        if (focusElement.elId !== hoverTarget.elId) {
          focusElement.elId = hoverTarget.elId;
          needRepaint = true;
        }
      }
    }

    if (needRepaint) {
      draw();
    }
  });

  return (
    <main className={styles.app}>
      <div ref={canvasWrapperRef} className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={cn(styles.canvas, {
            [styles.canvasScale]: densityFactor.factor !== 1,
          })}
          width={size.width * densityFactor.factor}
          height={size.height * densityFactor.factor}
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

              if (!isMoving && !wireElement.source && hoverTarget) {
                movingElement.target = {
                  elId: hoverTarget.elId,
                };
                focusElement.elId = hoverTarget.elId;
                needRepaint = true;
              }

              if (
                !wireElement.source &&
                !movingElement.target &&
                !mouseState.isDrag
              ) {
                mouseState.isDrag = true;
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
              if (mouseState.isDrag) {
                mouseState.isDrag = false;
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
            if (
              hoverElement.target ||
              wireElement.source ||
              mouseState.isDrag
            ) {
              e.preventDefault();
            }
          }}
        />
      </div>
      <div className={styles.panel}>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.POWER);
          }}
        >
          DD
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.GROUND);
          }}
        >
          GND
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.NPN);
          }}
        >
          npn
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.PNP);
          }}
        >
          pnp
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.INPUT);
          }}
        >
          input
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.OUTPUT);
          }}
        >
          output
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            addElement(ElementType.DOT);
          }}
        >
          dot
        </button>
        <span className={styles.divider} />
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            loadGameState();
          }}
        >
          Load
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            localStorage.setItem(
              `sch_game_${gameId}`,
              JSON.stringify({
                pos,
                elements: state.elements,
                connections: state.connections,
                options,
              }),
            );
            // eslint-disable-next-line no-console
            console.info('Saved');
          }}
        >
          Save
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={(e) => {
            e.preventDefault();
            clearState();
            draw();
          }}
        >
          Clear
        </button>
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#">
          <button type="button" className={styles.button}>
            Exit
          </button>
        </a>
      </div>
      <div className={styles.info}>
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
        <span className={styles.space} />
        <div className={styles.debugPanel}>
          <div>elements: {state.elements.length}</div>
          <div>connections: {state.connections.length}</div>
          <div>el moving: {yesNo(movingElement.target)}</div>
          <div>el in focus: {yesNo(focusElement.elId)}</div>
          <div>el hover: {yesNo(hoverElement.target)}</div>
          <div>pin hover: {yesNo(hoverElement.target?.activePin)}</div>
          <div>wiring: {yesNo(wireElement.source)}</div>
          <div>drag: {yesNo(mouseState.isDrag)}</div>
          <div>mouse down: {yesNo(mouseState.isMouseDown)}</div>
        </div>
      </div>
    </main>
  );
}
