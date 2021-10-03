import { useMemo, useState } from 'react';
import { last } from 'lodash-es';

import { styled } from 'stitches';
import { GameId } from 'common/types';
import { GameModel } from 'models/GameModel';
import { insert } from 'utils/array';
import { useOnChange } from 'hooks/useOnChange';
import { useWindowEvent } from 'hooks/useWindowEvent';
import { Simulator } from 'components/Simulator';

const _Wrapper = styled('div', {
  padding: 16,
});

const _Title = styled('h1', {
  margin: 0,
});

const _GameTitle = styled('h2', {
  fontVariant: '18|24',
});

const _List = styled('ul', {
  marginBottom: 10,
});

const _ListItem = styled('li', {
  display: 'flex',
  alignItems: 'center',
  padding: '2px 0',
});

const _GameLinkWrapper = styled('p', {
  minWidth: 140,
  marginRight: 16,
});

const _GameLink = styled('a', {});

const _Button = styled('button', {
  '+ button': {
    marginLeft: 5,
  },
});

function parseGameId(
  gameId: string,
): { gameId: GameId; gameNumber: number } | undefined {
  const match = gameId.match(/^[gs](\d+)$/);

  if (!match) {
    return undefined;
  }

  return {
    gameId: match[0] as GameId,
    gameNumber: parseInt(match[1], 10),
  };
}

type GameSave = {
  id: GameId;
  title: string;
};

function getCurrentGameId(currentGames: GameSave[]): GameId | undefined {
  const hash = (window.location.hash ?? '').trim().replace(/^#/, '');

  if (hash) {
    const game = parseGameId(hash);

    if (game && currentGames.some(({ id }) => id === game.gameId)) {
      return game.gameId;
    }
  }

  return undefined;
}

function getNextGameId(currentGames: GameSave[]): GameId {
  const lastGame = last(currentGames);

  if (!lastGame) {
    return `s1`;
  }

  const game = parseGameId(lastGame.id);

  if (!game) {
    throw new Error();
  }

  return `s${game.gameNumber + 1}`;
}

export function App() {
  const savedGames = useMemo<GameSave[]>(() => {
    const json = localStorage.getItem('sch_games');
    if (!json) {
      return [];
    }

    return JSON.parse(json).map((game: unknown) => {
      if (typeof game === 'string') {
        return {
          id: game,
          title: game,
        };
      }

      return game;
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

  if (currentGameId) {
    return <Simulator key={currentGameId} gameId={currentGameId} />;
  }

  return (
    <_Wrapper>
      <_Title>Schematic</_Title>
      <_GameTitle>Current schemas:</_GameTitle>
      <_List>
        {currentGames.length ? (
          currentGames.map(({ id: gameId, title }, index) => (
            <_ListItem key={gameId}>
              <_GameLinkWrapper>
                <_GameLink href={`#${gameId}`}>{title}</_GameLink>
              </_GameLinkWrapper>
              <_Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();

                  // eslint-disable-next-line no-alert
                  const title = window.prompt('Enter clone game name');

                  if (!title || !title.trim()) {
                    return;
                  }

                  const clonedGame = {
                    id: getNextGameId(currentGames),
                    title,
                  };

                  GameModel.cloneGame(gameId, clonedGame.id);

                  setCurrentGames(insert(currentGames, clonedGame, index));
                }}
              >
                clone
              </_Button>
              <_Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();

                  // eslint-disable-next-line no-alert
                  if (window.confirm('Are you sure?')) {
                    setCurrentGames(
                      currentGames.filter((game) => game.id !== gameId),
                    );
                    GameModel.removeGame(gameId);
                  }
                }}
              >
                x
              </_Button>
            </_ListItem>
          ))
        ) : (
          <div>no saved schemas</div>
        )}
      </_List>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const newGameId = getNextGameId(currentGames);

          // eslint-disable-next-line no-alert
          const title = window.prompt('Enter new game name');

          if (!title || !title.trim()) {
            return;
          }

          setCurrentGames([
            ...currentGames,
            {
              id: newGameId,
              title: title.trim(),
            },
          ]);

          window.setTimeout(() => {
            window.location.assign(`#${newGameId}`);
          }, 0);
        }}
      >
        New schema
      </button>
    </_Wrapper>
  );
}
