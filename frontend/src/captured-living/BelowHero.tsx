/**
 * Captured Living: place gallery navigation below the hero photo (fork-only).
 *
 * PicPeak renders the folder navigation and the filter bar (room chips) above
 * the grid wrapper, while the hero photo is drawn inside the grid component,
 * so in the hero header style they end up between the top bar and the photo.
 * The design puts the photo first. BelowHeroSlot (mounted right after the hero
 * in PhotoGridWithLayouts) provides the targets, and BelowHero portals its
 * children there. Without a hero (other header styles) BelowHero renders its
 * children in place, so PicPeak's own layout is unchanged.
 */
import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Slot = 'nav' | 'filters';

const CHANGE_EVENT = 'cl-below-hero-change';

export const BelowHeroSlot: React.FC = () => {
  // Layout effects run after the whole commit's DOM is in place, so a
  // BelowHero mounted in the same commit already finds the targets; the event
  // covers a hero that appears later (photos still loading) or goes away.
  useLayoutEffect(() => {
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return () => { window.dispatchEvent(new Event(CHANGE_EVENT)); };
  }, []);
  return (
    <div className="cl-below-hero">
      <div data-cl-slot="nav" />
      <div data-cl-slot="filters" />
    </div>
  );
};

interface BelowHeroProps {
  slot: Slot;
  /** Only move when the page uses the hero header. */
  enabled: boolean;
  children: React.ReactNode;
}

export const BelowHero: React.FC<BelowHeroProps> = ({ slot, enabled, children }) => {
  const [target, setTarget] = useState<Element | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setTarget(null);
      return undefined;
    }
    const find = () => {
      const el = document.querySelector(`.cl-below-hero [data-cl-slot="${slot}"]`);
      setTarget(el && el.isConnected ? el : null);
    };
    find();
    window.addEventListener(CHANGE_EVENT, find);
    return () => window.removeEventListener(CHANGE_EVENT, find);
  }, [enabled, slot]);

  return target ? createPortal(children, target) : <>{children}</>;
};
