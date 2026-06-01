import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  Modal,
  FlatList,
  useWindowDimensions,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { CalendarWeekIcon } from '../components/icons/CalendarWeekIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { CircleXIcon } from '../components/icons/CircleXIcon';
import {
  DiaryNoteEditor,
  type DiaryNoteEditorHandle,
} from '../components/DiaryNoteEditor';
import {
  getEntryByDate,
  getDateString,
  saveEntryForDate,
  deleteEntryByDate,
} from '../services/diaryStorage';
import { getIsPaid } from '../services/paidStorage';
import {
  ADMOB_BANNER_UNIT_ID_ANDROID,
  ADMOB_BANNER_UNIT_ID_IOS,
  ADMOB_BANNER_TEST_ANDROID,
  ADMOB_BANNER_TEST_IOS,
} from '../services/admobConfig';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import type { DiaryEntry } from '../types/diary';
import { DEFAULT_FONT_SIZE } from '../types/diary';
import { HighlightedText } from '../components/HighlightedText';
import { getDisplayUri } from '../services/imageStorage';

type Props = NativeStackScreenProps<HomeStackParamList, 'DiaryRead'>;

const PHOTO_THUMB_SIZE = 80;
const YEAR_PICKER_YEARS_BACK = 50;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdayLabels[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function setYearKeepingMonthDay(date: Date, year: number): Date {
  const month = date.getMonth();
  const day = date.getDate();
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, maxDay));
}

