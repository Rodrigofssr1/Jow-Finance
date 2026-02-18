/**
 * JOW - ThemeContext
 * 
 * Context para gerenciar tema dark/light com persistência no AsyncStorage.
 * Por padrão, o tema é dark mode.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, darkTheme, lightTheme } from '../theme';

const THEME_STORAGE_KEY = '@jow_theme';

interface ThemeContextType {
    theme: Theme;
    isDarkMode: boolean;
    toggleTheme: () => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar preferência salva ao iniciar
    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme !== null) {
                setIsDarkMode(savedTheme === 'dark');
            }
        } catch (error) {
            console.warn('Erro ao carregar preferência de tema:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTheme = useCallback(async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);

        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode ? 'dark' : 'light');
        } catch (error) {
            console.warn('Erro ao salvar preferência de tema:', error);
        }
    }, [isDarkMode]);

    const theme = isDarkMode ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook para acessar o tema atual e funções de controle.
 * 
 * @example
 * const { theme, isDarkMode, toggleTheme } = useTheme();
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
    }

    return context;
}
