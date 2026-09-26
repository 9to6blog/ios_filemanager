import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Button, colors, Icon, Notice, Sheet, styles } from '../../components/ui';
import { files } from '../../lib/files';
import type { Location } from '../../lib/types';

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
  return <View style={[styles.screen, { backgroundColor: colors.grouped }]}><Stack.Screen options={{ title: '저장소', headerLargeTitleEnabled: true }} /><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { flex: undefined, paddingBottom: 30, paddingTop: 16 }]}>
    {error !== '' && <Notice message={error} error onClose={() => setError('')} />}
    <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8, paddingLeft: 16 }}>위치</Text>
    <View style={{ borderRadius: 10, overflow: 'hidden' }}>{locations.map(item => <View key={item.id} style={[styles.card, { padding: 0, borderRadius: 0 }]}>
      <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/', params: { location: item.id, path: '' } })} style={[styles.row, { padding: 20 }]}>
        <Icon name={item.kind === 'local' ? 'smartphone' : 'cloud'} color={colors.accent} size={25} />
        <View style={{ flex: 1 }}><Text style={{ fontSize: 17, color: colors.ink }}>{item.name}</Text>{!item.available && <Text style={styles.subtitle}>다시 연결 필요</Text>}</View><Icon name="chevron-right" size={13} color={colors.muted} />
      </Pressable>{item.kind === 'external' && <Pressable onPress={() => setRemoving(item)} style={{ padding: 14, borderTopWidth: 1, borderColor: colors.border }}><Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>이 폴더 연결 해제</Text></Pressable>}
    </View>)}</View>
    <View style={[styles.card, { marginTop: 24, gap: 16 }]}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void connect()} style={styles.row}><Icon name="plus" color={colors.accent} /><Text style={{ fontSize: 17, color: colors.accent }}>{busy ? '연결 중…' : '외부 폴더 연결'}</Text></Pressable>
      {busy && <ActivityIndicator color={colors.accent} />}
    </View>
    <Text style={[styles.body, { paddingHorizontal: 16, marginTop: 8 }]}>iCloud Drive, 나의 iPhone, 외장 드라이브 등에서 폴더를 선택합니다. 연결한 폴더의 원본을 직접 관리합니다.</Text>
    <View style={{ marginTop: 28, gap: 12, paddingHorizontal: 16 }}><Text style={{ color: colors.muted, fontSize: 13 }}>NAS 및 클라우드</Text>
      <Text style={styles.body}>SMB 서버는 Apple 파일 앱의 ‘서버에 연결’에서 먼저 추가하세요. 클라우드·WebDAV는 해당 서비스 앱의 파일 제공 기능을 켠 뒤 여기에서 선택합니다.</Text>
      <Text style={styles.body}>제공 서비스가 폴더 선택을 지원하지 않으면 ‘파일 가져오기’ 또는 ‘공유 → 파일에 저장’을 사용하세요. 이 버전에는 SMB·WebDAV 직접 로그인 기능이 없습니다.</Text>
    </View>
    <Sheet visible={removing !== null} title="폴더 연결을 해제할까요?" onClose={() => setRemoving(null)}><Text style={styles.body}>{removing?.name}의 접근 권한만 앱에서 제거합니다. 원본 파일은 삭제하지 않습니다.</Text><Button label="연결 해제" secondary onPress={() => void disconnect()} /></Sheet>
  </ScrollView></View>;
}
