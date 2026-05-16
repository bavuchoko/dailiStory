import AsyncStorage from '@react-native-async-storage/async-storage';

const PAID_KEY = '@daily_story_paid';

export async function getIsPaid(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PAID_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setPaid(purchased: boolean): Promise<void> {
  await AsyncStorage.setItem(PAID_KEY, purchased ? 'true' : 'false');
}

/** 테스트용: 유료 상태 초기화 (광고 다시 표시) */
export async function resetPaidForTesting(): Promise<void> {
  await AsyncStorage.setItem(PAID_KEY, 'false');
}
