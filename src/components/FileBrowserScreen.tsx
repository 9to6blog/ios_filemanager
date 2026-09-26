import { useCallback, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, colors, Icon, Notice, Sheet, styles, type IconName } from '../components/ui';
import { TransferSheet } from '../components/TransferSheet';
import { FileThumbnail } from './FileThumbnail';
import { categoryOf, formatSize, validateName, visibleEntries, type Category } from '../lib/file-utils';
import { files, isDemo } from '../lib/files';
import type { Entry, Location } from '../lib/types';

const categories: { id: Category; label: string; icon: IconName }[] = [
  { id: 'all', label: '전체', icon: 'grid' }, { id: 'image', label: '이미지', icon: 'image' },
  { id: 'video', label: '영상', icon: 'film' }, { id: 'document', label: '문서', icon: 'file-text' }, { id: 'audio', label: '오디오', icon: 'music' },
];
const fileLooks: Record<string, { icon: IconName; tint: string; background: string }> = {
  folder: { icon: 'folder', tint: '#5AC8FA', background: 'transparent' }, image: { icon: 'image', tint: '#8E8E93', background: 'transparent' },
  video: { icon: 'play-circle', tint: '#8E8E93', background: 'transparent' }, document: { icon: 'file-text', tint: '#8E8E93', background: 'transparent' },
  audio: { icon: 'music', tint: '#8E8E93', background: 'transparent' }, other: { icon: 'file', tint: '#8E8E93', background: 'transparent' },
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
    setSelected([]); setSelecting(false); setNotice(null);
    void load();
    return () => { loadGeneration.current++; };
  }, [load]));

  function navigate(nextPath: string, nextLocation = location) {
    router.push({ pathname: '/folder', params: { path: nextPath, location: nextLocation } });
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
  function showFilter() {
    ActionSheetIOS.showActionSheetWithOptions({ options: [...categories.map(item => item.label), '취소'], cancelButtonIndex: categories.length, title: '파일 종류' }, index => {
      if (index < categories.length) setCategory(categories[index].id);
    });
  }
  function showMenu() {
    if (busy) return;
    if (Platform.OS !== 'ios') { startEditor('folder'); return; }
    ActionSheetIOS.showActionSheetWithOptions({
      options: ['파일 가져오기', '새로운 폴더', grid ? '목록으로 보기' : '아이콘으로 보기', '이름순 정렬', '최근 수정순 정렬', '크기순 정렬', '파일 종류 필터', '저장소 변경', '취소'],
      cancelButtonIndex: 8,
    }, index => {
      if (index === 0) void run('가져오는 중', async () => { const count = await files.importFiles(location, path); return count ? `${count}개 파일을 가져왔습니다.` : undefined; });
      if (index === 1) startEditor('folder');
      if (index === 2) setGrid(!grid);
      if (index === 3) setSort('name');
      if (index === 4) setSort('date');
      if (index === 5) setSort('size');
      if (index === 6) showFilter();
      if (index === 7) router.navigate('/locations');
    });
  }
  const renderEntry = ({ item }: { item: Entry }) => {
    const look = fileLooks[categoryOf(item)] ?? fileLooks.other;
    const checked = selected.includes(item.path);
    return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}${item.isDirectory ? ', 폴더' : ''}${checked ? ', 선택됨' : ''}`}
      accessibilityState={{ selected: checked }} onPress={() => open(item)} onLongPress={() => { setSelecting(true); toggle(item); }}
      style={({ pressed }) => [local.entry, grid ? local.gridEntry : local.listEntry, checked && local.selected, pressed && { opacity: 0.6 }]}>
      <View style={[local.fileIcon, grid && local.gridIcon]}><FileThumbnail entry={item} location={location} large={grid} fallback={look.icon} /></View>
      <View style={{ flex: grid ? undefined : 1, width: grid ? '100%' : undefined }}>
        <Text numberOfLines={grid ? 2 : 1} style={[local.fileName, grid && { textAlign: 'center' }]}>{item.name}</Text>
        <Text numberOfLines={1} style={[local.fileMeta, grid && { textAlign: 'center' }]}>{item.modified > 0 ? `${new Date(item.modified).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} · ` : ''}{item.isDirectory ? '폴더' : formatSize(item.size)}</Text>
      </View>
      {selecting ? <View style={[local.checkbox, grid && local.gridCheck, checked && local.checked]}>{checked && <Icon name="check" color="white" size={14} />}</View>
        : item.isDirectory && !grid ? <Icon name="chevron-right" size={13} color={colors.muted} /> : null}
    </Pressable>;
  };
  const header = <View>
    {isDemo && <Text style={local.demo}>브라우저 개발 테스트 · 기기 파일과 별개</Text>}
    {category !== 'all' && <Pressable onPress={() => setCategory('all')} style={local.filter}><Text style={{ color: colors.accent }}>{categories.find(item => item.id === category)?.label}만 보기</Text><Icon name="x" size={14} color={colors.accent} /></Pressable>}
    {notice && <View style={{ paddingHorizontal: 16 }}><Notice {...notice} onClose={() => setNotice(null)} /></View>}
    {selecting && <View style={local.selectionHeader}><Pressable onPress={() => setSelected(selected.length === visible.length ? [] : visible.map(e => e.path))}><Text style={{ color: colors.accent, fontSize: 17 }}>{selected.length === visible.length && visible.length > 0 ? '전체 해제' : '전체 선택'}</Text></Pressable><Text style={styles.body}>{selected.length}개 선택</Text></View>}
  </View>;
  return <View style={styles.screen}>
    <Stack.Screen options={{
      title: selecting ? `${selected.length}개 선택` : currentName,
      headerLargeTitleEnabled: !selecting,
      headerLargeTitleShadowVisible: false,
      gestureEnabled: !busy,
      headerBackVisible: !busy,
      headerSearchBarOptions: { placeholder: '검색', hideWhenScrolling: false, obscureBackground: false, cancelButtonText: '취소', onChangeText: event => setQuery(event.nativeEvent.text), onCancelButtonPress: () => setQuery('') },
    }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button disabled={!!busy} onPress={() => { setSelecting(!selecting); setSelected([]); }}>{selecting ? '완료' : '선택'}</Stack.Toolbar.Button>
      {!selecting && <Stack.Toolbar.Button icon="ellipsis.circle" accessibilityLabel="더 보기" disabled={!!busy} onPress={showMenu} />}
    </Stack.Toolbar>
    <FlatList data={visible} key={grid ? `grid-${columns}` : 'list'} numColumns={grid ? columns : 1}
      contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
      keyExtractor={item => item.path} renderItem={renderEntry} columnWrapperStyle={grid ? { paddingHorizontal: 12, gap: 8 } : undefined}
      refreshing={loading} onRefresh={() => void load()}
      ListHeaderComponent={header}
      ItemSeparatorComponent={grid ? undefined : () => <View style={local.separator} />}
      contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
      ListFooterComponent={visible.length > 0 ? <Text style={local.footer}>{visible.length}개 항목 · {formatSize(bytes)}</Text> : null}
      ListEmptyComponent={<View style={local.empty}><Icon name={query ? 'search' : 'folder'} size={58} color={colors.muted} /><Text style={local.emptyTitle}>{loading ? '불러오는 중' : query || category !== 'all' ? '검색 결과 없음' : '파일 없음'}</Text><Text style={[styles.body, { textAlign: 'center' }]}>{query || category !== 'all' ? '다른 검색어나 파일 종류를 선택하세요.' : '상단의 더 보기 버튼에서 파일을 가져오거나\n새로운 폴더를 만드세요.'}</Text></View>} />
    {selecting && <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Button icon="square.and.arrow.up" accessibilityLabel="공유" disabled={selected.length !== 1 || !!busy} onPress={() => void run('공유 중', () => files.share(location, selected[0]))} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="doc.on.doc" accessibilityLabel="복사" disabled={!selected.length || !!busy} onPress={() => setTransfer('copy')} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="folder" accessibilityLabel="이동" disabled={!selected.length || !!busy} onPress={() => setTransfer('move')} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="pencil" accessibilityLabel="이름 변경" disabled={selected.length !== 1 || !!busy} onPress={() => startEditor('rename')} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="trash" accessibilityLabel="삭제" disabled={!selected.length || !!busy} onPress={() => setConfirmDelete(true)} />
    </Stack.Toolbar>}
    <Sheet visible={editor !== null} title={editor === 'folder' ? '새로운 폴더' : '이름 변경'} onClose={() => setEditor(null)}>
      <TextInput accessibilityLabel="이름" autoFocus placeholder="이름" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={styles.input} onSubmitEditing={() => void submitEditor()} returnKeyType="done" selectTextOnFocus />
      {editorError !== '' && <Notice message={editorError} error />}<Button label={editor === 'folder' ? '생성' : '완료'} onPress={() => void submitEditor()} />
    </Sheet>
    <Sheet visible={confirmDelete} title={`${selected.length}개 항목 삭제`} onClose={() => setConfirmDelete(false)}>
      <Text style={styles.body}>파일과 폴더 안의 내용이 영구 삭제됩니다. 외부 폴더에서는 원본이 삭제됩니다. 이 앱에서는 복구할 수 없습니다.</Text>
      <Text numberOfLines={5} style={{ color: colors.ink }}>{selected.map(item => item.split('/').pop()).join('\n')}</Text>
      <Button danger label="영구 삭제" icon="trash-2" onPress={() => void performBatch('delete')} /><Button secondary label="취소" onPress={() => setConfirmDelete(false)} />
    </Sheet>
    {transfer !== null && <TransferSheet visible move={transfer === 'move'} count={selected.length} onClose={() => setTransfer(null)} onSubmit={(dest, folder) => void performBatch(transfer === 'move' ? 'move' : 'copy', dest, folder)} />}
    {busy !== '' && <View accessibilityLiveRegion="polite" style={local.busyOverlay}><View style={local.busyCard}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.ink, fontWeight: '600' }}>{busy}</Text><Text style={styles.body}>완료될 때까지 앱을 열어 두세요.</Text></View></View>}
  </View>;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
const local = StyleSheet.create({
  demo: { color: colors.muted, fontSize: 11, lineHeight: 17, padding: 16 },
  filter: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  entry: { backgroundColor: colors.background },
  listEntry: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 9, gap: 13, minHeight: 68 },
  gridEntry: { flex: 1, paddingHorizontal: 6, paddingVertical: 18, gap: 8, minHeight: 150, maxWidth: '50%', alignItems: 'center' },
  fileIcon: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  gridIcon: { width: 80, height: 72 },
  fileName: { color: colors.ink, fontWeight: '400', fontSize: 17, lineHeight: 22 },
  fileMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  selected: { backgroundColor: colors.pale },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 73 },
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  checkbox: { width: 23, height: 23, borderRadius: 12, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent }, gridCheck: { position: 'absolute', top: 12, right: 8 },
  footer: { textAlign: 'center', fontSize: 13, color: colors.muted, padding: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 24, gap: 14 },
  emptyTitle: { color: colors.ink, fontSize: 22, fontWeight: '600' },
  busyOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#00000033', alignItems: 'center', justifyContent: 'center' },
  busyCard: { padding: 24, gap: 14, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center' },
});
