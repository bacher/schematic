import { useMemo } from 'react';
import { getLiteralForSignal } from '../../common/common';
import { Element, ElementType, Options } from '../../common/types';

import styles from './TruthTable.module.scss';

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
  }, [elements.length, options.isInputVector, options.isOutputVector]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.options}>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={options.isInputVector}
            onChange={(e) => {
              onOptionsChange({
                isInputVector: e.target.checked,
              });
            }}
          />{' '}
          Threat input as vector
        </label>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={options.isOutputVector}
            onChange={(e) => {
              onOptionsChange({
                isOutputVector: e.target.checked,
              });
            }}
          />{' '}
          Threat output as vector
        </label>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            {renderInputs.map((el, i) => (
              <th key={i} className={styles.tableCell}>
                {getLiteralForSignal(inputs, el, options.isInputVector)}
              </th>
            ))}
            {renderOutputs.map((el, i) => (
              <th key={i} className={styles.tableCell}>
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
      </table>
    </div>
  );
}
