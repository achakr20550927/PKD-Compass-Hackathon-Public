'use client';

import { useRouter } from 'next/navigation';

export default function BarcodePage() {
    const router = useRouter();

    return (
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-4xl">barcode_scanner</span>
            </div>

            <h1 className="text-xl font-black text-primary uppercase tracking-tight mb-2">Barcode Scanner</h1>
            <p className="text-sm text-primary/40 leading-relaxed mb-8 px-8">
                Barcode scanning is coming in Phase 2. This will allow you to instantly log branded foods by scanning their UPC.
            </p>

            <div className="w-full max-w-xs space-y-4">
                <button
                    onClick={() => router.back()}
                    className="w-full py-4 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    Back to Food
                </button>
                <button
                    className="w-full py-4 rounded-3xl border border-primary/10 text-[10px] font-black text-primary/60 hover:bg-primary/5 transition-all uppercase tracking-widest"
                >
                    Enter Manually
                </button>
            </div>
        </div>
    );
}
