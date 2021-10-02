import {
  CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import { Coords, GameId } from 'common/types';
import { useRefState } from 'hooks/useRefState';
import { useForceUpdate } from 'hooks/useForceUpdate';
import { useHandler } from 'hooks/useHandler';
import { useWindowEvent } from 'hooks/useWindowEvent';
import { useAssets } from 'hooks/useAssets';
import { getCanvasContext } from 'utils/canvas';
import { GameModel, useGameState } from 'models/GameModel';
import { render } from 'utils/render';
import { TruthTable } from 'components/TruthTable';
import { SchemaErrors } from 'components/SchemaErrors';
import { InputSignalsControl } from 'components/InputSignalsControl';
import { Toolbar } from 'components/Toolbar';
import { OptionsPanel } from 'components/OptionsPanel';
import { DebugPanel } from 'components/DebugPanel';

import { _App, _Canvas, _CanvasWrapper, _Info, _Space } from './elements';

type Props = {
  gameId: GameId;
};

function getCurrentDensityFactor() {
  return window.devicePixelRatio ?? 1;
}

export function Emulator({ gameId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const forceUpdate = useForceUpdate();
  const densityFactor = useRefState({
    value: getCurrentDensityFactor(),
  });

  const gameModel = useMemo(() => {
    if (GameModel.checkSavedGame(gameId)) {
      return GameModel.loadGame(gameId);
    }
    return GameModel.createEmptyModel(gameId);
  }, [gameId]);

  const cursor = useGameState(gameModel, (state) => state.cursor);

  const size = useRefState({ width: 0, height: 0 });
  const assets = useAssets({
    densityFactor: densityFactor.value,
    draw: () => draw(),
  });

  function convertScreenCoordsToAppCoords({ x, y }: Coords): Coords {
    return {
      x: x - size.width / 2,
      y: y - size.height / 2,
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

  const draw = useHandler(() => {
    if (size.width === 0) {
      return;
    }

    if (actualizeDensityFactor()) {
      return;
    }

    const ctx = getCanvasContext(canvasRef.current);

    render(ctx, {
      gameState: gameModel.getState(),
      size,
      densityFactor: densityFactor.value,
      assets,
    });
  });

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
