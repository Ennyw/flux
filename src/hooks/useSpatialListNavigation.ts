import { useEffect } from 'react';

interface Options {
  itemSelector: string;
}

// Simple spatial navigation for D‑pad remotes:
// - Works with any list/grid of focusable items
// - Uses DOM order and rows computed by offsetTop
// - Arrow keys move within the container; Enter is handled by the focused element
export function useSpatialListNavigation(
  containerRef: React.RefObject<HTMLElement>,
  { itemSelector }: Options
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getItems = () => Array.from(container.querySelectorAll<HTMLElement>(itemSelector));

    const getColumns = (items: HTMLElement[]) => {
      if (items.length <= 1) return items.length || 1;
      const firstTop = items[0].offsetTop;
      let columns = 0;
      for (const el of items) {
        if (el.offsetTop !== firstTop) break;
        columns += 1;
      }
      return Math.max(columns, 1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;

      const items = getItems().filter(el => !el.hasAttribute('disabled'));
      if (items.length === 0) return;

      const columns = getColumns(items);

      const active = document.activeElement as HTMLElement | null;
      let index = items.indexOf(active || items[0]);
      if (index < 0) index = 0;

      let next = index;
      switch (e.key) {
        case 'ArrowLeft':
          next = Math.max(0, index - 1);
          break;
        case 'ArrowRight':
          next = Math.min(items.length - 1, index + 1);
          break;
        case 'ArrowUp':
          next = Math.max(0, index - columns);
          break;
        case 'ArrowDown':
          next = Math.min(items.length - 1, index + columns);
          break;
      }

      if (next !== index) {
        e.preventDefault();
        const target = items[next];
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, itemSelector]);
}


