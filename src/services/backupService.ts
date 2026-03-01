import { NativeModules, Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import {
  CloudStorage,
  CloudStorageProvider,
  CloudStorageScope,
} from 'react-native-cloud-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { DiaryEntry } from '../types/diary';
import { DEFAULT_FONT_SIZE } from '../types/diary';
import { getAllEntries, saveAllEntries } from './diaryStorage';
import { saveBase64ToAppStorage } from './imageStorage';

const BACKUP_DIR = '/DailyStory';
const BACKUP_FILENAME = 'backup.json';

export type BackupExportResult =
  | { success: true; count?: number }
  | { success: false; error: string };
export type BackupImportResult =
  | { success: true; count: number }
  | { success: false; error: string };

/** 플랫폼별 클라우드 사용 가능 여부 */
export async function isCloudAvailable(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const token = await GoogleSignin.getTokens();
      if (token?.accessToken) {
        CloudStorage.setProviderOptions({ accessToken: token.accessToken });
      }
    }
    return await CloudStorage.isCloudAvailable();
  } catch {
    return false;
  }
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/** Google Drive용 로그인 (Android) */
export async function signInGoogle(): Promise<SignInResult> {
  if (Platform.OS !== 'android') return { ok: true };
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const silent = await GoogleSignin.signInSilently();
    if (silent?.type === 'success') {
      const tokens = await GoogleSignin.getTokens();
      if (tokens?.accessToken) {
        CloudStorage.setProviderOptions({ accessToken: tokens.accessToken });
        return { ok: true };
      }
    }
    const signInResult = await GoogleSignin.signIn();
    if (signInResult?.type !== 'success') {
      return { ok: false, error: 'Google 계정 선택이 취소되었거나 완료되지 않았습니다.' };
    }
    await new Promise(r => setTimeout(r, 300));
    let tokens = await GoogleSignin.getTokens();
    if (!tokens?.accessToken) {
      await new Promise(r => setTimeout(r, 500));
      tokens = await GoogleSignin.getTokens();
    }
    if (tokens?.accessToken) {
      CloudStorage.setProviderOptions({ accessToken: tokens.accessToken });
      return { ok: true };
    }
    return {
      ok: false,
      error:
        'Drive 접근 권한을 가져오지 못했습니다. Google Cloud Console에서 Drive API 사용 설정과 OAuth 동의 화면·scope(drive.appdata)를 확인해 주세요.',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg || 'Google 로그인 중 오류가 발생했습니다.',
    };
  }
}

/** provider 설정: iOS=iCloud, Android=GoogleDrive */
function ensureProvider(): void {
  CloudStorage.setProvider(
    Platform.select({
      ios: CloudStorageProvider.ICloud,
      default: CloudStorageProvider.GoogleDrive,
    }),
  );
}

/** file:// URI에서 base64 읽기 */
async function readImageAsBase64(uri: string): Promise<string | null> {
  try {
    const path = uri.startsWith('file://') ? uri.replace(/^file:\/\//, '') : uri;
    const exists = await RNFS.exists(path);
    if (!exists) return null;
    return await RNFS.readFile(path, 'base64');
  } catch {
    return null;
  }
}

export type BackupEntry = Omit<DiaryEntry, 'imageUris'> & { imageData: string[] };

export type BackupPayload = {
  version: number;
  exportedAt: string;
  entries: BackupEntry[];
};

/** 백업 payload JSON 문자열 생성 (클라우드/파일 공용) */
export async function buildBackupPayload(): Promise<string> {
  const entries = await getAllEntries();
  const backupEntries: BackupEntry[] = [];

  for (const e of entries) {
    const imageData: string[] = [];
    for (const uri of e.imageUris) {
      const b64 = await readImageAsBase64(uri);
      if (b64) imageData.push(b64);
    }
    backupEntries.push({
      id: e.id,
      date: e.date,
      text: e.text,
      tags: e.tags,
      createdAt: e.createdAt,
      fontSize: e.fontSize ?? DEFAULT_FONT_SIZE,
      highlights: e.highlights ?? [],
      strikethroughs: e.strikethroughs ?? [],
      imageData,
    });
  }

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: backupEntries,
  };
  return JSON.stringify(payload);
}

