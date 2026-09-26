import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../components/ui';

export default function Layout() {
  const dark = useColorScheme() === 'dark';
  return <SafeAreaProvider><ThemeProvider value={dark ? DarkTheme : DefaultTheme}><StatusBar style="auto" />
    <NativeTabs tintColor={colors.accent}>
      <NativeTabs.Trigger name="(browse)"><NativeTabs.Trigger.Label>둘러보기</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} /></NativeTabs.Trigger>
      <NativeTabs.Trigger name="locations"><NativeTabs.Trigger.Label>저장소</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{ default: 'externaldrive', selected: 'externaldrive.fill' }} /></NativeTabs.Trigger>
      <NativeTabs.Trigger name="guide"><NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="gearshape" /></NativeTabs.Trigger>
    </NativeTabs>
  </ThemeProvider></SafeAreaProvider>;
}
