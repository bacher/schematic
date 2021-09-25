import { useMemo, useState } from 'react';

import { GameId } from '../../common/types';
import { useOnChange } from '../../hooks/useOnChange';
import { useWindowEvent } from '../../hooks/useWindowEvent';
import { Emulator } from '../Emulator';

import styles from './App.module.scss';

function getCurrentGameId(allowedIds: GameId[]): GameId | undefined {
  const hash = (window.location.hash ?? '').trim().replace(/^#/, '');

  if (hash) {
    const match = hash.match(/^g(\d+)$/);

    if (match) {
      const id = match[0] as GameId;

      if (allowedIds.includes(id)) {
        return id;
      }
    }
  }

  return undefined;
}

function getNextGameId(currentGames: GameId[]): GameId {
  const lastId = currentGames[currentGames.length - 1];

  if (!lastId) {
    return `g1`;
  }

  const match = lastId.match(/^g(\d+)$/);

  if (!match) {
    throw new Error();
  }

  return `g${parseInt(match[1], 10) + 1}`;
}

export function App() {
  const savedGames = useMemo<GameId[]>(() => {
    const json = localStorage.getItem('sch_games');
    if (!json) {
      return [];
    }
    return JSON.parse(json);
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

  if (currentGameId) {
    return <Emulator key={currentGameId} gameId={currentGameId} />;
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Schematic</h1>
      <h2 className={styles.gamesTitle}>Current schemas:</h2>
      <ul>
        {currentGames.length ? (
          currentGames.map((gameId) => (
            <li key={gameId}>
              <a href={`#${gameId}`}>{gameId}</a>{' '}
              <button
                type="button"
                className={styles.removeButton}
                onClick={(e) => {
                  e.preventDefault();

                  // eslint-disable-next-line no-alert
                  if (window.confirm('Are you sure?')) {
                    setCurrentGames(currentGames.filter((id) => id !== gameId));
                    localStorage.removeItem(`sch_game_${gameId}`);
                  }
                }}
              >
                x
              </button>
            </li>
          ))
        ) : (
          <div>no saved schemas</div>
        )}
      </ul>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const newGameId = getNextGameId(currentGames);
          setCurrentGames([...currentGames, newGameId]);

          window.setTimeout(() => {
            window.location.assign(`#${newGameId}`);
          }, 0);
        }}
      >
        New schema
      </button>
    </div>
  );
}
