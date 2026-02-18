import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme';

type ChatInputProps = {
    onSend: (message: string) => void;
    isLoading?: boolean;
};

export const ChatInput = ({ onSend, isLoading = false }: ChatInputProps) => {
    const { theme } = useTheme();
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim().length === 0) return;
        onSend(text.trim());
        setText('');
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.divider }]}>
            {/* Botão de Microfone (Visual por enquanto) */}
            <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => { }} // Placeholder para futura gravação
            >
                <Ionicons name="mic" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Fale com JOW..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={500}
                />
            </View>

            <TouchableOpacity
                style={[
                    styles.sendButton,
                    { backgroundColor: text.trim().length > 0 ? theme.colors.primary : theme.colors.surface }
                ]}
                onPress={handleSend}
                disabled={text.trim().length === 0 || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Ionicons
                        name="send"
                        size={20}
                        color={text.trim().length > 0 ? '#FFF' : theme.colors.textSecondary}
                    />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        borderTopWidth: 1,
        gap: spacing[3],
    },
    inputContainer: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        minHeight: 48,
        maxHeight: 100,
        justifyContent: 'center',
    },
    input: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        paddingTop: 0,
        paddingBottom: 0,
        minHeight: 24,
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
