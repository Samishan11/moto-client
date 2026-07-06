import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { ChatMessage, CreateReportRequest } from '@moto/contract';
import { useNavigation } from '../navigation/Navigator';
import { useAuth } from '../auth/AuthContext';
import { useGroup } from '../api/queries';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';
import {
  useAddReaction,
  useDeleteMessage,
  useMessages,
  useRemoveReaction,
  useReportMessage,
  useSendMessage,
} from '../chat/hooks';
import {
  connectChatSocket,
  emitTyping,
  joinGroupRoom,
  subscribeChat,
  type ChatSocketHandlers,
} from '../chat/socket';
import { colors } from '../theme';

const QUICK_EMOJI = ['👍', '❤️', '🔥', '😂', '🙌', '😮'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Merge messages by id (incoming wins for edits/updates) and return them
 * newest-first for the inverted list. Used to fold server history + live
 * socket/sent messages into one local list.
 */
function mergeMessages(base: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of base) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function ChatScreen(): ReactNode {
  const nav = useNavigation();
  const { user } = useAuth();
  const groupId = typeof nav.params.id === 'string' ? nav.params.id : '';
  const group = useGroup(groupId);

  const messagesQuery = useMessages(groupId);
  const send = useSendMessage(groupId);
  const del = useDeleteMessage(groupId);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const report = useReportMessage();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The rendered list is LOCAL STATE, not a memo over the query cache. Local
  // state always re-renders on change, whereas patching the infinite-query
  // cache proved unreliable on Android (sent messages didn't appear). Server
  // history is folded in via the sync effect below; send + socket events
  // mutate this directly. Newest-first for the inverted list (index 0 = bottom).
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const upsert = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => mergeMessages(prev, [incoming]));
  }, []);
  const patchLocal = useCallback((fn: (msgs: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => fn(prev));
  }, []);

  // Fold server history (initial load + older pages) into the local list.
  useEffect(() => {
    const history = messagesQuery.data?.pages.flatMap((p) => p.messages) ?? [];
    if (history.length) setMessages((prev) => mergeMessages(prev, history));
  }, [messagesQuery.data]);

  // --- Real-time wiring: connect once, patch the cache on events ---
  useEffect(() => {
    const socket = connectChatSocket();
    // Guarantee this group's room even if it was joined after connecting.
    joinGroupRoom(groupId);
    const handlers: ChatSocketHandlers = {
      onMessageNew: (m) => {
        if (m.groupId !== groupId) return;
        upsert(m);
      },
      onMessageUpdated: (e) => {
        if (e.groupId !== groupId) return;
        patchLocal((msgs) =>
          msgs.map((m) =>
            m.id === e.messageId ? { ...m, content: e.content, isEdited: e.isEdited } : m,
          ),
        );
      },
      onMessageDeleted: (e) => {
        if (e.groupId !== groupId) return;
        patchLocal((msgs) =>
          msgs.map((m) =>
            m.id === e.messageId ? { ...m, deleted: true, content: '', mediaUrls: [] } : m,
          ),
        );
      },
      onReactionAdded: (e) => {
        if (e.groupId !== groupId) return;
        patchLocal((msgs) => applyReaction(msgs, e, user?.id, +1));
      },
      onReactionRemoved: (e) => {
        if (e.groupId !== groupId) return;
        patchLocal((msgs) => applyReaction(msgs, e, user?.id, -1));
      },
      onMessageRead: (e) => {
        if (e.groupId !== groupId || e.userId === user?.id) return;
        patchLocal((msgs) =>
          msgs.map((m) => (m.id === e.messageId ? { ...m, readCount: m.readCount + 1 } : m)),
        );
      },
      onTyping: (e) => {
        if (e.groupId !== groupId || e.userId === user?.id) return;
        setTypingName(e.isTyping ? e.displayName ?? 'Someone' : null);
      },
    };
    const unsub = subscribeChat(socket, handlers);

    // Only on a genuine RE-connect (after a drop) do we re-join the room and
    // refetch to recover messages missed while offline. The initial history
    // load is already handled by the query mounting, so first-open stays a
    // single GET (the manager's `reconnect` never fires on the first connect).
    const onReconnect = () => {
      joinGroupRoom(groupId);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(groupId) });
    };
    socket.io.on('reconnect', onReconnect);

    return () => {
      unsub();
      socket.io.off('reconnect', onReconnect);
    };
  }, [groupId, user?.id]);

  const onChangeText = useCallback(
    (v: string) => {
      setText(v);
      emitTyping(groupId, true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => emitTyping(groupId, false), 1500);
    },
    [groupId],
  );

  function handleSend(): void {
    const content = text.trim();
    if (!content) return;
    setText('');
    emitTyping(groupId, false);
    send.mutate(
      { content, replyToId: replyTo?.id ?? null },
      { onSuccess: (m) => upsert(m) },
    );
    setReplyTo(null);
  }

  function toggleReaction(m: ChatMessage, emoji: string): void {
    const existing = m.reactions.find((r) => r.emoji === emoji);
    if (existing?.mine) removeReaction.mutate({ messageId: m.id, emoji });
    else addReaction.mutate({ messageId: m.id, body: { emoji } });
  }

  function openMessageActions(m: ChatMessage): void {
    if (m.deleted) return;
    const mine = m.author.id === user?.id;
    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Reply', onPress: () => setReplyTo(m) },
      { text: 'React', onPress: () => openReactionPicker(m) },
    ];
    if (mine) {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => del.mutate(m.id),
      });
    } else {
      buttons.push({ text: 'Report', style: 'destructive', onPress: () => openReport(m) });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, buttons);
  }

  function openReactionPicker(m: ChatMessage): void {
    Alert.alert('React', undefined, [
      ...QUICK_EMOJI.map((e) => ({ text: e, onPress: () => toggleReaction(m, e) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function openReport(m: ChatMessage): void {
    const reasons: CreateReportRequest['reason'][] = [
      'HARASSMENT',
      'SPAM',
      'INAPPROPRIATE',
      'HATE_SPEECH',
      'OTHER',
    ];
    Alert.alert('Report message', 'Why are you reporting this?', [
      ...reasons.map((reason) => ({
        text: reason.replace('_', ' '),
        onPress: () =>
          report.mutate(
            { messageId: m.id, body: { reason } },
            { onSuccess: () => Alert.alert('Reported', 'Thanks — our team will review it.') },
          ),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  const groupName = group.data?.name ?? 'Group';
  const memberCount = group.data?.memberCount ?? 0;

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        mine={item.author.id === user?.id}
        onLongPress={() => openMessageActions(item)}
        onToggleReaction={(emoji) => toggleReaction(item, emoji)}
      />
    ),
    [user?.id],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={nav.goBack} hitSlop={10} style={styles.headerBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <LinearGradient
          colors={['#FF5A1F', '#FF8A3D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerAvatar}
        >
          <Text style={styles.headerAvatarText}>{initials(groupName)}</Text>
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupName}
          </Text>
          <Text style={styles.headerSub}>● {memberCount} members</Text>
        </View>
        <Pressable
          onPress={() => nav.navigate('groupDetail', { id: groupId })}
          hitSlop={10}
          style={styles.headerBtn}
        >
          <Text style={styles.headerMenu}>⋯</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        style={styles.listContainer}
        data={messages}
        extraData={messages.length}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            messagesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          messagesQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.pageSpinner} />
          ) : null
        }
        ListEmptyComponent={
          messagesQuery.isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet — say hello 👋</Text>
            </View>
          )
        }
      />

      {/* Typing indicator */}
      {typingName ? (
        <Text style={styles.typing}>{typingName} is typing…</Text>
      ) : null}

      {/* Reply preview */}
      {replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyBarLine} />
          <View style={styles.flex}>
            <Text style={styles.replyBarName}>{replyTo.author.displayName ?? 'Rider'}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
            <Text style={styles.replyClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor="#6B7280"
          value={text}
          onChangeText={onChangeText}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || send.isPending}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M4 12l16-7-7 16-2-7-7-2z" fill="#fff" />
          </Svg>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Increment/decrement a reaction count for an emoji from a socket event. */
function applyReaction(
  msgs: ChatMessage[],
  e: { messageId: string; userId: string; emoji: string },
  myId: string | undefined,
  delta: 1 | -1,
): ChatMessage[] {
  return msgs.map((m) => {
    if (m.id !== e.messageId) return m;
    const reactions = [...m.reactions];
    const idx = reactions.findIndex((r) => r.emoji === e.emoji);
    const mine = e.userId === myId;
    if (idx === -1) {
      if (delta === 1) reactions.push({ emoji: e.emoji, count: 1, mine });
    } else {
      const next = { ...reactions[idx], count: reactions[idx].count + delta };
      if (mine) next.mine = delta === 1;
      if (next.count <= 0) reactions.splice(idx, 1);
      else reactions[idx] = next;
    }
    return { ...m, reactions };
  });
}

function MessageBubble({
  message,
  mine,
  onLongPress,
  onToggleReaction,
}: {
  message: ChatMessage;
  mine: boolean;
  onLongPress: () => void;
  onToggleReaction: (emoji: string) => void;
}): ReactNode {
  const name = message.author.displayName ?? 'Rider';
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      {!mine ? (
        <View style={styles.otherHead}>
          {message.author.avatarUrl ? (
            <Image source={{ uri: message.author.avatarUrl }} style={styles.msgAvatar} />
          ) : (
            <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
              <Text style={styles.msgAvatarText}>{initials(name)}</Text>
            </View>
          )}
          <Text style={styles.msgName}>{name}</Text>
        </View>
      ) : null}

      <Pressable
        onLongPress={onLongPress}
        delayLongPress={220}
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleOther,
          message.deleted && styles.bubbleDeleted,
        ]}
      >
        {message.replyTo ? (
          <View style={styles.replyQuote}>
            <Text style={styles.replyQuoteName}>
              {message.replyTo.author.displayName ?? 'Rider'}
            </Text>
            <Text style={styles.replyQuoteText} numberOfLines={1}>
              {message.replyTo.deleted ? 'message deleted' : message.replyTo.content}
            </Text>
          </View>
        ) : null}

        {message.deleted ? (
          <Text style={styles.deletedText}>🚫 message deleted</Text>
        ) : (
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.content}</Text>
        )}
      </Pressable>

      {/* Reactions */}
      {message.reactions.length > 0 ? (
        <View style={[styles.reactionRow, mine ? styles.reactionRowMine : null]}>
          {message.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => onToggleReaction(r.emoji)}
              style={[styles.reactionChip, r.mine && styles.reactionChipMine]}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={styles.reactionCount}>{r.count}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[styles.metaLine, mine ? styles.metaLineMine : null]}>
        <Text style={styles.time}>{timeLabel(message.createdAt)}</Text>
        {message.isEdited && !message.deleted ? <Text style={styles.edited}>· edited</Text> : null}
        {mine && message.readCount > 0 ? <Text style={styles.readTick}>· ✓✓</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(18,20,24,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 26, fontWeight: '600', lineHeight: 28 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, fontWeight: '500', color: '#30D158', marginTop: 1 },
  headerMenu: { fontSize: 20, color: colors.muted },

  // The list must flex to fill the space between header and input, otherwise it
  // collapses and new items don't render. No flexGrow/justifyContent on the
  // content style: `inverted` already anchors newest messages to the bottom.
  listContainer: { flex: 1 },
  list: { padding: 16, gap: 10 },
  pageSpinner: { paddingVertical: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, transform: [{ scaleY: -1 }] },
  emptyText: { color: colors.muted, fontSize: 14 },

  row: { maxWidth: '82%', marginBottom: 4 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  otherHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  msgAvatar: { width: 22, height: 22, borderRadius: 8 },
  msgAvatarFallback: { backgroundColor: '#23272F', alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 9, fontWeight: '700', color: colors.text },
  msgName: { fontSize: 11, fontWeight: '600', color: colors.muted },

  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleOther: { backgroundColor: '#1C1F26', borderBottomLeftRadius: 5 },
  bubbleDeleted: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bubbleText: { fontSize: 14, lineHeight: 20, color: colors.text },
  bubbleTextMine: { color: '#fff' },
  deletedText: { fontSize: 13, fontStyle: 'italic', color: colors.muted },

  replyQuote: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.35)',
    paddingLeft: 8,
    marginBottom: 6,
  },
  replyQuoteName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  replyQuoteText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  reactionRow: { flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  reactionRowMine: { justifyContent: 'flex-end' },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1C1F26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reactionChipMine: { borderColor: colors.primary, backgroundColor: 'rgba(255,90,31,0.14)' },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontSize: 11, fontWeight: '600', color: colors.muted },

  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaLineMine: { justifyContent: 'flex-end' },
  time: { fontSize: 10, color: '#6B7280' },
  edited: { fontSize: 10, color: '#6B7280' },
  readTick: { fontSize: 10, color: '#2E8BFF' },

  typing: { fontSize: 12, color: colors.muted, paddingHorizontal: 18, paddingBottom: 4, fontStyle: 'italic' },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(18,20,24,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  replyBarLine: { width: 3, height: 32, borderRadius: 2, backgroundColor: colors.primary },
  replyBarName: { fontSize: 12, fontWeight: '700', color: colors.primary },
  replyBarText: { fontSize: 12, color: colors.muted },
  replyClose: { fontSize: 16, color: colors.muted, paddingHorizontal: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 26,
    backgroundColor: 'rgba(18,20,24,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: '#1C1F26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
