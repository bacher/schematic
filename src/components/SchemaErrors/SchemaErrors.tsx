import type { GameState } from 'common/types';
import { elementsDescriptions } from 'common/data';

import styles from './SchemaErrors.module.scss';

type Props = {
  state: GameState;
};

export function SchemaErrors({ state }: Props) {
  const errors = [];

  for (const el of state.elements) {
    const { pins } = elementsDescriptions[el.type];
    const used = pins.map(() => false);

    for (const connection of state.connections) {
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
      <h2 className={styles.title}>Errors:</h2>
      {errors.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
