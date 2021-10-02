import { styled } from 'stitches';
import { Options } from 'common/types';
import { GameModel, useGameState } from 'models/GameModel';

import { Option } from './Option';

const _Wrapper = styled('div', {
  display: 'flex',
  flexDirection: 'column',

  '> *': {
    flexShrink: 0,
  },
});

export const _SimulateButton = styled('button', {
  marginBottom: 5,
  border: '1px solid #999',
  borderRadius: 0,
  appearance: 'none',
  cursor: 'pointer',

  variants: {
    active: {
      true: {
        color: '#fff',
        background: 'lightgreen',
      },
    },
  },
});

type Props = {
  gameModel: GameModel;
};

export function OptionsPanel({ gameModel }: Props) {
  const options = useGameState(gameModel, (state) => state.options);

  function update(updates: Partial<Options>): void {
    gameModel.updateOptions({
      ...options,
      ...updates,
    });
  }

  return (
    <_Wrapper>
      <_SimulateButton
        type="button"
        active={options.simulate}
        onClick={(e) => {
          e.preventDefault();
          update({ simulate: !options.simulate });
        }}
      >
        {options.simulate ? 'Simulation: ON' : 'Simulation: OFF'}
      </_SimulateButton>
      <Option
        title="Debug: draw id"
        checked={options.debugDrawId}
        onChange={(checked) => {
          update({ debugDrawId: checked });
        }}
      />
      <Option
        title="Debug: draw axis"
        checked={options.drawAxis}
        onChange={(checked) => {
          update({ drawAxis: checked });
        }}
      />
      <Option
        title="Treat input as vector"
        checked={options.isInputVector}
        onChange={(checked) => {
          update({ isInputVector: checked });
        }}
      />
      <Option
        title="Treat output as vector"
        checked={options.isOutputVector}
        onChange={(checked) => {
          update({ isOutputVector: checked });
        }}
      />
    </_Wrapper>
  );
}
