import { useRef } from 'react';

export function useLatest<T>(some: T): { current: T } {
  const ref = useRef(some);
  ref.current = some;
  return ref;
}
