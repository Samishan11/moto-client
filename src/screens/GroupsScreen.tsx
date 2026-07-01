import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../navigation/Navigator';

export function GroupsScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const [searchText, setSearchText] = useState('');

  const groups = [
    {
      id: 1,
      name: 'Iron Horizon MC',
      lastMessage: 'Marcus: Route looks clear for Saturday 🏍️',
      time: '2m',
      online: '8 online',
      unread: 3,
      bgColor: 'rgba(255,90,31,0.8)',
    },
    {
      id: 2,
      name: 'Desert Riders',
      lastMessage: 'Alex: See you at the junction!',
      time: '1h',
      online: '3 online',
      unread: 0,
      bgColor: '#2E8BFF',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups"
          placeholderTextColor="#6B7280"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Group List */}
      {groups.map((group) => (
        <TouchableOpacity key={group.id} style={styles.groupCard}>
          <View style={[styles.groupAvatar, { backgroundColor: group.bgColor }]}>
            <Text style={styles.groupAvatarText}>{group.name.substring(0, 2)}</Text>
          </View>

          <View style={styles.groupContent}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupTime}>{group.time}</Text>
            </View>
            <Text style={styles.groupMessage} numberOfLines={1}>
              {group.lastMessage}
            </Text>
            <Text style={styles.groupOnline}>● {group.online}</Text>
          </View>

          {group.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{group.unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  scrollContent: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.52,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 0,
  },

  // Search
  searchContainer: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 22,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#F2F3F5',
  },

  // Group Card
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 12,
  },
  groupAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  groupContent: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F2F3F5',
  },
  groupTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  groupMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
    marginBottom: 2,
  },
  groupOnline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#30D158',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    backgroundColor: '#FF5A1F',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
