/**
 * Draws a screen again and leaves the keyboard where it was: controls
 * keep their ids over a redraw, so the one that had the focus gets it back.
 */
export const keepFocus = (root: HTMLElement, draw: () => void): void => {
  const focused = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
  draw();
  if (focused) document.getElementById(focused)?.focus();
};
