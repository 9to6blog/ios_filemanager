import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, IconButton, Notice, Sheet, styles, type IconName } from '../components/ui';
import { TransferSheet } from '../components/TransferSheet';
import { categoryOf, formatSize, parentPath, validateName, visibleEntries, type Category } from '../lib/file-utils';
import { files, isDemo } from '../lib/files';
import type { Entry, Location } from '../lib/types';

const categories: { id: Category; label: string; icon: IconName }[] = [
  { id: 'all', label: '전체', icon: 'grid' }, { id: 'image', label: '이미지', icon: 'image' },
  { id: 'video', label: '영상', icon: 'film' }, { id: 'document', label: '문서', icon: 'file-text' }, { id: 'audio', label: '오디오', icon: 'music' },
];
const fileLooks: Record<string, { icon: IconName; tint: string; background: string }> = {
  folder: { icon: 'folder', tint: '#4F8065', background: '#E8F0D9' }, image: { icon: 'image', tint: '#6B67AA', background: '#EEEBF7' },
  video: { icon: 'play-circle', tint: '#B87B44', background: '#FAEFDE' }, document: { icon: 'file-text', tint: '#4778A3', background: '#E9F1F8' },
  audio: { icon: 'music', tint: '#A75E6A', background: '#F8E9ED' }, other: { icon: 'file', tint: '#748179', background: '#EFF1ED' },
};

