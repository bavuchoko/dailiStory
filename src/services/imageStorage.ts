import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export const IMAGES_DIR = 'DailyStoryImages';

/**
 * 저장된 이미지 URI를 현재 앱 Document 경로로 재구성.
 * iOS 등에서 경로가 바뀌어도 같은 파일명이면 표시 가능.
 */
export function getDisplayUri(storedUri: string): string {
  if (!storedUri) return storedUri;
  const marker = `${IMAGES_DIR}/`;
  const idx = storedUri.indexOf(marker);
  if (idx < 0) return storedUri;
  const filename = storedUri.slice(idx + marker.length).split('?')[0];
  if (!filename) return storedUri;
  const path = `${RNFS.DocumentDirectoryPath}/${IMAGES_DIR}/${filename}`;
  return `file://${path}`;
}

/** 피커에서 받은 이미지 URI를 앱 문서 디렉터리로 복사해 영구 보관하고, 새 file:// URI 반환 */
export async function copyImageToAppStorage(uri: string): Promise<string> {
  const dir = `${RNFS.DocumentDirectoryPath}/${IMAGES_DIR}`;
  await RNFS.mkdir(dir);

  const ext = getExtensionFromUri(uri);
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const destPath = `${dir}/${filename}`;

  const srcPath = uri.startsWith('file://') ? uri.replace(/^file:\/\//, '') : uri;

  try {
    await RNFS.copyFile(srcPath, destPath);
  } catch {
    try {
      const base64 = await RNFS.readFile(uri, 'base64');
      await RNFS.writeFile(destPath, base64, 'base64');
    } catch {
      throw new Error('이미지를 저장할 수 없습니다.');
    }
  }

  return Platform.OS === 'ios' ? `file://${destPath}` : `file://${destPath}`;
}

function getExtensionFromUri(uri: string): string {
  const match = uri.match(/\.(jpe?g|png|gif|webp)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

/** data URL 접두사 제거 후 순수 base64 반환 */
function stripDataUrlPrefix(data: string): string {
  const idx = data.indexOf(',');
  return idx >= 0 ? data.slice(idx + 1) : data;
}

/** base64 이미지를 앱 문서 디렉터리에 저장 후 file:// URI 반환 (피커·백업 가져오기용) */
export async function saveBase64ToAppStorage(
  base64: string,
  index: number,
): Promise<string> {
  const raw = stripDataUrlPrefix(base64);
  const dir = `${RNFS.DocumentDirectoryPath}/${IMAGES_DIR}`;
  await RNFS.mkdir(dir);
  const ext = raw.startsWith('/9j/') ? 'jpg' : 'png';
  const filename = `img_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const destPath = `${dir}/${filename}`;
  await RNFS.writeFile(destPath, raw, 'base64');
  return Platform.OS === 'ios' ? `file://${destPath}` : `file://${destPath}`;
}
