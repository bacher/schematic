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

  function OptionControl({
    title,
    optionName,
  }: {
    title: string;
    optionName: keyof Options;
  }) {
    return (
      <Option
        title={title}
        checked={options[optionName]}
        onChange={(checked) => {
          update({ [optionName]: checked });
        }}
      />
    );
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
      <OptionControl title="Auto saves" optionName="autoSaves" />
      <OptionControl title="Debug: draw fps" optionName="debugShowFps" />
      <OptionControl title="Debug: draw id" optionName="debugDrawId" />
      <OptionControl title="Debug: draw axis" optionName="debugDrawAxis" />
      <OptionControl title="Treat input as vector" optionName="isInputVector" />
      <OptionControl
        title="Treat output as vector"
        optionName="isOutputVector"
      />
    </_Wrapper>
  );
}
