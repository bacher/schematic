import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import styles from './App.module.scss';

type Coords = {
  x: number;
  y: number;
};

type Element = {
  type: 'pnp' | 'npn' | 'power' | 'ground';
  pos: Coords;
};

type GameState = {
  elements: Element[];
};

function useForceUpdate() {
  const incRef = useRef(0);
  const [, setInc] = useState(incRef.current);

  const callback = useCallback(() => {
    setInc(++incRef.current);
  }, []);

  return callback;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isDrag, setDrag] = useState(false);
  const forceUpdate = useForceUpdate();

  const sizeRef = useRef({ width: 0, height: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const assetsRef = useRef<Record<string, any>>({});
  const mousePosRef = useRef({ x: 0, y: 0 });
  const activeElementRef = useRef<{ el: Element | undefined }>({ el: undefined });
  const gameStateRef = useRef<GameState>({
    elements: [],
  });

  const size = sizeRef.current;
  const pos = posRef.current;
  const state = gameStateRef.current;
  const assets = assetsRef.current;
  const mousePos = mousePosRef.current;
  const activeElement = activeElementRef.current;

  function draw() {
    const ctx = canvasRef.current!.getContext('2d');

    if (!ctx) {
      throw new Error();
    }

    ctx.clearRect(0, 0, size.width, size.height);

    ctx.save();
    ctx.translate(size.width / 2 + pos.x + 0.5, size.height / 2 + pos.y + 0.5);

    // ctx.beginPath();
    // ctx.moveTo(-50, -50);
    // ctx.lineTo(50, 50);
    // ctx.closePath();
    // ctx.strokeStyle = '#000';
    // ctx.stroke();

    for (const element of state.elements) {
      const { type, pos } = element;

      if (element === activeElement.el) {
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 3;
        ctx.strokeRect(pos.x - 26, pos.y - 26, 52, 52);
      }

      const img = assets[type];

      if (img) {
        ctx.drawImage(img, pos.x - 24, pos.y - 24, 48, 48);
      }
    }

    ctx.restore();
  }

  function convertScreenCoordsToAppCoords({ x, y }: Coords): Coords {
    return {
      x: x - size.width / 2 - pos.x,
      y: y - size.height / 2 - pos.y,
    };
  }

  function checkHover() {
    const { x, y } = convertScreenCoordsToAppCoords(mousePos);

    for (const element of state.elements) {
      if (
        x > element.pos.x - 24 &&
        x < element.pos.x + 24 &&
        y > element.pos.y - 24 &&
        y < element.pos.y + 24
      ) {
        if (activeElement.el !== element) {
          activeElement.el = element;
          draw();
          forceUpdate();
        }
        return;
      }
    }

    if (activeElement.el) {
      activeElement.el = undefined;
      draw();
      forceUpdate();
    }
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
      if ((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2 < 24 ** 2) {
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
      pos.x += 50;
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
    activeElement.el = undefined;
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

  let cursor: 'move' | 'grabbing' | undefined;

  if (activeElement.el) {
    cursor = 'move';
  } else if (isDrag) {
    cursor = 'grabbing';
  }

  return (
    <main className={styles.app}>
      <div ref={canvasWrapperRef} className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={cursor ? { cursor } : undefined}
          onMouseDown={() => {
            setDrag(true);
          }}
          onMouseMove={(e) => {
            mousePos.x = e.clientX;
            mousePos.y = e.clientY;

            if (isDrag) {
              if (activeElement.el) {
                activeElement.el.pos.x += e.movementX;
                activeElement.el.pos.y += e.movementY;
              } else {
                pos.x += e.movementX;
                pos.y += e.movementY;
              }

              draw();
            } else {
              checkHover();
            }
          }}
          onMouseLeave={
            isDrag
              ? () => {
                  setDrag(false);
                }
              : undefined
          }
          onMouseUp={
            isDrag
              ? () => {
                  setDrag(false);
                }
              : undefined
          }
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
