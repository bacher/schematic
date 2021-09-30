import { styled } from 'stitches';
import { getLiteralForSignalByIndex } from 'common/common';

const _Wrapper = styled('div', {
  position: 'absolute',
  display: 'flex',
  alignItems: 'stretch',
  left: 52,
  bottom: 0,
  padding: 4,
});

const _Title = styled('h2', {
  marginRight: 8,
  fontVariant: '20|30',
});

const _Inputs = styled('div', {
  display: 'flex',
  // gridTemplateColumns: '"repeat(auto-fit, 1fr)"',
  gap: 4,

  variants: {
    reverse: {
      true: {
        flexDirection: 'row-reverse',
      },
    },
  },
});

const _InputLabel = styled('label', {
  display: 'grid',
  gridTemplateAreas: '"A"',
  width: 30,
  height: 30,
  userSelect: 'none',
  cursor: 'pointer',

  '> *': {
    gridArea: 'A',
  },
});

const _HiddenInput = styled('input', {
  opacity: 0,
});

const _Bg = styled('div', {
  background: '#aaa',

  'input:checked + &': {
    background: '#0d0',
  },
});

const _Symbol = styled('p', {
  textAlign: 'center',
  fontVariant: '16|30',
});

type Props = {
  inputs: boolean[];
  isVector: boolean;
  onChange: (inputs: boolean[]) => void;
};

export function InputSignalsControl({ inputs, isVector, onChange }: Props) {
  return (
    <_Wrapper>
      <_Title>Input signals:</_Title>
      <_Inputs reverse={isVector}>
        {inputs.map((enabled, index) => (
          <_InputLabel key={index}>
            <_HiddenInput
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                onChange(
                  inputs.map((enabled, i) =>
                    i === index ? e.target.checked : enabled,
                  ),
                );
              }}
            />
            <_Bg />
            <_Symbol>
              {getLiteralForSignalByIndex({
                elementsCount: inputs.length,
                index,
                isInput: true,
                isVector,
              })}
            </_Symbol>
          </_InputLabel>
        ))}
      </_Inputs>
    </_Wrapper>
  );
}
