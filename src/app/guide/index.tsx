import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { colors, Icon, styles, type IconName } from '../../components/ui';
import { files } from '../../lib/files';

const tips: { icon: IconName; title: string; body: string }[] = [
  { icon: 'folder', title: '공개된 파일 바로 보기', body: '앱 첫 화면에서 iCloud Drive, 나의 iPhone 및 활성화된 파일 제공 서비스의 문서를 원래 위치에서 탐색합니다. 가져오기 없이 파일을 누르면 미리보기가 열립니다. 폴더 관리의 앱 저장소는 모아 파일 자체 폴더입니다.' },
  { icon: 'check-square', title: '여러 파일 정리하기', body: '선택을 누르거나 항목을 길게 누른 뒤 파일을 골라 복사·이동·삭제하세요. 이름 변경과 공유는 한 번에 한 항목을 지원합니다. 검색과 종류 필터는 현재 폴더에 적용됩니다.' },
  { icon: 'play-circle', title: '이미지·영상·문서 보기', body: '파일을 누르면 iOS 미리보기가 열립니다. 이미지 확대, 지원되는 영상·오디오 재생, PDF·일반 문서 확인이 가능합니다. MKV·AVI 등은 코덱에 따라 재생이 안 될 수 있으므로 공유로 VLC 등 다른 앱에서 여세요.' },
  { icon: 'cloud', title: '외부 폴더와 iCloud', body: '저장소에서 폴더를 연결하면 원본을 직접 관리합니다. 이동·삭제는 원본에도 적용됩니다. iCloud 다운로드와 대용량 파일 작업 중에는 앱을 열어 두세요. 저장 공간이 부족하면 복사를 완료할 수 없습니다.' },
  { icon: 'refresh-cw', title: 'AltStore 갱신', body: '무료 Apple 계정으로 설치한 앱은 7일마다 갱신해야 합니다. Windows의 AltServer와 iPhone을 같은 네트워크에 연결하고 AltStore의 My Apps에서 Refresh All을 사용하세요. AltStore Classic 자체도 설치 한도에 포함됩니다.' },
  { icon: 'shield', title: '접근 범위와 삭제', body: '다른 앱이 파일 앱에 공개한 문서는 전체 파일 화면에서 탐색할 수 있습니다. 비공개 데이터와 시스템 폴더는 제외됩니다. 폴더 관리 도구의 삭제는 원본을 영구 삭제합니다. 기본 탐색기의 삭제·복구 지원은 저장 서비스에 따라 다릅니다.' },
];
export default function GuideScreen() {
  return <View style={[styles.screen, { backgroundColor: colors.grouped }]}><Stack.Screen options={{ title: '설정', headerLargeTitleEnabled: true }} />
    <Stack.Toolbar placement="left"><Stack.Toolbar.Button onPress={() => router.back()}>뒤로</Stack.Toolbar.Button></Stack.Toolbar>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { flex: undefined, paddingBottom: 30, paddingTop: 16 }]}>
    <View style={[styles.card, { marginBottom: 24, gap: 12 }]}><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.ink, fontSize: 17 }}>모아 파일</Text><Text style={styles.body}>0.2.0</Text></View><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.ink, fontSize: 17 }}>화면 스타일</Text><Text style={styles.body}>시스템 설정</Text></View></View>
    <Pressable accessibilityRole="button" onPress={() => void files.configureAppLock().catch(e => Alert.alert('앱 잠금', String(e)))} style={[styles.card, styles.row, { marginBottom: 24 }]}>
      <Icon name="shield" color={colors.accent} /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 17 }}>Face ID 앱 잠금</Text><Text style={styles.body}>Face ID 또는 기기 암호로 인증</Text></View><Icon name="chevron-right" color={colors.muted} />
    </Pressable>
    <Text style={{ color: colors.muted, fontSize: 13, paddingLeft: 16, marginBottom: 8 }}>사용 안내</Text>
    <View style={{ gap: 14 }}>{tips.map(tip => <View key={tip.title} style={[styles.card, { gap: 12 }]}><View style={styles.row}><Icon name={tip.icon} color={colors.accent} /><Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{tip.title}</Text></View><Text style={styles.body}>{tip.body}</Text></View>)}</View>
    <Text style={[styles.body, { marginTop: 24, textAlign: 'center' }]}>파일은 사용자가 선택한 저장소에 보관됩니다.</Text>
  </ScrollView></View>;
}
