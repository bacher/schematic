import { useCallback, useRef, useState } from 'react';

export function useForceUpdate() {
  const incRef = useRef(0);
  const [, setInc] = useState(incRef.current);

  return useCallback(() => {
    incRef.current += 1;
    setInc(incRef.current);
  }, []);
}
