import { useEffect } from 'react';

import { usePageActive } from './usePageActive';
import { useLatest } from './useLatest';

export function useActivePageInterval(
  callback: (() => void) | undefined,
  ms: number,
) {
  const isActive = usePageActive();
  const callbackRef = useLatest(callback);

  useEffect(() => {
    if (isActive && callbackRef.current) {
      const intervalId = window.setInterval(() => {
        if (callbackRef.current) {
          callbackRef.current();
        }
      }, ms);

      return () => {
        window.clearInterval(intervalId);
      };
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ms, Boolean(callbackRef.current)]);
}
