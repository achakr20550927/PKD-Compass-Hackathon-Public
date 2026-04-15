'use client';

import { useEffect } from 'react';

export interface WebNotificationPayload {
    title: string;
    body: string;
    delay: number;
}

export default function NotificationManager() {
    useEffect(() => {
        const handleSchedule = (event: any) => {
            const { title, body, delay } = event.detail as WebNotificationPayload;

            if (delay <= 0) return;

            console.log(`[WebNotification] Scheduled "${title}" in ${Math.round(delay / 1000)}s`);

            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification(title, {
                        body,
                        icon: '/favicon.ico',
                        requireInteraction: true
                    });
                }
            }, delay);
        };

        window.addEventListener('SCHEDULE_WEB_NOTIFICATION', handleSchedule as any);
        return () => window.removeEventListener('SCHEDULE_WEB_NOTIFICATION', handleSchedule as any);
    }, []);

    return null;
}
