import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryOf, formatSize, isDescendant, validateName, visibleEntries } from '../src/lib/file-utils.ts';

test('reject dangerous filenames without rejecting Korean names', () => {
  for (const name of ['', '  ', '..', '.', '../a', 'a/b', 'a\\b', 'a\u0000b', 'a\nb', '가'.repeat(81)]) assert.throws(() => validateName(name));
  assert.equal(validateName('  여행 사진.jpg  '), '여행 사진.jpg');
  assert.equal(validateName('report..txt'), 'report..txt');
});
test('descendant check respects path-component boundaries', () => {
  assert.equal(isDescendant('photo/backups', 'photo'), true);
  assert.equal(isDescendant('photos', 'photo'), false);
  assert.equal(isDescendant('photo', 'photo'), true);
});
test('types are case insensitive and folders are never classified as images', () => {
  assert.equal(categoryOf({ name: 'A.HEIC', isDirectory: false }), 'image');
  assert.equal(categoryOf({ name: 'film.MOV', isDirectory: false }), 'video');
  assert.equal(categoryOf({ name: 'x.jpg', isDirectory: true }), 'folder');
});
test('filter searches the current list and folders sort before files', () => {
  const entries = [
    { name: 'z', path: 'z', isDirectory: true, size: 0, modified: 1, type: '' },
    { name: 'A.JPG', path: 'A.JPG', isDirectory: false, size: 100, modified: 2, type: '' },
    { name: 'b.jpg', path: 'b.jpg', isDirectory: false, size: 200, modified: 3, type: '' },
  ];
  assert.deepEqual(visibleEntries(entries, '', 'all', 'size').map(e => e.name), ['z', 'b.jpg', 'A.JPG']);
  assert.deepEqual(visibleEntries(entries, 'a.', 'image', 'name').map(e => e.name), ['A.JPG']);
  assert.deepEqual(entries.map(e => e.name), ['z', 'A.JPG', 'b.jpg']);
});
test('file sizes use binary units', () => {
  assert.equal(formatSize(0), '0 B');
  assert.equal(formatSize(1024), '1.0 KB');
  assert.equal(formatSize(1024 ** 3), '1.0 GB');
});
