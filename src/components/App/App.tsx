import { useLayoutEffect, useMemo, useState } from 'react';

import { GameId, GameSaveDescriptor } from 'common/types';
import { getNextGameId, parseGameId } from 'utils/game';
import { useOnChange } from 'hooks/useOnChange';
import { useWindowEvent } from 'hooks/useWindowEvent';
import { MainMenu } from 'components/MainMenu';
import { Simulator } from 'components/Simulator';

function getCurrentGameId(
  currentGames: GameSaveDescriptor[],
): GameId | undefined {
  const hash = (window.location.hash ?? '').trim().replace(/^#/, '');

  if (hash) {
    const game = parseGameId(hash);

    if (game && currentGames.some(({ id }) => id === game.gameId)) {
      return game.gameId;
    }
  }

  return undefined;
}

export function App() {
  const savedGames = useMemo<GameSaveDescriptor[]>(() => {
    const json = localStorage.getItem('sch_games');
    if (!json) {
      return [];
    }

    return JSON.parse(json).map((data: GameSaveDescriptor | string) => {
      if (typeof data === 'string') {
        return {
          id: data as GameId,
          title: data,
        };
      }

      return data;
    });
  }, []);
  const [currentGames, setCurrentGames] = useState(savedGames);

  useOnChange(() => {
    localStorage.setItem('sch_games', JSON.stringify(currentGames));
  }, [currentGames]);

  const [currentGameId, setCurrentGameId] = useState(
    getCurrentGameId(currentGames),
  );

  useWindowEvent('hashchange', () => {
    const gameId = getCurrentGameId(currentGames);

    if (gameId !== currentGameId) {
      setCurrentGameId(gameId);
    }
  });

  useLayoutEffect(() => {
    if (!currentGames.length && !currentGameId) {
      const newGameId = getNextGameId(currentGames);

      setCurrentGames([
        {
          id: newGameId,
          title: 'Untitled schema',
        },
      ]);

      window.setTimeout(() => {
        window.location.assign(`#${newGameId}`);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (currentGameId) {
    return <Simulator key={currentGameId} gameId={currentGameId} />;
  }

  return (
    <MainMenu currentGames={currentGames} setCurrentGames={setCurrentGames} />
  );
}
