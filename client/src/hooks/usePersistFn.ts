import { useRef } from "react";

type noop = (...args: any[]) => any;

/**
 * usePersistFn 可以替代 useCallback 以降低心智负担
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T | null>(null);
  if (!persistFn.current) {
    (persistFn as { current: T }).current = function (this: unknown, ...args) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}
