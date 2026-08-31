import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p1324956aa36e44cebf0eabe4ab646da4',
  appName: 'meal-magic-repo',
  webDir: 'dist',
  server: {
    url: 'https://1324956a-a36e-44ce-bf0e-abe4ab646da4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

