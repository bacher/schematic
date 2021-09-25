import { useEffect } from 'react';

import { useFunc } from './useFunc';

export function useWindowEvent(
  eventName: string,
  callback: (...args: unknown[]) => void,
) {
  const func = useFunc(callback);

  useEffect(() => {
    window.addEventListener(eventName, func, false);

    return () => {
      window.removeEventListener(eventName, func, false);
    };
  }, [eventName, func]);
}
