import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { writeFilesTransaction } from './atomicWrite.js';

async function withTempDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'warfrontier-mcp-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('writeFilesTransaction commits multiple files together', async () => {
  await withTempDirectory(async (directory) => {
    const first = path.join(directory, 'stats', 'body.json');
    const second = path.join(directory, 'docs', 'unit.md');

    await writeFilesTransaction([
      { path: first, content: '{"FED-H02":{}}\n' },
      { path: second, content: '# Unit\n', mustNotExist: true },
    ]);

    assert.equal(await readFile(first, 'utf8'), '{"FED-H02":{}}\n');
    assert.equal(await readFile(second, 'utf8'), '# Unit\n');
  });
});

test('writeFilesTransaction refuses duplicate destinations before writing', async () => {
  await withTempDirectory(async (directory) => {
    const destination = path.join(directory, 'same.json');

    await assert.rejects(
      writeFilesTransaction([
        { path: destination, content: 'one' },
        { path: destination, content: 'two' },
      ]),
      /Duplicate transaction destination/,
    );

    await assert.rejects(readFile(destination, 'utf8'), { code: 'ENOENT' });
  });
});

test('mustNotExist protects existing files and preserves all originals', async () => {
  await withTempDirectory(async (directory) => {
    const existing = path.join(directory, 'existing.md');
    const other = path.join(directory, 'other.json');
    await writeFile(existing, 'original documentation', 'utf8');
    await writeFile(other, 'original json', 'utf8');

    await assert.rejects(
      writeFilesTransaction([
        { path: other, content: 'replacement json' },
        { path: existing, content: 'replacement documentation', mustNotExist: true },
      ]),
      /Refusing to overwrite existing file/,
    );

    assert.equal(await readFile(existing, 'utf8'), 'original documentation');
    assert.equal(await readFile(other, 'utf8'), 'original json');
  });
});

test('transaction replaces existing files and leaves no temporary artifacts', async () => {
  await withTempDirectory(async (directory) => {
    const destination = path.join(directory, 'research.json');
    await writeFile(destination, 'old', 'utf8');

    await writeFilesTransaction([{ path: destination, content: 'new' }]);

    assert.equal(await readFile(destination, 'utf8'), 'new');
    const entries = await import('node:fs/promises').then(({ readdir }) => readdir(directory));
    assert.deepEqual(entries, ['research.json']);
  });
});
