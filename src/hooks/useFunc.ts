import { useCallback } from 'react';
import { useLatest } from './useLatest';

export function useFunc<F extends CallableFunction>(callback: F) {
  const callbackRef = useLatest(callback);
  return useCallback((...args) => callbackRef.current(...args), []);
}
