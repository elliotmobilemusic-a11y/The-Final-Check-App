import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';

type ActivityOverlayContent = {
  detail: string;
  kicker: string;
  title: string;
};

type ActivityOverlayContextValue = {
  activity: ActivityOverlayContent | null;
  hideActivity: (token: number) => void;
  runWithActivity: <T>(
    content: ActivityOverlayContent,
    task: () => Promise<T> | T,
    minDurationMs?: number
  ) => Promise<T>;
  showActivity: (content: ActivityOverlayContent) => number;
};

const ActivityOverlayContext = createContext<ActivityOverlayContextValue>({
  activity: null,
  hideActivity: () => undefined,
  runWithActivity: async (_content, task) => task(),
  showActivity: () => 0
});

export function ActivityOverlayProvider({ children }: PropsWithChildren) {
  const [activity, setActivity] = useState<ActivityOverlayContent | null>(null);
  const activeTokenRef = useRef(0);
  const activityStartRef = useRef(0);

  const showActivity = useCallback((content: ActivityOverlayContent) => {
    const token = activeTokenRef.current + 1;
    activeTokenRef.current = token;
    activityStartRef.current = Date.now();
    setActivity(content);
    return token;
  }, []);

  const hideActivity = useCallback((token: number) => {
    if (token !== activeTokenRef.current) return;
    setActivity(null);
  }, []);

  const runWithActivity = useCallback(
    async <T,>(
      content: ActivityOverlayContent,
      task: () => Promise<T> | T,
      minDurationMs = 1150
    ) => {
      const token = showActivity(content);

      try {
        return await task();
      } finally {
        const elapsed = Date.now() - activityStartRef.current;
        const remaining = Math.max(0, minDurationMs - elapsed);

        if (remaining > 0 && typeof window !== 'undefined') {
          await new Promise((resolve) => window.setTimeout(resolve, remaining));
        }

        hideActivity(token);
      }
    },
    [hideActivity, showActivity]
  );

  const value = useMemo(
    () => ({
      activity,
      hideActivity,
      runWithActivity,
      showActivity
    }),
    [activity, hideActivity, runWithActivity, showActivity]
  );

  return (
    <ActivityOverlayContext.Provider value={value}>{children}</ActivityOverlayContext.Provider>
  );
}

export function useActivityOverlay() {
  return useContext(ActivityOverlayContext);
}
