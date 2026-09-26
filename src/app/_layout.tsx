import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, styles } from '../components/ui';
import { files } from '../lib/files';

export default function Layout() {
  const dark = useColorScheme() === 'dark';
  const [ready, setReady] = useState(Platform.OS !== 'ios');
  const [error, setError] = useState('');
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // Don't mount any file list before the native privacy gate is installed.
    void files.showSystemBrowser().then(() => setReady(true)).catch(e => setError(String(e)));
  }, []);
  return <SafeAreaProvider><ThemeProvider value={dark ? DarkTheme : DefaultTheme}><StatusBar style="auto" />
    {ready ? <Stack screenOptions={{ headerShown: false }} /> : <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }]}>
      {error ? <Text style={{ color: colors.ink }}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
    </View>}
  </ThemeProvider></SafeAreaProvider>;
}
