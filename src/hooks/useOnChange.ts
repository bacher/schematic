import { useEffect, DependencyList, useRef } from 'react';

export function useOnChange(callback: () => void, deps: DependencyList) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      return;
    }

    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
