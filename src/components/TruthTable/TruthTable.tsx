import { useMemo } from 'react';
import { styled } from 'stitches';

import { getLiteralForSignal } from 'common/common';
import { Element, ElementType, Options } from 'common/types';

const _Table = styled('table', {
  '> thead > tr > th': {
    textAlign: 'center',
    fontWeight: 700,
  },
  '> tbody > tr > td': {
    textAlign: 'center',
    fontWeight: 400,
  },
});

const _Options = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: 10,
});

const _Option = styled('label', {
  userSelect: 'none',

  '> input:not(:disabled)': {
    cursor: 'pointer',
  },
});

type Props = {
  elements: Element[];
  options: Options;
  onOptionsChange: (update: Partial<Options>) => void;
};

export function TruthTable({ elements, options, onOptionsChange }: Props) {
  const { inputs, outputs, renderInputs, renderOutputs } = useMemo(() => {
    const inputs = elements.filter((el) => el.type === ElementType.INPUT);
    const outputs = elements.filter((el) => el.type === ElementType.OUTPUT);

    let renderInputs = inputs;
    let renderOutputs = outputs;

    if (options.isInputVector) {
      renderInputs = [...inputs].reverse();
    }

    if (options.isOutputVector) {
      renderOutputs = [...outputs].reverse();
    }

    return {
      inputs,
      outputs,
      renderInputs,
      renderOutputs,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    elements,
    elements.length,
    options.isInputVector,
    options.isOutputVector,
  ]);

  return (
    <div>
      <_Options>
        <_Option>
          <input
            type="checkbox"
            checked={options.isInputVector}
            onChange={(e) => {
              onOptionsChange({
                isInputVector: e.target.checked,
              });
            }}
          />{' '}
          Treat input as vector
        </_Option>
        <_Option>
          <input
            type="checkbox"
            checked={options.isOutputVector}
            onChange={(e) => {
              onOptionsChange({
                isOutputVector: e.target.checked,
              });
            }}
          />{' '}
          Treat output as vector
        </_Option>
      </_Options>
      <_Table>
        <thead>
          <tr>
            {renderInputs.map((el, i) => (
              <th key={i}>
                {getLiteralForSignal(inputs, el, options.isInputVector)}
              </th>
            ))}
            {renderOutputs.map((el, i) => (
              <th key={i}>
                {getLiteralForSignal(outputs, el, options.isOutputVector)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 2 ** inputs.length }).map((el, rowIndex) => (
            <tr key={rowIndex}>
              {renderInputs.map((value, cellIndex) => (
                <td key={cellIndex}>
                  {Math.floor(rowIndex / 2 ** (inputs.length - cellIndex - 1)) %
                    2}
                </td>
              ))}
              {renderOutputs.map((value, i) => (
                <td key={i}>Z</td>
              ))}
            </tr>
          ))}
        </tbody>
      </_Table>
    </div>
  );
}
