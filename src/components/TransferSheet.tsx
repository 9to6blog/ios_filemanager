import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { files } from '../lib/files';
import { parentPath } from '../lib/file-utils';
import type { Entry, Location } from '../lib/types';
import { Button, colors, Icon, Notice, Sheet, styles } from './ui';

export function TransferSheet({ visible, move, count, onClose, onSubmit }: {
  visible: boolean; move: boolean; count: number; onClose: () => void; onSubmit: (location: string, path: string) => void;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [location, setLocation] = useState('local');
  const [path, setPath] = useState('');
  const [folders, setFolders] = useState<Entry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    files.locations().then(items => { if (active) setLocations(items); }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    if (!visible) return;
    files.list(location, path).then(entries => { if (active) setFolders(entries.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name))); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location, path, visible]);
  function navigate(nextPath: string, nextLocation = location) {
    if (nextPath === path && nextLocation === location) return;
    setLoading(true); setError(''); setLocation(nextLocation); setPath(nextPath);
  }
  return <Sheet visible={visible} title={`${count}개 ${move ? '이동' : '복사'}`} onClose={onClose}>
    <Text style={styles.body}>대상 저장소와 폴더를 선택하세요. 같은 이름의 파일은 덮어쓰지 않습니다.</Text>
    <View style={{ gap: 8 }}>{locations.map(item => <Pressable key={item.id} onPress={() => navigate('', item.id)}
      style={[styles.row, { padding: 12, borderRadius: 12, backgroundColor: location === item.id ? colors.pale : colors.background }]}>
      <Icon name={item.kind === 'local' ? 'smartphone' : 'cloud'} /><Text style={{ color: colors.ink, flex: 1 }}>{item.name}</Text>{location === item.id && <Icon name="check" />}
    </Pressable>)}</View>
    <View style={styles.row}><Pressable accessibilityLabel="대상 상위 폴더" onPress={() => navigate(parentPath(path))} style={{ padding: 10 }}><Icon name="corner-left-up" /></Pressable><Text style={{ flex: 1, color: colors.ink }}>{path || '최상위 폴더'}</Text></View>
    {error ? <Notice message={error} error /> : loading ? <ActivityIndicator color={colors.accent} /> : <View style={{ gap: 4 }}>
      {folders.map(folder => <Pressable key={folder.path} onPress={() => navigate(folder.path)} style={[styles.row, { paddingVertical: 12 }]}><Icon name="folder" /><Text style={{ flex: 1, color: colors.ink }}>{folder.name}</Text><Icon name="chevron-right" size={16} /></Pressable>)}
      {folders.length === 0 && <Text style={styles.body}>하위 폴더가 없습니다.</Text>}
    </View>}
    <Button label={`이 폴더에 ${move ? '이동' : '복사'}`} icon={move ? 'corner-up-right' : 'copy'} disabled={loading || !!error} onPress={() => onSubmit(location, path)} />
  </Sheet>;
}
