import { useEffect } from 'react';

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof window === 'undefined') return;

    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
      window.scrollTo({ top: scrollY, behavior: 'auto' });
    };
  }, [locked]);
}
