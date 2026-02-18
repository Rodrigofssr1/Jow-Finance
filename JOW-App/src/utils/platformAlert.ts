/**
 * Cross-platform Alert utility
 *
 * Alert.alert() do React Native NÃO funciona na Web.
 * Este utilitário usa window.confirm/window.alert na Web
 * e Alert.alert no iOS/Android.
 *
 * Referência: skill mobile-design (plataform-specific patterns)
 */
import { Alert, Platform } from 'react-native';

interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

/**
 * Exibe um alerta simples (apenas OK)
 */
export function showAlert(title: string, message?: string) {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n\n${message}` : title);
    } else {
        Alert.alert(title, message);
    }
}

/**
 * Exibe confirmação com Cancelar/Confirmar
 * Retorna true se confirmado, false se cancelado
 */
export function showConfirm(title: string, message?: string): Promise<boolean> {
    return new Promise((resolve) => {
        if (Platform.OS === 'web') {
            const result = window.confirm(message ? `${title}\n\n${message}` : title);
            resolve(result);
        } else {
            Alert.alert(title, message, [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
            ]);
        }
    });
}

/**
 * Exibe alerta com botões customizados
 * Na Web, usa uma cadeia de confirms para múltiplas opções
 */
export function showAlertWithButtons(title: string, message: string, buttons: AlertButton[]) {
    if (Platform.OS === 'web') {
        // Para web com múltiplos botões, usar abordagem sequencial
        const nonCancelButtons = buttons.filter(b => b.style !== 'cancel');
        const cancelButton = buttons.find(b => b.style === 'cancel');

        if (nonCancelButtons.length === 1) {
            // Simples: 1 ação + cancelar
            const confirmed = window.confirm(`${title}\n\n${message}`);
            if (confirmed) {
                nonCancelButtons[0].onPress?.();
            } else {
                cancelButton?.onPress?.();
            }
        } else if (nonCancelButtons.length === 2) {
            // 2 ações: perguntar sequencialmente
            const first = window.confirm(
                `${title}\n\n${message}\n\nClique OK para: "${nonCancelButtons[0].text}"\nClique Cancelar para mais opções`
            );
            if (first) {
                nonCancelButtons[0].onPress?.();
            } else {
                const second = window.confirm(
                    `${title}\n\nClique OK para: "${nonCancelButtons[1].text}"\nClique Cancelar para voltar`
                );
                if (second) {
                    nonCancelButtons[1].onPress?.();
                } else {
                    cancelButton?.onPress?.();
                }
            }
        } else {
            // Fallback: usar prompt com números
            const options = nonCancelButtons.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
            const choice = window.prompt(`${title}\n\n${message}\n\nEscolha:\n${options}\n\n(Digite o número ou cancele)`);
            if (choice) {
                const index = parseInt(choice) - 1;
                if (index >= 0 && index < nonCancelButtons.length) {
                    nonCancelButtons[index].onPress?.();
                }
            } else {
                cancelButton?.onPress?.();
            }
        }
    } else {
        Alert.alert(title, message, buttons);
    }
}
