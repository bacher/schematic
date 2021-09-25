import { Element, ElementType } from './types';

const INPUT_LITERALS = 'ABCDEFGHIJ';
const OUTPUT_LITERALS = 'YZXWVUTSRQ';

export function getLiteralForSignal(
  elements: Element[],
  element: Element,
  isVector: boolean = false,
) {
  const index = elements.indexOf(element);

  const charVariants =
    element.type === ElementType.INPUT ? INPUT_LITERALS : OUTPUT_LITERALS;

  if (!isVector && elements.length <= charVariants.length) {
    return charVariants.charAt(index);
  }

  return element.type === ElementType.INPUT ? `I${index}` : `Y${index}`;
}
