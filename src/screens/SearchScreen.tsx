import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { TabScreenLayout } from '../components/TabScreenLayout';
import { getEntriesByTag, getAllTags } from '../services/diaryStorage';
import { getDisplayUri } from '../services/imageStorage';
import type { DiaryEntry } from '../types/diary';
import type { TabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<TabParamList, 'SearchTab'>;

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${weekdays[date.getDay()]})`;
}

function formatTime(createdAt: number): string {
  const d = new Date(createdAt);
  const h = `${d.getHours()}`.padStart(2, '0');
  const m = `${d.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

function dateToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

const PREVIEW_LINES = 2;
const PHOTO_SIZE = 56;

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const [tagInput, setTagInput] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  const runSearch = useCallback((tag: string) => {
    const t = tag.trim();
    setSearchTag(t);
    if (!t) {
      setEntries([]);
      return;
    }
    getEntriesByTag(t).then(setEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getAllTags().then(setAllTags);
      if (searchTag) {
        getEntriesByTag(searchTag).then(setEntries);
      }
    }, [searchTag]),
  );

  const handleSubmit = () => {
    runSearch(tagInput);
  };

  const handleTagPress = (tag: string) => {
    setTagInput(tag);
    runSearch(tag);
  };

  const goToDiary = (dateStr: string) => {
    (navigation as any).navigate('HomeTab', {
      screen: 'DiaryRead',
      params: { date: dateToIso(dateStr) },
    });
  };

  const renderEntry = ({ item }: { item: DiaryEntry }) => {
    const preview =
      item.text.length > 80 ? `${item.text.slice(0, 80)}...` : item.text;
    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => goToDiary(item.date)}
        activeOpacity={0.7}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryDate}>{formatDateLabel(item.date)}</Text>
          <Text style={styles.entryTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {item.text ? (
          <Text style={styles.entryPreview} numberOfLines={PREVIEW_LINES}>
            {preview}
          </Text>
        ) : null}
        {item.imageUris.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoRow}
            contentContainerStyle={styles.photoRowContent}>
            {item.imageUris.slice(0, 4).map((uri, i) => (
              <Image
                key={i}
                source={{ uri: getDisplayUri(uri) }}
                style={[styles.thumb, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
              />
            ))}
          </ScrollView>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <TabScreenLayout>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="태그 검색"
          placeholderTextColor="#9CA3AF"
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit}>
          <Text style={styles.searchBtnText}>검색</Text>
        </TouchableOpacity>
      </View>

      {allTags.length > 0 ? (
        <View style={styles.tagSection}>
          <Text style={styles.tagSectionTitle}>태그</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagChips}>
            {allTags.map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tagChip,
                  searchTag && t.toLowerCase() === searchTag.toLowerCase() && styles.tagChipActive,
                ]}
                onPress={() => handleTagPress(t)}>
                <Text
                  style={[
                    styles.tagChipText,
                    searchTag && t.toLowerCase() === searchTag.toLowerCase() && styles.tagChipTextActive,
                  ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {searchTag ? (
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>"{searchTag}" 일기</Text>
          <Text style={styles.resultCount}>{entries.length}건</Text>
        </View>
      ) : null}

      <View style={styles.resultArea}>
        {searchTag && entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>이 태그가 달린 일기가 없습니다.</Text>
          </View>
        ) : null}

        {searchTag && entries.length > 0 ? (
          <FlatList
            data={entries}
            keyExtractor={e => e.id}
            renderItem={renderEntry}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {!searchTag ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>태그를 입력하거나 위 태그를 눌러 검색하세요.</Text>
          </View>
        ) : null}
      </View>
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  searchBtn: {
    paddingHorizontal: 18,
    height: 44,
    backgroundColor: '#111827',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tagSection: {
    marginBottom: 16,
  },
  tagSectionTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  tagChips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
  },
  tagChipActive: {
    backgroundColor: '#111827',
  },
  tagChipText: {
    fontSize: 14,
    color: '#374151',
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 8,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  resultCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultArea: {
    flex: 1,
    minHeight: 200,
  },
  listContent: {
    paddingBottom: 24,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  entryTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  entryPreview: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  photoRow: {
    marginTop: 8,
  },
  photoRowContent: {
    gap: 8,
  },
  thumb: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
  },
  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  hintText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
});
