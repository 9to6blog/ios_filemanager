import type { Entry } from './types';

export type Category = 'all' | 'image' | 'video' | 'document' | 'audio';
export function categoryOf(entry: Pick<Entry, 'name' | 'isDirectory'>): Category | 'folder' | 'other' {
  if (entry.isDirectory) return 'folder';
  const extension = entry.name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif', 'webp', 'bmp', 'tiff', 'svg'].includes(extension)) return 'image';
  if (['mp4', 'mov', 'm4v', 'mkv', 'avi', 'webm'].includes(extension)) return 'video';
  if (['mp3', 'm4a', 'wav', 'aac', 'flac', 'aiff', 'ogg'].includes(extension)) return 'audio';
  if (['pdf', 'txt', 'md', 'csv', 'json', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pages', 'numbers', 'key', 'rtf'].includes(extension)) return 'document';
  return 'other';
}

export function validateName(name: string): string {
  const value = name.trim();
  if (!value || value === '.' || value === '..' || /[/\\\u0000-\u001f]/.test(value)) throw new Error('이름에 /, \\ 또는 제어 문자를 사용할 수 없습니다.');
  if (new TextEncoder().encode(value).length > 240) throw new Error('파일 이름이 너무 깁니다.');
  return value;
}

export function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function parentPath(path: string): string { return path.split('/').slice(0, -1).join('/'); }
export function joinPath(path: string, name: string): string { return path ? `${path}/${name}` : name; }
export function isDescendant(path: string, parent: string): boolean { return path === parent || path.startsWith(`${parent}/`); }

export function visibleEntries(entries: Entry[], query: string, category: Category, sort: 'name' | 'date' | 'size'): Entry[] {
  return entries.filter(entry => entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (category === 'all' || categoryOf(entry) === category))
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) ||
      (sort === 'date' ? b.modified - a.modified : sort === 'size' ? b.size - a.size : a.name.localeCompare(b.name, 'ko', { numeric: true })));
}
