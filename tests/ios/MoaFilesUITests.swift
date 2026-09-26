import XCTest

final class MoaFilesUITests: XCTestCase {
  override func setUpWithError() throws { continueAfterFailure = false }

  private func screenshot(_ name: String) {
    let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  func testPublicBrowserAndUnobscuredFileActions() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ko)", "-AppleLocale", "ko_KR"]
    app.launch()
    let manage = app.buttons["moa.manage-folders"]
    XCTAssertTrue(manage.waitForExistence(timeout: 30), app.debugDescription)
    screenshot("public-browser")
    manage.tap()
    let file = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "테스트 문서.txt")).firstMatch
    XCTAssertTrue(file.waitForExistence(timeout: 15), app.debugDescription)
    file.press(forDuration: 1.2)
    let share = app.buttons["공유"].firstMatch
    let delete = app.buttons["삭제"].firstMatch
    XCTAssertTrue(share.waitForExistence(timeout: 5))
    XCTAssertTrue(share.isHittable, "Share must be reachable after long press")
    XCTAssertTrue(delete.isHittable, "Delete must be reachable after long press")
    XCTAssertFalse(app.tabBars.firstMatch.exists, "No app tabs may overlap selection actions")
    screenshot("selection-actions")
    // Open, then cancel the destructive confirmation. The fixture must survive.
    delete.tap()
    XCTAssertTrue(app.buttons["영구 삭제"].waitForExistence(timeout: 5))
    app.buttons["취소"].firstMatch.tap()
    app.buttons["완료"].firstMatch.tap()
    app.buttons["전체 파일"].firstMatch.tap()
    XCTAssertTrue(manage.waitForExistence(timeout: 10))
    app.buttons["moa.lock-settings"].tap()
    XCTAssertTrue(app.alerts["Face ID 앱 잠금"].waitForExistence(timeout: 5))
    screenshot("lock-settings")
    app.alerts.buttons["취소"].tap()
  }

  func testLockRemainsClosedWithoutAuthentication() {
    let app = XCUIApplication()
    // Standard UserDefaults launch override; no authentication bypass in app code.
    app.launchArguments = ["-AppleLanguages", "(ko)", "-AppleLocale", "ko_KR", "-moa.appLock.enabled", "YES"]
    app.launch()
    let unlock = app.buttons["moa.unlock"]
    XCTAssertTrue(unlock.waitForExistence(timeout: 30), app.debugDescription)
    XCTAssertTrue(unlock.isHittable)
    XCTAssertFalse(app.buttons["moa.manage-folders"].isHittable)
    screenshot("locked-without-authentication")
    XCUIDevice.shared.press(.home)
    app.activate()
    XCTAssertTrue(unlock.waitForExistence(timeout: 10))
    XCTAssertTrue(unlock.isHittable)
    XCTAssertFalse(app.buttons["moa.manage-folders"].isHittable)
  }
}
