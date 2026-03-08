import { useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { runtimeEngine } from '../runtimeEngine';
import type { EngineRuntimeSnapshot } from '../types';

const selectIdentity = <T,>(value: T): T => value;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function areSelectionResultsEqual(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) {
    return true;
  }

  if (Array.isArray(previous) && Array.isArray(next)) {
    if (previous.length !== next.length) {
      return false;
    }

    for (let index = 0; index < previous.length; index += 1) {
      if (!areSelectionResultsEqual(previous[index], next[index])) {
        return false;
      }
    }

    return true;
  }

  if (!isPlainObject(previous) || !isPlainObject(next)) {
    return false;
  }

  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of previousKeys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) {
      return false;
    }

    if (!areSelectionResultsEqual(previous[key], next[key])) {
      return false;
    }
  }

  return true;
}

/**
 * useSyncExternalStore requires getSnapshot to return a cached value when the
 * store hasn't changed. Selectors that return new objects (e.g. { a, b }) would
 * otherwise trigger infinite re-renders. We also reuse equivalent selector
 * results so runtime tick updates do not force React re-renders when the
 * selected values are unchanged.
 */
export function useEngineSnapshot<T = EngineRuntimeSnapshot>(
  selector: (snapshot: EngineRuntimeSnapshot) => T = selectIdentity as (snapshot: EngineRuntimeSnapshot) => T
): T {
  const cacheRef = useRef<{
    snapshot: EngineRuntimeSnapshot | null;
    selector: ((snapshot: EngineRuntimeSnapshot) => T) | null;
    result: T;
  }>({
    snapshot: null,
    selector: null,
    result: undefined as T,
  });

  const getSnapshot = () => {
    const snapshot = runtimeEngine.getSnapshot();
    const cache = cacheRef.current;
    if (snapshot === cache.snapshot && selector === cache.selector) {
      return cache.result;
    }

    const nextResult = selector(snapshot);
    if (cache.selector !== null && areSelectionResultsEqual(cache.result, nextResult)) {
      cache.snapshot = snapshot;
      cache.selector = selector;
      return cache.result;
    }

    cache.snapshot = snapshot;
    cache.selector = selector;
    cache.result = nextResult;
    return cache.result;
  };

  return useSyncExternalStore(
    runtimeEngine.subscribe,
    getSnapshot,
    getSnapshot
  );
}

