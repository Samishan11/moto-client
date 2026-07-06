import { useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { dateToIsoDay, fromIsoDate, isoToDate } from '../lib/date';
import { colors, spacing } from '../theme';

interface DateFieldProps {
  label: string;
  /** ISO-8601 string, or null when unset. */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Show a "Clear" action to unset the date. */
  optional?: boolean;
}

/**
 * Native date picker presented as a field. Android shows the platform dialog;
 * iOS shows an inline spinner in a bottom sheet (it has no built-in dialog).
 */
export function DateField({ label, value, onChange, optional }: DateFieldProps): ReactNode {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const seed = isoToDate(value) ?? new Date();

  function handleChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selected) onChange(dateToIsoDay(selected));
    } else if (selected) {
      // iOS spinner updates live; commit each change, dismiss via "Done".
      onChange(dateToIsoDay(selected));
    }
  }

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>{t('common.optional')}</Text> : null}
      </View>
      <View style={styles.row}>
        <Pressable style={styles.input} onPress={() => setShow(true)}>
          <Text style={value ? styles.value : styles.placeholder}>
            {value ? fromIsoDate(value) : t('common.selectDate')}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable hitSlop={8} onPress={() => onChange(null)} style={styles.clearBtn}>
            <Text style={styles.clear}>{t('common.clear')}</Text>
          </Pressable>
        ) : null}
      </View>

      {show && Platform.OS === 'android' ? (
        <DateTimePicker value={seed} mode="date" onChange={handleChange} />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <DateTimePicker
                value={seed}
                mode="date"
                display="spinner"
                onChange={handleChange}
              />
              <Pressable style={styles.done} onPress={() => setShow(false)}>
                <Text style={styles.doneText}>{t('common.done')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing(1) },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  optional: { fontSize: 12, fontWeight: '500', color: colors.faint },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  input: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing(2),
  },
  value: { fontSize: 15, fontWeight: '500', color: colors.text },
  placeholder: { fontSize: 15, fontWeight: '500', color: colors.faint },
  clearBtn: { paddingHorizontal: spacing(1) },
  clear: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: colors.bg, paddingBottom: spacing(3) },
  done: { alignItems: 'center', paddingVertical: spacing(1.5) },
  doneText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
