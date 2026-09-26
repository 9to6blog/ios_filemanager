export type Location = { id: string; name: string; kind: 'local' | 'external'; available: boolean };
export type Entry = { name: string; path: string; isDirectory: boolean; size: number; modified: number; type: string };
export type FileRef = { location: string; path: string };
export interface FilesAPI {
  showSystemBrowser(): Promise<void>;
  configureAppLock(): Promise<void>;
  locations(): Promise<Location[]>;
  connectFolder(): Promise<Location | null>;
  disconnect(id: string): Promise<void>;
  list(id: string, path: string): Promise<Entry[]>;
  mkdir(id: string, path: string, name: string): Promise<void>;
  rename(id: string, path: string, name: string): Promise<void>;
  transfer(id: string, path: string, destination: string, folder: string, move: boolean): Promise<void>;
  remove(id: string, path: string): Promise<void>;
  importFiles(id: string, path: string): Promise<number>;
  preview(id: string, path: string): Promise<void>;
  share(id: string, path: string): Promise<void>;
  thumbnail(id: string, path: string): Promise<string | null>;
}
