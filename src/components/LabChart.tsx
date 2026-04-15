'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

type DataPoint = {
    timestamp: string | Date;
    value: number;
    unit?: string;
};

export default function LabChart({ data, color = "#0284c7" }: { data: DataPoint[], color?: string }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return <div className="h-48 bg-slate-50 animate-pulse rounded-md" />;

    const formattedData = data.map(d => ({
        ...d,
        date: formatDate(d.timestamp),
        val: d.value
    })).reverse(); // Oldest first

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: '#cbd5e1' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
