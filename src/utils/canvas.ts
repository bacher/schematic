export function getCanvasContext(
  canvas: HTMLCanvasElement | null | undefined,
): CanvasRenderingContext2D {
  if (!canvas) {
    throw new Error();
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
