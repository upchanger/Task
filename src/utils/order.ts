/**
 * Compute a fractional order value between two neighboring Kanban cards
 * so moving a task only updates a single Firestore document.
 */
export function computeOrderBetween(prevOrder: number | null, nextOrder: number | null): number {
  if (prevOrder === null && nextOrder === null) return 1000;
  if (prevOrder === null && nextOrder !== null) return nextOrder - 1000;
  if (prevOrder !== null && nextOrder === null) return prevOrder + 1000;
  return ((prevOrder ?? 0) + (nextOrder ?? 0)) / 2;
}
