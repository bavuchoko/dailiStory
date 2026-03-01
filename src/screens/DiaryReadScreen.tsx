import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  ImageBackground,
  Modal,
  FlatList,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../navigation/types';
import { CalendarWeekIcon } from '../components/icons/CalendarWeekIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { PencilCheckIcon } from '../components/icons/PencilCheckIcon';
import { BackspaceIcon } from '../components/icons/BackspaceIcon';
import { CircleXIcon } from '../components/icons/CircleXIcon';
import {
  getEntriesByDate,
  getDateString,
  deleteEntry,
} from '../services/diaryStorage';
import { getIsPaid } from '../services/paidStorage';
import {
  ADMOB_BANNER_UNIT_ID_ANDROID,
  ADMOB_BANNER_UNIT_ID_IOS,
} from '../services/admobConfig';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import type { DiaryEntry } from '../types/diary';
import { DEFAULT_FONT_SIZE } from '../types/diary';
import { HighlightedText } from '../components/HighlightedText';
import { getDisplayUri } from '../services/imageStorage';

type Props = NativeStackScreenProps<HomeStackParamList, 'DiaryRead'>;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdayLabels[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function formatEntryTime(createdAt: number) {
  const d = new Date(createdAt);
  const h = `${d.getHours()}`.padStart(2, '0');
  const m = `${d.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function addYears(date: Date, amount: number) {
  const next = new Date(date);
  next.setFullYear(date.getFullYear() + amount);
  return next;
}

export const DiaryReadScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialDate = useMemo(
    () => (route.params?.date ? new Date(route.params.date) : new Date()),
    [route.params?.date],
  );
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [entryMetaLayout, setEntryMetaLayout] = useState<
    Record<
      string,
      { containerWidth?: number; lastLineWidth?: number; metaWidth?: number }
    >
  >({});
  const [isPaid, setIsPaid] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bannerUnitId =
    Platform.OS === 'ios' ? ADMOB_BANNER_UNIT_ID_IOS : ADMOB_BANNER_UNIT_ID_ANDROID;

  useFocusEffect(
    React.useCallback(() => {
      getIsPaid().then(setIsPaid);
    }, []),
  );

  const getMetaOnNextLine = (entryId: string) => {
    const layout = entryMetaLayout[entryId];
    if (
      !layout ||
      layout.containerWidth == null ||
      layout.lastLineWidth == null ||
      layout.metaWidth == null
    )
      return true;
    const { containerWidth, lastLineWidth, metaWidth } = layout;
    const gap = 8;
    return lastLineWidth + gap + metaWidth > containerWidth;
  };

  const dateStr = getDateString(currentDate);

  const contentWidth = screenWidth - 48;
  const photoGap = 8;
  const photoSize = (contentWidth - photoGap * 3) / 4;

  useFocusEffect(
    React.useCallback(() => {
      getEntriesByDate(currentDate).then(setEntries);
    }, [dateStr]),
  );

  const allPhotos = useMemo(
    () => entries.flatMap(e => e.imageUris),
    [entries],
  );

  const runSlideTransition = (
    direction: 'up' | 'down' | 'left' | 'right',
    updateDate: () => void,
  ) => {
    if (isAnimatingRef.current) {
      return;
    }

    const { width, height } = Dimensions.get('window');
    let outX = 0;
    let outY = 0;
    let inX = 0;
    let inY = 0;

    switch (direction) {
      case 'up':
        outY = -height;
        inY = height;
        break;
      case 'down':
        outY = height;
        inY = -height;
        break;
      case 'left':
        outX = -width;
        inX = width;
        break;
      case 'right':
        outX = width;
        inX = -width;
        break;
      default:
        break;
    }

    const activeValue =
      direction === 'left' || direction === 'right' ? translateX : translateY;

    isAnimatingRef.current = true;

    Animated.timing(activeValue, {
      toValue: direction === 'left' || direction === 'right' ? outX : outY,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      updateDate();

      translateX.setValue(
        direction === 'left' || direction === 'right' ? inX : 0,
      );
      translateY.setValue(
        direction === 'up' || direction === 'down' ? inY : 0,
      );

      Animated.timing(activeValue, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
      });
    });
  };

  const handleSwipeRelease = (
    _evt: GestureResponderEvent,
    gestureState: PanResponderGestureState,
  ) => {
    const { dx, dy } = gestureState;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 30 && absDy < 30) {
      return;
    }

    if (absDy > absDx) {
      if (dy < 0) {
        runSlideTransition('up', () =>
          setCurrentDate(prev => addDays(prev, 1)),
        );
      } else {
        runSlideTransition('down', () =>
          setCurrentDate(prev => addDays(prev, -1)),
        );
      }
    } else {
      if (dx < 0) {
        runSlideTransition('left', () =>
          setCurrentDate(prev => addYears(prev, 1)),
        );
      } else {
        runSlideTransition('right', () =>
          setCurrentDate(prev => addYears(prev, -1)),
        );
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
      onPanResponderRelease: handleSwipeRelease,
    }),
  ).current;

  const handlePressToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCalendar = () => {
    navigation.navigate('YearCalendar', {
      date: currentDate.toISOString(),
    });
  };

  const handlePressBack = () => {
    if ((navigation as any).canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  const handlePressWrite = () => {
    const root = (navigation as any).getParent()?.getParent();
    root?.navigate('DiaryWrite', { date: dateStr });
  };

  const handlePressEdit = (entryId: string) => {
    const root = (navigation as any).getParent()?.getParent();
    root?.navigate('DiaryWrite', { date: dateStr, entryId });
  };

  const handlePressDelete = async (entryId: string) => {
    const ok = await deleteEntry(entryId);
    if (ok) getEntriesByDate(currentDate).then(setEntries);
  };

  const openPhotoViewer = (index: number) => {
    setPhotoViewerIndex(index);
    setPhotoViewerVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeftGroup}>
            <TouchableOpacity
              onPress={handlePressBack}
              style={styles.topBarBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeftIcon size={24} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenCalendar}
              style={styles.topBarLeft}>
              <CalendarWeekIcon size={22} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePressToday} style={styles.todayButton}>
              <Text style={styles.topBarToday}>오늘</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handlePressWrite} style={styles.writeButton}>
            <Text style={styles.writeButtonText}>쓰기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateHeader} {...panResponder.panHandlers}>
          {allPhotos.length > 0 ? (
            <ImageBackground
              source={{ uri: getDisplayUri(allPhotos[0]) }}
              style={styles.dateHeaderBackground}
              resizeMode="cover">
              <View style={styles.dateHeaderOverlay} />
              <View style={styles.dateHeaderInner}>
                <Text style={styles.dateHeaderText}>{formatDate(currentDate)}</Text>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.dateHeaderInner}>
              <Text style={styles.dateHeaderText}>{formatDate(currentDate)}</Text>
            </View>
          )}
        </View>

        <View style={styles.bodyWrapper}>
          <Animated.View
            style={{
              flex: 1,
              transform: [
                { translateX: translateX },
                { translateY: translateY },
              ],
            }}>
            <View style={styles.content}>
              {allPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {allPhotos.map((uri, index) => (
                    <TouchableOpacity
                      key={`${uri}-${index}`}
                      style={[
                        styles.photoThumbWrap,
                        {
                          width: photoSize,
                          height: photoSize,
                          marginRight: (index + 1) % 4 === 0 ? 0 : photoGap,
                          marginBottom: photoGap,
                        },
                      ]}
                      onPress={() => openPhotoViewer(index)}
                      activeOpacity={0.8}>
                      <Image
                        source={{ uri: getDisplayUri(uri) }}
                        style={[styles.photoThumb, { width: photoSize, height: photoSize }]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Modal
                visible={photoViewerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPhotoViewerVisible(false)}>
                <View style={styles.photoViewerOverlay}>
                  <TouchableOpacity
                    style={styles.photoViewerClose}
                    onPress={() => setPhotoViewerVisible(false)}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <CircleXIcon size={28} color="#FFF" />
                  </TouchableOpacity>
                  <FlatList
                    data={allPhotos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={photoViewerIndex}
                    initialNumToRender={allPhotos.length}
                    getItemLayout={(_: unknown, index: number) => ({
                      length: screenWidth,
                      offset: screenWidth * index,
                      index,
                    })}
                    keyExtractor={(_, i) => `photo-${i}`}
                    renderItem={({ item: uri }) => (
                      <View style={[styles.photoViewerSlide, { width: screenWidth }]}>
                        <Image
                          source={{ uri: getDisplayUri(uri) }}
                          style={styles.photoViewerImage}
                          resizeMode="contain"
                        />
                      </View>
                    )}
                  />
                </View>
              </Modal>
              {entries.length === 0 ? (
                <>
                  <Text style={styles.diaryPlaceholder}>
                    해당 날짜의 일기가 없습니다.
                  </Text>
                  <Text style={styles.helperText}>
                    위/아래로 스와이프하면 하루씩, 좌/우로 스와이프하면 1년씩 이동합니다.
                  </Text>
                </>
              ) : (
                <ScrollView
                  style={styles.entriesScroll}
                  showsVerticalScrollIndicator={false}>
                  {entries.map((entry, index) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.entryBlock,
                        index < entries.length - 1 && styles.entryBlockBorder,
                      ]}>
                      <View
                        style={styles.entryBodyWrap}
                        onLayout={ev => {
                          const w = ev.nativeEvent.layout.width;
                          setEntryMetaLayout(prev => ({
                            ...prev,
                            [entry.id]: {
                              ...prev[entry.id],
                              containerWidth: w,
                            },
                          }));
                        }}>
                        <HighlightedText
                          text={entry.text}
                          highlights={entry.highlights}
                          strikethroughs={entry.strikethroughs}
                          style={[
                            styles.entryText,
                            {
                              fontSize: entry.fontSize ?? DEFAULT_FONT_SIZE,
                              lineHeight: (entry.fontSize ?? DEFAULT_FONT_SIZE) * 1.5,
                            },
                          ]}
                          onTextLayout={ev => {
                            const lines = ev.nativeEvent.lines;
                            if (lines.length > 0) {
                              const last = lines[lines.length - 1];
                              const lastW = last.width;
                              setEntryMetaLayout(prev => ({
                                ...prev,
                                [entry.id]: {
                                  ...prev[entry.id],
                                  lastLineWidth: lastW,
                                },
                              }));
                            }
                          }}
                        />
                        <View
                          style={
                            getMetaOnNextLine(entry.id)
                              ? styles.entryMetaRowNextLine
                              : styles.entryMetaRow
                          }
                          pointerEvents="box-none">
                          <View style={styles.entryMetaRowInner}>
                            <View style={styles.entryMetaSpacer} />
                            <View
                              style={styles.entryMetaContentWrap}
                              onLayout={ev => {
                                const w = ev.nativeEvent.layout.width;
                                setEntryMetaLayout(prev => ({
                                  ...prev,
                                  [entry.id]: {
                                    ...prev[entry.id],
                                    metaWidth: w,
                                  },
                                }));
                              }}>
                              {(entry.tags?.length ?? 0) > 0 && (
                                <View style={styles.entryMetaTagsWrap}>
                                  {(entry.tags ?? []).map((tag, i) => (
                                    <View
                                      key={`${entry.id}-tag-${i}`}
                                      style={styles.entryTag}>
                                      <Text
                                        style={styles.entryTagText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail">
                                        {tag}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                              <View style={styles.entryMetaActions} pointerEvents="box-none">
                                <Text style={styles.entryTime}>
                                  {formatEntryTime(entry.createdAt)}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handlePressEdit(entry.id)}
                                  style={styles.entryActionBtn}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <PencilCheckIcon size={18} color="#8e9299" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handlePressDelete(entry.id)}
                                  style={styles.entryActionBtn}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <BackspaceIcon size={18} color="#eb9d9d" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </Animated.View>
        </View>

        {!isPaid && (
          <View
            style={[
              styles.adArea,
              {
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
            ]}>
            <BannerAd
              unitId={bannerUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  topBarLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarBack: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 4,
  },
  topBarLeft: {
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
  writeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  writeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dateHeader: {
    backgroundColor: '#111827',
    height: 180,
    overflow: 'hidden',
  },
  dateHeaderInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  dateHeaderBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dateHeaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dateHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
    zIndex: 1,
  },
  content: {
    flex: 1,
    marginTop: 0,
    marginHorizontal: 0,
    backgroundColor: '#FFFFFF',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  photoThumbWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoThumb: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  photoViewerSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
  entriesScroll: {
    flex: 1,
  },
  entryBlock: {
    paddingBottom: 8,
    marginBottom: 8,
  },
  entryBlockBorder: {
  },
  entryBodyWrap: {
    position: 'relative',
  },
  entryText: {
    color: '#111827',
  },
  entryMetaRow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  entryMetaRowNextLine: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 24,
  },
  entryMetaRowInner: {
    height:24,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    width: '100%',
  },
  entryMetaSpacer: {
    flex: 1,
    minWidth: 0,
  },
  entryMetaContentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  entryMetaTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    minWidth: 0,
    marginRight: 8,
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 1,
  },
  entryMetaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  entryTime: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 4,
  },
  entryActionBtn: {
    marginLeft: 4,
    padding: 6,
  },
  entryTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  entryTag: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 6,
    maxWidth: 100,
    minWidth: 0,
    flexShrink: 1,
  },
  entryTagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bodyWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  adArea: {
    minHeight: 60,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  diaryPlaceholder: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});

