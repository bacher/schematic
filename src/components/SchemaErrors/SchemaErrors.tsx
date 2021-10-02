import { styled } from 'stitches';

import { elementsDescriptions } from 'common/data';
import { GameModel, useGameState } from 'models/GameModel';

const _Title = styled('h2', {
  margin: 0,
});

type Props = {
  gameModel: GameModel;
};

export function SchemaErrors({ gameModel }: Props) {
  const { elements, connections } = useGameState(
    gameModel,
    ({ elements, connections }) => ({
      elements,
      connections,
    }),
  );

  const errors = [];

  for (const el of elements) {
    const { pins } = elementsDescriptions[el.type];
    const used = pins.map(() => false);

    for (const connection of connections) {
      for (const p of connection) {
        if (p.elId === el.id) {
          used[p.pinIndex] = true;
        }
      }
    }

    if (used.some((value) => !value)) {
      errors.push(`Floating pins on node ${el.type}`);
    }
  }

  if (!errors.length) {
    return null;
  }

  return (
    <div>
      <_Title>Errors:</_Title>
      {errors.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
