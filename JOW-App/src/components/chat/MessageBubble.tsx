import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Body, Caption } from '../Typography';
import { spacing } from '../../theme';

type Suggestion = {
    label: string;
    action: string;
    params?: any;
};

type MessageBubbleProps = {
    message: string;
    sender: 'user' | 'jow';
    timestamp: string;
    suggestions?: Suggestion[];
    onAction?: (action: string, params: any) => void;
};

export const MessageBubble = ({ message, sender, timestamp, suggestions, onAction }: MessageBubbleProps) => {
    const { theme } = useTheme();
    const isUser = sender === 'user';

    return (
        <View style={[
            styles.container,
            isUser ? styles.userContainer : styles.jowContainer,
            { flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }
        ]}>
            <View style={StyleSheet.flatten([
                styles.bubble,
                isUser ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface },
                isUser ? styles.userBubble : styles.jowBubble
            ])}>
                <Body style={StyleSheet.flatten([
                    styles.messageText,
                    isUser ? { color: '#FFFFFF' } : { color: theme.colors.text }
                ])}>
                    {message}
                </Body>
                <Caption style={StyleSheet.flatten([
                    styles.timestamp,
                    isUser ? { color: 'rgba(255, 255, 255, 0.7)' } : { color: theme.colors.textSecondary }
                ])}>
                    {timestamp}
                </Caption>
            </View>

            {/* Suggestions Buttons */}
            {suggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.suggestionButton, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary }]}
                            onPress={() => onAction?.(suggestion.action, suggestion.params)}
                        >
                            <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>
                                {suggestion.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: spacing[4],
        marginVertical: spacing[1],
        flexDirection: 'row',
    },
    userContainer: {
        justifyContent: 'flex-end',
    },
    jowContainer: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        borderRadius: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    jowBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 10,
        alignSelf: 'flex-end',
    },
    suggestionsContainer: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        maxWidth: '80%',
    },
    suggestionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 4,
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
