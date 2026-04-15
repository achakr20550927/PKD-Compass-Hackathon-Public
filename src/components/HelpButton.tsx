'use client';

import { useState } from 'react';
import AppTour from './AppTour';

export default function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full transition-all hover:bg-blue-100 active:scale-95 group shadow-sm border border-blue-100/50"
                title="How to use PKD Compass"
            >
                <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">info</span>
                <span className="text-xs font-bold uppercase tracking-wider">How it works</span>
            </button>
            <AppTour isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
