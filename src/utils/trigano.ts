import type { Point } from 'common/types';

export function subtract(p1: Point, p2: Point): Point {
  return {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
  };
}

export function rotate(point: Point, a: number): Point {
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);

  return {
    x: point.x * cosA - point.y * sinA,
    y: point.x * sinA + point.y * cosA,
  };
}
