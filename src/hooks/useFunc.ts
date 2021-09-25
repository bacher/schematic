import { useCallback } from 'react';
import { useLatest } from './useLatest';

export function useFunc<F extends (...args: any) => any>(callback: F): F {
  const callbackRef = useLatest(callback);
  // @ts-ignore
  return useCallback((...args) => callbackRef.current(...args), []);
}
