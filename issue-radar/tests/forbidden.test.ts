import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { clearLoaderCache, loadFeedback, loadProducts } from '../lib/loader';

/**
 * 금지 규칙 스캔 (SPEC 4.7 · 8.4).
 *
 * 소스와 데이터 전체를 훑어 API 키 형태 문자열·실제 사이트 URL·실명·실제 브랜드명이
 * 한 건도 없는 것을 본다. 사람이 한 번 훑고 끝내지 않고 테스트로 둔 이유는,
 * 나중에 Phase 6·7에서 코드와 데이터가 늘어날 때 이 규칙이 조용히 깨지기 때문이다.
 *
 * `tests/`는 훑는 대상에서 뺀다. 이 파일 자체가 금지어 목록을 글자로 들고 있어서,
 * 스스로를 훑으면 언제나 걸린다.
 */

const APP_ROOT = join(import.meta.dirname, '..');
const SCANNED_ROOTS = ['app', 'lib', 'scripts', 'data'];
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js', '.json', '.css']);

function collectFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectFiles(full));
    } else if (SCANNED_EXTENSIONS.has(extname(entry))) {
      found.push(full);
    }
  }
  return found;
}

const SCANNED_FILES = SCANNED_ROOTS.flatMap((root) => collectFiles(join(APP_ROOT, root)));
const DATA_FILES = collectFiles(join(APP_ROOT, 'data'));

/** 파일 이름과 몇 번째 줄인지를 함께 낸다 — 걸렸을 때 바로 열어 고칠 수 있어야 한다 */
function findLines(pattern: RegExp, files: string[] = SCANNED_FILES): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        hits.push(`${relative(APP_ROOT, file)}:${index + 1}: ${line.trim().slice(0, 120)}`);
      }
      pattern.lastIndex = 0;
    });
  }
  return hits;
}

/**
 * 키처럼 생긴 문자열. 값의 무작위성으로 판별하지 않는다 —
 * `content_hash`가 16자리 16진수라 무작위성만 보면 300건이 전부 걸린다.
 */
const KEY_SHAPED = [
  /sk-[A-Za-z0-9]{16,}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret|password)\b\s*[:=]/i,
];

/** 이 이름들이 데이터에 섞이면 가상 제품이라는 전제가 무너진다(SPEC 2.1 · 4.7) */
const REAL_BRAND_WORDS = [
  '삼성',
  'Samsung',
  '갤럭시',
  'Galaxy',
  'LG전자',
  '애플',
  'Apple',
  '아이폰',
  'iPhone',
  '아이패드',
  'iPad',
  '소니',
  'Sony',
  '샤오미',
  'Xiaomi',
  '화웨이',
  'Huawei',
];

/** SPEC 2.1이 정한 가상 이름. products.json에는 이 밖의 이름이 있으면 안 된다 */
const FICTIONAL_BRANDS = ['노바텍', '오리온디스플레이'];
const FICTIONAL_PRODUCTS = ['루멘 폰 X', '아틀라스 탭 11', '클리어뷰 모니터 27'];

describe('forbidden content scan', () => {
  it('scans a non-empty set of source and data files', () => {
    // 훑을 파일을 한 개도 못 찾았는데 통과해 버리는 것이 가장 위험한 실패다
    expect(SCANNED_FILES.length).toBeGreaterThan(10);
  });

  it('has no API-key-shaped string anywhere in source or data', () => {
    for (const pattern of KEY_SHAPED) {
      expect(findLines(pattern)).toEqual([]);
    }
  });

  it('never reads an environment variable to run the app', () => {
    // .env가 없어도 대시보드가 떠야 한다(SPEC 8.4). 읽는 코드가 아예 없어야 확실하다
    expect(findLines(/process\.env\b/)).toEqual([]);
  });

  it('writes every URL as a fake example.com URL', () => {
    const urls = SCANNED_FILES.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/https?:\/\/[^\s"'`)]+/g)].map((match) => ({
        file: relative(APP_ROOT, file),
        url: match[0],
      })),
    );

    const outsiders = urls.filter((entry) => !entry.url.startsWith('https://example.com/'));
    expect(outsiders).toEqual([]);
    expect(urls.length).toBeGreaterThan(0);
  });

  /**
   * 브랜드명은 `data/`만 훑는다. 금지 규칙이 막는 것은 "데이터에 실제 브랜드명을
   * 넣는 것"이고(SPEC 4.7), 코드가 시스템 글꼴 이름을 적는 것은 여기에 해당하지 않는다 —
   * `globals.css`의 `Apple SD Gothic Neo`는 macOS에서 한글을 그리기 위한 글꼴 이름이지
   * 데이터에 심어 둔 제품명이 아니다.
   */
  it('mentions no real brand or product name in the data files', () => {
    for (const word of REAL_BRAND_WORDS) {
      expect(findLines(new RegExp(word, 'i'), DATA_FILES)).toEqual([]);
    }
  });
});

describe('forbidden content scan — loaded records', () => {
  const loadData = () => {
    clearLoaderCache();
    return { products: loadProducts(), records: loadFeedback() };
  };

  it('names every author 익명N and nothing else', () => {
    const { records } = loadData();
    const wrong = records
      .filter((record) => !/^익명([1-9]|[1-3][0-9]|40)$/.test(record.author_name))
      .map((record) => `${record.id}: ${record.author_name}`);

    expect(wrong).toEqual([]);
  });

  it('points every original_url at example.com', () => {
    const { records } = loadData();
    const wrong = records
      .filter((record) => !record.original_url.startsWith('https://example.com/'))
      .map((record) => `${record.id}: ${record.original_url}`);

    expect(wrong).toEqual([]);
  });

  it('uses only the fictional brand and product names from SPEC 2.1', () => {
    const { products } = loadData();

    // 브랜드는 제품마다 겹칠 수 있으므로 목록이 아니라 소속을 본다
    const strangeBrands = products
      .filter((product) => !FICTIONAL_BRANDS.includes(product.brand))
      .map((product) => `${product.id}: ${product.brand}`);
    expect(strangeBrands).toEqual([]);

    expect(products.map((product) => product.name).sort()).toEqual([...FICTIONAL_PRODUCTS].sort());
  });
});
