import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import {
  DiaryNoteEditor,
  type DiaryNoteEditorHandle,
} from '../components/DiaryNoteEditor';
import {
  saveEntryForDate,
  getDateString,
  getEntryByDate,
  deleteEntryByDate,
} from '../services/diaryStorage';
import type { DiaryEntry } from '../types/diary';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryWrite'>;

export const DiaryWriteScreen: React.FC<Props> = ({ navigation, route }) => {
  const saveDate = route.params?.date ?? getDateString(new Date());
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<DiaryNoteEditorHandle>(null);

  useEffect(() => {
    let cancelled = false;
    const [y, m, d] = saveDate.split('-').map(Number);
    getEntryByDate(new Date(y, m - 1, d)).then(e => {
      if (!cancelled) {
        setEntry(e);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [saveDate]);

  const handleSave = async () => {
    const draft = editorRef.current?.getDraft();
    if (!draft || !editorRef.current?.canSave()) return;

    setSaving(true);
    try {
      const [y, m, d] = saveDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (!draft.text.trim() && draft.imageUris.length === 0) {
        await deleteEntryByDate(date);
      } else {
        await saveEntryForDate(saveDate, draft);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (editorRef.current?.isDirty()) {
      Alert.alert('변경 내용', '저장하지 않고 나가시겠습니까?', [
        { text: '계속 편집', style: 'cancel' },
        { text: '저장 안 함', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  if (!loaded) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.topButton}>
            <ChevronLeftIcon size={26} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.doneButton, saving && styles.doneButtonDisabled]}
            disabled={saving}>
            <CheckIcon
              size={22}
              color={saving ? '#D1D5DB' : '#111827'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.editorWrap}>
          <DiaryNoteEditor
            ref={editorRef}
            key={saveDate}
            initialEntry={entry}
            autoFocus
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  topButton: {
    padding: 4,
  },
  doneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  doneButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  editorWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
