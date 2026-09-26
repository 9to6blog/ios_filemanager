# 모아 파일 설치·첫 사용

설치 파일은 `MoaFiles.ipa`입니다. iPhone에 설치하는 독립 실행 앱이며, 설치 후 브라우저나 Expo 개발 서버가 필요하지 않습니다.

## 1. Windows에서 AltStore 준비

[AltStore Classic의 Windows 공식 설치 안내](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)를 따라 AltServer와 AltStore를 설치합니다. 공식 안내에서 요구하는 iTunes·iCloud 구성도 확인합니다.

iPhone을 USB로 연결하고 PC를 신뢰한 뒤, AltServer에서 **Install AltStore → 내 iPhone**을 선택합니다. Apple 계정 입력과 앱 서명은 AltServer·AltStore에서 진행합니다.

iPhone에서 개발자 프로필을 신뢰하고 **설정 → 개인정보 보호 및 보안 → 개발자 모드**를 활성화합니다.

## 2. IPA 설치

1. `MoaFiles.ipa`를 iCloud Drive 등으로 iPhone의 파일 앱에 저장합니다.
2. Windows에서 AltServer를 실행하고 iPhone과 같은 네트워크에 연결합니다. 처음 설치할 때는 USB 연결을 유지해도 됩니다.
3. AltStore의 **My Apps → +**에서 `MoaFiles.ipa`를 선택합니다.
4. 서명·설치가 끝나면 홈 화면에서 **모아 파일**을 엽니다.

무료 Apple 계정의 앱은 7일마다 갱신해야 합니다. AltStore의 **Refresh All**로 갱신할 수 있으며, 활성 사이드로드 앱 수에도 제한이 있습니다. [AltStore 공식 설명](https://faq.altstore.io/altstore-classic/your-altstore)

## 3. 파일 관리

- **둘러보기 → … → 파일 가져오기**: 선택한 파일의 복사본을 현재 폴더에 가져옵니다.
- **… → 새로운 폴더**: 폴더를 만듭니다.
- 파일을 누르면 iOS 미리보기가 열립니다. 지원되는 이미지·영상·오디오·PDF·문서를 볼 수 있습니다.
- **선택**을 누르거나 항목을 길게 눌러 선택하고, 아래 도구막대로 공유·복사·이동·이름 변경·삭제를 실행합니다.
- **저장소 → 외부 폴더 연결**: 파일 앱에서 폴더를 선택해 연결합니다. 연결된 외부 폴더의 이동·삭제는 원본에도 적용됩니다.
- 화면은 iPhone의 라이트·다크 설정을 따릅니다.

앱 자체 저장소와 사용자가 허용한 외부 폴더를 관리합니다. 다른 앱의 비공개 데이터나 iOS 시스템 폴더에는 접근하지 못합니다. 삭제는 영구 삭제이며 앱 안에 휴지통이 없습니다.

## 4. 첫 기기 확인

처음에는 별도 테스트 폴더와 복사한 파일로 아래 동작을 확인하세요.

1. 새 폴더 생성, 이미지·영상·PDF 가져오기와 미리보기.
2. 파일 이름 변경, 다른 폴더로 복사·이동, 동일 이름 충돌 시 원본 보존.
3. 앱 종료 후 다시 열어 파일이 유지되는지 확인.
4. 외부 폴더 연결 후 다시 실행했을 때 접근 권한이 유지되는지 확인.
5. 실제로 쓰는 iCloud·NAS 제공자에서 가져오기·복사·이동 확인.

iOS 시뮬레이터 확인만으로 AltStore 서명, 사용자의 iOS 버전, iCloud·NAS 또는 모든 영상 코덱을 검증할 수는 없습니다. 기기에서 문제가 생기면 실패한 동작과 화면에 나온 오류를 기록해 주세요.
