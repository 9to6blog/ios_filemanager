import { Stack } from 'expo-router';
import { colors } from '../../components/ui';
export default function BrowseLayout() {
  return <Stack screenOptions={{ headerTintColor: colors.accent, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }} />;
}
