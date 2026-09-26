import { Feather } from '@expo/vector-icons';
import { Modal, Platform, PlatformColor, Pressable, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentProps, ReactNode } from 'react';

const system = (name: string, fallback: string): ColorValue => Platform.OS === 'ios' ? PlatformColor(name) : fallback;
export const colors = {
  ink: system('label', '#000000'), muted: system('secondaryLabel', '#8E8E93'),
  accent: system('systemBlue', '#007AFF'), pale: system('tertiarySystemFill', '#F2F2F7'),
  background: system('systemBackground', '#FFFFFF'), grouped: system('systemGroupedBackground', '#F2F2F7'),
  white: system('secondarySystemGroupedBackground', '#FFFFFF'), border: system('separator', '#D1D1D6'),
  danger: system('systemRed', '#FF3B30'),
};
const symbols: Partial<Record<IconName, ComponentProps<typeof SymbolView>['name']>> = {
  folder: 'folder.fill', 'folder-plus': 'folder.badge.plus', image: 'photo', film: 'film', 'play-circle': 'play.circle.fill',
  'file-text': 'doc.text', file: 'doc', music: 'music.note', 'hard-drive': 'externaldrive', smartphone: 'iphone', cloud: 'icloud',
  search: 'magnifyingglass', grid: 'square.grid.2x2', list: 'list.bullet', 'refresh-cw': 'arrow.clockwise',
  'chevron-right': 'chevron.right', 'chevron-left': 'chevron.left', 'arrow-left': 'chevron.left', 'arrow-down': 'arrow.down',
  'more-horizontal': 'ellipsis.circle', plus: 'plus', x: 'xmark', check: 'checkmark', 'check-circle': 'checkmark.circle',
  'alert-circle': 'exclamationmark.circle', copy: 'doc.on.doc', 'corner-up-right': 'folder', 'corner-left-up': 'arrow.turn.up.left',
  'edit-2': 'pencil', share: 'square.and.arrow.up', 'trash-2': 'trash', download: 'square.and.arrow.down',
  server: 'server.rack', 'help-circle': 'questionmark.circle', shield: 'lock.shield', 'check-square': 'checkmark.circle', layers: 'square.stack',
};
export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  if (Platform.OS === 'ios' && symbols[name]) return <SymbolView name={symbols[name]!} size={size} tintColor={color} style={{ width: size + 2, height: size + 2 }} />;
  return <Feather name={name} size={size} color={color} />;
}
export function Button({ label, onPress, icon, secondary = false, danger = false, disabled = false }: {
  label: string; onPress: () => void; icon?: IconName; secondary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const color = secondary ? (danger ? colors.danger : colors.accent) : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: secondary ? colors.pale : danger ? colors.danger : colors.accent, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}>
    {icon && <Icon name={icon} color={color} size={18} />}<Text style={[styles.buttonText, { color }]}>{label}</Text>
  </Pressable>;
}
export function IconButton({ icon, label, onPress, active = false }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, active && { backgroundColor: colors.pale }]}><Icon name={icon} color={colors.accent} /></Pressable>;
}
export function ToolbarButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ alignItems: 'center', gap: 5, padding: 8, opacity: disabled ? 0.3 : 1 }}><Icon name={icon} color={colors.accent} size={22} /><Text style={{ fontSize: 11, color: colors.accent }}>{label}</Text></Pressable>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (Platform.OS === 'ios') return <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.grouped }}>
      <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><IconButton icon="x" label="닫기" onPress={onClose} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
    </SafeAreaView>
  </Modal>;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.scrim}>
      <Pressable accessibilityLabel="대화상자 닫기" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><IconButton icon="x" label="닫기" onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
export function Notice({ message, error = false, onClose }: { message: string; error?: boolean; onClose?: () => void }) {
  return <View accessibilityLiveRegion="polite" style={styles.notice}>
    <Icon name={error ? 'alert-circle' : 'check-circle'} size={18} color={error ? colors.danger : colors.accent} />
    <Text selectable style={[styles.noticeText, error && { color: colors.danger }]}>{message}</Text>
    {onClose && <IconButton icon="x" label="알림 닫기" onPress={onClose} />}
  </View>;
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 22, flex: 1 },
  heading: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 6 },
  header: { paddingTop: 24, paddingBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { minHeight: 44, borderRadius: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scrim: { flex: 1, backgroundColor: '#0C251F77', justifyContent: 'center', alignItems: 'center', padding: 22 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '88%', backgroundColor: colors.white, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 80px #09261D30' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingLeft: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sheetTitle: { color: colors.ink, fontWeight: '600', fontSize: 17, flex: 1 },
  sheetContent: { padding: 24, gap: 16 },
  input: { backgroundColor: colors.white, borderRadius: 10, padding: 15, fontSize: 17, color: colors.ink, minHeight: 48 },
  notice: { backgroundColor: colors.pale, padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  noticeText: { color: colors.accent, flex: 1, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: 10, padding: 16 },
  body: { fontSize: 14, lineHeight: 23, color: colors.muted },
});
