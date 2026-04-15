import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter, Lexend } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import { Providers } from './providers';
import NotificationManager from '@/components/NotificationManager';

const inter = Inter({ subsets: ['latin'] });
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' });

export const metadata: Metadata = {
    title: 'PKD Compass',
    description: 'Polycystic Kidney Disease Monitoring Platform',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning={true} className={`${lexend.className} bg-background-light dark:bg-background-dark text-[#111318] min-h-screen flex flex-col`}>
                <Providers>
                    <div className="pb-24">
                        {children}
                    </div>

                    <BottomNav />
                </Providers>
                <div id="portal-root" />
            </body>
        </html>
    );
}
