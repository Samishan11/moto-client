import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Group } from '@samishan11/moto-contract';
import { useMyGroupsInfinite, useRecentGroups } from '../api/queries';
import { colors, spacing } from '../theme';

const SEARCH_DEBOUNCE_MS = 350;

interface GroupSelectProps {
  label?: string;
  value: Group | null;
  onChange: (group: Group) => void;
}

/**
 * Searchable select over the user's joined groups. Search + pagination happen
 * server-side (a rider in 50+ groups never downloads them all); the latest 5
 * joined groups are offered as one-tap suggestion chips below the field.
 */
export function GroupSelect({ label = 'Group', value, onChange }: GroupSelectProps): ReactNode {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Only hit the server once the dropdown is actually open.
  const results = useMyGroupsInfinite(search, open);
  const recent = useRecentGroups();

  const items = useMemo(
    () => results.data?.pages.flatMap((page) => page.groups) ?? [],
    [results.data],
  );

  function select(group: Group): void {
    onChange(group);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  const suggestions = recent.data ?? [];

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      {/* Search input doubles as the select trigger; shows the pick when idle. */}
      <View style={[styles.inputWrap, open && styles.inputWrapFocused]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setOpen(true)}
          placeholder={value ? value.name : 'Search your groups'}
          placeholderTextColor={value ? colors.text : colors.faint}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={label}
        />
        {open ? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              setQuery('');
              setOpen(false);
              inputRef.current?.blur();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close group list"
          >
            <Text style={styles.chevron}>✕</Text>
          </Pressable>
        ) : (
          <Text style={styles.chevron}>▾</Text>
        )}
      </View>

      {open ? (
        <View style={styles.dropdown}>
          {results.isLoading ? (
            <ActivityIndicator style={styles.dropdownSpinner} size="small" color={colors.primary} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>
              {search ? 'No groups match your search.' : 'Join a group first to plan a trip.'}
            </Text>
          ) : (
            <ScrollView
              style={styles.dropdownList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {items.map((group) => (
                <Pressable
                  key={group.id}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => select(group)}
                  accessibilityRole="button"
                  accessibilityLabel={group.name}
                >
                  <Text
                    style={[styles.optionName, value?.id === group.id && styles.optionNameActive]}
                    numberOfLines={1}
                  >
                    {group.name}
                  </Text>
                  <Text style={styles.optionMeta}>{group.memberCount} members</Text>
                </Pressable>
              ))}
              {results.hasNextPage ? (
                <Pressable
                  style={styles.loadMore}
                  onPress={() => results.fetchNextPage()}
                  disabled={results.isFetchingNextPage}
                  accessibilityRole="button"
                  accessibilityLabel="Show more groups"
                >
                  {results.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>Show more</Text>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </View>
      ) : null}

      {/* Latest joined groups as one-tap suggestions */}
      {suggestions.length > 0 ? (
        <>
          <Text style={styles.suggestionsLabel}>RECENTLY JOINED</Text>
          <View style={styles.chipWrap}>
            {suggestions.map((group) => {
              const active = value?.id === group.id;
              return (
                <Pressable
                  key={group.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => select(group)}
                  accessibilityRole="button"
                  accessibilityLabel={group.name}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {group.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing(2) },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: spacing(1) },

  inputWrap: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  inputWrapFocused: { borderColor: colors.fieldBorderFocus },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text, height: '100%' },
  chevron: { fontSize: 14, color: colors.faint },

  dropdown: {
    marginTop: spacing(1),
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    overflow: 'hidden',
  },
  dropdownList: { maxHeight: 260 },
  dropdownSpinner: { marginVertical: spacing(2) },
  emptyText: { fontSize: 13, color: colors.muted, padding: spacing(2) },

  option: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  optionName: { fontSize: 14, fontWeight: '600', color: colors.text },
  optionNameActive: { color: colors.primary },
  optionMeta: { fontSize: 11, fontWeight: '500', color: colors.faint, marginTop: 2 },
  loadMore: { alignItems: 'center', paddingVertical: spacing(1.5) },
  loadMoreText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.96,
    color: colors.faint,
    marginTop: spacing(1.5),
    marginBottom: spacing(1),
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  chip: {
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
});
