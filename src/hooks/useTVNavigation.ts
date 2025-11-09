import { useEffect } from 'react';

export const useTVNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const focusableSelector = 'button, a, [tabindex]:not([tabindex="-1"]), .content-card[tabindex="0"]';
      const focusableElements = Array.from(
        document.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.hasAttribute('disabled');
      });

      if (focusableElements.length === 0) return;

      const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
          focusableElements[nextIndex]?.focus();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
          focusableElements[nextIndex]?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Find next element below current
          if (currentIndex >= 0) {
            const current = focusableElements[currentIndex];
            const currentRect = current.getBoundingClientRect();
            const below = focusableElements
              .slice(currentIndex + 1)
              .find(el => {
                const rect = el.getBoundingClientRect();
                return rect.top > currentRect.bottom && Math.abs(rect.left - currentRect.left) < 100;
              });
            if (below) {
              below.focus();
            } else {
              // Move to next row
              nextIndex = Math.min(currentIndex + 10, focusableElements.length - 1);
              focusableElements[nextIndex]?.focus();
            }
          } else {
            focusableElements[0]?.focus();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Find next element above current
          if (currentIndex > 0) {
            const current = focusableElements[currentIndex];
            const currentRect = current.getBoundingClientRect();
            const above = focusableElements
              .slice(0, currentIndex)
              .reverse()
              .find(el => {
                const rect = el.getBoundingClientRect();
                return rect.bottom < currentRect.top && Math.abs(rect.left - currentRect.left) < 100;
              });
            if (above) {
              above.focus();
            } else {
              // Move to previous row
              nextIndex = Math.max(currentIndex - 10, 0);
              focusableElements[nextIndex]?.focus();
            }
          }
          break;
        case 'Enter':
        case ' ':
          // Trigger click on focused element
          if (document.activeElement instanceof HTMLElement) {
            const focused = document.activeElement;
            if (focused.tagName === 'BUTTON' || focused.tagName === 'A' || focused.hasAttribute('tabindex')) {
              e.preventDefault();
              focused.click();
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};

