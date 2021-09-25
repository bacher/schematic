import { useEffect, DependencyList, useRef } from 'react';

export function useOnChange(callback: () => void, deps: DependencyList) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      return;
    }

    callback();
  }, deps);
}
