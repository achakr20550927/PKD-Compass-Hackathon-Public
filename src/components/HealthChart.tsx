'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

interface HealthChartProps {
    data: Array<{ value: number; timestamp: Date }>;
    color?: string;
    unit?: string;
}

export default function HealthChart({ data, color = '#4F80FF', unit }: HealthChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data || data.length === 0) return null;

    // Get last entries for better visualization
    const displayData = data.slice(-12);

    const values = displayData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 10;
    const padding = range * 0.15;
    const chartMin = minValue - padding;
    const chartMax = maxValue + padding;
    const chartRange = chartMax - chartMin;

    const width = 100;
    const height = 30;
    const px = 2;
    const py = 2;
    const cw = width - px * 2;
    const ch = height - py * 2;

    const points = displayData.map((item, i) => {
        const x = px + (i / (displayData.length - 1 || 1)) * cw;
        const y = py + ch - ((item.value - chartMin) / chartRange) * ch;
        return { x, y, value: item.value, date: item.timestamp };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="relative w-full">
            {hoveredIndex !== null && points[hoveredIndex] && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-bold z-10 shadow-lg border border-white/10 whitespace-nowrap">
                    {points[hoveredIndex].value} {unit}
                    <div className="text-[8px] opacity-60 font-medium">{formatDate(points[hoveredIndex].date)}</div>
                </div>
            )}

            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-24 overflow-visible"
            >
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                <line x1={px} y1={py} x2={width - px} y2={py} stroke="white" strokeWidth="0.1" opacity="0.1" />
                <line x1={px} y1={height - py} x2={width - px} y2={height - py} stroke="white" strokeWidth="0.1" opacity="0.1" />

                {/* Area */}
                <path
                    d={`${pathData} L ${points[points.length - 1].x} ${height - py} L ${points[0].x} ${height - py} Z`}
                    fill={`url(#grad-${color})`}
                />

                {/* Line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Points */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredIndex === i ? 1.2 : 0.6}
                        fill={color}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="transition-all duration-200 cursor-pointer"
                    />
                ))}
            </svg>
        </div>
    );
}
