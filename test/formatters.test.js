import test from 'node:test';
import assert from 'node:assert';
import { formatPHP, formatDate, getDueDateStatus, formatPercent, parseLocalDate } from '../src/lib/formatters.js';

test('formatPHP formats currency as Philippine Peso', () => {
  const result = formatPHP(12500);
  assert.ok(result.includes('12,500.00'), `Expected formatted amount, got ${result}`);
});

test('formatPercent formats percentage correctly', () => {
  assert.strictEqual(formatPercent(75.43), '75.4%');
  assert.strictEqual(formatPercent(100), '100.0%');
});

test('getDueDateStatus detects overdue dates', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);
  const status = getDueDateStatus(yesterday);
  assert.strictEqual(status.isOverdue, true);
  assert.strictEqual(status.daysRemaining, -2);
});

test('getDueDateStatus detects upcoming dates', () => {
  const future = new Date();
  future.setDate(future.getDate() + 5);
  const status = getDueDateStatus(future);
  assert.strictEqual(status.isOverdue, false);
  assert.strictEqual(status.daysRemaining, 5);
});

test('parseLocalDate parses YYYY-MM-DD correctly without shift', () => {
  const d = parseLocalDate('2026-10-26');
  assert.strictEqual(d.getFullYear(), 2026);
  assert.strictEqual(d.getMonth(), 9); // 0-indexed October
  assert.strictEqual(d.getDate(), 26);
});
