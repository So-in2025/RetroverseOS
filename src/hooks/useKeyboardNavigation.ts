import { useEffect, useRef } from 'react';

/**
 * Custom hook to enable console-like keyboard navigation (D-Pad/Arrows)
 * for a list of focusable elements.
 */
export function useKeyboardNavigation<T extends HTMLElement>(containerRef: { current: T | null }, selector: string = 'button, a, [tabindex="0"]') {
  const currentIndex = useRef(-1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
      if (elements.length === 0) return;

      const moveFocus = (delta: number) => {
        e.preventDefault();
        currentIndex.current = (currentIndex.current + delta + elements.length) % elements.length;
        elements[currentIndex.current].focus();
        
        // Scroll into view if needed
        elements[currentIndex.current].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      };

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          moveFocus(1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          moveFocus(-1);
          break;
        case 'Enter':
          if (currentIndex.current >= 0) {
            elements[currentIndex.current].click();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, selector]);

  return {
    resetFocus: () => { currentIndex.current = -1; }
  };
}
