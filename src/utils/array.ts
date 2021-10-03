export function insert<T>(array: T[], item: T, index: number): T[] {
  return [...array.slice(0, index), item, ...array.slice(index)];
}
