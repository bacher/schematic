import { useEffect } from 'react';

import { useHandler } from 'hooks/useHandler';

export function useWindowEvent(
  eventName: string,
  callback: (...args: unknown[]) => void,
) {
  const func = useHandler(callback);

  useEffect(() => {
    window.addEventListener(eventName, func, false);

    return () => {
      window.removeEventListener(eventName, func, false);
    };
  }, [eventName, func]);
}
