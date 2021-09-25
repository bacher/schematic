import { useRef } from 'react';

export function useLatest<T>(some: T) {
  const ref = useRef(some);
  ref.current = some;
  return ref;
}
