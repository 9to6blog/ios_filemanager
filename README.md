# Moa Files · 모아 파일

Windows에서 개발하고 AltStore Classic으로 설치하는 한국어 iPhone/iPad 파일 매니저입니다. Expo SDK 57 + React Native + 로컬 Swift Expo Module로 구성됩니다.

## 기능

- 앱 Documents 저장소 및 사용자가 선택한 외부 폴더 탐색
- 폴더 권한 bookmark 저장·복원, 연결 해제
- 파일 가져오기, 폴더 생성, 이름 변경, 다중 복사·이동·영구 삭제
- 현재 폴더 이름 검색, 이미지/영상/문서/오디오 필터, 정렬, 목록·격자
- iOS 네이티브 탐색 막대·검색창·탭, SF Symbols, 시스템 라이트/다크 모드
- 이미지·영상·지원 문서의 Quick Look 썸네일
- iOS Quick Look 이미지 확대, 지원되는 영상·오디오 재생, PDF·문서 미리보기
- 시스템 공유 시트, Apple 파일 앱에 앱 Documents 표시
- 목적지 충돌 시 덮어쓰기 금지, 가져오기는 중복 이름 자동 변경
- 파일 제공자와 NSFileCoordinator로 조율하는 백그라운드 파일 작업

## 설치 (Windows + 무료 Apple 계정)

1. 이 저장소의 **Actions → Build AltStore IPA**에서 성공한 실행을 엽니다.
2. `MoaFiles-unsigned-*` artifact를 다운로드하고 ZIP을 풉니다.
3. iPhone에 [AltStore Classic](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)을 설치합니다. AltStore PAL과 다릅니다.
4. `MoaFiles.ipa`를 iPhone 파일 앱으로 전송합니다. AltStore의 **My Apps → +**에서 IPA를 선택하거나 파일 공유 메뉴에서 AltStore로 엽니다.
5. 필요한 경우 설정 → 개인정보 보호 및 보안 → 개발자 모드를 켭니다.
6. 무료 계정은 7일마다 갱신합니다. 같은 네트워크에서 Windows AltServer를 실행하고 AltStore에서 **Refresh All**을 사용합니다. 기본적으로 AltStore를 포함해 활성 사이드로드 앱 3개 제한이 있습니다.

IPA는 **기기용 arm64 Release 앱**이며 JavaScript 번들이 포함됩니다. 설치 후 PC 개발 서버 없이 실행할 수 있습니다. 빌드는 macOS GitHub-hosted runner에서 실행하고, Apple ID·인증서·비밀번호는 저장소/Actions에 넣지 않습니다. 실제 서명은 AltStore에서 합니다. GitHub Actions artifact는 로그인과 다운로드 권한이 필요하며 7일 보관됩니다.

## Windows 개발

Node.js 24.21.0과 npm을 사용합니다.

```powershell
npm ci
npm run check
npm run web
```

웹은 **명시적인 메모리 기반 데모**입니다. 파일 가져오기·이름 변경·복사·이동·삭제를 시험할 수 있지만 새로고침 시 초기화됩니다. 기기 파일 관리 코드는 iOS 앱에만 있습니다. Expo Go에는 이 프로젝트의 Swift 모듈이 없으므로 Expo Go로 실제 파일 기능을 실행할 수 없습니다.

`src/app`은 Expo Router 화면, `modules/moa-files/ios`는 네이티브 파일 기능입니다. `ios/`는 `expo prebuild`로 생성하며 직접 수정하거나 커밋하지 않습니다.

## 접근 범위와 제한

- iOS 16.4 이상 대상. 사용자 대상 기기는 iPhone 17 / iOS 27이며 실제 기기 확인은 별도로 필요합니다.
- 다른 앱의 비공개 폴더 및 iOS 시스템 파일에는 접근할 수 없습니다. 일반 사이드로딩은 이 제한을 제거하지 않습니다.
- iCloud Drive는 시스템 선택창으로 접근하므로 iCloud entitlement나 유료 Apple 개발자 계정이 필요하지 않습니다. 네트워크·제공자 상태·권한에 따라 작업이 실패할 수 있습니다.
- SMB는 Apple 파일 앱에서 먼저 서버에 연결합니다. WebDAV/클라우드는 해당 서비스 앱이 Files provider로 노출하는 범위에서 이용합니다. **직접 SMB/WebDAV 클라이언트와 로그인 UI는 아직 없습니다.** 폴더 선택을 지원하지 않는 제공자는 가져오기·내보내기를 사용합니다.
- Quick Look이 지원하는 컨테이너·코덱만 재생합니다. MKV/AVI 등 모든 영상 형식 재생을 보장하지 않습니다. 지원하지 않으면 공유로 다른 플레이어에서 엽니다.
- 삭제는 영구 삭제입니다. 앱 내 휴지통이 없습니다. 외부 폴더 작업은 원본에 영향을 줍니다.
- 이동은 복사 완료 후 원본을 지웁니다. 디스크 부족이나 원본 삭제 실패 시 오류를 표시하며, 삭제 실패의 경우 양쪽에 파일이 남을 수 있습니다. 중복 이름은 덮어쓰지 않습니다.
- 대용량 복사 및 iCloud 파일 다운로드 동안 앱을 열어 두세요. 종료 후 작업 재개·백그라운드 전송은 제공하지 않습니다.
- 심볼릭 링크와 숨김 파일은 표시하지 않습니다. 사진 보관함 직접 탐색·압축 해제·파일 편집 기능은 포함하지 않습니다.

## 검증

`npm run check`는 타입 검사, Expo ESLint, 파일명·경로 경계·필터/정렬 테스트를 실행합니다. GitHub 빌드는 동일 검사와 Xcode Release 컴파일, arm64/JS 번들/IPA ZIP 검증, SHA-256 생성을 수행합니다. 별도 simulator 작업은 실제 iOS 앱을 실행해 라이트/다크 스크린샷과 런타임 로그를 저장합니다. 시뮬레이터에만 넣는 테스트 파일은 IPA에 포함되지 않습니다. 실제 iCloud/SMB 파일 제공자·AltStore 서명·영상 코덱은 iPhone 검증이 필요합니다. 상세 결과는 `VALIDATION.md`에 기록합니다.

## 네이티브 빌드 선택

무료 계정으로 AltStore에서 서명하는 요구에 맞춰 EAS 기본 서명 빌드 대신 GitHub macOS runner에서 unsigned IPA를 만듭니다. 향후 유료 개발자 계정을 사용하면 EAS 빌드를 추가할 수 있습니다.
