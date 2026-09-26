let fm = FileManager.default
let core = FileCore()
let temporaryBase = fm.temporaryDirectory.resolvingSymlinksInPath().standardizedFileURL
let testRoot = temporaryBase.appendingPathComponent("moa-native-tests-" + UUID().uuidString, isDirectory: true)
try fm.createDirectory(at: testRoot, withIntermediateDirectories: false)
defer {
  // Only remove this run's isolated, verified temporary fixture directory.
  let resolved = testRoot.resolvingSymlinksInPath().standardizedFileURL
  if resolved.deletingLastPathComponent() == temporaryBase && resolved.lastPathComponent.hasPrefix("moa-native-tests-") {
    try? fm.removeItem(at: resolved)
  }
}
func check(_ condition: @autoclosure () throws -> Bool, _ name: String) throws {
  guard try condition() else { throw failure("FAIL: " + name) }
  print("PASS: " + name)
}
func rejects(_ name: String, _ operation: () throws -> Void) throws {
  do { try operation() } catch { print("PASS: " + name); return }
  throw failure("FAIL: expected rejection: " + name)
}

let root = testRoot.appendingPathComponent("root", isDirectory: true)
let outside = testRoot.appendingPathComponent("root-neighbor", isDirectory: true)
try fm.createDirectory(at: root, withIntermediateDirectories: false)
try fm.createDirectory(at: outside, withIntermediateDirectories: false)
for name in ["", ".", "..", "../secret", "a/b", "a\\b", "a\0b", String(repeating: "가", count: 81)] {
  try rejects("invalid file name \(name.debugDescription)") { _ = try core.validName(name) }
}
try check(core.validName(" 여행 사진.jpg ") == "여행 사진.jpg", "Korean file names")
try check(core.child(root, "").path == root.path, "empty path resolves authorized root")
try rejects("parent traversal") { _ = try core.child(root, "../root-neighbor") }
try rejects("absolute path") { _ = try core.child(root, "/etc/passwd") }
try fm.createSymbolicLink(at: root.appendingPathComponent("escape"), withDestinationURL: outside)
try rejects("symlink escape") { _ = try core.child(root, "escape/secret.txt") }

let source = root.appendingPathComponent("source.txt")
let target = root.appendingPathComponent("copy.txt")
try Data("original contents".utf8).write(to: source)
try core.copySafely(source, to: target)
try check(Data(contentsOf: source) == Data(contentsOf: target), "copy preserves content and source")
try Data("existing destination".utf8).write(to: target)
try rejects("existing destination is never overwritten") { try core.copySafely(source, to: target) }
try check(String(contentsOf: target, encoding: .utf8) == "existing destination", "collision leaves destination intact")
try check(String(contentsOf: source, encoding: .utf8) == "original contents", "collision leaves source intact")
try rejects("missing destination directory") { try core.copySafely(source, to: root.appendingPathComponent("missing/child.txt")) }
try check(fm.fileExists(atPath: source.path), "failed copy keeps original")

let directory = root.appendingPathComponent("photos", isDirectory: true)
try fm.createDirectory(at: directory, withIntermediateDirectories: false)
try Data([1, 2, 3, 4]).write(to: directory.appendingPathComponent("image.bin"))
let copiedDirectory = root.appendingPathComponent("photos-copy", isDirectory: true)
try core.copySafely(directory, to: copiedDirectory)
try check(Data(contentsOf: copiedDirectory.appendingPathComponent("image.bin")) == Data([1, 2, 3, 4]), "recursive folder copy")
try check(core.availableName("source.txt", in: root) == "source (2).txt", "import creates a non-conflicting name")
try Data().write(to: root.appendingPathComponent("source (2).txt"))
try check(core.availableName("source.txt", in: root) == "source (3).txt", "import skips existing numbered copies")
try check(fm.contentsOfDirectory(atPath: root.path).allSatisfy { !$0.hasPrefix(".moa-transfer-") }, "staging files cleaned after operations")
print("Native filesystem helper tests passed.")
