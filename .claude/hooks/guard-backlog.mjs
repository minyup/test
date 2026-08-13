#!/usr/bin/env node

// PreToolUse 훅 — 파일 도구가 backlog.json을 직접 읽거나 고치는 것을 막는다.
// 백로그는 tools/backlog.mjs의 list/set/validate로만 다룬다.

import { basename } from 'node:path';

const GUARDED_FILE = 'backlog.json';
const MESSAGE = '백로그는 tools/backlog.mjs로만 읽고 수정할 수 있습니다. list/set/validate를 쓰세요.';
const GUARDED_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function readStdin() {
  return new Promise((resolve) => {
    let buffer = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
    });
    process.stdin.on('end', () => resolve(buffer));
    process.stdin.on('error', () => resolve(buffer));
  });
}

function allow() {
  // 아무것도 출력하지 않으면 평소의 권한 흐름을 그대로 탄다.
  process.exit(0);
}

function deny() {
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: MESSAGE,
    },
    systemMessage: MESSAGE,
  })}\n`);
  process.exit(0);
}

const raw = await readStdin();

// 훅이 스스로 판단하지 못하는 상황에서 작업을 막지 않는다.
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  allow();
}

if (!GUARDED_TOOLS.has(payload?.tool_name)) {
  allow();
}

const input = payload?.tool_input ?? {};
const targets = [input.file_path, input.notebook_path, input.path]
  .filter((value) => typeof value === 'string' && value.length > 0);

if (targets.some((target) => basename(target.replace(/\\/g, '/')) === GUARDED_FILE)) {
  deny();
}

allow();
