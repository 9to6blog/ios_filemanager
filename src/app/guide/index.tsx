import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { colors, Icon, styles, type IconName } from '../../components/ui';

const tips: { icon: IconName; title: string; body: string }[] = [
  { icon: 'download', title: '내 파일로 가져오기', body: '둘러보기에서 파일 가져오기를 누르면 선택한 파일의 복사본을 현재 폴더에 저장합니다. 같은 이름은 (2), (3)을 붙여 보존합니다. 원본은 유지됩니다.' },
  { icon: 'check-square', title: '여러 파일 정리하기', body: '선택을 누르거나 항목을 길게 누른 뒤 파일을 골라 복사·이동·삭제하세요. 이름 변경과 공유는 한 번에 한 항목을 지원합니다. 검색과 종류 필터는 현재 폴더에 적용됩니다.' },
  { icon: 'play-circle', title: '이미지·영상·문서 보기', body: '파일을 누르면 iOS 미리보기가 열립니다. 이미지 확대, 지원되는 영상·오디오 재생, PDF·일반 문서 확인이 가능합니다. MKV·AVI 등은 코덱에 따라 재생이 안 될 수 있으므로 공유로 VLC 등 다른 앱에서 여세요.' },
  { icon: 'cloud', title: '외부 폴더와 iCloud', body: '저장소에서 폴더를 연결하면 원본을 직접 관리합니다. 이동·삭제는 원본에도 적용됩니다. iCloud 다운로드와 대용량 파일 작업 중에는 앱을 열어 두세요. 저장 공간이 부족하면 복사를 완료할 수 없습니다.' },
  { icon: 'refresh-cw', title: 'AltStore 갱신', body: '무료 Apple 계정으로 설치한 앱은 7일마다 갱신해야 합니다. Windows의 AltServer와 iPhone을 같은 네트워크에 연결하고 AltStore의 My Apps에서 Refresh All을 사용하세요. AltStore Classic 자체도 설치 한도에 포함됩니다.' },
  { icon: 'shield', title: '접근 범위와 삭제', body: '이 앱은 앱 자체 저장소와 사용자가 허용한 폴더만 관리합니다. 사이드로딩으로 다른 앱의 비공개 파일이나 iOS 시스템 폴더에 접근할 수는 없습니다. 삭제는 영구 삭제이며 앱 안에 휴지통은 없습니다.' },
];
export default function GuideScreen() {
  return <View style={[styles.screen, { backgroundColor: colors.grouped }]}><Stack.Screen options={{ title: '설정', headerLargeTitleEnabled: true }} /><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { flex: undefined, paddingBottom: 30, paddingTop: 16 }]}>
    <View style={[styles.card, { marginBottom: 24, gap: 12 }]}><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.ink, fontSize: 17 }}>모아 파일</Text><Text style={styles.body}>0.1.0</Text></View><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.ink, fontSize: 17 }}>화면 스타일</Text><Text style={styles.body}>시스템 설정</Text></View></View>
    <Text style={{ color: colors.muted, fontSize: 13, paddingLeft: 16, marginBottom: 8 }}>사용 안내</Text>
    <View style={{ gap: 14 }}>{tips.map(tip => <View key={tip.title} style={[styles.card, { gap: 12 }]}><View style={styles.row}><Icon name={tip.icon} color={colors.accent} /><Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{tip.title}</Text></View><Text style={styles.body}>{tip.body}</Text></View>)}</View>
    <Text style={[styles.body, { marginTop: 24, textAlign: 'center' }]}>파일은 사용자가 선택한 저장소에 보관됩니다.</Text>
  </ScrollView></View>;
}
