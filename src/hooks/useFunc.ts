import { useCallback } from 'react';
import { useLatest } from './useLatest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFunc<F extends (...args: any) => any>(callback: F): F {
  const callbackRef = useLatest<F>(callback);

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((...args: any) => callbackRef.current(...args)) as any,
    [],
  );
}
