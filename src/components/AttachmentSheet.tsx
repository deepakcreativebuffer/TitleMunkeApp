import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { appColors, typography, scaleWidth } from '../global';

export type AttachOption = 'photos' | 'camera' | 'location' | 'document';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: AttachOption) => void;
}

// WhatsApp-style attachment grid, themed to the app's warm maroon/coffee palette.
// AI images / Poll / Event intentionally omitted.
const OPTIONS: Array<{
  key: AttachOption;
  label: string;
  bg: string;
}> = [
  { key: 'photos', label: 'Photos', bg: appColors.maroonLink },
  { key: 'camera', label: 'Camera', bg: appColors.warning },
  { key: 'location', label: 'Location', bg: appColors.success },
  { key: 'document', label: 'Document', bg: appColors.coffeeDark },
];

// Crisp white line-art glyphs drawn with plain Views (no icon dependency), so
// all five tiles share one consistent monochrome style like WhatsApp.
const ICON = '#ffffff';
const ST = scaleWidth(2); // stroke width
const w = (n: number) => scaleWidth(n);

const AttachIcon = ({ name }: { name: AttachOption }) => {
  switch (name) {
    case 'photos':
      // Framed photo with a "sun" and a mountain.
      return (
        <View style={ic.photoFrame}>
          <View style={ic.photoSun} />
          <View style={ic.photoHill} />
        </View>
      );
    case 'camera':
      return (
        <View style={ic.camWrap}>
          <View style={ic.camBump} />
          <View style={ic.camBody}>
            <View style={ic.camLens} />
          </View>
        </View>
      );
    case 'location':
      // Teardrop pin: a rounded square with one sharp (bottom) corner, rotated.
      return (
        <View style={ic.pinWrap}>
          <View style={ic.pin}>
            <View style={ic.pinDot} />
          </View>
        </View>
      );
    case 'document':
      return (
        <View style={ic.doc}>
          <View style={ic.docLine} />
          <View style={ic.docLine} />
          <View style={ic.docLineShort} />
        </View>
      );
  }
};

export const AttachmentSheet = ({ visible, onClose, onSelect }: Props) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Share content</Text>
          <View style={styles.grid}>
            {OPTIONS.map(o => (
              <TouchableOpacity
                key={o.key}
                activeOpacity={0.85}
                style={styles.item}
                onPress={() => onSelect(o.key)}
              >
                <View style={[styles.tile, { backgroundColor: o.bg }]}>
                  <AttachIcon name={o.key} />
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // No dim layer — the chat stays fully visible behind the sheet.
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: appColors.background,
    borderTopLeftRadius: scaleWidth(28),
    borderTopRightRadius: scaleWidth(28),
    paddingTop: scaleWidth(12),
    paddingBottom: scaleWidth(36),
    paddingHorizontal: scaleWidth(20),
    shadowColor: '#3d2014',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: scaleWidth(42),
    height: scaleWidth(5),
    borderRadius: scaleWidth(3),
    backgroundColor: 'rgba(94,23,23,0.18)',
    marginBottom: scaleWidth(16),
  },
  title: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginBottom: scaleWidth(18),
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    width: '20%',
    alignItems: 'center',
  },
  tile: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleWidth(9),
    shadowColor: '#3d2014',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    ...typography(500, 11.5, 'coffeeDark'),
    fontWeight: '500',
    textAlign: 'center',
  },
});

// White line-art glyphs (shared monochrome style across all tiles).
const ic = StyleSheet.create({
  // Photos
  photoFrame: {
    width: w(26),
    height: w(22),
    borderWidth: ST,
    borderColor: ICON,
    borderRadius: w(5),
    overflow: 'hidden',
  },
  photoSun: {
    position: 'absolute',
    top: w(3),
    left: w(3),
    width: w(6),
    height: w(6),
    borderRadius: w(3),
    backgroundColor: ICON,
  },
  photoHill: {
    position: 'absolute',
    bottom: -w(1),
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: w(9),
    borderRightWidth: w(9),
    borderBottomWidth: w(13),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ICON,
  },
  // Camera
  camWrap: {
    width: w(26),
    height: w(22),
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  camBump: {
    position: 'absolute',
    top: w(1),
    width: w(10),
    height: w(5),
    borderTopLeftRadius: w(2),
    borderTopRightRadius: w(2),
    backgroundColor: ICON,
  },
  camBody: {
    width: w(26),
    height: w(17),
    borderWidth: ST,
    borderColor: ICON,
    borderRadius: w(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  camLens: {
    width: w(9),
    height: w(9),
    borderWidth: ST,
    borderColor: ICON,
    borderRadius: w(5),
  },
  // Location pin
  pinWrap: {
    width: w(24),
    height: w(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: w(17),
    height: w(17),
    borderWidth: ST,
    borderColor: ICON,
    borderTopLeftRadius: w(9),
    borderTopRightRadius: w(9),
    borderBottomRightRadius: w(9),
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: w(6),
    height: w(6),
    borderRadius: w(3),
    backgroundColor: ICON,
    transform: [{ rotate: '-45deg' }],
  },
  // Document
  doc: {
    width: w(18),
    height: w(23),
    borderWidth: ST,
    borderColor: ICON,
    borderRadius: w(3),
    paddingTop: w(5),
    alignItems: 'center',
  },
  docLine: {
    width: w(9),
    height: ST,
    backgroundColor: ICON,
    marginBottom: w(3),
    borderRadius: w(1),
  },
  docLineShort: {
    width: w(6),
    height: ST,
    backgroundColor: ICON,
    borderRadius: w(1),
  },
});
