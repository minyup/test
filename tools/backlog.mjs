#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backlogPath = resolve(scriptDirectory, '..', 'backlog.json');

const topLevelFields = ['$schema_version', 'meta', 'enums', 'tasks'];
const metaFields = ['updated', 'context_doc', 'note'];
const enumFields = ['status', 'priority', 'category'];
const taskFields = [
  'id',
  'status',
  'priority',
  'category',
  'title',
  'summary',
  'where',
  'parent',
  'deps',
  'doc',
  'done_at',
  'note',
];

function hasOwn(value, field) {
  return value !== null
    && typeof value === 'object'
    && Object.hasOwn(value, field);
}

async function loadBacklog() {
  let source;
  try {
    source = await readFile(backlogPath, 'utf8');
  } catch (error) {
    throw new Error(`backlog.json을 읽을 수 없습니다: ${error.message}`);
  }

  try {
    return { source, data: JSON.parse(source) };
  } catch (error) {
    throw new Error(`backlog.json이 올바른 JSON이 아닙니다: ${error.message}`);
  }
}

// 파일 전체를 다시 직렬화하면 배열 줄바꿈 같은 원본 서식이 전부 바뀐다.
// 바꾸려는 status 값의 글자만 잘라 끼워 나머지 바이트는 그대로 둔다.
function replaceStatusInSource(source, id, status) {
  const idPattern = new RegExp(`"id"\\s*:\\s*"${id}"`);
  const idMatch = idPattern.exec(source);
  if (!idMatch) {
    return null;
  }

  const statusPattern = /("status"\s*:\s*")([^"\\]*)(")/g;
  statusPattern.lastIndex = idMatch.index;
  const statusMatch = statusPattern.exec(source);
  if (!statusMatch) {
    return null;
  }

  const valueStart = statusMatch.index + statusMatch[1].length;
  const valueEnd = valueStart + statusMatch[2].length;
  return source.slice(0, valueStart) + status + source.slice(valueEnd);
}

function validateBacklog(backlog) {
  const problems = [];

  for (const field of topLevelFields) {
    if (!hasOwn(backlog, field)) {
      problems.push(`최상위 필수 필드 누락: ${field}`);
    }
  }

  if (hasOwn(backlog, 'meta')) {
    if (backlog.meta === null || typeof backlog.meta !== 'object' || Array.isArray(backlog.meta)) {
      problems.push('meta는 객체여야 합니다');
    } else {
      for (const field of metaFields) {
        if (!hasOwn(backlog.meta, field)) {
          problems.push(`meta 필수 필드 누락: ${field}`);
        }
      }
    }
  }

  if (hasOwn(backlog, 'enums')) {
    if (backlog.enums === null || typeof backlog.enums !== 'object' || Array.isArray(backlog.enums)) {
      problems.push('enums는 객체여야 합니다');
    } else {
      for (const field of enumFields) {
        if (!hasOwn(backlog.enums, field)) {
          problems.push(`enums 필수 필드 누락: ${field}`);
        } else if (
          !Array.isArray(backlog.enums[field])
          || backlog.enums[field].length === 0
          || backlog.enums[field].some((value) => typeof value !== 'string' || value.length === 0)
        ) {
          problems.push(`enums.${field}는 비어 있지 않은 문자열 배열이어야 합니다`);
        }
      }
    }
  }

  if (hasOwn(backlog, 'tasks') && !Array.isArray(backlog.tasks)) {
    problems.push('tasks는 배열이어야 합니다');
  }

  if (!Array.isArray(backlog.tasks)) {
    return problems;
  }

  const seenIds = new Set();
  backlog.tasks.forEach((task, index) => {
    const label = hasOwn(task, 'id') ? String(task.id) : `tasks[${index}]`;

    if (task === null || typeof task !== 'object' || Array.isArray(task)) {
      problems.push(`tasks[${index}]는 객체여야 합니다`);
      return;
    }

    for (const field of taskFields) {
      if (!hasOwn(task, field)) {
        problems.push(`${label}: 필수 필드 누락: ${field}`);
      }
    }

    if (hasOwn(task, 'id')) {
      if (typeof task.id !== 'string' || !/^LB-\d{3}$/.test(task.id)) {
        problems.push(`${label}: id는 LB-숫자3자리 형식이어야 합니다`);
      } else if (seenIds.has(task.id)) {
        problems.push(`${label}: 중복 id입니다`);
      } else {
        seenIds.add(task.id);
      }
    }

    for (const field of enumFields) {
      const allowed = backlog.enums?.[field];
      if (hasOwn(task, field) && Array.isArray(allowed) && !allowed.includes(task[field])) {
        problems.push(`${label}: ${field} 값 '${task[field]}'은(는) enums.${field}에 없습니다`);
      }
    }

    if (hasOwn(task, 'deps') && !Array.isArray(task.deps)) {
      problems.push(`${label}: deps는 배열이어야 합니다`);
    }
  });

  return problems;
}

function printUsage() {
  console.error('사용법: node tools/backlog.mjs <list|set|validate> [인수]');
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!['list', 'set', 'validate'].includes(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const { source, data: backlog } = await loadBacklog();

  if (command === 'list') {
    if (args.length !== 0) {
      printUsage();
      process.exitCode = 1;
      return;
    }
    if (!Array.isArray(backlog.tasks)) {
      throw new Error('tasks가 배열이 아니므로 목록을 출력할 수 없습니다');
    }
    for (const task of backlog.tasks) {
      console.log(`${task.id}\t${task.status}\t${task.title}`);
    }
    return;
  }

  if (command === 'set') {
    if (args.length !== 2) {
      console.error('사용법: node tools/backlog.mjs set <id> <status>');
      process.exitCode = 1;
      return;
    }

    const [id, status] = args;
    const allowedStatuses = backlog.enums?.status;
    if (!Array.isArray(allowedStatuses)) {
      throw new Error('enums.status가 문자열 배열이 아닙니다');
    }
    if (!allowedStatuses.includes(status)) {
      console.error(`허용되지 않은 상태 '${status}'입니다. 허용값: ${allowedStatuses.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    const task = Array.isArray(backlog.tasks)
      ? backlog.tasks.find((item) => item?.id === id)
      : undefined;
    if (!task) {
      console.error(`작업을 찾을 수 없습니다: ${id}`);
      process.exitCode = 1;
      return;
    }

    if (task.status === status) {
      console.log(`${id}\t${status}\t${task.title}`);
      return;
    }

    const updated = replaceStatusInSource(source, id, status);
    if (updated === null) {
      throw new Error(`${id}의 status 위치를 파일에서 찾지 못했습니다`);
    }

    // 서식만 남기고 값이 정확히 하나 바뀌었는지 확인한 뒤에 쓴다.
    task.status = status;
    let reparsed;
    try {
      reparsed = JSON.parse(updated);
    } catch (error) {
      throw new Error(`수정 결과가 올바른 JSON이 아니라 저장하지 않았습니다: ${error.message}`);
    }
    if (JSON.stringify(reparsed) !== JSON.stringify(backlog)) {
      throw new Error('수정 결과가 의도한 내용과 달라 저장하지 않았습니다');
    }

    await writeFile(backlogPath, updated, 'utf8');
    console.log(`${id}\t${status}\t${task.title}`);
    return;
  }

  if (args.length !== 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const problems = validateBacklog(backlog);
  if (problems.length === 0) {
    console.log('VALID');
  } else {
    problems.forEach((problem) => console.log(`- ${problem}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
