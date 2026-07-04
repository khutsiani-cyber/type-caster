import { useEffect, useRef } from 'react';
import { vfx } from './vfx';

/** Full-bleed overlay canvas the particle engine draws on. */
export function VfxCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) vfx.attach(ref.current);
    return () => vfx.detach();
  }, []);

  return <canvas ref={ref} className="vfx-canvas" />;
}
