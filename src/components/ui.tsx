import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';

export const colors = { ink: '#163932', muted: '#6D7C76', accent: '#206E57', pale: '#E7F1E9', background: '#F7F8F4', white: '#FFFFFF', border: '#E3E8E0', danger: '#B84539' };
export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  return <Feather name={name} size={size} color={color} />;
}
export function Button({ label, onPress, icon, secondary = false, danger = false, disabled = false }: {
  label: string; onPress: () => void; icon?: IconName; secondary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const color = secondary ? (danger ? colors.danger : colors.ink) : colors.white;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: secondary ? colors.pale : danger ? colors.danger : colors.accent, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}>
    {icon && <Icon name={icon} color={color} size={18} />}<Text style={[styles.buttonText, { color }]}>{label}</Text>
  </Pressable>;
}
export function IconButton({ icon, label, onPress, active = false }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, active && { backgroundColor: colors.pale }]}><Icon name={icon} /></Pressable>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
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
  return <View accessibilityLiveRegion="polite" style={[styles.notice, error && { backgroundColor: '#FBECE7' }]}>
    <Icon name={error ? 'alert-circle' : 'check-circle'} size={18} color={error ? colors.danger : colors.accent} />
    <Text selectable style={[styles.noticeText, error && { color: colors.danger }]}>{message}</Text>
    {onClose && <IconButton icon="x" label="알림 닫기" onPress={onClose} />}
  </View>;
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 22, flex: 1 },
  heading: { fontSize: 32, fontWeight: '800', letterSpacing: -1.4, color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 6 },
  header: { paddingTop: 24, paddingBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scrim: { flex: 1, backgroundColor: '#0C251F77', justifyContent: 'center', alignItems: 'center', padding: 22 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '88%', backgroundColor: colors.white, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 80px #09261D30' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingLeft: 24, borderBottomWidth: 1, borderColor: colors.border },
  sheetTitle: { color: colors.ink, fontWeight: '800', fontSize: 20, flex: 1 },
  sheetContent: { padding: 24, gap: 16 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 15, fontSize: 16, color: colors.ink, minHeight: 50 },
  notice: { backgroundColor: colors.pale, padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  noticeText: { color: colors.accent, flex: 1, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20 },
  body: { fontSize: 14, lineHeight: 23, color: colors.muted },
});
