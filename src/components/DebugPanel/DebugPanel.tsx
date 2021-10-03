import { styled } from 'stitches';
import { ObjectType } from 'common/types';
import { GameModel, useGameState } from 'models/GameModel';

export const _Yes = styled('span', {
  color: '#4ebd4e',
});

export const _No = styled('span', {
  color: '#666',
});

function yesNo(value: unknown) {
  if (value) {
    return <_Yes>yes</_Yes>;
  }
  return <_No>no</_No>;
}

type Props = {
  gameModel: GameModel;
};

export function DebugPanel({ gameModel }: Props) {
  const {
    elements,
    connections,
    movingElement,
    focusElement,
    hoverElement,
    wireElement,
    panState,
  } = useGameState(gameModel, (state) => state);

  return (
    <div>
      <div>elements: {elements.length}</div>
      <div>connections: {connections.length}</div>
      <div>el moving: {yesNo(movingElement)}</div>
      <div>
        el in focus:{' '}
        {yesNo(focusElement && focusElement.type === ObjectType.ELEMENT)}
      </div>
      <div>
        conn in focus:{' '}
        {yesNo(focusElement && focusElement.type === ObjectType.CONNECTION)}
      </div>
      <div>
        el hover:{' '}
        {yesNo(hoverElement && hoverElement.type === ObjectType.ELEMENT)}
      </div>
      <div>
        pin hover: {yesNo(hoverElement && hoverElement.type === ObjectType.PIN)}
      </div>
      <div>
        conn hover:{' '}
        {yesNo(hoverElement && hoverElement.type === ObjectType.CONNECTION)}
      </div>
      <div>wiring: {yesNo(wireElement)}</div>
      <div>drag: {yesNo(panState.isPan)}</div>
    </div>
  );
}
