import UIKit
import UniformTypeIdentifiers
import QuickLook

/// UIKit requires the document browser to be the window root. The retained Expo
/// controller is presented only for the app's additional folder-management tools.
final class MoaBrowserHost {
  static let shared = MoaBrowserHost()
  private var browser: MoaDocumentBrowser?
  private var manager: UIViewController?

  func show() throws {
    if let browser = browser {
      browser.dismiss(animated: true)
      return
    }
    guard let window = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene })
      .flatMap({ $0.windows }).first(where: { $0.isKeyWindow }),
      let manager = window.rootViewController else {
      throw NSError(domain: "MoaFiles", code: 1, userInfo: [NSLocalizedDescriptionKey: "파일 탐색기를 열 수 없습니다. 앱을 다시 열어 주세요."])
    }
    self.manager = manager
    let browser = MoaDocumentBrowser()
    browser.openManager = { [weak self] in
      guard let self = self, let manager = self.manager, self.browser?.presentedViewController == nil else { return }
      manager.modalPresentationStyle = .fullScreen
      self.browser?.present(manager, animated: true)
    }
    self.browser = browser
    // Install the privacy cover before revealing either file interface.
    MoaAppLock.shared.install(in: window)
    window.rootViewController = browser
    window.makeKeyAndVisible()
  }

  func configureLock() {
    guard let controller = browser else { return }
    // Settings may be requested from the Expo manager or the system browser.
    var presenter: UIViewController = controller
    while let presented = presenter.presentedViewController { presenter = presented }
    MoaAppLock.shared.configure(from: presenter)
  }
}

final class MoaDocumentBrowser: UIDocumentBrowserViewController, UIDocumentBrowserViewControllerDelegate {
  var openManager: (() -> Void)?
  private var previewSession: PreviewSession?
  private var opening = false
  private let io = DispatchQueue(label: "app.moa.browser.preview", qos: .userInitiated)

  init() {
    // String-based initializer is available throughout our iOS deployment range.
    super.init(forOpeningFilesWithContentTypes: [UTType.item.identifier])
    delegate = self
    allowsDocumentCreation = false
    allowsPickingMultipleItems = false
    let manage = UIBarButtonItem(title: "폴더 관리", style: .plain, target: self, action: #selector(manageFolders))
    manage.accessibilityIdentifier = "moa.manage-folders"
    additionalTrailingNavigationBarButtonItems = [manage]
    let lock = UIBarButtonItem(image: UIImage(systemName: "faceid"), style: .plain, target: self, action: #selector(lockSettings))
    lock.accessibilityLabel = "Face ID 앱 잠금"
    lock.accessibilityIdentifier = "moa.lock-settings"
    additionalLeadingNavigationBarButtonItems = [lock]
  }

  required init?(coder: NSCoder) { fatalError("Use init()") }
  @objc private func manageFolders() { openManager?() }
  @objc private func lockSettings() { MoaAppLock.shared.configure(from: self) }

  func documentBrowser(_ controller: UIDocumentBrowserViewController, didPickDocumentsAt documentURLs: [URL]) {
    guard let url = documentURLs.first, !opening, presentedViewController == nil else { return }
    opening = true
    let accessing = url.startAccessingSecurityScopedResource()
    io.async {
      var error: NSError?
      // The provider materializes cloud files here without importing a copy.
      NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &error) { _ in }
      DispatchQueue.main.async {
        self.opening = false
        if let error = error {
          if accessing { url.stopAccessingSecurityScopedResource() }
          self.showError(error.localizedDescription)
          return
        }
        guard self.presentedViewController == nil else {
          if accessing { url.stopAccessingSecurityScopedResource() }
          return
        }
        if QLPreviewController.canPreview(url as NSURL) {
          let preview = QLPreviewController()
          let session = PreviewSession(url: url) { [weak self] in
            if accessing { url.stopAccessingSecurityScopedResource() }
            self?.previewSession = nil
          }
          self.previewSession = session
          preview.dataSource = session
          preview.delegate = session
          self.present(preview, animated: true)
        } else {
          let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
          activity.completionWithItemsHandler = { _, _, _, _ in
            if accessing { url.stopAccessingSecurityScopedResource() }
          }
          activity.popoverPresentationController?.sourceView = self.view
          activity.popoverPresentationController?.sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.midY, width: 1, height: 1)
          self.present(activity, animated: true)
        }
      }
    }
  }

  private func showError(_ message: String) {
    let alert = UIAlertController(title: "파일을 열 수 없습니다", message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "확인", style: .default))
    present(alert, animated: true)
  }
}