export const DiaryReadScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialDate = useMemo(
    () => (route.params?.date ? new Date(route.params.date) : new Date()),
    [route.params?.date],
  );
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<DiaryNoteEditorHandle>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const yearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return Array.from(
      { length: YEAR_PICKER_YEARS_BACK + 1 },
      (_, i) => thisYear - i,
    );
  }, []);
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bannerUnitId =
    Platform.OS === 'ios'
      ? __DEV__
        ? ADMOB_BANNER_TEST_IOS
        : ADMOB_BANNER_UNIT_ID_IOS
      : __DEV__
        ? ADMOB_BANNER_TEST_ANDROID
        : ADMOB_BANNER_UNIT_ID_ANDROID;

  const dateStr = getDateString(currentDate);
  const photoGap = 8;
  const photoThumbSize = PHOTO_THUMB_SIZE;
  const photos = entry?.imageUris ?? [];

  const loadEntry = React.useCallback(() => {
    getEntryByDate(currentDate).then(setEntry);
  }, [dateStr]);

  React.useEffect(() => {
    if (route.params?.date) {
      setCurrentDate(new Date(route.params.date));
    }
  }, [route.params?.date]);

  const goPrevDay = () => {
    setCurrentDate(prev => addDays(prev, -1));
  };

  const goNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  const openYearCalendar = () => {
    navigation.navigate('YearCalendar', {
      date: currentDate.toISOString(),
      returnTo: 'DiaryRead',
    });
  };

  const selectYear = (year: number) => {
    setCurrentDate(prev => setYearKeepingMonthDay(prev, year));
    setYearPickerVisible(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      getIsPaid().then(setIsPaid);
    }, []),
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!isEditing) {
        loadEntry();
      }
    }, [loadEntry, isEditing]),
  );

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    loadEntry();
  };

  const confirmDiscardIfNeeded = (onDiscard: () => void) => {
    if (editorRef.current?.isDirty()) {
      Alert.alert('변경 내용', '저장하지 않고 나가시겠습니까?', [
        { text: '계속 편집', style: 'cancel' },
        { text: '저장 안 함', style: 'destructive', onPress: onDiscard },
      ]);
    } else {
      onDiscard();
    }
  };

  const handleSave = async () => {
    const draft = editorRef.current?.getDraft();
    if (!draft || !editorRef.current?.canSave()) return;

    setSaving(true);
    try {
      if (!draft.text.trim() && draft.imageUris.length === 0) {
        await deleteEntryByDate(currentDate);
        setEntry(null);
      } else {
        const saved = await saveEntryForDate(dateStr, draft);
        setEntry(saved);
      }
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePressBack = () => {
    if (isEditing) {
      confirmDiscardIfNeeded(cancelEditing);
      return;
    }
    if ((navigation as any).canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  const openPhotoViewer = (index: number) => {
    setPhotoViewerIndex(index);
    setPhotoViewerVisible(true);
  };

  const bodyFontSize = entry?.fontSize ?? DEFAULT_FONT_SIZE;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeftGroup}>
              <TouchableOpacity
                onPress={handlePressBack}
                style={styles.topBarBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronLeftIcon size={24} color="#6B7280" />
              </TouchableOpacity>
              {!isEditing && (
                <>
                  <TouchableOpacity
                    onPress={openYearCalendar}
                    style={styles.topBarBtn}>
                    <CalendarWeekIcon size={22} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentDate(new Date())}
                    style={styles.todayButton}>
                    <Text style={styles.topBarToday}>오늘</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {isEditing ? (
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.doneButton, saving && styles.doneButtonDisabled]}
                disabled={saving}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CheckIcon
                  size={22}
                  color={saving ? '#D1D5DB' : '#111827'}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.dateNav}>
                <TouchableOpacity
                  onPress={goPrevDay}
                  style={styles.dateNavDayBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                  accessibilityLabel="전날">
                  <Text style={styles.dateNavDayText}>전날</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setYearPickerVisible(true)}
                  style={styles.dateNavYearBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityLabel="연도 선택">
                  <Text style={styles.dateNavYear}>
                    {currentDate.getFullYear()}
                  </Text>
                  <Text style={styles.dateNavYearChevron}>▾</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={goNextDay}
                  style={styles.dateNavDayBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  accessibilityLabel="다음날">
                  <Text style={styles.dateNavDayText}>다음날</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editorArea}>
              <Text style={styles.dateTitle}>{formatDate(currentDate)}</Text>
              <DiaryNoteEditor
                ref={editorRef}
                key={dateStr}
                initialEntry={entry}
                autoFocus
              />
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.dateTitle}>{formatDate(currentDate)}</Text>

              <Pressable style={styles.notePressable} onPress={startEditing}>
                <ScrollView
                  style={styles.noteScroll}
                  contentContainerStyle={styles.noteScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  {!entry ||
                  (entry.text.trim().length === 0 && photos.length === 0) ? (
                    <Text style={styles.placeholder}>
                      탭해서 일기를 작성하세요...
                    </Text>
                  ) : (
                    <>
                      {photos.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.photoScroll}
                          contentContainerStyle={styles.photoScrollContent}
                          nestedScrollEnabled>
                          {photos.map((uri, index) => (
                            <TouchableOpacity
                              key={`${uri}-${index}`}
                              style={[
                                styles.photoThumbWrap,
                                {
                                  width: photoThumbSize,
                                  height: photoThumbSize,
                                  marginRight:
                                    index < photos.length - 1 ? photoGap : 0,
                                },
                              ]}
                              onPress={e => {
                                e.stopPropagation();
                                openPhotoViewer(index);
                              }}
                              activeOpacity={0.85}>
                              <Image
                                source={{ uri: getDisplayUri(uri) }}
                                style={[
                                  styles.photoThumb,
                                  {
                                    width: photoThumbSize,
                                    height: photoThumbSize,
                                  },
                                ]}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}

                      {entry.text.trim().length > 0 && (
                        <HighlightedText
                          text={entry.text}
                          highlights={entry.highlights}
                          strikethroughs={entry.strikethroughs}
                          style={[
                            styles.noteBody,
                            {
                              fontSize: bodyFontSize,
                              lineHeight: bodyFontSize * 1.55,
                            },
                          ]}
                        />
                      )}
                    </>
                  )}
                </ScrollView>

                {(entry?.tags?.length ?? 0) > 0 && (
                  <View style={styles.tagFooter}>
                    <View style={styles.tagRow}>
                      {(entry?.tags ?? []).map((tag, i) => (
                        <View key={`tag-${i}`} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          <Modal
            visible={yearPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setYearPickerVisible(false)}>
            <Pressable
              style={styles.yearPickerOverlay}
              onPress={() => setYearPickerVisible(false)}>
              <Pressable
                style={styles.yearPickerCard}
                onPress={e => e.stopPropagation()}>
                <Text style={styles.yearPickerTitle}>연도 선택</Text>
                <ScrollView
                  style={styles.yearPickerList}
                  showsVerticalScrollIndicator={false}>
                  {yearOptions.map(year => {
                    const selected = year === currentDate.getFullYear();
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearPickerItem,
                          selected && styles.yearPickerItemSelected,
                        ]}
                        onPress={() => selectYear(year)}>
                        <Text
                          style={[
                            styles.yearPickerItemText,
                            selected && styles.yearPickerItemTextSelected,
                          ]}>
                          {year}년
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={photoViewerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPhotoViewerVisible(false)}>
            <View style={styles.photoViewerOverlay}>
              <View
                style={[
                  styles.photoViewerHeader,
                  { paddingTop: insets.top + 8 },
                ]}>
                <TouchableOpacity
                  style={styles.photoViewerCloseBtn}
                  onPress={() => setPhotoViewerVisible(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="닫기">
                  <CircleXIcon size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <FlatList
                style={styles.photoViewerList}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={photoViewerIndex}
                initialNumToRender={photos.length}
                getItemLayout={(_: unknown, index: number) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
                onMomentumScrollEnd={e => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / screenWidth,
                  );
                  if (index >= 0 && index < photos.length) {
                    setPhotoViewerIndex(index);
                  }
                }}
                keyExtractor={(_, i) => `photo-${i}`}
                renderItem={({ item: uri }) => (
                  <View
                    style={[styles.photoViewerSlide, { width: screenWidth }]}>
                    <Image
                      source={{ uri: getDisplayUri(uri) }}
                      style={styles.photoViewerImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />

              <View
                style={[
                  styles.photoViewerFooter,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}>
                {photos.length > 1 ? (
                  <Text style={styles.photoViewerPageText}>
                    {photoViewerIndex + 1} / {photos.length}
                  </Text>
                ) : null}
              </View>
            </View>
          </Modal>

          {!isPaid && !isEditing && (
            <View
              style={[
                styles.adArea,
                { paddingLeft: insets.left, paddingRight: insets.right },
              ]}>
              <BannerAd
                unitId={bannerUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              />
            </View>
          )}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  topBarLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBarBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  topBarToday: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  todayButton: {
    marginLeft: 8,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateNavDayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dateNavDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dateNavYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dateNavYear: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dateNavYearChevron: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
    marginTop: 1,
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  yearPickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  yearPickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  yearPickerList: {
    maxHeight: 260,
  },
  yearPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  yearPickerItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  yearPickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  yearPickerItemTextSelected: {
    fontWeight: '700',
    color: '#111827',
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
  editorArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  notePressable: {
    flex: 1,
    justifyContent: 'space-between',
  },
  noteScroll: {
    flex: 1,
  },
  noteScrollContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  placeholder: {
    fontSize: 17,
    lineHeight: 26,
    color: '#9CA3AF',
    paddingTop: 8,
  },
  noteBody: {
    color: '#111827',
  },
  photoScroll: {
    maxHeight: PHOTO_THUMB_SIZE + 4,
    marginBottom: 16,
  },
  photoScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  photoThumbWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoThumb: {
    borderRadius: 10,
  },
  tagFooter: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  photoViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  photoViewerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerList: {
    flex: 1,
  },
  photoViewerSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
  photoViewerFooter: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    backgroundColor: '#000000',
  },
  photoViewerPageText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  adArea: {
    minHeight: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
