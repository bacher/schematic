import { Fragment, useEffect, useRef, MouseEvent, useState } from 'react';

import { useRefState } from '../../hooks/useRefState';
import styles from './App.module.scss';

const ICON_SIZE = 48;
const FOCUS_SIZE = ICON_SIZE + 4;
const PIN_DOT_RADIUS = 5;

type Coords = {
  x: number;
  y: number;
};

type Element = {
  type: 'pnp' | 'npn' | 'power' | 'ground';
  pos: Coords;
};

type Cursor =
  | 'move'
  | 'pointer'
  | 'drag'
  | 'grab'
  | 'grabbing'
  | 'cross'
  | undefined;

type Connection = {
  el1: { el: Element; pinIndex: number };
  el2: { el: Element; pinIndex: number };
};

type GameState = {
  elements: Element[];
  connections: Connection[];
};

type Pin = {
  pos: Coords;
};

type ElementDescription = {
  pins: Pin[];
};

const elements: Record<Element['type'], ElementDescription> = {
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
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<Cursor>();

  const size = useRefState({ width: 0, height: 0 });
  const pos = useRefState({ x: 0, y: 0 });
  const assets = useRefState<Record<string, any>>({});
  const mousePos = useRefState({ x: 0, y: 0 });
  const hoverElement = useRefState<{
    target:
      | {
          el: Element;
          activePin: { index: number } | undefined;
        }
      | undefined;
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

  function draw() {
    const ctx = canvasRef.current!.getContext('2d');

    if (!ctx) {
      throw new Error();
    }

    ctx.clearRect(0, 0, size.width, size.height);

    ctx.save();
    ctx.translate(size.width / 2 + pos.x + 0.5, size.height / 2 + pos.y + 0.5);

    for (const { el1, el2 } of state.connections) {
      ctx.beginPath();
      const pin1 = elements[el1.el.type].pins[el1.pinIndex];
      const pin2 = elements[el2.el.type].pins[el2.pinIndex];
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
    }

    for (const element of state.elements) {
      const { type, pos } = element;

      if (element === hoverElement.target?.el) {
        ctx.strokeStyle = '#ddf';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          pos.x - FOCUS_SIZE / 2,
          pos.y - FOCUS_SIZE / 2,
          FOCUS_SIZE,
          FOCUS_SIZE,
        );
      }

      const img = assets[type];

      const x0 = pos.x - ICON_SIZE / 2;
      const y0 = pos.y - ICON_SIZE / 2;

      if (img) {
        ctx.drawImage(img, x0, y0, ICON_SIZE, ICON_SIZE);
      }

      const { pins } = elements[type];

      let i = 0;

      const activeTarget = hoverElement.target;

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
          x0 + pin.pos.x * ICON_SIZE,
          y0 + pin.pos.y * ICON_SIZE,
          isActive ? PIN_DOT_RADIUS + 1 : PIN_DOT_RADIUS,
          0,
          Math.PI * 2,
        );
        ctx.closePath();
        ctx.lineWidth = 2;

        if (isActive || isWire) {
          ctx.fillStyle = isWire ? '#d66' : '#66d';
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#448';
          ctx.stroke();
        }
        i++;
      }
    }

    if (wireElement.source) {
      const { el, pinIndex } = wireElement.source;

      const { pos } = elements[el.type].pins[pinIndex];

      const x0 = pos.x * ICON_SIZE + el.pos.x - ICON_SIZE / 2;
      const y0 = pos.y * ICON_SIZE + el.pos.y - ICON_SIZE / 2;

      const { x, y } = convertScreenCoordsToAppCoords(mousePos);

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#888';
      ctx.stroke();
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
  }

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
      const { pins } = elements[element.type];

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
    const app = canvasWrapperRef.current!;
    const canvas = canvasRef.current!;

    size.width = app.clientWidth;
    size.height = app.clientHeight;

    canvas.width = size.width;
    canvas.height = size.height;

    draw();
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

  function addElement(type: Element['type']) {
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
    state.elements = [];
    pos.x = 0;
    pos.y = 0;
    hoverElement.target = undefined;
    draw();
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

  function onMouseUp(e?: MouseEvent) {
    if (e) {
      console.log('onMouseUp');

      e.preventDefault();

      if (e.button !== 0) {
        return;
      }
    }

    let needRepaint = false;
    let needUpdate = false;

    mouseState.isMouseDown = false;

    if (movingElement.target) {
      movingElement.target = undefined;
      needRepaint = true;
    }

    if (mouseState.isDrag) {
      mouseState.isDrag = false;
      needRepaint = true;
      needUpdate = true;
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
      const hoverTarget = hoverElement.target;

      if (hoverTarget) {
        if (hoverTarget.activePin) {
          wireElement.source = {
            el: hoverTarget.el,
            pinIndex: hoverTarget.activePin.index,
          };
          needRepaint = true;
        } else {
          focusElement.el = hoverTarget.el;
          needRepaint = true;
        }
      }
    }

    if (needRepaint) {
      draw();
    }
  }

  return (
    <main className={styles.app}>
      <div ref={canvasWrapperRef} className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={cursor ? { cursor } : undefined}
          onClick={(e) => {
            console.log('onClick');
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.preventDefault();

            if (e.button !== 0) {
              return;
            }

            console.log('onMouseDown');

            if (mouseState.isMouseDown) {
              onMouseUp();
            }

            mouseState.isMouseDown = true;
          }}
          onMouseMove={(e) => {
            console.log('onMouseMove');

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
                hoverTarget &&
                hoverTarget.activePin &&
                !wireElement.source
              ) {
                wireElement.source = {
                  el: hoverTarget.el,
                  pinIndex: hoverTarget.activePin.index,
                };
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
            console.log('onMouseLeave');
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
            addElement('power');
          }}
        >
          DD
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement('ground');
          }}
        >
          GND
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement('pnp');
          }}
        >
          pnp
        </button>
        <button
          className={styles.button}
          onClick={() => {
            addElement('npn');
          }}
        >
          npn
        </button>
        <button
          className={styles.button}
          onClick={() => {
            clearState();
          }}
        >
          Clear
        </button>
      </div>
      <div className={styles.info}>
        <div className={styles.table}>
          <div className={styles.tableCell}>A</div>
          <div className={styles.tableCell}>B</div>
          <div className={styles.tableCell}>C</div>
          <div className={styles.tableCell}>D</div>
          <div className={styles.tableCell}>Y</div>
          {Array.from({ length: 16 }).map((el, i) => (
            <Fragment key={i}>
              <div className={styles.tableCell}>{Math.floor(i / 8) % 2}</div>
              <div className={styles.tableCell}>{Math.floor(i / 4) % 2}</div>
              <div className={styles.tableCell}>{Math.floor(i / 2) % 2}</div>
              <div className={styles.tableCell}>{i % 2}</div>
              <div className={styles.tableCell}>Z</div>
            </Fragment>
          ))}
        </div>
      </div>
    </main>
  );
}
