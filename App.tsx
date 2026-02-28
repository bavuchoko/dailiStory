/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';

import { RootNavigator } from './src/navigation/RootNavigator';
import { initIapIfAvailable } from './src/services/purchaseService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  React.useEffect(() => {
    mobileAds().initialize();
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
    <View style={styles.container}>
      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
