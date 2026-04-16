'use client';

export default function IngestionConsole() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 md:p-10">
            <div className="max-w-3xl mx-auto">
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 p-8 text-center">
                    <div className="text-xs font-black uppercase tracking-[0.28em] text-primary/50">Admin Removed</div>
                    <h1 className="text-3xl font-black text-primary mt-3">Administrative Console Disabled</h1>
                    <p className="text-sm text-text-muted mt-3">
                        This build does not ship the administrative ingestion or user-oversight console.
                    </p>
                </div>
            </div>
        </div>
    );
}
