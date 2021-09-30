import { Element, ElementType } from './types';

const INPUT_LITERALS = 'ABCDEFGHIJ';
const OUTPUT_LITERALS = 'YZXWVUTSRQ';

export function getLiteralForSignalByIndex({
  elementsCount,
  index,
  isInput,
  isVector,
}: {
  elementsCount: number;
  index: number;
  isInput: boolean;
  isVector: boolean;
}) {
  const charVariants = isInput ? INPUT_LITERALS : OUTPUT_LITERALS;

  if (!isVector && elementsCount <= charVariants.length) {
    return charVariants.charAt(index);
  }

  return isInput ? `I${index}` : `Y${index}`;
}

export function getLiteralForSignal(
  elements: Element[],
  element: Element,
  isVector = false,
): string {
  return getLiteralForSignalByIndex({
    elementsCount: elements.length,
    index: elements.indexOf(element),
    isInput: element.type === ElementType.INPUT,
    isVector,
  });
}
