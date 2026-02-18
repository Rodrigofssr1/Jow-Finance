import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';

interface ChatModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatModal = ({ visible, onClose }: ChatModalProps) => {
    const { theme } = useTheme();
    const { messages, loading, sendMessage, handleAction } = useChat();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Close area */}
                <TouchableOpacity style={styles.backdrop} onPress={onClose} />

                <KeyboardAvoidingView
                    style={[styles.container, { backgroundColor: theme.colors.background }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="sparkles" size={24} color={theme.colors.primary} />
                            <Text style={[styles.title, { color: theme.colors.text }]}> Jow Chat</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Messages */}
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
                                <Text style={{ color: theme.colors.text, textAlign: 'center' }}>
                                    Olá! Eu sou o Jow. Como posso ajudar com suas finanças hoje?
                                </Text>
                            </View>
                        }
                    />

                    {/* Input */}
                    <ChatInput onSend={sendMessage} isLoading={loading} />

                    {/* Safe Area Bottom Spacer */}
                    <View style={{ height: Platform.OS === 'ios' ? 20 : 0 }} />
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay as requested
    },
    backdrop: {
        flex: 1,
    },
    container: {
        height: '90%', // Increased height as requested
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        padding: 16,
        paddingTop: 20,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 18,
        marginLeft: 8,
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
        transform: [{ scaleY: -1 }],
        padding: 20,
    },
});
