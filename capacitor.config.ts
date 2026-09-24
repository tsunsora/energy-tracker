import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'app.vanguard.energy', appName: 'Energy', webDir: 'dist',
  android: { backgroundColor: '#101217' },
  plugins: { SystemBars: { insetsHandling: 'native' } }
};
export default config;
