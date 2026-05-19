import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../api/client';

// En Expo Go (SDK 53+), les push distantes ne sont plus supportées
const isExpoGo = Constants.executionEnvironment === 'storeClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<void> {
  if (isExpoGo) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Android nécessite un canal de notification
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'AutoFlow',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post('/push-token', { token });
  } catch {
    // Silencieux — les notifs sont une feature optionnelle
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete('/push-token');
  } catch {}
}
