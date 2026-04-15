'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Dashboard', href: '/dashboard', icon: 'grid_view', iconFilled: 'grid_view' },
        { name: 'BP', href: '/bp-monitoring', icon: 'favorite', iconFilled: 'favorite' },
        { name: 'Food', href: '/food-tracker', icon: 'restaurant', iconFilled: 'restaurant' },
        { name: 'Meds', href: '/meds', icon: 'pill', iconFilled: 'pill' },
        { name: 'Labs', href: '/labs', icon: 'science', iconFilled: 'science' },
        { name: 'Docs', href: '/documents', icon: 'description', iconFilled: 'description' },
        { name: 'Resources', href: '/resources', icon: 'info', iconFilled: 'info' },
        { name: 'Care', href: '/care-organizer', icon: 'calendar_month', iconFilled: 'calendar_month' },
    ];

    if (pathname === '/' || pathname === '/login') return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-100 px-2 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between w-full max-w-md mx-auto py-2">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href + '/'));
                    return (
                        <a
                            key={tab.name}
                            href={tab.href}
                            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 flex-1 min-w-0 ${isActive
                                ? 'text-blue-600'
                                : 'text-slate-400'
                                }`}
                        >
                            <span
                                className={`material-symbols-outlined text-[22px] transition-all duration-200 ${isActive ? 'fill-1' : ''}`}
                            >
                                {isActive ? tab.iconFilled : tab.icon}
                            </span>
                            <span className={`text-[8px] font-bold text-center truncate w-full px-0.5`}>
                                {tab.name}
                            </span>
                        </a>
                    );
                })}
            </div>
        </nav>
    );
}
