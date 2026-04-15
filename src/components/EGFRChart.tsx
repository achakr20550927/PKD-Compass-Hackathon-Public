'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

interface EGFRChartProps {
    egfrData: Array<{ value: number; timestamp: Date }>;
}

export default function EGFRChart({ egfrData }: EGFRChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!egfrData || egfrData.length === 0) {
        return (
            <div className="flex h-24 items-center justify-center text-[#616f89] text-sm">
                No eGFR data available
            </div>
        );
    }

    // Get last 12 entries for better visualization
    const displayData = egfrData.slice(-12);

    // Calculate bounds
    const values = displayData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 10;
    const padding = range * 0.1; // Add 10% padding
    const chartMin = minValue - padding;
    const chartMax = maxValue + padding;
    const chartRange = chartMax - chartMin;

    // SVG dimensions
    const width = 100;
    const height = 24;
    const padding_x = 2;
    const padding_y = 2;
    const chart_width = width - padding_x * 2;
    const chart_height = height - padding_y * 2;

    // Calculate positions for each point
    const points = displayData.map((item, i) => {
        const x = padding_x + (i / (displayData.length - 1 || 1)) * chart_width;
        const y = padding_y + chart_height - ((item.value - chartMin) / chartRange) * chart_height;
        return { x, y, value: item.value, date: item.timestamp };
    });

    // Create path for the line
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="relative w-full">
            {/* Hover Tooltip */}
            {hoveredIndex !== null && (
                <div className="absolute -top-14 left-0 right-0 flex justify-center pointer-events-none z-10">
                    <div className="bg-slate-900 dark:bg-slate-950 text-white px-3 py-2 rounded-lg whitespace-nowrap text-sm font-semibold shadow-lg border border-slate-700">
                        <div className="font-bold text-base">{displayData[hoveredIndex].value}</div>
                        <div className="text-xs opacity-80 mt-0.5">{formatDate(new Date(displayData[hoveredIndex].timestamp))}</div>
                        <div className="text-xs opacity-70 mt-1">mL/min/1.73m²</div>
                    </div>
                </div>
            )}

            {/* SVG Chart */}
            <svg
                width="100%"
                height="100px"
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-24"
                style={{ minHeight: '100px' }}
            >
                {/* Grid lines */}
                <line x1={padding_x} y1={padding_y} x2={width - padding_x} y2={padding_y} stroke="#e2e8f0" strokeWidth="0.5" />
                <line x1={padding_x} y1={height / 2} x2={width - padding_x} y2={height / 2} stroke="#e2e8f0" strokeWidth="0.3" opacity="0.5" />
                <line x1={padding_x} y1={height - padding_y} x2={width - padding_x} y2={height - padding_y} stroke="#e2e8f0" strokeWidth="0.5" />

                {/* Fill area under curve */}
                <path
                    d={`${pathData} L ${width - padding_x} ${height - padding_y} L ${padding_x} ${height - padding_y} Z`}
                    fill="url(#gradient)"
                    opacity="0.2"
                />

                {/* Gradient definition */}
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                    </linearGradient>
                </defs>

                {/* Line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map((point, i) => (
                    <g key={i}>
                        {/* Interactive circle (larger for hover area) */}
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="1.5"
                            fill="#0284c7"
                            className="cursor-pointer hover:r-2 transition-all"
                            style={{
                                opacity: hoveredIndex === i ? 1 : 0.7,
                                filter: hoveredIndex === i ? 'drop-shadow(0 0 3px #0284c7)' : 'none'
                            }}
                        />
                        {/* Hover circle overlay */}
                        {hoveredIndex === i && (
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="2.5"
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="0.5"
                                opacity="0.5"
                            />
                        )}
                    </g>
                ))}
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 text-xs text-[#616f89] font-medium w-8 flex flex-col justify-between py-1">
                <span>{Math.round(chartMax)}</span>
                <span>{Math.round((chartMin + chartMax) / 2)}</span>
                <span>{Math.round(chartMin)}</span>
            </div>
        </div>
    );
}
