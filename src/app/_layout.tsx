import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, Icon } from '../components/ui';

export default function Layout() {
  return <SafeAreaProvider><StatusBar style="dark" /><Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, paddingTop: 8 },
    tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
  }}>
    <Tabs.Screen name="index" options={{ title: '둘러보기', tabBarIcon: ({ color }) => <Icon name="folder" color={color} /> }} />
    <Tabs.Screen name="locations" options={{ title: '저장소', tabBarIcon: ({ color }) => <Icon name="hard-drive" color={color} /> }} />
    <Tabs.Screen name="guide" options={{ title: '사용 안내', tabBarIcon: ({ color }) => <Icon name="help-circle" color={color} /> }} />
  </Tabs></SafeAreaProvider>;
}
