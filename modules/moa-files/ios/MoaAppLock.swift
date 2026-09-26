import UIKit
import LocalAuthentication

/// Main-thread-only privacy gate. Native windows cover the document browser,
/// React screens, Quick Look and system sheets, including app-switcher snapshots.
final class MoaAppLock {
  static let shared = MoaAppLock()
  private let key = "moa.appLock.enabled"
  private var enabled: Bool { UserDefaults.standard.bool(forKey: key) }
  private var cover: UIWindow?
  private var lockScreen: MoaLockScreen?
  private var context: LAContext?
  private var generation = 0
  private var locked = false
  private var autoAuthenticate = true
  private var observers: [NSObjectProtocol] = []

  func install(in window: UIWindow) {
    guard cover == nil, let scene = window.windowScene else { return }
    let screen = MoaLockScreen()
    screen.unlock = { [weak self] in self?.unlock() }
    let cover = UIWindow(windowScene: scene)
    cover.windowLevel = .alert + 1
    cover.rootViewController = screen
    cover.backgroundColor = .systemBackground
    self.cover = cover
    lockScreen = screen
    locked = enabled
    if enabled { cover.isHidden = false }
    let center = NotificationCenter.default
    observers = [
      center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
        guard let self = self, self.enabled else { return }
        // Face ID itself can make the app inactive; don't invalidate that request.
        if self.context == nil { self.locked = true; self.autoAuthenticate = true }
        self.cover?.isHidden = false
      },
      center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
        guard let self = self else { return }
        self.generation += 1
        self.context?.invalidate()
        self.context = nil
        self.autoAuthenticate = true
        if self.enabled { self.locked = true; self.cover?.isHidden = false }
      },
      center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
        guard let self = self, self.enabled else { return }
        if self.locked {
          if self.autoAuthenticate { self.unlock() }
        } else { self.cover?.isHidden = true }
      }
    ]
    if enabled { DispatchQueue.main.async { self.unlock() } }
  }

  func configure(from presenter: UIViewController) {
    guard context == nil, !locked else { return }
    let target = !enabled
    let alert = UIAlertController(title: "Face ID 앱 잠금", message:
      "현재: \(enabled ? "켜짐" : "꺼짐")\n\n앱을 다시 열 때 Face ID 또는 기기 암호로 인증합니다. 앱 전환 화면도 가립니다.\n\n이 앱의 화면을 잠그는 기능이며, 파일 자체를 암호화하거나 Apple 파일 앱의 접근을 막지는 않습니다.", preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: target ? "앱 잠금 켜기" : "앱 잠금 끄기", style: .default) { [weak self, weak presenter] _ in
      guard let self = self else { return }
      self.authenticate(reason: target ? "모아 파일의 앱 잠금을 켭니다." : "모아 파일의 앱 잠금을 끕니다.") { success, message in
        if success {
          UserDefaults.standard.set(target, forKey: self.key)
          self.locked = false
          self.cover?.isHidden = true
        } else if !self.locked, let presenter = presenter {
          let error = UIAlertController(title: "설정을 변경하지 않았습니다", message: message, preferredStyle: .alert)
          error.addAction(UIAlertAction(title: "확인", style: .default))
          presenter.present(error, animated: true)
        }
      }
    })
    alert.addAction(UIAlertAction(title: "취소", style: .cancel))
    presenter.present(alert, animated: true)
  }

  private func unlock() {
    guard enabled, locked, context == nil, UIApplication.shared.applicationState == .active else { return }
    autoAuthenticate = false
    authenticate(reason: "모아 파일의 잠금을 해제합니다.") { success, message in
      if success {
        self.locked = false
        self.cover?.isHidden = true
      } else {
        self.locked = true
        self.cover?.isHidden = false
        self.lockScreen?.showError(message)
      }
    }
  }

  private func authenticate(reason: String, completion: @escaping (Bool, String) -> Void) {
    guard context == nil else { return }
    let request = LAContext()
    request.localizedCancelTitle = "취소"
    var error: NSError?
    guard request.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
      completion(false, error?.localizedDescription ?? "기기 설정에서 Face ID와 암호를 먼저 설정해 주세요.")
      return
    }
    context = request
    let attempt = generation
    request.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
      DispatchQueue.main.async {
        // A result from before backgrounding must never unlock a later session.
        guard self.context === request, self.generation == attempt else { return }
        self.context = nil
        completion(success, error?.localizedDescription ?? "인증을 완료하지 못했습니다. 다시 시도해 주세요.")
      }
    }
  }
}

private final class MoaLockScreen: UIViewController {
  var unlock: (() -> Void)?
  private let detail = UILabel()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    view.accessibilityIdentifier = "moa.lock-screen"
    let icon = UIImageView(image: UIImage(systemName: "lock.fill"))
    icon.tintColor = .systemBlue
    icon.contentMode = .scaleAspectFit
    icon.heightAnchor.constraint(equalToConstant: 56).isActive = true
    let title = UILabel()
    title.text = "모아 파일이 잠겼습니다"
    title.font = .preferredFont(forTextStyle: .title2)
    title.adjustsFontForContentSizeCategory = true
    title.textAlignment = .center
    title.numberOfLines = 0
    detail.text = "Face ID 또는 기기 암호로 잠금을 해제하세요."
    detail.textColor = .secondaryLabel
    detail.font = .preferredFont(forTextStyle: .body)
    detail.adjustsFontForContentSizeCategory = true
    detail.numberOfLines = 0
    detail.textAlignment = .center
    var config = UIButton.Configuration.filled()
    config.title = "잠금 해제"
    config.image = UIImage(systemName: "faceid")
    config.imagePadding = 8
    config.cornerStyle = .capsule
    let button = UIButton(configuration: config, primaryAction: UIAction { [weak self] _ in self?.unlock?() })
    button.accessibilityIdentifier = "moa.unlock"
    let stack = UIStackView(arrangedSubviews: [icon, title, detail, button])
    stack.axis = .vertical
    stack.spacing = 24
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
      stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stack.widthAnchor.constraint(lessThanOrEqualToConstant: 380),
      stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 28),
      stack.trailingAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -28)
    ])
  }

  func showError(_ message: String) { loadViewIfNeeded(); detail.text = message }
}
