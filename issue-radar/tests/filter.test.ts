import { describe, expect, it } from 'vitest';

import { applyFilter } from '../lib/filter';
import { clearLoaderCache, loadFeedback } from '../lib/loader';

describe('Phase 4 filters', () => {
  const records = () => {
    clearLoaderCache();
    return loadFeedback();
  };

  it('matches every fixed count from the SPEC 8.3 filter table', () => {
    const allRecords = records();

    expect(applyFilter(allRecords, { period: '30d', productId: 'all' })).toHaveLength(300);
    expect(applyFilter(allRecords, { period: '30d', productId: 'P-001' })).toHaveLength(140);
    expect(applyFilter(allRecords, { period: '30d', productId: 'P-002' })).toHaveLength(90);
    expect(applyFilter(allRecords, { period: '30d', productId: 'P-003' })).toHaveLength(70);

    expect(applyFilter(allRecords, { period: '7d', productId: 'all' })).toHaveLength(111);
    expect(applyFilter(allRecords, { period: '7d', productId: 'P-001' })).toHaveLength(63);

    expect(applyFilter(allRecords, { period: 'today', productId: 'all' })).toHaveLength(16);
    expect(applyFilter(allRecords, { period: 'today', productId: 'P-001' })).toHaveLength(9);
  });
});
