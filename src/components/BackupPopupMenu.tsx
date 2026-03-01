import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { CloudArrowUpFillIcon } from './icons/CloudArrowUpFillIcon';
import { CloudArrowDownFillIcon } from './icons/CloudArrowDownFillIcon';

type Props = {
  visible: boolean;
  onClose: () => void;
  onExport?: () => void;
  onImport?: () => void;
};

export const BackupPopupMenu: React.FC<Props> = ({
  visible,
  onClose,
  onExport,
  onImport,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleExport = () => {
    onExport?.();
    onClose();
  };

  const handleImport = () => {
    onImport?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={styles.popupWrap}>
          <Animated.View
            style={[
              styles.popup,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleExport}
              activeOpacity={0.7}>
              <CloudArrowUpFillIcon size={22} color="#111827" />
              <Text style={[styles.menuItemText, styles.menuItemTextWithIcon]}>내보내기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleImport}
              activeOpacity={0.7}>
              <CloudArrowDownFillIcon size={22} color="#111827" />
              <Text style={[styles.menuItemText, styles.menuItemTextWithIcon]}>가져오기</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingBottom: 100,
  },
  popupWrap: {
    marginRight: 20,
    marginBottom: 8,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  menuItemTextWithIcon: {
    marginLeft: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
