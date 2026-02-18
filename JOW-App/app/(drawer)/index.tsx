/**
 * JOW - Index Redirect
 * 
 * Redireciona para dashboard ao iniciar.
 */

import { Redirect } from 'expo-router';

export default function Index() {
    return <Redirect href="/dashboard" />;
}
