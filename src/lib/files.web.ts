import type { Entry, FilesAPI } from './types';
import { isDescendant, joinPath, parentPath, validateName } from './file-utils';

export const isDemo = true;
export const isNativeAvailable = true;
type DemoEntry = Entry & { blob?: Blob };
const items = new Map<string, DemoEntry>();
function put(path: string, isDirectory: boolean, blob?: Blob) {
  items.set(path, { path, name: path.split('/').pop()!, isDirectory, size: blob?.size ?? 0, modified: Date.now(), type: blob?.type ?? '', blob });
}
put('문서', true); put('사진', true); put('영상', true);
put('시작하기.txt', false, new Blob(['Moa Files에 오신 것을 환영합니다.\n\n이 화면은 브라우저 데모입니다.\n파일을 가져오고 복사·이동을 시험해 볼 수 있습니다.\n새로고침하면 데모 파일은 초기화됩니다.\n\niPhone 앱에서는 실제 저장소를 관리합니다.'], { type: 'text/plain' }));

function get(path: string) {
  const value = items.get(path);
  if (!value) throw new Error('파일을 찾을 수 없습니다.');
  return value;
}
function assertDestination(path: string) {
  if (items.has(path)) throw new Error('같은 이름의 항목이 있습니다. 먼저 이름을 바꿔 주세요.');
  const parent = parentPath(path);
  if (parent && !get(parent).isDirectory) throw new Error('대상 폴더를 찾을 수 없습니다.');
}
function relocate(path: string, destination: string, move: boolean) {
  get(path);
  if (isDescendant(destination, path)) throw new Error('같은 위치나 하위 폴더로 복사·이동할 수 없습니다.');
  assertDestination(destination);
  const affected = [...items.values()].filter(item => isDescendant(item.path, path));
  for (const item of affected) {
    const newPath = destination + item.path.slice(path.length);
    items.set(newPath, { ...item, path: newPath, name: newPath.split('/').pop()! });
  }
  if (move) for (const item of affected) items.delete(item.path);
}
async function openBlob(path: string) {
  const blob = get(path).blob;
  if (!blob) throw new Error('미리 볼 파일이 없습니다.');
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  // Browsers with noopener may return null even when opening succeeds.
  void tab;
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
export const files: FilesAPI = {
  async showSystemBrowser() { throw new Error('전체 파일 탐색은 iPhone 앱에서 사용할 수 있습니다.'); },
  async configureAppLock() { throw new Error('Face ID 앱 잠금은 iPhone 앱에서 사용할 수 있습니다.'); },
  async thumbnail() { return null; },
  async locations() { return [{ id: 'local', name: '앱 저장소', kind: 'local', available: true }]; },
  async connectFolder() { throw new Error('외부 폴더 연결은 iPhone 앱에서 사용할 수 있습니다. 브라우저에서는 파일 가져오기로 시험해 보세요.'); },
  async disconnect() { throw new Error('내 파일은 연결 해제할 수 없습니다.'); },
  async list(_id, path) { return [...items.values()].filter(item => parentPath(item.path) === path); },
  async mkdir(_id, path, name) { const target = joinPath(path, validateName(name)); assertDestination(target); put(target, true); },
  async rename(_id, path, name) { const target = joinPath(parentPath(path), validateName(name)); if (path !== target) relocate(path, target, true); },
  async transfer(_id, path, _destination, folder, move) { relocate(path, joinPath(folder, get(path).name), move); },
  async remove(_id, path) { get(path); for (const key of [...items.keys()]) if (isDescendant(key, path)) items.delete(key); },
  async importFiles(_id, path) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file'; input.multiple = true;
      input.oncancel = () => resolve(0);
      input.onchange = () => {
        const selected = Array.from(input.files ?? []);
        for (const file of selected) {
          let name = file.name, index = 2;
          const dot = name.lastIndexOf('.');
          const stem = dot > 0 ? name.slice(0, dot) : name;
          const extension = dot > 0 ? name.slice(dot) : '';
          while (items.has(joinPath(path, name))) name = `${stem} (${index++})${extension}`;
          put(joinPath(path, name), false, file);
        }
        resolve(selected.length);
      };
      input.click();
    });
  },
  async preview(_id, path) { await openBlob(path); },
  async share(_id, path) {
    const entry = get(path);
    if (!entry.blob) throw new Error('브라우저 데모에서는 파일만 내보낼 수 있습니다.');
    const url = URL.createObjectURL(entry.blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = entry.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  },
};
