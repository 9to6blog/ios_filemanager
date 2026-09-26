import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, Notice, Sheet, styles } from '../components/ui';
import { files, isDemo } from '../lib/files';
import type { Location } from '../lib/types';

export default function LocationsScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<Location | null>(null);
  const reload = useCallback(async () => { try { setLocations(await files.locations()); } catch (e) { setError(String(e)); } }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  async function connect() {
    setBusy(true); setError('');
    try {
      const item = await files.connectFolder();
      await reload();
      if (item) router.navigate({ pathname: '/', params: { location: item.id, path: '' } });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!removing) return;
    const item = removing; setRemoving(null); setBusy(true);
    try { await files.disconnect(item.id); await reload(); router.setParams({ location: 'local', path: '' }); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}><ScrollView contentContainerStyle={[styles.page, { flex: undefined, paddingBottom: 30 }]}>
    <View style={styles.header}><Text style={styles.heading}>저장소</Text><Text style={styles.subtitle}>내 기기부터 연결된 폴더까지.</Text></View>
    {error !== '' && <Notice message={error} error onClose={() => setError('')} />}
    <View style={{ gap: 12 }}>{locations.map(item => <View key={item.id} style={[styles.card, { padding: 0 }]}>
      <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/', params: { location: item.id, path: '' } })} style={[styles.row, { padding: 20 }]}>
        <View style={{ padding: 13, borderRadius: 16, backgroundColor: colors.pale }}><Icon name={item.kind === 'local' ? 'smartphone' : 'cloud'} color={colors.accent} size={25} /></View>
        <View style={{ flex: 1 }}><Text style={{ fontSize: 17, color: colors.ink, fontWeight: '700' }}>{item.name}</Text><Text style={styles.subtitle}>{!item.available ? '다시 연결 필요' : item.kind === 'local' ? 'Moa Files에 보관된 파일' : '사용자가 연결한 외부 폴더'}</Text></View><Icon name="chevron-right" size={18} />
      </Pressable>{item.kind === 'external' && <Pressable onPress={() => setRemoving(item)} style={{ padding: 14, borderTopWidth: 1, borderColor: colors.border }}><Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>이 폴더 연결 해제</Text></Pressable>}
    </View>)}</View>
    <View style={[styles.card, { marginTop: 24, gap: 16, backgroundColor: '#EDF3E8' }]}>
      <Icon name="folder-plus" size={30} color={colors.accent} /><Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink }}>외부 폴더 연결</Text>
      <Text style={styles.body}>iCloud Drive, 나의 iPhone, 외장 드라이브 등 파일 앱에 표시되는 폴더를 선택하세요. 연결한 폴더의 원본을 직접 관리합니다.</Text>
      <Button label={busy ? '처리 중…' : '폴더 선택하기'} icon="plus" onPress={() => void connect()} disabled={busy} />
      {busy && <ActivityIndicator color={colors.accent} />}
    </View>
    <View style={[styles.card, { marginTop: 16, gap: 12 }]}><View style={styles.row}><Icon name="server" /><Text style={{ fontWeight: '700', color: colors.ink, fontSize: 16 }}>NAS와 클라우드</Text></View>
      <Text style={styles.body}>SMB 서버는 Apple 파일 앱의 ‘서버에 연결’에서 먼저 추가하세요. 클라우드·WebDAV는 해당 서비스 앱의 파일 제공 기능을 켠 뒤 여기에서 선택합니다.</Text>
      <Text style={styles.body}>제공 서비스가 폴더 선택을 지원하지 않으면 ‘파일 가져오기’ 또는 ‘공유 → 파일에 저장’을 사용하세요. 이 버전에는 SMB·WebDAV 직접 로그인 기능이 없습니다.</Text>
    </View>
    {isDemo && <Text style={[styles.body, { marginTop: 18 }]}>브라우저는 UI 데모입니다. 외부 저장소 연결은 설치한 iPhone 앱에서 작동합니다.</Text>}
    <Sheet visible={removing !== null} title="폴더 연결을 해제할까요?" onClose={() => setRemoving(null)}><Text style={styles.body}>{removing?.name}의 접근 권한만 앱에서 제거합니다. 원본 파일은 삭제하지 않습니다.</Text><Button label="연결 해제" secondary onPress={() => void disconnect()} /></Sheet>
  </ScrollView></SafeAreaView>;
}
