import { describe, expect, it } from 'vitest';

import { clearLoaderCache, loadProducts } from '../lib/loader';

describe('test runner', () => {
  it('reads the real products data without mocking', () => {
    clearLoaderCache();

    expect(loadProducts()).not.toHaveLength(0);
  });
});
