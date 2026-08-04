import assert from 'node:assert/strict';
import test from 'node:test';

import { nextNumericId, nextTemplateId } from './suggestIds.js';

test('nextNumericId returns the first identifier when no IDs exist', () => {
  assert.equal(nextNumericId([], 'FED-WPN-', 3), 'FED-WPN-001');
});

test('nextNumericId fills the first gap instead of only incrementing the maximum', () => {
  assert.equal(
    nextNumericId(['FED-WPN-001', 'FED-WPN-003', 'OTHER-002'], 'FED-WPN-', 3),
    'FED-WPN-002',
  );
});

test('nextNumericId ignores malformed and unrelated identifiers', () => {
  assert.equal(
    nextNumericId(['FED-H01', 'FED-HXX', 'FED-H-02', 'FED-WPN-001'], 'FED-H', 2),
    'FED-H02',
  );
});

test('nextNumericId preserves values beyond the requested minimum width', () => {
  const keys = Array.from({ length: 105 }, (_, index) => `FED-RES-${String(index + 1).padStart(3, '0')}`);
  assert.equal(nextNumericId(keys, 'FED-RES-', 3), 'FED-RES-106');
});

test('nextTemplateId derives the preferred template from the suggested body', () => {
  assert.equal(nextTemplateId([], 'FED-H07'), 'FED-TPL-H07');
});

test('nextTemplateId falls back to a generic free template ID when preferred is occupied', () => {
  assert.equal(
    nextTemplateId(['FED-TPL-H07', 'FED-TPL-001', 'FED-TPL-003'], 'FED-H07'),
    'FED-TPL-002',
  );
});
