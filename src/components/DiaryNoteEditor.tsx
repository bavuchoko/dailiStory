import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import { TagIcon } from './icons/TagIcon';
import { TextSizeIcon } from './icons/TextSizeIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { CircleXIcon } from './icons/CircleXIcon';
import { BackspaceIcon } from './icons/BackspaceIcon';
import { MarkerTipIcon } from './icons/MarkerTipIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { TypeStrikethroughIcon } from './icons/TypeStrikethroughIcon';
import { HighlightedText } from './HighlightedText';
import {
  copyImageToAppStorage,
  saveBase64ToAppStorage,
  getDisplayUri,
} from '../services/imageStorage';
import {
  adjustHighlightsForTextChange,
  adjustStrikethroughsForTextChange,
} from '../utils/diaryTextAdjust';
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZE_OPTIONS,
  HIGHLIGHT_COLOR_OPTIONS,
  type DiaryEntry,
  type HighlightRange,
  type StrikethroughRange,
} from '../types/diary';

export type DiaryDraft = {
  text: string;
  imageUris: string[];
  tags: string[];
  fontSize: number;
  highlights: HighlightRange[];
  strikethroughs: StrikethroughRange[];
};

export type DiaryNoteEditorHandle = {
  getDraft: () => DiaryDraft;
  isDirty: () => boolean;
  canSave: () => boolean;
};

type ImageAsset = { uri: string };

type Props = {
  initialEntry: DiaryEntry | null;
  autoFocus?: boolean;
};

function draftFromEntry(entry: DiaryEntry | null): DiaryDraft {
  if (!entry) {
    return {
      text: '',
      imageUris: [],
      tags: [],
      fontSize: DEFAULT_FONT_SIZE,
      highlights: [],
      strikethroughs: [],
    };
  }
  return {
    text: entry.text,
    imageUris: [...entry.imageUris],
    tags: [...(entry.tags ?? [])],
    fontSize: entry.fontSize ?? DEFAULT_FONT_SIZE,
    highlights: [...(entry.highlights ?? [])],
    strikethroughs: [...(entry.strikethroughs ?? [])],
  };
}

function serializeDraft(d: DiaryDraft): string {
  return JSON.stringify(d);
}

