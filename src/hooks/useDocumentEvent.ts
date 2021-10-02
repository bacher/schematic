import { useEffect } from 'react';

import { useHandler } from 'hooks/useHandler';

export function useDocumentEvent(
  eventName: string,
  callback: (...args: unknown[]) => void,
) {
  const func = useHandler(callback);

  useEffect(() => {
    document.addEventListener(eventName, func, false);

    return () => {
      document.removeEventListener(eventName, func, false);
    };
  }, [eventName, func]);
}
