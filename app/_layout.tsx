import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { DbProvider } from '../src/context/DbContext';
import { getColors } from '../src/constants/colors';
import { ShareIntentProvider } from '../src/context/ShareIntentProvider';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <DbProvider>
      <ShareIntentProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="domain/[domain]" options={{ title: '' }} />
          <Stack.Screen name="link/[id]" options={{ title: 'Link Detayı' }} />
          <Stack.Screen name="search" options={{ title: 'Ara', presentation: 'modal' }} />
          <Stack.Screen name="favorites" options={{ title: 'Favoriler' }} />
          <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
        </Stack>
      </ShareIntentProvider>
    </DbProvider>
  );
}
