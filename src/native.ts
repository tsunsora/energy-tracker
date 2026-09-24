import { registerPlugin } from '@capacitor/core';
export const ScreenAwake = registerPlugin<{ setEnabled(options: { enabled: boolean }): Promise<void> }>('ScreenAwake');
