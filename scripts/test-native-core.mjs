import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Compile the actual Foundation-only helpers from the production module,
// so these tests do not maintain a second copy of file-operation logic.
const source = readFileSync('modules/moa-files/ios/MoaFilesModule.swift', 'utf8');
const start = source.indexOf('  private func validName(');
const end = source.indexOf('  private func read(', start);
if (start < 0 || end < 0) throw new Error('Native helper boundaries changed; update the test harness.');
const helpers = source.slice(start, end).replaceAll('private func ', 'func ');
const tests = readFileSync('tests/native-file-ops.swift', 'utf8');
mkdirSync('build/native-tests', { recursive: true });
writeFileSync('build/native-tests/main.swift', `import Foundation
func failure(_ message: String) -> NSError { NSError(domain: "MoaFiles", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
final class FileCore {
  let fm = FileManager.default
${helpers}
}
${tests}`);
for (const [command, args] of [
  ['swiftc', ['build/native-tests/main.swift', '-o', 'build/native-tests/file-tests']],
  ['./build/native-tests/file-tests', []],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
