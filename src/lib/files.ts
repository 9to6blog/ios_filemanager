import { requireOptionalNativeModule } from 'expo';
import type { FilesAPI } from './types';

const native = requireOptionalNativeModule<FilesAPI>('MoaFiles');
export const isDemo = false;
export const isNativeAvailable = native !== null;
const unavailable = async (): Promise<never> => {
  throw new Error('Moa Files 전용 iOS 앱을 설치해 주세요. Expo Go에는 파일 관리 모듈이 포함되어 있지 않습니다.');
};
export const files: FilesAPI = native ?? {
  showSystemBrowser: unavailable, configureAppLock: unavailable,
  locations: unavailable, connectFolder: unavailable, disconnect: unavailable,
  list: unavailable, mkdir: unavailable, rename: unavailable, transfer: unavailable,
  remove: unavailable, importFiles: unavailable, preview: unavailable, share: unavailable, thumbnail: unavailable,
};