export default function BrowserScreen() {
  const params = useLocalSearchParams<{ location?: string; path?: string }>();
  const location = typeof params.location === 'string' ? params.location : 'local';
  const path = typeof params.path === 'string' ? params.path : '';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sort, setSort] = useState<'name' | 'date' | 'size'>('name');
  const [grid, setGrid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const operationLock = useRef(false);
  const loadGeneration = useRef(0);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [editor, setEditor] = useState<'folder' | 'rename' | null>(null);
  const [name, setName] = useState('');
  const [editorError, setEditorError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transfer, setTransfer] = useState<'copy' | 'move' | null>(null);
  const { width } = useWindowDimensions();
  const columns = width > 850 ? 4 : width > 580 ? 3 : 2;
  const currentLocation = locations.find(item => item.id === location);
  const currentName = path ? path.split('/').pop() : currentLocation?.name ?? '내 파일';
  const visible = useMemo(() => visibleEntries(entries, query, category, sort), [entries, query, category, sort]);
  const currentFiles = entries.filter(entry => !entry.isDirectory);
  const bytes = currentFiles.reduce((sum, entry) => sum + entry.size, 0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    try {
      const [nextLocations, nextEntries] = await Promise.all([files.locations(), files.list(location, path)]);
      if (generation === loadGeneration.current) { setLocations(nextLocations); setEntries(nextEntries); }
    } catch (e) {
      if (generation === loadGeneration.current) { setEntries([]); setNotice({ message: errorMessage(e), error: true }); }
    } finally { if (generation === loadGeneration.current) setLoading(false); }
  }, [location, path]);
  useFocusEffect(useCallback(() => {
    setSelected([]); setSelecting(false); setQuery(''); setCategory('all'); setNotice(null);
    void load();
    return () => { loadGeneration.current++; };
  }, [load]));

  function navigate(nextPath: string, nextLocation = location) {
    router.setParams({ path: nextPath, location: nextLocation });
  }
  function toggle(entry: Entry) {
    setSelected(previous => previous.includes(entry.path) ? previous.filter(item => item !== entry.path) : [...previous, entry.path]);
  }
  async function run(label: string, operation: () => Promise<string | void>) {
    if (operationLock.current) return;
    operationLock.current = true; setBusy(label); setNotice(null);
    try { const message = await operation(); if (message) setNotice({ message }); }
    catch (e) { setNotice({ message: errorMessage(e), error: true }); }
    finally { await load(); operationLock.current = false; setBusy(''); }
  }
  function open(entry: Entry) {
    if (selecting) { toggle(entry); return; }
    if (entry.isDirectory) navigate(entry.path);
    else void run('파일 여는 중', () => files.preview(location, entry.path));
  }
  async function submitEditor() {
    let clean: string;
    try { clean = validateName(name); } catch (e) { setEditorError(errorMessage(e)); return; }
    const action = editor;
    setEditor(null);
    await run(action === 'folder' ? '폴더 만드는 중' : '이름 바꾸는 중', async () => {
      if (action === 'folder') await files.mkdir(location, path, clean);
      else await files.rename(location, selected[0], clean);
      setSelected([]); setSelecting(false);
      return action === 'folder' ? '새 폴더를 만들었습니다.' : '이름을 바꿨습니다.';
    });
  }
  async function performBatch(kind: 'delete' | 'copy' | 'move', dest = '', folder = '') {
    setConfirmDelete(false); setTransfer(null);
    await run(kind === 'delete' ? '삭제 중' : kind === 'move' ? '이동 중' : '복사 중', async () => {
      const failures: string[] = [], failedPaths: string[] = [];
      let completed = 0;
      for (const item of selected) {
        try {
          if (kind === 'delete') await files.remove(location, item);
          else await files.transfer(location, item, dest, folder, kind === 'move');
          completed++;
        } catch (e) { failures.push(`${item.split('/').pop()}: ${errorMessage(e)}`); failedPaths.push(item); }
      }
      setSelected(failedPaths); setSelecting(failedPaths.length > 0);
      const label = kind === 'delete' ? '삭제' : kind === 'move' ? '이동' : '복사';
      if (failures.length) throw new Error(`${completed}개 ${label} 완료, ${failures.length}개 확인 필요.\n${failures.join('\n')}`);
      return `${completed}개 항목을 ${label}했습니다.`;
    });
  }
  function startEditor(type: 'folder' | 'rename') {
    setName(type === 'folder' ? '' : entries.find(item => item.path === selected[0])?.name ?? ''); setEditorError(''); setEditor(type);
  }
  const renderEntry = ({ item }: { item: Entry }) => {
    const look = fileLooks[categoryOf(item)] ?? fileLooks.other;
    const checked = selected.includes(item.path);
    return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}${item.isDirectory ? ', 폴더' : ''}${checked ? ', 선택됨' : ''}`}
      accessibilityState={{ selected: checked }} onPress={() => open(item)} onLongPress={() => { setSelecting(true); toggle(item); }}
      style={({ pressed }) => [local.entry, grid ? local.gridEntry : local.listEntry, checked && local.selected, pressed && { opacity: 0.7 }]}>
      <View style={[local.fileIcon, grid && local.gridIcon, { backgroundColor: look.background }]}><Icon name={look.icon} size={grid ? 34 : 24} color={look.tint} /></View>
      <View style={{ flex: grid ? undefined : 1, width: grid ? '100%' : undefined }}>
        <Text numberOfLines={grid ? 2 : 1} style={local.fileName}>{item.name}</Text>
        <Text numberOfLines={1} style={local.fileMeta}>{item.isDirectory ? '폴더' : formatSize(item.size)}{item.modified > 0 ? ` · ${new Date(item.modified).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}` : ''}</Text>
      </View>
      {selecting ? <View style={[local.checkbox, grid && local.gridCheck, checked && local.checked]}>{checked && <Icon name="check" color="white" size={14} />}</View>
        : grid ? null : <Icon name={item.isDirectory ? 'chevron-right' : 'more-horizontal'} size={17} color={colors.muted} />}
    </Pressable>;
  };

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}><View style={styles.page}>
    <View style={[styles.header, local.topHeader]}>
      <View><View style={styles.row}><View style={local.brandMark}><Icon name="layers" size={17} color={colors.accent} /></View><Text style={local.eyebrow}>MOA FILES</Text></View>
        <Text style={[styles.heading, { marginTop: 10 }]}>파일을 한곳에.</Text><Text style={styles.subtitle}>보고, 옮기고, 나만의 방식으로 정리하세요.</Text></View>
      <IconButton icon="refresh-cw" label="새로고침" onPress={() => void load()} />
    </View>
    {isDemo && <Text style={local.demo}>브라우저 데모 · 새로고침 시 초기화 · 실제 기기 파일과 별개</Text>}
    <View style={local.search}><Icon name="search" color={colors.muted} size={19} /><TextInput accessibilityLabel="현재 폴더에서 검색" placeholder="현재 폴더에서 검색" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={local.searchInput} autoCapitalize="none" clearButtonMode="while-editing" /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginVertical: 16 }} contentContainerStyle={{ gap: 8 }}>
      {categories.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: category === item.id }} onPress={() => setCategory(item.id)} style={[local.chip, category === item.id && local.activeChip]}>
        <Icon name={item.icon} size={15} color={category === item.id ? 'white' : colors.muted} /><Text style={[local.chipText, category === item.id && { color: 'white' }]}>{item.label}</Text>
      </Pressable>)}
    </ScrollView>
    <View style={local.locationBar}>
      <Icon name={currentLocation?.kind === 'external' ? 'cloud' : 'smartphone'} size={23} color={colors.accent} />
      <View style={{ flex: 1 }}><Text style={local.locationName}>{currentLocation?.name ?? '내 파일'}</Text><Text style={local.locationDetail}>{currentLocation?.kind === 'external' ? '연결된 폴더의 원본 파일' : '이 앱에 보관한 파일'}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/locations')} style={{ padding: 10 }}><Text style={local.changeLocation}>변경</Text></Pressable>
    </View>
    <View style={[styles.row, { marginTop: 14, marginBottom: 5 }]}>
      {path !== '' && <IconButton icon="arrow-left" label="상위 폴더" onPress={() => navigate(parentPath(path))} />}
      <Text numberOfLines={1} style={local.folderTitle}>{currentName}</Text>
      <IconButton icon={grid ? 'list' : 'grid'} label={grid ? '목록 보기' : '격자 보기'} active={grid} onPress={() => setGrid(!grid)} />
      <Pressable accessibilityRole="button" accessibilityLabel={`정렬: ${sort === 'name' ? '이름' : sort === 'date' ? '최근 수정' : '크기'}`} onPress={() => setSort(sort === 'name' ? 'date' : sort === 'date' ? 'size' : 'name')} style={styles.row}><Text style={local.sort}>{sort === 'name' ? '이름순' : sort === 'date' ? '최신순' : '크기순'}</Text><Icon name="arrow-down" size={13} /></Pressable>
    </View>
    {path !== '' && <ScrollView horizontal style={{ flexGrow: 0, marginBottom: 10 }} contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
      <Pressable onPress={() => navigate('')}><Text style={local.breadcrumb}>{currentLocation?.name}</Text></Pressable>
      {path.split('/').map((part, i) => <View key={i} style={styles.row}><Icon name="chevron-right" size={12} color={colors.muted} /><Pressable onPress={() => navigate(path.split('/').slice(0, i + 1).join('/'))}><Text style={local.breadcrumb}>{part}</Text></Pressable></View>)}
    </ScrollView>}
    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
      <Text style={local.count}>{visible.length}개 항목 · 파일 {formatSize(bytes)}</Text>
      <Pressable accessibilityRole="button" onPress={() => { setSelecting(!selecting); setSelected([]); }} style={{ padding: 8 }}><Text style={local.changeLocation}>{selecting ? '선택 취소' : '선택'}</Text></Pressable>
    </View>
    {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    {selecting && <View style={[styles.row, { marginBottom: 12 }]}><Button secondary label={selected.length === visible.length && visible.length > 0 ? '전체 해제' : '전체 선택'} onPress={() => setSelected(selected.length === visible.length ? [] : visible.map(e => e.path))} /><Text style={styles.body}>{selected.length}개 선택</Text></View>}
    {loading ? <View style={local.empty}><ActivityIndicator color={colors.accent} /><Text style={styles.subtitle}>파일을 불러오는 중…</Text></View> : <FlatList data={visible} key={grid ? `grid-${columns}` : 'list'} numColumns={grid ? columns : 1}
      keyExtractor={item => item.path} renderItem={renderEntry} columnWrapperStyle={grid ? { gap: 12 } : undefined}
      contentContainerStyle={{ paddingBottom: 18, gap: grid ? 12 : 5, flexGrow: visible.length ? 0 : 1 }}
      ListEmptyComponent={<View style={local.empty}><View style={local.emptyIcon}><Icon name={query ? 'search' : 'folder-plus'} size={32} color={colors.accent} /></View><Text style={local.emptyTitle}>{query || category !== 'all' ? '일치하는 파일이 없습니다' : '여기에 파일을 모아보세요'}</Text><Text style={[styles.body, { textAlign: 'center' }]}>{query || category !== 'all' ? '검색어나 파일 종류를 바꿔 보세요.' : '파일을 가져오거나 새 폴더를 만들어\n나만의 공간을 시작하세요.'}</Text></View>} />}
    <View style={local.toolbar}>{selecting ? <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
      <Button secondary icon="copy" label="복사" disabled={!selected.length} onPress={() => setTransfer('copy')} />
      <Button secondary icon="corner-up-right" label="이동" disabled={!selected.length} onPress={() => setTransfer('move')} />
      <Button secondary icon="edit-2" label="이름" disabled={selected.length !== 1} onPress={() => startEditor('rename')} />
      <Button secondary icon="share" label="공유" disabled={selected.length !== 1} onPress={() => void run('공유 중', () => files.share(location, selected[0]))} />
      <Button secondary danger icon="trash-2" label="삭제" disabled={!selected.length} onPress={() => setConfirmDelete(true)} />
    </ScrollView> : <View style={styles.row}><View style={{ flex: 1 }}><Button icon="download" label="파일 가져오기" onPress={() => void run('파일 가져오는 중', async () => { const count = await files.importFiles(location, path); return count ? `${count}개 파일을 가져왔습니다.` : undefined; })} /></View><Button secondary icon="folder-plus" label="새 폴더" onPress={() => startEditor('folder')} /></View>}</View>
    <Sheet visible={editor !== null} title={editor === 'folder' ? '새 폴더' : '이름 바꾸기'} onClose={() => setEditor(null)}>
      <TextInput accessibilityLabel="이름" autoFocus placeholder="이름을 입력하세요" value={name} onChangeText={setName} style={styles.input} onSubmitEditing={() => void submitEditor()} returnKeyType="done" selectTextOnFocus />
      {editorError !== '' && <Notice message={editorError} error />}<Button label={editor === 'folder' ? '폴더 만들기' : '변경'} onPress={() => void submitEditor()} />
    </Sheet>
    <Sheet visible={confirmDelete} title={`${selected.length}개 항목을 삭제할까요?`} onClose={() => setConfirmDelete(false)}>
      <Text style={styles.body}>선택한 파일과 폴더 안의 내용이 영구 삭제됩니다. 외부 폴더에서는 원본이 삭제됩니다. 이 앱에서는 복구할 수 없습니다.</Text>
      <Text numberOfLines={5} style={{ color: colors.ink }}>{selected.map(item => item.split('/').pop()).join('\n')}</Text>
      <Button danger label="영구 삭제" icon="trash-2" onPress={() => void performBatch('delete')} /><Button secondary label="취소" onPress={() => setConfirmDelete(false)} />
    </Sheet>
    {transfer !== null && <TransferSheet visible move={transfer === 'move'} count={selected.length} onClose={() => setTransfer(null)} onSubmit={(dest, folder) => void performBatch(transfer === 'move' ? 'move' : 'copy', dest, folder)} />}
  </View>{busy !== '' && <View accessibilityLiveRegion="polite" style={local.busyOverlay}><View style={local.busyCard}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.ink, fontWeight: '600' }}>{busy}</Text><Text style={styles.body}>작업이 끝날 때까지 앱을 열어 두세요.</Text></View></View>}</SafeAreaView>;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
const local = StyleSheet.create({
  topHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brandMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, letterSpacing: 2.4, color: colors.accent, fontWeight: '800' },
  demo: { color: colors.muted, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 16, backgroundColor: '#EBEEE7', gap: 10, minHeight: 50 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13, color: colors.ink },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#ECF0E8', gap: 7 },
  activeChip: { backgroundColor: colors.accent }, chipText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  locationBar: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  locationName: { fontSize: 15, fontWeight: '700', color: colors.ink }, locationDetail: { fontSize: 12, color: colors.muted, marginTop: 4 },
  changeLocation: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  folderTitle: { flex: 1, fontSize: 21, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  sort: { fontSize: 12, color: colors.muted }, count: { fontSize: 12, color: colors.muted }, breadcrumb: { fontSize: 12, color: colors.accent },
  entry: { backgroundColor: colors.white, borderColor: 'transparent', borderWidth: 1, borderRadius: 16 },
  listEntry: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, minHeight: 78 },
  gridEntry: { flex: 1, padding: 17, gap: 14, minHeight: 166, maxWidth: '50%' },
  fileIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  gridIcon: { width: 58, height: 58, borderRadius: 17 }, fileName: { color: colors.ink, fontWeight: '600', fontSize: 14, lineHeight: 20 },
  fileMeta: { color: colors.muted, fontSize: 11, marginTop: 5 },
  selected: { borderColor: colors.accent, backgroundColor: '#F0F6EE' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderColor: '#CBD6CD', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent }, gridCheck: { position: 'absolute', top: 14, right: 14 },
  toolbar: { paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderColor: colors.border },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 12 },
  emptyIcon: { padding: 21, borderRadius: 28, backgroundColor: colors.pale }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  busyOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#F7F8F4CC', alignItems: 'center', justifyContent: 'center' },
  busyCard: { padding: 28, gap: 14, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
});
