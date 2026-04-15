'use client';

import { useState } from 'react';

interface DataPoint {
    value: number;
    timestamp: Date;
}

interface SparkLineProps {
    data: DataPoint[];
    label?: string;
    unit?: string;
    color?: string;
    height?: number;
}

export default function SparkLine({
    data,
    label,
    unit = '',
    color = '#4F80FF',
    height = 100
}: SparkLineProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center text-slate-400 text-sm`} style={{ height: `${height}px` }}>
                No data available
            </div>
        );
    }

    // Sort by date
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Bounds
    const values = sortedData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 10;
    const padding = range * 0.1;
    const chartMin = minValue - padding;
    const chartMax = maxValue + padding;
    const chartRange = chartMax - chartMin;

    // SVG dimensions
    const svgWidth = 100;
    const svgHeight = 24;
    const paddingX = 4;
    const paddingY = 4;
    const chartWidth = svgWidth - paddingX * 2;
    const chartHeight = svgHeight - paddingY * 2;

    const points = sortedData.map((item, i) => {
        const x = paddingX + (i / (sortedData.length - 1 || 1)) * chartWidth;
        const y = paddingY + chartHeight - ((item.value - chartMin) / chartRange) * chartHeight;
        return { x, y, value: item.value, date: item.timestamp };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="relative w-full">
            {/* Header / Info */}
            <div className="flex justify-between items-end mb-2 px-1">
                {label && <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>}
                <div className="text-right">
                    <span className="text-lg font-display font-bold dark:text-white">
                        {sortedData[sortedData.length - 1].value}
                    </span>
                    <span className="text-[10px] text-text-muted ml-1">{unit}</span>
                </div>
            </div>

            {/* Hover Tooltip */}
            {hoveredIndex !== null && (
                <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-10">
                    <div className="bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-lg">
                        {sortedData[hoveredIndex].value} {unit} • {sortedData[hoveredIndex].timestamp.toLocaleDateString()}
                    </div>
                </div>
            )}

            <svg
                width="100%"
                height={`${height}px`}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Fill */}
                <path
                    d={`${pathData} L ${svgWidth - paddingX} ${svgHeight - paddingY} L ${paddingX} ${svgHeight - paddingY} Z`}
                    fill={`url(#grad-${label})`}
                />

                {/* Line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Points */}
                {points.map((point, i) => (
                    <circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r={hoveredIndex === i ? 1.5 : 0.8}
                        fill={color}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer transition-all"
                    />
                ))}
            </svg>
        </div>
    );
}
