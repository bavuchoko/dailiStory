/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { Platform, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { RootNavigator } from './src/navigation/RootNavigator';
import { EntriesRefreshProvider } from './src/context/EntriesRefreshContext';
import { initIapIfAvailable } from './src/services/purchaseService';

// Google Drive 백업용 (Android). webClientId는 Google Cloud Console에서 발급한 Web Client ID로 교체하세요.
if (Platform.OS === 'android') {
  GoogleSignin.configure({
    webClientId: '958134214322-ptjb9rjqebi4s356hu4jie6pm7f4ri1m.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  React.useEffect(() => {
    mobileAds()
      .setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR'],
      })
      .then(() => mobileAds().initialize())
      .catch(() => mobileAds().initialize());
  }, []);

  React.useEffect(() => {
    initIapIfAvailable();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  return (
    <EntriesRefreshProvider>
      <View style={styles.container}>
        <RootNavigator />
      </View>
    </EntriesRefreshProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
