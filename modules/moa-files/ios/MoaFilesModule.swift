import ExpoModulesCore
import UIKit
import UniformTypeIdentifiers
import QuickLook
import QuickLookThumbnailing
import CryptoKit

private func failure(_ message: String) -> NSError {
  NSError(domain: "MoaFiles", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
}

/// All paths crossing the JS bridge are relative to a user-authorized root.
/// File operations run on one serial background queue, and coordinate with providers.
public final class MoaFilesModule: Module {
  private let io = DispatchQueue(label: "app.moa.files.io", qos: .userInitiated)
  private let fm = FileManager.default
  private let bookmarkKey = "moa.folderBookmarks.v1"
  private var pickerSession: PickerSession?
  private var previewSessions: [UUID: PreviewSession] = [:]

  public func definition() -> ModuleDefinition {
    Name("MoaFiles")

    AsyncFunction("thumbnail") { (id: String, path: String, promise: Promise) in
      do {
        let (root, access) = try self.openRoot(id)
        do {
          let url = try self.child(root, path)
          let values = try url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey, .isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey])
          if values.isUbiquitousItem == true && values.ubiquitousItemDownloadingStatus != .current {
            if access { root.stopAccessingSecurityScopedResource() }
            promise.resolve(); return
          }
          let token = "\(id)/\(path)/\(values.contentModificationDate?.timeIntervalSince1970 ?? 0)/\(values.fileSize ?? 0)"
          let digest = SHA256.hash(data: Data(token.utf8)).map { String(format: "%02x", $0) }.joined()
          let cache = self.fm.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("MoaThumbnails", isDirectory: true)
          try self.fm.createDirectory(at: cache, withIntermediateDirectories: true)
          let output = cache.appendingPathComponent(digest + ".jpg")
          if self.fm.fileExists(atPath: output.path) {
            if access { root.stopAccessingSecurityScopedResource() }
            promise.resolve(output.absoluteString); return
          }
          let request = QLThumbnailGenerator.Request(fileAt: url, size: CGSize(width: 160, height: 160), scale: 2, representationTypes: .thumbnail)
          QLThumbnailGenerator.shared.generateBestRepresentation(for: request) { representation, _ in
            defer { if access { root.stopAccessingSecurityScopedResource() } }
            guard let data = representation?.uiImage.jpegData(compressionQuality: 0.8) else { promise.resolve(); return }
            do { try data.write(to: output, options: .atomic); promise.resolve(output.absoluteString) }
            catch { promise.resolve() }
          }
        } catch {
          if access { root.stopAccessingSecurityScopedResource() }
          throw error
        }
      } catch { promise.resolve() }
    }.runOnQueue(io)

    AsyncFunction("locations") { () -> [[String: Any]] in
      var result: [[String: Any]] = [["id": "local", "name": "내 파일", "kind": "local", "available": true]]
      for (id, data) in self.bookmarks().sorted(by: { $0.key < $1.key }) {
        do {
          var stale = false
          let url = try URL(resolvingBookmarkData: data, options: [.withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale)
          result.append(["id": id, "name": url.lastPathComponent, "kind": "external", "available": true])
        } catch {
          result.append(["id": id, "name": "다시 연결할 폴더", "kind": "external", "available": false])
        }
      }
      return result
    }.runOnQueue(io)

    AsyncFunction("disconnect") { (id: String) in
      guard id != "local" else { throw failure("내 파일은 연결 해제할 수 없습니다.") }
      var saved = self.bookmarks()
      saved.removeValue(forKey: id)
      UserDefaults.standard.set(saved, forKey: self.bookmarkKey)
    }.runOnQueue(io)

    AsyncFunction("connectFolder") { (promise: Promise) in
      self.presentPicker(types: [.folder], copy: false, multiple: false, promise: promise) { urls in
        guard let url = urls.first else { promise.resolve(nil); return }
        self.io.async {
          let access = url.startAccessingSecurityScopedResource()
          defer { if access { url.stopAccessingSecurityScopedResource() } }
          do {
            let data = try url.bookmarkData(options: [.minimalBookmark], includingResourceValuesForKeys: nil, relativeTo: nil)
            var saved = self.bookmarks()
            // Reconnecting an already authorized folder should not add another sidebar row.
            let existing = saved.first { _, value in
              var stale = false
              return (try? URL(resolvingBookmarkData: value, options: [.withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale).standardizedFileURL) == url.standardizedFileURL
            }?.key
            let id = existing ?? UUID().uuidString
            saved[id] = data
            UserDefaults.standard.set(saved, forKey: self.bookmarkKey)
            promise.resolve(["id": id, "name": url.lastPathComponent, "kind": "external", "available": true])
          } catch { promise.reject(error) }
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("list") { (id: String, path: String) -> [[String: Any]] in
      try self.withRoot(id) { root in
        let url = try self.child(root, path)
        var entries: [[String: Any]] = []
        try self.read(url) { coordinated in
          let keys: Set<URLResourceKey> = [.isDirectoryKey, .isSymbolicLinkKey, .fileSizeKey, .contentModificationDateKey, .contentTypeKey]
          let urls = try self.fm.contentsOfDirectory(at: coordinated, includingPropertiesForKeys: Array(keys), options: [.skipsHiddenFiles])
          for item in urls {
            let values = try item.resourceValues(forKeys: keys)
            // Do not follow symbolic links outside the selected tree.
            if values.isSymbolicLink == true { continue }
            entries.append([
              "name": item.lastPathComponent,
              "path": path.isEmpty ? item.lastPathComponent : path + "/" + item.lastPathComponent,
              "isDirectory": values.isDirectory == true,
              "size": values.fileSize ?? 0,
              "modified": (values.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000,
              "type": values.contentType?.preferredMIMEType ?? "application/octet-stream"
            ])
          }
        }
        return entries
      }
    }.runOnQueue(io)

    AsyncFunction("mkdir") { (id: String, path: String, name: String) in
      try self.withRoot(id) { root in
        let parent = try self.child(root, path)
        let name = try self.validName(name)
        try self.write(parent) { folder in
          let target = folder.appendingPathComponent(name, isDirectory: true)
          try self.requireAbsent(target)
          try self.fm.createDirectory(at: target, withIntermediateDirectories: false)
        }
      }
    }.runOnQueue(io)

    AsyncFunction("rename") { (id: String, path: String, name: String) in
      guard !path.isEmpty else { throw failure("저장소 자체의 이름은 바꿀 수 없습니다.") }
      try self.withRoot(id) { root in
        let source = try self.child(root, path)
        let name = try self.validName(name)
        if source.lastPathComponent == name { return }
        try self.write(source.deletingLastPathComponent()) { parent in
          let target = parent.appendingPathComponent(name)
          try self.requireAbsent(target)
          try self.fm.moveItem(at: source, to: target)
        }
      }
    }.runOnQueue(io)

    AsyncFunction("transfer") { (id: String, path: String, destID: String, folder: String, move: Bool) in
      guard !path.isEmpty else { throw failure("저장소 전체를 복사하거나 이동할 수 없습니다.") }
      try self.withRoot(id) { sourceRoot in
        try self.withRoot(destID) { targetRoot in
          let source = try self.child(sourceRoot, path)
          let parent = try self.child(targetRoot, folder)
          let destination = parent.appendingPathComponent(source.lastPathComponent)
          let sourcePath = source.resolvingSymlinksInPath().standardizedFileURL.path
          let destPath = destination.resolvingSymlinksInPath().standardizedFileURL.path
          guard destPath != sourcePath && !destPath.hasPrefix(sourcePath + "/") else {
            throw failure("같은 위치나 하위 폴더로 복사·이동할 수 없습니다.")
          }
          let coordinator = NSFileCoordinator()
          var coordinationError: NSError?
          var operationError: Error?
          let operation: (URL, URL) -> Void = { src, dstParent in
            do {
              let target = dstParent.appendingPathComponent(source.lastPathComponent)
              try self.copySafely(src, to: target)
              if move {
                do { try self.fm.removeItem(at: src) }
                catch { throw failure("복사는 완료했지만 원본을 지우지 못했습니다. 두 위치의 파일을 확인해 주세요. " + error.localizedDescription) }
              }
            } catch { operationError = error }
          }
          if move {
            coordinator.coordinate(writingItemAt: source, options: .forMoving, writingItemAt: parent, options: [], error: &coordinationError, byAccessor: operation)
          } else {
            coordinator.coordinate(readingItemAt: source, options: [], writingItemAt: parent, options: [], error: &coordinationError, byAccessor: operation)
          }
          if let error = operationError { throw error }
          if let error = coordinationError { throw error }
        }
      }
    }.runOnQueue(io)

    AsyncFunction("remove") { (id: String, path: String) in
      guard !path.isEmpty else { throw failure("저장소 자체는 삭제할 수 없습니다.") }
      try self.withRoot(id) { root in
        let url = try self.child(root, path)
        try self.write(url, options: .forDeleting) { try self.fm.removeItem(at: $0) }
      }
    }.runOnQueue(io)

    AsyncFunction("importFiles") { (id: String, path: String, promise: Promise) in
      self.presentPicker(types: [.item], copy: true, multiple: true, promise: promise) { urls in
        self.io.async {
          var completed = 0
          do {
            try self.withRoot(id) { root in
              let parent = try self.child(root, path)
              for url in urls {
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                let coordinator = NSFileCoordinator()
                var coordinationError: NSError?
                var operationError: Error?
                coordinator.coordinate(readingItemAt: url, options: [], writingItemAt: parent, options: [], error: &coordinationError) { src, dst in
                  do {
                    let name = self.availableName(url.lastPathComponent, in: dst)
                    try self.copySafely(src, to: dst.appendingPathComponent(name))
                  } catch { operationError = error }
                }
                if let error = operationError { throw error }
                if let error = coordinationError { throw error }
                completed += 1
              }
            }
            promise.resolve(completed)
          } catch { promise.reject("IMPORT_FAILED", "\(completed)개 가져옴. " + error.localizedDescription) }
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("preview") { (id: String, path: String, promise: Promise) in
      // Materialize cloud content under coordinated read before presenting Quick Look.
      self.io.async {
        do {
          let (root, access) = try self.openRoot(id)
          do {
            let url = try self.child(root, path)
            try self.read(url) { _ in }
            DispatchQueue.main.async {
              guard let controller = self.appContext?.utilities?.currentViewController() else {
                if access { root.stopAccessingSecurityScopedResource() }
                promise.reject("NO_VIEW", "미리보기 화면을 열 수 없습니다."); return
              }
              guard QLPreviewController.canPreview(url as NSURL) else {
                if access { root.stopAccessingSecurityScopedResource() }
                promise.reject("UNSUPPORTED", "이 형식은 iOS 미리보기에서 지원하지 않습니다. 공유를 눌러 다른 앱에서 열어 주세요."); return
              }
              let key = UUID()
              let session = PreviewSession(url: url) { [weak self] in
                if access { root.stopAccessingSecurityScopedResource() }
                self?.previewSessions.removeValue(forKey: key)
              }
              self.previewSessions[key] = session
              let preview = QLPreviewController()
              preview.dataSource = session
              preview.delegate = session
              controller.present(preview, animated: true) { promise.resolve() }
            }
          } catch {
            if access { root.stopAccessingSecurityScopedResource() }
            throw error
          }
        } catch { promise.reject(error) }
      }
    }.runOnQueue(.main)

    AsyncFunction("share") { (id: String, path: String, promise: Promise) in
      do {
        let (root, access) = try self.openRoot(id)
        do {
          let url = try self.child(root, path)
          guard let controller = self.appContext?.utilities?.currentViewController() else { throw failure("공유 화면을 열 수 없습니다.") }
          let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
          activity.completionWithItemsHandler = { _, _, _, error in
            if access { root.stopAccessingSecurityScopedResource() }
            if let error = error { promise.reject(error) } else { promise.resolve() }
          }
          if let popover = activity.popoverPresentationController {
            popover.sourceView = controller.view
            popover.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.midY, width: 1, height: 1)
          }
          controller.present(activity, animated: true)
        } catch {
          if access { root.stopAccessingSecurityScopedResource() }
          throw error
        }
      } catch { promise.reject(error) }
    }.runOnQueue(.main)
  }

  private func bookmarks() -> [String: Data] {
    UserDefaults.standard.dictionary(forKey: bookmarkKey) as? [String: Data] ?? [:]
  }

  private func openRoot(_ id: String) throws -> (URL, Bool) {
    if id == "local" {
      return (try fm.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true), false)
    }
    guard let data = bookmarks()[id] else { throw failure("폴더를 다시 연결해 주세요.") }
    var stale = false
    let url = try URL(resolvingBookmarkData: data, options: [.withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale)
    let access = url.startAccessingSecurityScopedResource()
    guard access else { throw failure("폴더 접근 권한이 만료되었습니다. 저장소에서 연결을 해제한 뒤 다시 연결해 주세요.") }
    if stale {
      do {
        var saved = bookmarks()
        saved[id] = try url.bookmarkData(options: [.minimalBookmark], includingResourceValuesForKeys: nil, relativeTo: nil)
        UserDefaults.standard.set(saved, forKey: bookmarkKey)
      } catch {
        url.stopAccessingSecurityScopedResource()
        throw error
      }
    }
    return (url, access)
  }

  private func withRoot<T>(_ id: String, _ operation: (URL) throws -> T) throws -> T {
    let (root, access) = try openRoot(id)
    defer { if access { root.stopAccessingSecurityScopedResource() } }
    return try operation(root)
  }

  private func validName(_ name: String) throws -> String {
    let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty, name != ".", name != "..", name.utf8.count <= 240,
          !name.contains("/"), !name.contains("\\"), name.rangeOfCharacter(from: .controlCharacters) == nil else {
      throw failure("올바른 파일 이름을 입력해 주세요.")
    }
    return name
  }

  private func child(_ root: URL, _ path: String) throws -> URL {
    if path.isEmpty { return root }
    let parts = path.split(separator: "/", omittingEmptySubsequences: false)
    let resolvedRoot = root.resolvingSymlinksInPath().standardizedFileURL.path
    var candidate = root
    // Resolve each ancestor before appending a potentially nonexistent leaf.
    // Resolving the full path alone can leave an ancestor symlink unresolved.
    for part in parts {
      _ = try validName(String(part))
      candidate = candidate.appendingPathComponent(String(part)).standardizedFileURL
      let resolvedPath = candidate.resolvingSymlinksInPath().standardizedFileURL.path
      guard resolvedPath.hasPrefix(resolvedRoot + "/") else { throw failure("선택한 폴더 밖에는 접근할 수 없습니다.") }
    }
    return candidate
  }

  private func requireAbsent(_ url: URL) throws {
    if fm.fileExists(atPath: url.path) { throw failure("같은 이름의 항목이 있습니다. 먼저 이름을 바꿔 주세요.") }
  }

  private func availableName(_ name: String, in folder: URL) -> String {
    if !fm.fileExists(atPath: folder.appendingPathComponent(name).path) { return name }
    let ext = (name as NSString).pathExtension
    let stem = (name as NSString).deletingPathExtension
    var index = 2
    while true {
      let candidate = "\(stem) (\(index))" + (ext.isEmpty ? "" : ".\(ext)")
      if !fm.fileExists(atPath: folder.appendingPathComponent(candidate).path) { return candidate }
      index += 1
    }
  }

  private func copySafely(_ source: URL, to target: URL) throws {
    try requireAbsent(target)
    let temporary = target.deletingLastPathComponent().appendingPathComponent(".moa-transfer-" + UUID().uuidString)
    defer { if fm.fileExists(atPath: temporary.path) { try? fm.removeItem(at: temporary) } }
    try fm.copyItem(at: source, to: temporary)
    // Recheck for provider-side races. FileManager.moveItem does not overwrite.
    try requireAbsent(target)
    try fm.moveItem(at: temporary, to: target)
  }

  private func read(_ url: URL, _ operation: (URL) throws -> Void) throws {
    var coordinationError: NSError?
    var operationError: Error?
    NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { coordinated in
      do { try operation(coordinated) } catch { operationError = error }
    }
    if let error = operationError { throw error }
    if let error = coordinationError { throw error }
  }

  private func write(_ url: URL, options: NSFileCoordinator.WritingOptions = [], _ operation: (URL) throws -> Void) throws {
    var coordinationError: NSError?
    var operationError: Error?
    NSFileCoordinator().coordinate(writingItemAt: url, options: options, error: &coordinationError) { coordinated in
      do { try operation(coordinated) } catch { operationError = error }
    }
    if let error = operationError { throw error }
    if let error = coordinationError { throw error }
  }

  private func presentPicker(types: [UTType], copy: Bool, multiple: Bool, promise: Promise, completion: @escaping ([URL]) -> Void) {
    guard pickerSession == nil, let controller = appContext?.utilities?.currentViewController() else {
      promise.reject("PICKER_BUSY", "열려 있는 파일 선택창을 먼저 닫아 주세요."); return
    }
    let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: copy)
    picker.allowsMultipleSelection = multiple
    let session = PickerSession { [weak self] urls in
      self?.pickerSession = nil
      if let urls = urls { completion(urls) }
      else if copy { promise.resolve(0) }
      else { promise.resolve() }
    }
    pickerSession = session
    picker.delegate = session
    controller.present(picker, animated: true)
  }
}

private final class PickerSession: NSObject, UIDocumentPickerDelegate {
  private var completion: (([URL]?) -> Void)?
  init(_ completion: @escaping ([URL]?) -> Void) { self.completion = completion }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finish(urls) }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finish(nil) }
  private func finish(_ urls: [URL]?) { let callback = completion; completion = nil; callback?(urls) }
}

private final class PreviewSession: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
  private let url: URL
  private var onClose: (() -> Void)?
  init(url: URL, onClose: @escaping () -> Void) { self.url = url; self.onClose = onClose }
  func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { url as NSURL }
  func previewControllerDidDismiss(_ controller: QLPreviewController) { let callback = onClose; onClose = nil; callback?() }
  deinit { onClose?() }
}
