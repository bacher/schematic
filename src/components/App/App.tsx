import { MouseEvent, useEffect, useRef, useState } from 'react';

import { useRefState } from '../../hooks/useRefState';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import {
  Coords,
  Element,
  ElementType,
  GameState,
  Options,
} from '../../common/types';
import styles from './App.module.scss';
import { TruthTable } from '../TruthTable';
import { elementsDescriptions } from '../../common/data';
import { getLiteralForSignal } from '../../common/common';
import { useFunc } from '../../hooks/useFunc';
import { useOnChange } from '../../hooks/useOnChange';

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
  el: Element;
  activePin: { index: number } | undefined;
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const forceUpdate = useForceUpdate();
  const [cursor, setCursor] = useState<Cursor>();
  const [options, setOptions] = useState<Options>({
    isInputVector: false,
    isOutputVector: false,
  });

  useEffect(() => {
    const intervalId = window.setInterval(forceUpdate, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const size = useRefState({ width: 0, height: 0 });
  const pos = useRefState({ x: 0, y: 0 });
  const assets = useRefState<Record<string, any>>({});
  const mousePos = useRefState({ x: 0, y: 0 });
  const hoverElement = useRefState<{
    target: HoverTarget | undefined;
  }>({
    target: undefined,
  });
  const focusElement = useRefState<{ el: Element | undefined }>({
    el: undefined,
  });
  const movingElement = useRefState<{
    target: { el: Element } | undefined;
  }>({
    target: undefined,
  });
  const wireElement = useRefState<{
    source: { el: Element; pinIndex: number } | undefined;
  }>({
    source: undefined,
  });
  const state = useRefState<GameState>({
    elements: [],
    connections: [],
  });
  const mouseState = useRefState({ isMouseDown: false, isDrag: false });

  // @ts-ignore
  window.state = state;

  const draw = useFunc(() => {
    const ctx = canvasRef.current!.getContext('2d');

    if (!ctx) {
      throw new Error();
    }

    ctx.clearRect(0, 0, size.width, size.height);

    ctx.save();
    ctx.translate(size.width / 2 + pos.x + 0.5, size.height / 2 + pos.y + 0.5);

    for (const element of state.elements) {
      const { pos } = element;

      if (element === hoverElement.target?.el) {
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
      } else if (element === focusElement.el) {
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

    for (const { el1, el2 } of state.connections) {
      const pin1 = elementsDescriptions[el1.el.type].pins[el1.pinIndex];
      const pin2 = elementsDescriptions[el2.el.type].pins[el2.pinIndex];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(
        el1.el.pos.x - ICON_SIZE / 2 + pin1.pos.x * ICON_SIZE,
        el1.el.pos.y - ICON_SIZE / 2 + pin1.pos.y * ICON_SIZE,
      );
      ctx.lineTo(
        el2.el.pos.x - ICON_SIZE / 2 + pin2.pos.x * ICON_SIZE,
        el2.el.pos.y - ICON_SIZE / 2 + pin2.pos.y * ICON_SIZE,
      );
      ctx.strokeStyle = '#333';
      ctx.stroke();
      ctx.restore();
    }

    if (wireElement.source) {
      const { el, pinIndex } = wireElement.source;

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
        const img = assets[type];

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
          element === activeTarget.el &&
          activeTarget.activePin &&
          activeTarget.activePin.index === i;

        const isWire =
          wireElement.source &&
          wireElement.source.el === element &&
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
        i++;
      }
    }

    ctx.restore();

    let currentCursor: Cursor;

    if (wireElement.source) {
      currentCursor = 'pointer';
    } else if (hoverElement.target?.activePin) {
      currentCursor = 'pointer';
    } else if (hoverElement.target?.el) {
      currentCursor = 'move';
    } else if (mouseState.isDrag) {
      currentCursor = 'grabbing';
    }

    if (currentCursor !== cursor) {
      setCursor(currentCursor);
    }
  });

  function convertScreenCoordsToAppCoords({ x, y }: Coords): Coords {
    return {
      x: x - size.width / 2 - pos.x,
      y: y - size.height / 2 - pos.y,
    };
  }

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
            hoverTarget.el !== element ||
            hoverTarget.activePin?.index !== pinIndex
          ) {
            hoverElement.target = {
              el: element,
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
          activeTarget.el !== element ||
          activeTarget.activePin
        ) {
          hoverElement.target = {
            el: element,
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

  function updateSize() {
    setTimeout(() => {
      const app = canvasWrapperRef.current!;
      const canvas = canvasRef.current!;

      size.width = app.clientWidth;
      size.height = app.clientHeight;

      canvas.width = size.width;
      canvas.height = size.height;

      draw();
    }, 0);
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
      type: type,
      pos,
    });
    draw();
  }

  function clearState() {
    pos.x = 0;
    pos.y = 0;
    state.elements = [];
    state.connections = [];
    hoverElement.target = undefined;
    focusElement.el = undefined;
    movingElement.target = undefined;
    wireElement.source = undefined;
    mouseState.isDrag = false;
    mouseState.isMouseDown = false;
  }

  useEffect(() => {
    updateSize();

    window.addEventListener('resize', updateSize);

    const pnp = new Image();
    pnp.src = 'assets/pnp.png';
    const npn = new Image();
    npn.src = 'assets/npn.png';
    const ground = new Image();
    ground.src = 'assets/ground.png';
    const power = new Image();
    power.src = 'assets/power.png';

    assets['pnp'] = pnp;
    assets['npn'] = npn;
    assets['ground'] = ground;
    assets['power'] = power;
  }, []);

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

  function startWiring({ el, pinIndex }: { el: Element; pinIndex: number }) {
    focusElement.el = el;
    wireElement.source = {
      el: el,
      pinIndex,
    };
    state.connections = state.connections.filter(
      ({ el1, el2 }) => el1.el !== el && el2.el !== el,
    );
  }

  const onMouseUp = useFunc((e?: MouseEvent) => {
    if (e) {
      e.preventDefault();

      if (e.button !== 0) {
        return;
      }
    }

    let needRepaint = false;

    mouseState.isMouseDown = false;

    if (focusElement.el && !wireElement.source && !movingElement.target) {
      focusElement.el = undefined;
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
        wireElement.source.el !== activeTarget.el
      ) {
        state.connections.push({
          el1: {
            el: activeTarget.el,
            pinIndex: activeTarget.activePin.index,
          },
          el2: {
            el: wireElement.source.el,
            pinIndex: wireElement.source.pinIndex,
          },
        });
      }

      wireElement.source = undefined;
      needRepaint = true;
    } else {
      if (!wireElement.source) {
        const hoverTarget = hoverElement.target;

        if (hoverTarget && hoverTarget.activePin) {
          startWiring({
            el: hoverTarget.el,
            pinIndex: hoverTarget.activePin.index,
          });
          needRepaint = true;
        }

        if (hoverTarget && !hoverTarget.activePin) {
          if (focusElement.el !== hoverTarget.el) {
            focusElement.el = hoverTarget.el;
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
    <main className={styles.app}>
      <div ref={canvasWrapperRef} className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={cursor ? { cursor } : undefined}
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
                  el: hoverTarget.el,
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
                hoverTarget.el
              ) {
                movingElement.target = { el: hoverTarget.el };
                focusElement.el = hoverTarget.el;
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
                movingElement.target.el.pos.x += e.movementX;
                movingElement.target.el.pos.y += e.movementY;
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
          className={styles.button}
          onClick={() => {
            addElement(ElementType.POWER);
          }}
        >
          DD
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement(ElementType.GROUND);
          }}
        >
          GND
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement(ElementType.NPN);
          }}
        >
          npn
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement(ElementType.PNP);
          }}
        >
          pnp
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement(ElementType.INPUT);
          }}
        >
          input
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement(ElementType.OUTPUT);
          }}
        >
          output
        </button>
        <span className={styles.divider} />
        <button
          className={styles.button}
          onClick={() => {
            const json = localStorage.getItem('sch_save');

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
          }}
        >
          Load
        </button>
        <button
          className={styles.button}
          onClick={() => {
            localStorage.setItem(
              'sch_save',
              JSON.stringify({
                pos,
                elements: state.elements,
                connections: state.connections,
                options,
              }),
            );
            console.info('Saved');
          }}
        >
          Save
        </button>
        <button
          className={styles.button}
          onClick={() => {
            clearState();
            draw();
          }}
        >
          Clear
        </button>
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
        <div className={styles.debugPanel}>
          <div>elements: {state.elements.length}</div>
          <div>connections: {state.connections.length}</div>
          <div>el moving: {yesNo(movingElement.target)}</div>
          <div>el in focus: {yesNo(focusElement.el)}</div>
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

function yesNo(value: unknown) {
  if (value) {
    return <span className={styles.yes}>yes</span>;
  }

  return <span className={styles.no}>no</span>;
}
