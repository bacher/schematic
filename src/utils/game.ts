import type { GameId } from 'common/types';

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
