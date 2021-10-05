import { useEffect, useRef } from 'react';

import { styled } from 'stitches';
import type { GameId, GameSaveDescriptor } from 'common/types';
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from 'common/data';
import { GameModel, getGameIdPreviewStorageKey } from 'models/GameModel';
import { insert } from 'utils/array';
import { getNextGameId } from 'utils/game';
import { useForceUpdate } from 'hooks/useForceUpdate';

const NO_PREVIEW = 'NO_PREVIEW';

const _Wrapper = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'start',
  height: '100%',
  padding: 16,
  boxSizing: 'border-box',

  '> *': {
    flexShrink: 0,
  },
});

const _Title = styled('h1', {
  margin: '0 0 10px',
});

const _GameTitle = styled('h2', {
  marginBottom: 10,
  fontVariant: '18|24',
});

const _List = styled('ul', {
  flexShrink: 1,
  marginBottom: 15,
  paddingRight: 10,
  overflow: 'hidden',
  overflowY: 'auto',
});

const _ListItem = styled('li', {
  display: 'flex',
  alignItems: 'center',
  padding: '5px 0',
});

const _PreviewLink = styled('a', {
  display: 'block',
  textDecoration: 'none',
});

const previewStyles = {
  width: PREVIEW_WIDTH,
  height: PREVIEW_HEIGHT,
  marginRight: 10,
  border: '1px solid #888',
  overflow: 'hidden',
};

const _PreviewBox = styled('div', previewStyles);

const _PreviewImage = styled('img', {
  ...previewStyles,
  display: 'block',
});

const _NoPreview = styled('div', {
  ...previewStyles,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontVariant: '14|18',
  color: '#888',
});

const _GameLinkWrapper = styled('p', {
  minWidth: 200,
  marginRight: 16,
});

const _GameLink = styled('a', {});

const _Button = styled('button', {
  '+ button': {
    marginLeft: 5,
  },
});

const _NewGameButton = styled('button');

type PreviewBlobs = Record<
  GameId,
  | {
      imageUrl: string;
    }
  | 'NO_PREVIEW'
>;

type Props = {
  currentGames: GameSaveDescriptor[];
  setCurrentGames: (games: GameSaveDescriptor[]) => void;
};

export function MainMenu({ currentGames, setCurrentGames }: Props) {
  const previewsRef = useRef<PreviewBlobs>({});
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    let isDestroying = false;

    for (const { id: gameId } of currentGames) {
      try {
        const previewData = localStorage.getItem(
          getGameIdPreviewStorageKey(gameId),
        );

        if (previewData) {
          fetch(previewData)
            .then((res) => res.blob())
            // eslint-disable-next-line no-loop-func,@typescript-eslint/no-loop-func
            .then((blob) => {
              if (!isDestroying) {
                previewsRef.current[gameId] = {
                  imageUrl: URL.createObjectURL(blob),
                };
                forceUpdate();
              }
            });
          // eslint-disable-next-line no-continue
          continue;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }

      previewsRef.current[gameId] = NO_PREVIEW;
    }

    return () => {
      isDestroying = true;

      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const preview of Object.values(previewsRef.current)) {
        if (preview !== NO_PREVIEW) {
          URL.revokeObjectURL(preview.imageUrl);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <_Wrapper>
      <_Title>Schematic</_Title>
      <_GameTitle>Current schemas:</_GameTitle>
      <_List>
        {currentGames.length ? (
          currentGames.map(({ id: gameId, title }, index) => {
            let preview;

            const imageState = previewsRef.current[gameId];

            if (imageState === NO_PREVIEW) {
              preview = <_NoPreview>No preview</_NoPreview>;
            } else if (imageState) {
              preview = <_PreviewImage src={imageState.imageUrl} />;
            } else {
              preview = <_PreviewBox />;
            }

            return (
              <_ListItem key={gameId}>
                <_PreviewLink href={`#${gameId}`}>{preview}</_PreviewLink>
                <_GameLinkWrapper>
                  <_GameLink href={`#${gameId}`}>{title}</_GameLink>
                </_GameLinkWrapper>
                <_Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();

                    // eslint-disable-next-line no-alert
                    const title = window.prompt('Enter new game name');

                    if (!title || !title.trim()) {
                      return;
                    }

                    setCurrentGames(
                      currentGames.map((item, i) => {
                        if (i === index) {
                          return {
                            ...item,
                            title,
                          };
                        }

                        return item;
                      }),
                    );
                  }}
                >
                  rename
                </_Button>
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
            );
          })
        ) : (
          <div>no saved schemas</div>
        )}
      </_List>
      <_NewGameButton
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
      </_NewGameButton>
    </_Wrapper>
  );
}