/** payload JSON으로 로컬 복원 (클라우드/파일 공용) */
export async function restoreFromBackupPayload(json: string): Promise<BackupImportResult> {
  try {
    const raw = typeof json === 'string' ? json : String(json);
    const trimmed = raw.trim();
    if (!trimmed || trimmed[0] !== '{') {
      return { success: false, error: '백업 파일 내용이 비어 있거나 형식이 올바르지 않습니다.' };
    }
    const payload = JSON.parse(trimmed) as BackupPayload;
    if (!payload.entries || !Array.isArray(payload.entries)) {
      return { success: false, error: '잘못된 백업 형식입니다. (entries 없음)' };
    }

    const restored: DiaryEntry[] = [];
    for (const e of payload.entries) {
      const imageUris: string[] = [];
      const imageData = e.imageData ?? [];
      for (let i = 0; i < imageData.length; i++) {
        const uri = await saveBase64ToAppStorage(imageData[i], i);
        imageUris.push(uri);
      }
      restored.push({
        id: e.id,
        date: e.date,
        text: e.text,
        tags: e.tags ?? [],
        createdAt: e.createdAt,
        imageUris,
        fontSize: e.fontSize ?? DEFAULT_FONT_SIZE,
        highlights: e.highlights ?? [],
        strikethroughs: e.strikethroughs ?? [],
      });
    }
    await saveAllEntries(restored);
    return { success: true, count: restored.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** 내보내기: 일기+이미지를 클라우드에 업로드 */
export async function exportBackup(): Promise<BackupExportResult> {
  try {
    ensureProvider();

    if (Platform.OS === 'android') {
      const signIn = await signInGoogle();
      if (!signIn.ok) {
        return { success: false, error: signIn.error };
      }
    }

    const available = await isCloudAvailable();
    if (!available) {
      return {
        success: false,
        error:
          Platform.OS === 'ios'
            ? 'iCloud에 로그인되어 있는지 확인해 주세요.'
            : 'Google Drive 로그인이 필요합니다.',
      };
    }

    const json = await buildBackupPayload();
    await CloudStorage.mkdir(BACKUP_DIR, CloudStorageScope.AppData);
    await CloudStorage.writeFile(
      `${BACKUP_DIR}/${BACKUP_FILENAME}`,
      json,
      CloudStorageScope.AppData,
    );
    const payload = JSON.parse(json) as BackupPayload;
    const count = payload.entries?.length ?? 0;
    return { success: true, count };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export type BackupInfoResult =
  | { success: true; count: number; exportedAt: string }
  | { success: false; error: string };

/** 클라우드에 저장된 백업 정보만 읽기 (복원하지 않음) */
export async function getBackupInfoFromCloud(): Promise<BackupInfoResult> {
  try {
    ensureProvider();
    if (Platform.OS === 'android') {
      const signIn = await signInGoogle();
      if (!signIn.ok) return { success: false, error: signIn.error };
    }
    const available = await isCloudAvailable();
    if (!available) {
      return {
        success: false,
        error:
          Platform.OS === 'ios'
            ? 'iCloud 로그인을 확인해 주세요.'
            : 'Google Drive 로그인이 필요합니다.',
      };
    }
    const remotePath = `${BACKUP_DIR}/${BACKUP_FILENAME}`;
    const exists = await CloudStorage.exists(
      remotePath,
      CloudStorageScope.AppData,
    );
    if (!exists) {
      return { success: false, error: '저장된 백업이 없습니다.' };
    }
    if (Platform.OS === 'ios') {
      await CloudStorage.triggerSync(remotePath, CloudStorageScope.AppData);
    }
    const json = await CloudStorage.readFile(
      remotePath,
      CloudStorageScope.AppData,
    );
    const raw = typeof json === 'string' ? json : String(json);
    const trimmed = raw.trim();
    if (!trimmed || trimmed[0] !== '{') {
      return { success: false, error: '백업 파일 형식이 올바르지 않습니다.' };
    }
    const payload = JSON.parse(trimmed) as BackupPayload;
    const count = payload.entries?.length ?? 0;
    const exportedAt = payload.exportedAt
      ? new Date(payload.exportedAt).toLocaleString('ko-KR')
      : '알 수 없음';
    return { success: true, count, exportedAt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** 가져오기: 클라우드에서 다운로드 후 로컬에 복원 */
export async function importBackup(): Promise<BackupImportResult> {
  try {
    ensureProvider();

    if (Platform.OS === 'android') {
      const signIn = await signInGoogle();
      if (!signIn.ok) {
        return { success: false, error: signIn.error };
      }
    }

    const available = await isCloudAvailable();
    if (!available) {
      return {
        success: false,
        error:
          Platform.OS === 'ios'
            ? 'iCloud에 로그인이 되어 있는지 확인해 주세요.'
            : 'Google Drive 로그인이 필요합니다.',
      };
    }

    const remotePath = `${BACKUP_DIR}/${BACKUP_FILENAME}`;
    const exists = await CloudStorage.exists(
      remotePath,
      CloudStorageScope.AppData,
    );
    if (!exists) {
      return { success: false, error: '백업 파일을 찾을 수 없습니다.' };
    }

    if (Platform.OS === 'ios') {
      await CloudStorage.triggerSync(remotePath, CloudStorageScope.AppData);
    }

    const json = await CloudStorage.readFile(
      remotePath,
      CloudStorageScope.AppData,
    );
    return await restoreFromBackupPayload(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** (Android) 파일로 내보내기: 백업 JSON 생성 후 공유 시트로 저장/전달 */
export async function exportBackupToFile(): Promise<BackupExportResult> {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'Android에서만 사용 가능합니다.' };
  }
  try {
    const json = await buildBackupPayload();
    const base = (RNFS.DocumentDirectoryPath ?? RNFS.CacheDirectory ?? '').replace(/\/?$/, '');
    if (!base) {
      return { success: false, error: '저장 경로를 찾을 수 없습니다.' };
    }
    let path: string;
    const subDir = `${base}/DailyStoryBackup`;
    try {
      const exists = await RNFS.exists(subDir);
      if (!exists) await RNFS.mkdir(subDir);
      path = `${subDir}/backup_${Date.now()}.json`;
    } catch {
      path = `${base}/backup_${Date.now()}.json`;
    }
    await RNFS.writeFile(path, json, 'utf8');
    const payload = JSON.parse(json) as BackupPayload;
    const count = payload.entries?.length ?? 0;
    const fileUri = `file://${path}`;
    const ShareFile = NativeModules.ShareFile;
    if (ShareFile?.shareFile) {
      try {
        await ShareFile.shareFile(fileUri, 'Daily Story 백업');
        return { success: true, count };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, error: msg };
      }
    }
    let shareUri = fileUri;
    if (ShareFile?.getContentUri) {
      try {
        shareUri = await ShareFile.getContentUri(fileUri);
      } catch (_) {}
    }
    await Share.share({
      title: 'Daily Story 백업',
      url: shareUri,
    });
    return { success: true, count };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** (Android) 파일에서 가져오기: 백업 파일 URI로 복원 */
export async function importBackupFromFile(fileUri: string): Promise<BackupImportResult> {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'Android에서만 사용 가능합니다.' };
  }
  try {
    let json: string;
    if (fileUri.startsWith('content://')) {
      const ShareFile = NativeModules.ShareFile;
      if (ShareFile?.readContentUri) {
        json = await ShareFile.readContentUri(fileUri);
      } else {
        const res = await fetch(fileUri);
        json = await res.text();
      }
    } else {
      const path = fileUri.startsWith('file://') ? fileUri.replace(/^file:\/\//, '') : fileUri;
      json = await RNFS.readFile(path, 'utf8');
    }
    return await restoreFromBackupPayload(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
