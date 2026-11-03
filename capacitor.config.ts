import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.allsocial.downloader',
  appName: 'ALL SOCIAL DOWNLOADER',
  webDir: 'dist/all-social-downloader/browser',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    Filesystem: {},
    Preferences: {}
  }
};

export default config;

