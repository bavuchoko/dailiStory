import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TabScreenLayout } from '../components/TabScreenLayout';
import {
  getIsPaid,
  purchaseAdRemoval,
  restorePurchases,
} from '../services/purchaseService';
import {
  seedYearFromTemplate,
  clearAllEntries,
} from '../services/diaryStorage';

export const ToolsScreen: React.FC = () => {
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getIsPaid().then(setIsPaid);
    }, []),
  );

  const handlePurchase = async () => {
    setLoading(true);
    const { success, message } = await purchaseAdRemoval();
    setLoading(false);
    if (success) {
      setIsPaid(true);
      Alert.alert('완료', '광고가 제거되었습니다.');
    } else {
      Alert.alert('오류', message ?? '구매 처리에 실패했습니다.');
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const { success, restored, message } = await restorePurchases();
    setLoading(false);
    if (success && restored) {
      setIsPaid(true);
      Alert.alert('복원 완료', '구매 내역이 복원되었습니다.');
    } else if (success && !restored) {
      Alert.alert('복원', '복원할 구매 내역이 없습니다.');
    } else {
      Alert.alert('오류', message ?? '복원에 실패했습니다.');
    }
  };

  const handleSeedYear = async () => {
    setSeedLoading(true);
    try {
      const added = await seedYearFromTemplate('2026-02-28');
      Alert.alert('완료', `2026년 1/1~12/31에 ${added}건 복제되었습니다.`);
    } catch (e) {
      Alert.alert('오류', (e as Error).message);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 일기가 삭제됩니다. 복원할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            setResetLoading(true);
            try {
              await clearAllEntries();
              Alert.alert('완료', '모든 일기가 삭제되었습니다.');
            } catch (e) {
              Alert.alert('오류', (e as Error).message);
            } finally {
              setResetLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TabScreenLayout>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>광고 제거</Text>
        {isPaid ? (
          <Text style={styles.paidLabel}>유료 구매됨 · 광고가 표시되지 않습니다.</Text>
        ) : (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={handlePurchase}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>광고 제거 구매</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleRestore}
              disabled={loading}>
              <Text style={styles.buttonSecondaryText}>구매 복원</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {/*{__DEV__ && (*/}
      {/*  <View style={styles.section}>*/}
      {/*    <Text style={styles.sectionTitle}>개발용</Text>*/}
      {/*    <Text style={styles.sectionHint}>*/}
      {/*      빌드 시 제외됩니다.*/}
      {/*    </Text>*/}
      {/*    <TouchableOpacity*/}
      {/*      style={[styles.buttonSecondary, styles.devButton]}*/}
      {/*      onPress={handleSeedYear}*/}
      {/*      disabled={seedLoading}>*/}
      {/*      {seedLoading ? (*/}
      {/*        <ActivityIndicator color="#6B7280" size="small" />*/}
      {/*      ) : (*/}
      {/*        <Text style={styles.buttonSecondaryText}>2026년 데이터 복제</Text>*/}
      {/*      )}*/}
      {/*    </TouchableOpacity>*/}
      {/*    <TouchableOpacity*/}
      {/*      style={styles.buttonSecondary}*/}
      {/*      onPress={handleResetData}*/}
      {/*      disabled={resetLoading}>*/}
      {/*      {resetLoading ? (*/}
      {/*        <ActivityIndicator color="#DC2626" size="small" />*/}
      {/*      ) : (*/}
      {/*        <Text style={styles.resetButtonText}>데이터 초기화</Text>*/}
      {/*      )}*/}
      {/*    </TouchableOpacity>*/}
      {/*  </View>*/}
      {/*)}*/}
      <Text style={styles.hint}>
        「광고 제거 구매」는 스토어 인앱 결제로 진행됩니다.{'\n'}
        「구매 복원」은 재설치·기기 변경 후 구매 내역을 불러옵니다.{'\n'}
        상품 ID: remove_ads (앱스토어·플레이 콘솔에 동일 ID로 등록 필요)
      </Text>
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  paidLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  sectionHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: 15,
    color: '#6B7280',
  },
  devButton: {
    marginBottom: 4,
  },
  resetButtonText: {
    fontSize: 15,
    color: '#DC2626',
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
