'use client';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main dark:text-white">
            <main className="transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
