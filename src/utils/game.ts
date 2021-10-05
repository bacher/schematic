import type { GameId } from 'common/types';
import { GameSaveDescriptor } from 'common/types';
import { last } from 'lodash-es';

export function parseGameId(
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

export function getNextGameId(currentGames: GameSaveDescriptor[]): GameId {
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
