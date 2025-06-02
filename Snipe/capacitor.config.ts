import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snipe.app',
  appName: 'Snipe',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#171a21',
      style: 'LIGHT',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#171a21',
      showSpinner: false,
    },
  },
};

export default config;
