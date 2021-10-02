import {
  CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounce } from 'lodash-es';

import { Coords, GameId } from 'common/types';
import { MAX_FPS } from 'common/data';
import { GameModel, useGameState } from 'models/GameModel';
import { useRefState } from 'hooks/useRefState';
import { useForceUpdate } from 'hooks/useForceUpdate';
import { useHandler } from 'hooks/useHandler';
import { useWindowEvent } from 'hooks/useWindowEvent';
import { useAssets } from 'hooks/useAssets';
import { getCanvasContext } from 'utils/canvas';
import { render } from 'utils/render';
import { useActivePageInterval } from 'hooks/useActivePageInterval';
import { TruthTable } from 'components/TruthTable';
import { SchemaErrors } from 'components/SchemaErrors';
import { InputSignalsControl } from 'components/InputSignalsControl';
import { Toolbar } from 'components/Toolbar';
import { OptionsPanel } from 'components/OptionsPanel';
import { DebugPanel } from 'components/DebugPanel';

import {
  _App,
  _Canvas,
  _CanvasWrapper,
  _FpsCounter,
  _Info,
  _Space,
} from './elements';

type Props = {
  gameId: GameId;
};

function getCurrentDensityFactor() {
  return window.devicePixelRatio ?? 1;
}

export function Simulator({ gameId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const forceUpdate = useForceUpdate();
  const [drawFps, setDrawFps] = useState(0);
  const densityFactor = useRefState({
    value: getCurrentDensityFactor(),
  });

  const gameModel = useMemo(() => {
    if (GameModel.checkSavedGame(gameId)) {
      return GameModel.loadGame(gameId);
    }
    return GameModel.createEmptyModel(gameId);
  }, [gameId]);

  const { cursor, showFps } = useGameState(
    gameModel,
    ({ cursor, options }) => ({
      cursor,
      showFps: options.debugShowFps,
    }),
  );

  const fps = useRefState({ value: 0 });

  useActivePageInterval(
    showFps
      ? () => {
          setDrawFps(fps.value);
          fps.value = 0;
        }
      : undefined,
    1000,
  );

  const size = useRefState({ width: 0, height: 0 });
  const assets = useAssets({
    densityFactor: densityFactor.value,
    draw: () => draw(),
  });

  function convertScreenCoordsToAppCoords({ x, y }: Coords): Coords {
    return {
      x: Math.floor(x - size.width / 2),
      y: Math.floor(y - size.height / 2),
    };
  }

  function actualizeDensityFactor(): boolean {
    const factor = getCurrentDensityFactor();

    if (factor !== densityFactor.value) {
      densityFactor.value = factor;
      forceUpdate();
      return true;
    }

    return false;
  }

  const drawHandler = useHandler(() => {
    if (size.width === 0) {
      return;
    }

    if (actualizeDensityFactor()) {
      return;
    }

    const ctx = getCanvasContext(canvasRef.current);

    fps.value += 1;

    render(ctx, {
      gameState: gameModel.getState(),
      size,
      densityFactor: densityFactor.value,
      assets,
    });
  });

  const draw = useMemo(() => {
    const interval = 1000 / MAX_FPS;

    return debounce(drawHandler, interval, {
      maxWait: interval,
      leading: true,
      trailing: true,
    });
  }, [drawHandler]);

  function updateSize() {
    const canvasWrapper = canvasWrapperRef.current;
    const canvas = canvasRef.current;

    if (!canvasWrapper || !canvas) {
      throw new Error();
    }

    size.width = canvasWrapper.clientWidth;
    size.height = canvasWrapper.clientHeight;

    canvas.width = size.width * densityFactor.value;
    canvas.height = size.height * densityFactor.value;

    draw();
  }

  useEffect(() => {
    gameModel.setDrawHandler(draw);

    return () => {
      gameModel.setDrawHandler(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(updateSize, [densityFactor.value]);

  useWindowEvent('resize', () => {
    setTimeout(() => {
      actualizeDensityFactor();
      updateSize();
    }, 0);
  });

  return (
    <_App>
      <_CanvasWrapper ref={canvasWrapperRef}>
        <_Canvas
          ref={canvasRef}
          enableScaling={densityFactor.value !== 1}
          width={0}
          height={0}
          style={
            {
              '--factor': 1 / densityFactor.value,
              cursor,
            } as CSSProperties
          }
          onClick={(e) => {
            if (e.button === 0) {
              e.preventDefault();
            }
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              e.preventDefault();
              gameModel.onMouseDown();
            }
          }}
          onMouseMove={(e) => {
            gameModel.onMouseMove({
              position: convertScreenCoordsToAppCoords({
                x: e.clientX,
                y: e.clientY,
              }),
              movement: { x: e.movementX, y: e.movementY },
            });
          }}
          onMouseUp={(e) => {
            if (e.button === 0) {
              e.preventDefault();
              gameModel.onMouseUp();
            }
          }}
          onMouseLeave={() => {
            gameModel.resetCursorState();
          }}
          onContextMenu={(e) => {
            if (!gameModel.allowOpenContextMenu()) {
              e.preventDefault();
            }
          }}
        />
        {showFps && <_FpsCounter>{drawFps}</_FpsCounter>}
      </_CanvasWrapper>
      <Toolbar gameModel={gameModel} />
      <InputSignalsControl gameModel={gameModel} />
      <_Info>
        <OptionsPanel gameModel={gameModel} />
        <TruthTable gameModel={gameModel} />
        <SchemaErrors gameModel={gameModel} />
        <_Space />
        <DebugPanel gameModel={gameModel} />
      </_Info>
    </_App>
  );
}
