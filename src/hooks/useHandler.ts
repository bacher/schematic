import { useCallback } from 'react';
import { useLatest } from './useLatest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useHandler<F extends (...args: any) => any>(callback: F): F {
  const callbackRef = useLatest<F>(callback);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((...args: any) => callbackRef.current(...args)) as any,
    [],
  );
}