export const DiaryNoteEditor = forwardRef<DiaryNoteEditorHandle, Props>(
  ({ initialEntry, autoFocus = true }, ref) => {
    const snapshotRef = useRef(serializeDraft(draftFromEntry(initialEntry)));

    const [text, setText] = useState(() => draftFromEntry(initialEntry).text);
    const [images, setImages] = useState<ImageAsset[]>(() =>
      (initialEntry?.imageUris ?? []).map(uri => ({ uri })),
    );
    const [tags, setTags] = useState<string[]>(() => initialEntry?.tags ?? []);
    const [fontSize, setFontSize] = useState(
      () => initialEntry?.fontSize ?? DEFAULT_FONT_SIZE,
    );
    const [highlights, setHighlights] = useState<HighlightRange[]>(
      () => initialEntry?.highlights ?? [],
    );
    const [strikethroughs, setStrikethroughs] = useState<StrikethroughRange[]>(
      () => initialEntry?.strikethroughs ?? [],
    );
    const [selectionStart, setSelectionStart] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);
    const [inputContentHeight, setInputContentHeight] = useState(0);
    const [tagModalVisible, setTagModalVisible] = useState(false);
    const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);
    const [highlightColorMenuVisible, setHighlightColorMenuVisible] =
      useState(false);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
      const draft = draftFromEntry(initialEntry);
      snapshotRef.current = serializeDraft(draft);
      setText(draft.text);
      setImages(draft.imageUris.map(uri => ({ uri })));
      setTags(draft.tags);
      setFontSize(draft.fontSize);
      setHighlights(draft.highlights);
      setStrikethroughs(draft.strikethroughs);
    }, [initialEntry?.date, initialEntry?.updatedAt, initialEntry?.createdAt]);

    const getDraft = (): DiaryDraft => ({
      text,
      imageUris: images.map(i => i.uri),
      tags,
      fontSize,
      highlights,
      strikethroughs,
    });

    useImperativeHandle(ref, () => ({
      getDraft,
      isDirty: () => serializeDraft(getDraft()) !== snapshotRef.current,
      canSave: () => {
        const draft = getDraft();
        const hasContent =
          draft.text.trim().length > 0 || draft.imageUris.length > 0;
        const dirty = serializeDraft(draft) !== snapshotRef.current;
        return hasContent || dirty;
      },
    }));

    const addTag = () => {
      const t = tagInput.trim();
      if (!t || tags.includes(t) || tags.length >= 3) return;
      setTags(prev => [...prev, t]);
      setTagInput('');
    };

    const removeTag = (index: number) => {
      setTags(prev => prev.filter((_, i) => i !== index));
    };

    const handlePickImage = () => {
      launchImageLibrary(
        {
          mediaType: 'photo',
          selectionLimit: 5,
          includeBase64: true,
        },
        async res => {
          if (res.didCancel || res.errorCode) return;
          const assets = res.assets?.filter(a => a.uri) ?? [];
          if (assets.length === 0) return;
          try {
            const persistedUris = await Promise.all(
              assets.map((a, i) =>
                a.base64
                  ? saveBase64ToAppStorage(a.base64, i)
                  : copyImageToAppStorage(a.uri!),
              ),
            );
            setImages(prev =>
              [...prev, ...persistedUris.map(uri => ({ uri }))].slice(0, 10),
            );
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : '사진을 저장할 수 없습니다.';
            Alert.alert('사진 저장 실패', msg);
          }
        },
      );
    };

    return (
      <View style={styles.wrap}>
        <View style={styles.body}>
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageList}
              contentContainerStyle={styles.imageListContent}>
              {images.map((img, index) => (
                <View key={`${img.uri}-${index}`} style={styles.imageWrap}>
                  <Image
                    source={{ uri: getDisplayUri(img.uri) }}
                    style={styles.thumb}
                  />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() =>
                      setImages(prev => prev.filter((_, i) => i !== index))
                    }>
                    <CircleXIcon size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <ScrollView
            style={styles.inputScroll}
            contentContainerStyle={[
              styles.inputScrollContent,
              inputContentHeight > 0 && { minHeight: inputContentHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.inputContainer,
                { minHeight: Math.max(inputContentHeight, 200) },
              ]}>
              <View
                style={[
                  styles.inputBackLayer,
                  { minHeight: Math.max(inputContentHeight, 200) },
                ]}
                pointerEvents="none">
                {text.length > 0 && (
                  <HighlightedText
                    text={text}
                    highlights={highlights}
                    strikethroughs={strikethroughs}
                    style={[
                      styles.inputBackText,
                      { fontSize, lineHeight: fontSize * 1.55 },
                    ]}
                  />
                )}
              </View>
              <TextInput
                autoFocus={autoFocus}
                value={text}
                onChangeText={newText => {
                  setHighlights(prev =>
                    adjustHighlightsForTextChange(text, newText, prev),
                  );
                  setStrikethroughs(prev =>
                    adjustStrikethroughsForTextChange(text, newText, prev),
                  );
                  setText(newText);
                }}
                onContentSizeChange={e => {
                  const h = e.nativeEvent.contentSize.height;
                  setInputContentHeight(Math.max(h, 200));
                }}
                onSelectionChange={e => {
                  setSelectionStart(e.nativeEvent.selection.start);
                  setSelectionEnd(e.nativeEvent.selection.end);
                }}
                placeholder="탭해서 일기를 작성하세요..."
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  styles.inputOverlay,
                  {
                    fontSize,
                    lineHeight: fontSize * 1.55,
                    minHeight: Math.max(inputContentHeight, 200),
                  },
                ]}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </View>
          </ScrollView>

          {tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagRowScroll}
              contentContainerStyle={styles.tagRowContent}>
              {tags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText} numberOfLines={1}>
                    #{tag}
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    onPress={() => removeTag(index)}
                    style={styles.tagChipRemove}>
                    <BackspaceIcon size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => setTagModalVisible(true)}>
            <TagIcon size={22} color="#4f5052" />
          </TouchableOpacity>
          <View style={styles.fontSizeButtonWrap}>
            {fontSizeModalVisible && (
              <View
                style={styles.fontSizeDropdown}
                onStartShouldSetResponder={() => true}>
                {FONT_SIZE_OPTIONS.map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeDropdownOption,
                      fontSize === size && styles.fontSizeOptionActive,
                    ]}
                    onPress={() => {
                      setFontSize(size);
                      setFontSizeModalVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.fontSizeOptionText,
                        { fontSize: size },
                        fontSize === size && styles.fontSizeOptionTextActive,
                      ]}>
                      {size}pt
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setFontSizeModalVisible(prev => !prev)}>
              <TextSizeIcon size={22} color="#4f5052" />
            </TouchableOpacity>
          </View>
          <View style={styles.fontSizeButtonWrap}>
            {highlightColorMenuVisible && (
              <View
                style={styles.highlightColorMenu}
                onStartShouldSetResponder={() => true}>
                {HIGHLIGHT_COLOR_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.highlightColorSwatch,
                      { backgroundColor: opt.color },
                    ]}
                    onPress={() => {
                      if (
                        selectionStart !== selectionEnd &&
                        selectionEnd <= text.length
                      ) {
                        const start = Math.min(selectionStart, selectionEnd);
                        const end = Math.max(selectionStart, selectionEnd);
                        setHighlights(prev =>
                          [...prev, { start, end, color: opt.color }].sort(
                            (a, b) => a.start - b.start,
                          ),
                        );
                      }
                      setHighlightColorMenuVisible(false);
                    }}
                  />
                ))}
                <View style={styles.highlightColorDivider} />
                <TouchableOpacity
                  style={styles.highlightColorClear}
                  onPress={() => {
                    if (
                      selectionStart !== selectionEnd &&
                      selectionEnd <= text.length
                    ) {
                      const start = Math.min(selectionStart, selectionEnd);
                      const end = Math.max(selectionStart, selectionEnd);
                      setHighlights(prev =>
                        prev.filter(h => !(h.start < end && h.end > start)),
                      );
                    }
                    setHighlightColorMenuVisible(false);
                  }}>
                  <XCircleIcon size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setHighlightColorMenuVisible(prev => !prev)}>
              <MarkerTipIcon size={22} color="#4f5052" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.toolButton} onPress={handlePickImage}>
            <PhotoIcon size={22} color="#4f5052" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => {
              if (
                selectionStart === selectionEnd ||
                selectionEnd > text.length
              ) {
                return;
              }
              const start = Math.min(selectionStart, selectionEnd);
              const end = Math.max(selectionStart, selectionEnd);
              const overlapping = strikethroughs.filter(
                s => s.start < end && s.end > start,
              );
              const fullyCovered =
                overlapping.length > 0 &&
                Math.min(...overlapping.map(s => s.start)) <= start &&
                Math.max(...overlapping.map(s => s.end)) >= end;
              if (fullyCovered) {
                setStrikethroughs(prev =>
                  prev.filter(s => !(s.start < end && s.end > start)),
                );
              } else {
                setStrikethroughs(prev =>
                  [...prev, { start, end }].sort((a, b) => a.start - b.start),
                );
              }
            }}>
            <TypeStrikethroughIcon size={22} color="#4f5052" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={tagModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTagModalVisible(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.tagModalOverlay}
            onPress={() => setTagModalVisible(false)}>
            <View
              style={styles.tagModalContent}
              onStartShouldSetResponder={() => true}>
              <Text style={styles.tagModalTitle}>태그 추가</Text>
              <View style={styles.tagModalInputRow}>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="태그 입력"
                  placeholderTextColor="#9CA3AF"
                  style={styles.tagModalInput}
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    styles.tagModalAddBtn,
                    tags.length >= 3 && styles.tagModalAddBtnDisabled,
                  ]}
                  onPress={addTag}
                  disabled={tags.length >= 3}>
                  <Text style={styles.tagModalAddText}>추가</Text>
                </TouchableOpacity>
              </View>
              {tags.length >= 3 && (
                <Text style={styles.tagModalLimit}>
                  태그는 최대 3개까지 추가할 수 있습니다.
                </Text>
              )}
              <ScrollView
                style={styles.tagModalList}
                keyboardShouldPersistTaps="handled">
                {tags.map((tag, index) => (
                  <View key={`${tag}-${index}`} style={styles.tagModalChip}>
                    <Text style={styles.tagModalChipText}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() => removeTag(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <BackspaceIcon size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.tagModalClose}
                onPress={() => setTagModalVisible(false)}>
                <Text style={styles.tagModalCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  },
);

DiaryNoteEditor.displayName = 'DiaryNoteEditor';

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingTop: 4,
  },
  imageList: {
    maxHeight: 100,
    marginBottom: 12,
  },
  imageListContent: {
    paddingRight: 8,
  },
  imageWrap: {
    position: 'relative',
    marginRight: 8,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeImage: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRowScroll: {
    marginTop: 12,
    maxHeight: 40,
  },
  tagRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: 16,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 4,
  },
  tagChipRemove: {
    padding: 2,
  },
  inputScroll: {
    flex: 1,
  },
  inputScrollContent: {
    flexGrow: 1,
  },
  inputContainer: {
    position: 'relative',
  },
  inputBackLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  inputBackText: {
    color: '#111827',
  },
  input: {
    padding: 0,
    color: '#111827',
  },
  inputOverlay: {
    backgroundColor: 'transparent',
    color: 'transparent',
  },
  bottomBar: {
    height: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  toolButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  tagModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
  },
  tagModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tagModalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagModalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginRight: 8,
  },
  tagModalAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  tagModalAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  tagModalAddBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.8,
  },
  tagModalLimit: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  tagModalList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  tagModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagModalChipText: {
    fontSize: 15,
    color: '#374151',
  },
  tagModalClose: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tagModalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  fontSizeButtonWrap: {
    position: 'relative',
  },
  fontSizeDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    marginBottom: 8,
    marginLeft: -70,
    width: 140,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fontSizeDropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  fontSizeOptionActive: {
    backgroundColor: '#E5E7EB',
  },
  fontSizeOptionText: {
    color: '#374151',
  },
  fontSizeOptionTextActive: {
    fontWeight: '600',
    color: '#111827',
  },
  highlightColorMenu: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    marginBottom: 8,
    marginLeft: -120,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  highlightColorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  highlightColorDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  highlightColorClear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
