import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'the-final-check-visit-mode';

export function useVisitMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryVisit = searchParams.get('visit');

  const initialValue = useMemo(() => {
    if (queryVisit === '1') return true;
    if (queryVisit === '0') return false;
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  }, [queryVisit]);

  const [visitMode, setVisitMode] = useState(initialValue);

  useEffect(() => {
    setVisitMode(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, visitMode ? '1' : '0');
    }

    document.body.classList.toggle('visit-mode-active', visitMode);

    return () => {
      document.body.classList.remove('visit-mode-active');
    };
  }, [visitMode]);

  const setVisitModeEnabled = useCallback(
    (nextValue: boolean) => {
      setVisitMode(nextValue);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextValue) {
            next.set('visit', '1');
          } else {
            next.delete('visit');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const toggleVisitMode = useCallback(() => {
    setVisitModeEnabled(!visitMode);
  }, [setVisitModeEnabled, visitMode]);

  return {
    visitMode,
    setVisitModeEnabled,
    toggleVisitMode
  };
}
