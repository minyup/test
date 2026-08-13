import { describe, expect, it } from 'vitest';

import { clearLoaderCache, loadFeedback, loadProducts } from '../lib/loader';
import type { FeedbackRecord } from '../lib/types';

const RECENT_7_DAYS = ['2026-08-07', '2026-08-13'] as const;
const PREVIOUS_7_DAYS = ['2026-07-31', '2026-08-06'] as const;
const EARLIER_16_DAYS = ['2026-07-15', '2026-07-30'] as const;

function inRange(record: FeedbackRecord, [start, end]: readonly [string, string]): boolean {
  const date = record.published_at.slice(0, 10);
  return date >= start && date <= end;
}

function countByProduct(records: FeedbackRecord[]) {
  return Object.fromEntries(
    ['P-001', 'P-002', 'P-003'].map((productId) => [
      productId,
      records.filter((record) => record.analysis.product_id === productId).length,
    ]),
  );
}

function negativeCountByProduct(records: FeedbackRecord[]) {
  return Object.fromEntries(
    ['P-001', 'P-002', 'P-003'].map((productId) => [
      productId,
      records.filter(
        (record) =>
          record.analysis.product_id === productId && record.analysis.sentiment === 'negative',
      ).length,
    ]),
  );
}

describe('Phase 1 data integrity', () => {
  const loadData = () => {
    clearLoaderCache();
    return { products: loadProducts(), records: loadFeedback() };
  };

  it('loads exactly 300 feedback records and three products from the real JSON files', () => {
    const { products, records } = loadData();

    expect(products).toHaveLength(3);
    expect(records).toHaveLength(300);
  });

  it('keeps every feedback item matched to one distinct analysis', () => {
    const { records } = loadData();

    expect(new Set(records.map((record) => record.id)).size).toBe(300);
    expect(new Set(records.map((record) => record.analysis.id)).size).toBe(300);
    expect(records.every((record) => record.analysis.feedback_item_id === record.id)).toBe(true);
  });

  it('matches the fixed product and sentiment distribution', () => {
    const { records } = loadData();

    expect(countByProduct(records)).toEqual({ 'P-001': 140, 'P-002': 90, 'P-003': 70 });
    expect(
      Object.fromEntries(
        ['P-001', 'P-002', 'P-003'].map((productId) => [
          productId,
          Object.fromEntries(
            ['negative', 'neutral', 'positive'].map((sentiment) => [
              sentiment,
              records.filter(
                (record) =>
                  record.analysis.product_id === productId && record.analysis.sentiment === sentiment,
              ).length,
            ]),
          ),
        ]),
      ),
    ).toEqual({
      'P-001': { negative: 77, neutral: 45, positive: 18 },
      'P-002': { negative: 36, neutral: 33, positive: 21 },
      'P-003': { negative: 22, neutral: 27, positive: 21 },
    });
  });

  it('matches all seven fixed category counts', () => {
    const { records } = loadData();

    expect(
      Object.fromEntries(
        ['화질', '성능', '발열', '소비전력', '내구성', '가격', '기타'].map((category) => [
          category,
          records.filter((record) => record.analysis.issue_category === category).length,
        ]),
      ),
    ).toEqual({
      화질: 96,
      성능: 54,
      발열: 39,
      소비전력: 33,
      내구성: 30,
      가격: 27,
      기타: 21,
    });
  });

  it('matches the fixed date-range distribution, including the P-001 negative surge', () => {
    const { records } = loadData();

    const recentRecords = records.filter((record) => inRange(record, RECENT_7_DAYS));
    const previousRecords = records.filter((record) => inRange(record, PREVIOUS_7_DAYS));
    const earlierRecords = records.filter((record) => inRange(record, EARLIER_16_DAYS));
    const todayRecords = records.filter((record) => record.published_at.startsWith('2026-08-13'));

    expect(recentRecords).toHaveLength(111);
    expect(countByProduct(recentRecords)).toEqual({
      'P-001': 63,
      'P-002': 28,
      'P-003': 20,
    });
    expect(negativeCountByProduct(recentRecords)).toEqual({ 'P-001': 45, 'P-002': 11, 'P-003': 8 });

    expect(previousRecords).toHaveLength(63);
    expect(countByProduct(previousRecords)).toEqual({
      'P-001': 26,
      'P-002': 20,
      'P-003': 17,
    });
    expect(negativeCountByProduct(previousRecords)).toEqual({ 'P-001': 12, 'P-002': 8, 'P-003': 5 });

    expect(earlierRecords).toHaveLength(126);
    expect(countByProduct(earlierRecords)).toEqual({
      'P-001': 51,
      'P-002': 42,
      'P-003': 33,
    });
    expect(negativeCountByProduct(earlierRecords)).toEqual({ 'P-001': 20, 'P-002': 17, 'P-003': 9 });

    expect(todayRecords).toHaveLength(16);
    expect(countByProduct(todayRecords)).toEqual({ 'P-001': 9, 'P-002': 4, 'P-003': 3 });
  });
});
