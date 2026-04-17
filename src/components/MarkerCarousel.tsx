'use client';

import { useState } from 'react';
import HealthChart from './HealthChart';

interface MarkerCarouselProps {
    labs: any[];
    egfrHistory: any[];
    uacrHistory: any[];
}

const MARKERS = [
    { key: 'EGFR', label: 'eGFR', unit: 'mL/min/1.73m²', color: '#4F80FF' },
    { key: 'UACR', label: 'uACR', unit: 'mg/g', color: '#10B981' },
    { key: 'CREATININE', label: 'Creatinine', unit: 'mg/dL', color: '#8B5CF6' },
    { key: 'POTASSIUM', label: 'Potassium', unit: 'mEq/L', color: '#F59E0B' },
    { key: 'SODIUM', label: 'Sodium', unit: 'mEq/L', color: '#3B82F6' },
    { key: 'PHOSPHORUS', label: 'Phosphorus', unit: 'mg/dL', color: '#EC4899' },
    { key: 'BUN', label: 'BUN', unit: 'mg/dL', color: '#EF4444' },
];

export default function MarkerCarousel({ labs, egfrHistory, uacrHistory }: MarkerCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const activeMarker = MARKERS[currentIndex];

    const getMarkerData = () => {
        if (activeMarker.key === 'EGFR') return egfrHistory;
        if (activeMarker.key === 'UACR') return uacrHistory;
        return labs
            .filter(l => l.type === activeMarker.key)
            .map(l => ({ value: l.value, timestamp: new Date(l.timestamp) }))
            .reverse();
    };

    const data = getMarkerData();

    const next = () => setCurrentIndex((prev) => (prev + 1) % MARKERS.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + MARKERS.length) % MARKERS.length);

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={prev}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <div className="text-center">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{activeMarker.label} Trend</p>
                    <p className="text-white text-xs font-medium">{activeMarker.unit}</p>
                </div>
                <button
                    onClick={next}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 min-h-[140px] flex flex-col justify-center">
                {data.length > 0 ? (
                    <HealthChart data={data} color={activeMarker.color} unit={activeMarker.unit} />
                ) : (
                    <div className="text-center py-8">
                        <span className="material-symbols-outlined text-white/20 text-4xl mb-2">assessment</span>
                        <p className="text-white/40 text-sm font-medium">No {activeMarker.label} data found</p>
                    </div>
                )}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-1.5 mt-4">
                {MARKERS.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/20'}`}
                    />
                ))}
            </div>
        </div>
    );
}
