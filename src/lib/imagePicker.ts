import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../i18n';

export interface PickedFile {
  uri: string;
  contentType: string;
}

type Source = 'camera' | 'library';

/** Ask the user to take a photo or choose from the library. */
function chooseSource(): Promise<Source | null> {
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('imagePicker.title'),
      undefined,
      [
        { text: i18n.t('imagePicker.takePhoto'), onPress: () => resolve('camera') },
        { text: i18n.t('imagePicker.chooseLibrary'), onPress: () => resolve('library') },
        { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

function toPicked(result: ImagePicker.ImagePickerResult): PickedFile | null {
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, contentType: asset.mimeType ?? 'image/jpeg' };
}

/**
 * Pick an image — via camera or library. Returns null if the user cancels or
 * denies permission.
 */
export async function pickImage(): Promise<PickedFile | null> {
  const source = await chooseSource();
  if (!source) return null;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    return toPicked(
      await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }),
    );
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  return toPicked(
    await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }),
  );
}
