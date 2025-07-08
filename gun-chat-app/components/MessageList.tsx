import React, { useRef, useEffect } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  ListRenderItem,
  RefreshControl,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Message } from '../gun.config';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUser?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onRefresh,
  refreshing = false,
  isLoading = false,
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderMessage: ListRenderItem<Message> = ({ item }) => {
    const isOwnMessage = currentUser ? item.user === currentUser : false;
    return (
      <MessageItem
        message={item}
        isOwnMessage={isOwnMessage}
      />
    );
  };

  const keyExtractor = (item: Message) => item.id;

  const getItemLayout = (_: any, index: number) => ({
    length: 80, // Approximate height of each message
    offset: 80 * index,
    index,
  });

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Loading messages...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>Start the conversation!</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
        getItemLayout={messages.length > 0 ? getItemLayout : undefined}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          ) : undefined
        }
        // Performance optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={15}
        updateCellsBatchingPeriod={50}
        initialNumToRender={25}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  listContentEmpty: {
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MessageList;
