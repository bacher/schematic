import { useRef } from 'react';

export function useRefState<D>(value: D): D {
  const ref = useRef<D>(value);
  return ref.current;
}
