import { useCallback, useRef, useState } from 'react';

export function useForceUpdate() {
  const incRef = useRef(0);
  const [, setInc] = useState(incRef.current);

  return useCallback(() => {
    setInc(++incRef.current);
  }, []);
}
