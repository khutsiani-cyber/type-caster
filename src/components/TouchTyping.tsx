import { useEffect, useRef } from 'react';

/** True on phones/tablets — anywhere the primary pointer can't hover. */
export const IS_TOUCH =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

/**
 * Invisible input that summons the mobile keyboard and replays whatever the
 * user types as synthetic window keydown events — so the existing desktop
 * typing logic works untouched on phones.
 */
export function TouchTyping({ active }: { active: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!IS_TOUCH || !active) return;
    ref.current?.focus({ preventScroll: true });
    // Tapping anywhere non-interactive re-summons the keyboard.
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('button, a, input:not(.touch-catcher)')) return;
      ref.current?.focus({ preventScroll: true });
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [active]);

  if (!IS_TOUCH) return null;

  return (
    <input
      ref={ref}
      className="touch-catcher"
      type="text"
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="go"
      aria-label="Type the incantation"
      onFocus={() => {
        // Keep the incantation visible above the keyboard.
        window.setTimeout(() => {
          document.querySelector('.typing-panel')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 350);
      }}
      onInput={(e) => {
        const el = e.currentTarget;
        const text = el.value;
        el.value = ''; // keep it empty so autocorrect has nothing to chew on
        for (const ch of text) {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }),
          );
        }
      }}
    />
  );
}
