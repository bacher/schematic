import { useMemo } from 'react';
import { styled } from 'stitches';

import { getLiteralForSignal } from 'common/common';
import { Element, ElementType, Options } from 'common/types';
import { Option } from 'components/Option';

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
        <Option
          title="Treat input as vector"
          checked={options.isInputVector}
          onChange={(checked) => {
            onOptionsChange({
              isInputVector: checked,
            });
          }}
        />
        <Option
          title="Treat output as vector"
          checked={options.isOutputVector}
          onChange={(checked) => {
            onOptionsChange({
              isOutputVector: checked,
            });
          }}
        />
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
