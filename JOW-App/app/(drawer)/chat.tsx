/**
 * JOW - Chat Screen
 * 
 * Interface de conversação principal com o Jow.
 */

import React from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useChat } from '../../src/hooks/useChat';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { Caption } from '../../src/components/Typography';
import { StatusBar } from 'expo-status-bar';

import { ChatHeader } from '../../src/components/chat/ChatHeader';
import { Stack } from 'expo-router';

export default function ChatScreen() {
    const { theme, isDarkMode } = useTheme();
    const { messages, loading, sendMessage, isSpeaking, handleAction } = useChat();

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <Stack.Screen options={{ header: () => <ChatHeader /> }} />

            {/* Lista de Mensagens */}
            <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MessageBubble
                        message={item.message}
                        sender={item.sender as 'user' | 'jow'}
                        timestamp={new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        suggestions={item.metadata?.suggestions}
                        onAction={handleAction}
                    />
                )}
                inverted
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Caption style={{ textAlign: 'center', marginTop: 20 }}>
                            Comece uma conversa com o JOW...
                        </Caption>
                    </View>
                }
            />

            {/* Input Area */}
            <ChatInput onSend={sendMessage} isLoading={loading} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ scaleY: -1 }] // Reverter o inverted da lista
    },
});
