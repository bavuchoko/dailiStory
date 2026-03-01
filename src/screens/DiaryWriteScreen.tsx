import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { TagIcon } from '../components/icons/TagIcon';
import { TextSizeIcon } from '../components/icons/TextSizeIcon';
import { PhotoIcon } from '../components/icons/PhotoIcon';
import { CircleXIcon } from '../components/icons/CircleXIcon';
import { BackspaceIcon } from '../components/icons/BackspaceIcon';
import {
  addEntry,
  updateEntry,
  getDateString,
  getEntryById,
} from '../services/diaryStorage';
import { DEFAULT_FONT_SIZE, FONT_SIZE_OPTIONS } from '../types/diary';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryWrite'>;

type ImageAsset = { uri: string };

export const DiaryWriteScreen: React.FC<Props> = ({ navigation, route }) => {
  const entryId = route.params?.entryId;
  const [text, setText] = useState('');
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!entryId);

  const saveDate =
    route.params?.date ?? getDateString(new Date());

  useEffect(() => {
    if (!entryId) {
      setLoaded(true);
      return;
    }
    getEntryById(entryId).then(entry => {
      if (entry) {
        setText(entry.text);
        setImages(entry.imageUris.map(uri => ({ uri })));
        setTags(entry.tags ?? []);
        setFontSize(entry.fontSize ?? DEFAULT_FONT_SIZE);
      }
      setLoaded(true);
    });
  }, [entryId]);

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
        includeBase64: false,
      },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) return;
        const assets = res.assets?.filter(a => a.uri) ?? [];
        if (assets.length) {
          setImages(prev => [
            ...prev,
            ...assets.map(a => ({ uri: a.uri! })),
          ].slice(0, 10));
        }
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topButton}>
            <Text style={styles.backText}>{'< back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>일기 쓰기</Text>

          <TouchableOpacity
            onPress={async () => {
              if (saving || !loaded || !text.trim()) return;
              setSaving(true);
              try {
                if (entryId) {
                  await updateEntry(entryId, {
                    text,
                    imageUris: images.map(i => i.uri),
                    tags,
                    fontSize,
                  });
                } else {
                  await addEntry({
                    date: saveDate,
                    text,
                    imageUris: images.map(i => i.uri),
                    tags,
                    fontSize,
                  });
                }
                navigation.goBack();
              } finally {
                setSaving(false);
              }
            }}
            style={styles.saveButton}
            disabled={saving || !loaded || !text.trim()}>
            <Text
              style={[
                styles.saveText,
                (saving || !loaded || !text.trim()) && styles.saveTextDisabled,
              ]}>
              {saving ? '저장 중...' : '저장'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageList}
              contentContainerStyle={styles.imageListContent}>
              {images.map((img, index) => (
                <View key={`${img.uri}-${index}`} style={styles.imageWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
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
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="내용을 입력하세요..."
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              {
                fontSize,
                lineHeight: fontSize * 1.5,
              },
            ]}
            multiline
            textAlignVertical="top"
          />
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
          <TouchableOpacity style={styles.toolButton} onPress={handlePickImage}>
            <PhotoIcon size={22} color="#4f5052" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton}>
            <FeatherIcon name="video" size={22} color="#4f5052" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton}>
            <FeatherIcon name="mic" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={tagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTagModalVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.tagModalOverlay}
          onPress={() => setTagModalVisible(false)}>
          <View style={styles.tagModalContent} onStartShouldSetResponder={() => true}>
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
                style={[styles.tagModalAddBtn, tags.length >= 3 && styles.tagModalAddBtnDisabled]}
                onPress={addTag}
                disabled={tags.length >= 3}>
                <Text style={styles.tagModalAddText}>추가</Text>
              </TouchableOpacity>
            </View>
            {tags.length >= 3 && (
              <Text style={styles.tagModalLimit}>태그는 최대 3개까지 추가할 수 있습니다.</Text>
            )}
            <ScrollView style={styles.tagModalList} keyboardShouldPersistTaps="handled">
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  saveButton: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  saveTextDisabled: {
    color: '#D1D5DB',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  input: {
    flex: 1,
    color: '#111827',
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
});

