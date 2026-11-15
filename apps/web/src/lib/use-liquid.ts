import { useCallback } from 'react';

type Axis = 'x' | 'y';

/** Elements that mark "the current item" inside a liquid container. */
const ACTIVE_SELECTOR = '[aria-current="page"], [data-state="active"], [data-liquid-active="true"]';

/** How long the indicator stays "in motion" (stretched) after it starts moving. */
const MOVING_MS = 360;

/**
 * Liquid-glass indicator.
 *
 * Attach the returned ref to a container whose children include the active item (a NavLink with
 * `aria-current`, a Radix tab with `data-state="active"`, …). The hook measures the active item and
 * publishes its geometry as CSS variables (`--ind-x/y/w/h/r/tone`); the glass lens itself is drawn
 * by `[data-liquid]::after` in `glass.css`, so React never re-renders while it glides.
 *
 * `axis` is the direction the lens travels, used to stretch it while moving.
 */
export function useLiquid<T extends HTMLElement>(axis: Axis) {
  return useCallback(
    (node: T | null) => {
      if (!node) return;
      node.dataset.liquid = axis;

      let last = '';
      // Item clicado: a lente vai para ele na hora, sem esperar a rota carregar.
      let pending: HTMLElement | null = null;
      let pendingTimer: number | undefined;
      let movingTimer: number | undefined;
      let frame: number | undefined;

      function measure() {
        const current = node!.querySelector<HTMLElement>(ACTIVE_SELECTOR);
        if (pending && (current === pending || !pending.isConnected)) pending = null;
        const active = pending ?? current;
        if (!active) {
          node!.style.setProperty('--ind-o', '0');
          return;
        }
        const box = node!.getBoundingClientRect();
        const rect = active.getBoundingClientRect();
        const x = rect.left - box.left - node!.clientLeft + node!.scrollLeft;
        const y = rect.top - box.top - node!.clientTop + node!.scrollTop;
        const style = getComputedStyle(active);

        const key = `${Math.round(x)}:${Math.round(y)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
        const moved = last !== '' && key !== last;
        last = key;

        node!.style.setProperty('--ind-x', `${x}px`);
        node!.style.setProperty('--ind-y', `${y}px`);
        node!.style.setProperty('--ind-w', `${rect.width}px`);
        node!.style.setProperty('--ind-h', `${rect.height}px`);
        node!.style.setProperty('--ind-r', style.borderRadius || '12px');
        const tone = style.getPropertyValue('--tone').trim();
        if (tone) node!.style.setProperty('--ind-tone', tone);
        node!.style.setProperty('--ind-o', '1');

        if (moved) {
          node!.dataset.moving = 'true';
          window.clearTimeout(movingTimer);
          movingTimer = window.setTimeout(() => delete node!.dataset.moving, MOVING_MS);
        }
      }

      // Coalesce bursts of mutations (route change + tooltip state + class updates) into one pass.
      function schedule() {
        if (frame !== undefined) return;
        frame = requestAnimationFrame(() => {
          frame = undefined;
          measure();
        });
      }

      function onClick(event: MouseEvent) {
        const item = (event.target as HTMLElement).closest<HTMLElement>('a[href], [role="tab"]');
        if (!item || !node!.contains(item) || item.getAttribute('target') === '_blank') return;
        pending = item;
        window.clearTimeout(pendingTimer);
        pendingTimer = window.setTimeout(() => {
          pending = null;
          schedule();
        }, 4000);
        measure();
      }
      node.addEventListener('click', onClick);

      measure();
      node.querySelector<HTMLElement>(ACTIVE_SELECTOR)?.scrollIntoView({ block: 'nearest' });
      // The first placement must not animate from the top-left corner.
      const ready = requestAnimationFrame(() => {
        node.dataset.ready = 'true';
      });

      const mutations = new MutationObserver(schedule);
      mutations.observe(node, {
        attributes: true,
        subtree: true,
        attributeFilter: ['aria-current', 'data-state', 'data-liquid-active', 'class'],
      });
      const resizes = new ResizeObserver(schedule);
      resizes.observe(node);
      void document.fonts?.ready.then(schedule);

      return () => {
        node.removeEventListener('click', onClick);
        window.clearTimeout(pendingTimer);
        mutations.disconnect();
        resizes.disconnect();
        cancelAnimationFrame(ready);
        if (frame !== undefined) cancelAnimationFrame(frame);
        window.clearTimeout(movingTimer);
      };
    },
    [axis],
  );
}
