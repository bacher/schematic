import { useState } from 'react';

import { useDocumentEvent } from './useDocumentEvent';

export function usePageActive(): boolean {
  const [isActive, setActive] = useState(true);

  useDocumentEvent('visibilitychange', () => {
    const newIsActive = document.visibilityState === 'visible';

    if (isActive !== newIsActive) {
      setActive(newIsActive);
    }
  });

  return isActive;
}
