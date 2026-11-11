export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_SNAPPY = [0.22, 1, 0.36, 1] as const;

export const PORTAL_PAGE_TRANSITION = {
  duration: 0.24,
  ease: EASE_OUT_EXPO,
};

export const PORTAL_HEADER_TRANSITION = {
  duration: 0.32,
  ease: EASE_OUT_EXPO,
};

export const PORTAL_CARD_TRANSITION = {
  duration: 0.28,
  ease: EASE_OUT_EXPO,
};

export const MODAL_BACKDROP_TRANSITION = {
  duration: 0.18,
  ease: 'easeOut' as const,
};

export const MODAL_PANEL_TRANSITION = {
  duration: 0.22,
  ease: EASE_OUT_EXPO,
};

export const NAV_SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 38,
  mass: 0.8,
};

export const POS_SCREEN_TRANSITION = {
  duration: 0.16,
  ease: EASE_OUT_EXPO,
};

export const POS_MODAL_BACKDROP_TRANSITION = {
  duration: 0.14,
  ease: 'easeOut' as const,
};

export const POS_MODAL_PANEL_TRANSITION = {
  duration: 0.16,
  ease: EASE_OUT_EXPO,
};

export const POS_DROPDOWN_TRANSITION = {
  duration: 0.14,
  ease: EASE_OUT_EXPO,
};

export const POS_TAB_SPRING = {
  type: 'spring' as const,
  stiffness: 620,
  damping: 42,
  mass: 0.7,
};

export const POS_BUMP_TRANSITION = {
  duration: 0.14,
  ease: EASE_OUT_EXPO,
};

/**
 * Caps stagger delay so long lists never make users wait on lower items.
 */
export function staggerDelay(index: number, step = 0.03, max = 0.18): number {
  return Math.min(index * step, max);
}
