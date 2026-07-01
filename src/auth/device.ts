import { Platform } from 'react-native';
import * as Device from 'expo-device';

export type SessionPlatform = 'IOS' | 'ANDROID' | 'WEB';

/** Maps the RN platform to the backend's `Platform` enum. */
export function currentPlatform(): SessionPlatform {
  switch (Platform.OS) {
    case 'ios':
      return 'IOS';
    case 'android':
      return 'ANDROID';
    default:
      return 'WEB';
  }
}

/**
 * Human-readable device label shown in the (future) "Devices" screen, e.g.
 * "iPhone 15". Falls back to the platform name when the model is unavailable.
 */
export function deviceName(): string {
  return Device.modelName ?? Device.deviceName ?? currentPlatform();
}
