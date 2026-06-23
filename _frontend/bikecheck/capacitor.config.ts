import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bikecheck.app',
  appName: 'bikecheck-c55fd',
  webDir: 'dist',
  // TODO: remove once the backend is reached over HTTPS. Needed for http://10.0.2.2 during local testing.
  server: {
    cleartext: true,
  },
};

export default config;
