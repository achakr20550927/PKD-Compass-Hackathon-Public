import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import config from './config.json';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function App() {
    const [error, setError] = React.useState(null);
    const webViewRef = React.useRef(null);

    React.useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);

    async function registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                alert('Please enable notifications in settings to receive medication reminders.');
                return;
            }
        }
    }

    const onMessage = async (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'DEBUG') {
                console.log('[WebView Debug]', data.message, 'Target:', data.target);
                return;
            }
            if (data.type === 'SCHEDULE_NOTIFICATION') {
                const { title, body, seconds, hour, minute, repeats } = data;

                const trigger = repeats
                    ? { hour: hour, minute: minute, repeats: true }
                    : { seconds: seconds || 5 };

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: title || "Medication Reminder",
                        body: body || "It's time to take your medication!",
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                        channelId: 'default',
                    },
                    trigger: trigger,
                });

                const msg = repeats ? `Daily at ${hour}:${minute}` : `in ${seconds}s`;
                console.log('Notification scheduled:', title, msg, 'Trigger:', trigger);
                alert(`SUCCESS: Scheduled "${title}" ${msg}`);
            }
        } catch (e) {
            console.error('WebView message error:', e);
        }
    };

    const reload = () => {
        setError(null);
        webViewRef.current?.reload();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: config.apiUrl }}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowFileAccess={true}
                    allowUniversalAccessFromFileURLs={true}
                    mixedContentMode="always"
                    originWhitelist={['*']}
                    userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                    sharedCookiesEnabled={true}
                    thirdPartyCookiesEnabled={true}
                    incognito={false}
                    injectedJavaScript={`
                        (function() {
                            // Fix 300ms delay and hit testing
                            var style = document.createElement('style');
                            style.innerHTML = '* { cursor: pointer !important; -webkit-tap-highlight-color: transparent !important; }';
                            document.head.appendChild(style);
                        })();
                        true;
                    `}
                    onMessage={onMessage}
                    onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.warn('WebView HTTP error: ', nativeEvent);
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error: ', nativeEvent);
                    }}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                        </View>
                    )}
                />

                {error && (
                    <View style={styles.errorOverlay}>
                        <Text style={styles.errorTitle}>Connection Error</Text>
                        <Text style={styles.errorText}>{error.description || 'Could not connect to the server.'}</Text>
                        <View style={styles.urlBadge}>
                            <Text style={styles.urlLabel}>Target Endpoint:</Text>
                            <Text style={styles.urlValue}>{config.apiUrl}</Text>
                        </View>
                        <TouchableOpacity style={styles.button} onPress={reload}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                        <Text style={styles.hintText}>If using Local IP, ensure same WiFi. If using Tunnel, ensure Backend/SSH is running.</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    webviewContainer: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 10,
    },
    errorText: {
        textAlign: 'center',
        color: '#374151',
        marginBottom: 10,
        fontSize: 16,
    },
    urlText: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    hintText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    button: {
        backgroundColor: '#0284c7',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    urlBadge: {
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 12,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        width: '100%',
    },
    urlLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    urlValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
    },
});
