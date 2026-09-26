import { Stack } from 'expo-router';
import { colors } from '../../components/ui';
export default function LocationsLayout() { return <Stack screenOptions={{ headerTintColor: colors.accent, headerTitleStyle: { color: colors.ink }, headerLargeTitleStyle: { color: colors.ink }, headerShadowVisible: false }} />; }
