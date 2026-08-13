import { describe, expect, it } from 'vitest';

import { applyFilter } from '../lib/filter';
import { clearLoaderCache, loadFeedback } from '../lib/loader';
import { countTotal, negativeRatio } from '../lib/metrics';

describe('Phase 2 metrics', () => {
  const records = () => {
    clearLoaderCache();
    return loadFeedback();
  };

  it('matches every fixed value from the SPEC 8.2 metrics table', () => {
    const allRecords = records();

    const all30Days = applyFilter(allRecords, { period: '30d', productId: 'all' });
    expect(countTotal(all30Days)).toBe(300);
    expect(negativeRatio(all30Days)).toBe(45.0);

    const p00130Days = applyFilter(allRecords, { period: '30d', productId: 'P-001' });
    expect(countTotal(p00130Days)).toBe(140);
    expect(negativeRatio(p00130Days)).toBe(55.0);

    const p00230Days = applyFilter(allRecords, { period: '30d', productId: 'P-002' });
    expect(countTotal(p00230Days)).toBe(90);
    expect(negativeRatio(p00230Days)).toBe(40.0);

    const p00330Days = applyFilter(allRecords, { period: '30d', productId: 'P-003' });
    expect(countTotal(p00330Days)).toBe(70);
    expect(negativeRatio(p00330Days)).toBe(31.4);

    const all7Days = applyFilter(allRecords, { period: '7d', productId: 'all' });
    expect(countTotal(all7Days)).toBe(111);
    expect(negativeRatio(all7Days)).toBe(57.7);

    const p0017Days = applyFilter(allRecords, { period: '7d', productId: 'P-001' });
    expect(countTotal(p0017Days)).toBe(63);
    expect(negativeRatio(p0017Days)).toBe(71.4);
  });
});
