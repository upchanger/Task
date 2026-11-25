import { describe, expect, it } from 'vitest';
import { computeOrderBetween } from '@/utils/order';

describe('computeOrderBetween', () => {
  it('returns 1000 for an empty column', () => {
    expect(computeOrderBetween(null, null)).toBe(1000);
  });

  it('places before the first item when prevOrder is null', () => {
    expect(computeOrderBetween(null, 1000)).toBe(0);
  });

  it('places after the last item when nextOrder is null', () => {
    expect(computeOrderBetween(2000, null)).toBe(3000);
  });

  it('places midway between two adjacent items', () => {
    expect(computeOrderBetween(1000, 2000)).toBe(1500);
  });
});
