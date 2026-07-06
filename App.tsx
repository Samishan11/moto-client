import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import './src/i18n';
import { AuthProvider } from './src/auth/AuthContext';
// THE app-wide QueryClient. Mutations, socket-sync hooks and AuthContext all
// import this singleton to invalidate/patch caches — the provider MUST use the
// same instance. A second `new QueryClient()` here once split the app into two
// caches: screens read one while every invalidation wrote to the other, so no
// mutation ever updated the UI without a manual reload.
import { queryClient } from './src/api/queryClient';

import { RootNavigator } from './src/navigation/RootNavigator';

export default function App(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaView style={styles.root}>
          <RootNavigator />
          <StatusBar style="light" />
        </SafeAreaView>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0D' },
});
