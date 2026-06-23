import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {appColors, typography, scaleWidth} from '../global';

export type DateRange = {fromDatetime?: string; toDatetime?: string};

const PRESETS: {key: string; label: string; days: number | null}[] = [
  {key: 'all', label: 'All time', days: null},
  {key: '7', label: 'Last 7 days', days: 7},
  {key: '30', label: 'Last 30 days', days: 30},
  {key: '90', label: 'Last 90 days', days: 90},
];

/**
 * Mobile-friendly replacement for the web's dd/mm/yyyy date inputs — preset
 * range chips that emit ISO `fromDatetime`/`toDatetime` (matching the API).
 */
export const RangeFilter = ({
  onChange,
}: {
  onChange: (range: DateRange) => void;
}) => {
  const [active, setActive] = useState('all');

  const pick = (preset: (typeof PRESETS)[number]) => {
    setActive(preset.key);
    if (preset.days == null) {
      onChange({});
      return;
    }
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setDate(from.getDate() - preset.days);
    from.setHours(0, 0, 0, 0);
    onChange({fromDatetime: from.toISOString(), toDatetime: to.toISOString()});
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {PRESETS.map(p => {
        const on = active === p.key;
        return (
          <TouchableOpacity
            key={p.key}
            activeOpacity={0.85}
            onPress={() => pick(p)}
            style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.text, on && styles.textOn]}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {paddingVertical: scaleWidth(2)},
  chip: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleWidth(9),
    borderRadius: scaleWidth(10),
    marginRight: scaleWidth(8),
    backgroundColor: appColors.white,
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
  },
  chipOn: {backgroundColor: appColors.maroon, borderColor: appColors.maroon},
  text: {...typography(500, 13, 'coffeeDark'), fontWeight: '500'},
  textOn: {color: appColors.white},
});
