import { useState, useEffect, useRef, useCallback } from 'react';

interface Size {
  width: number | undefined;
  height: number | undefined;
}

export const useResizeObserver = <T extends HTMLElement>(): [React.RefObject<T>, Size] => {
  const [size, setSize] = useState<Size>({ width: undefined, height: undefined });
  const ref = useRef<T>(null) as React.RefObject<T>;

  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    }
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(handleResize);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  return [ref, size];
};
