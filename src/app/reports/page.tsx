'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import { formatDate } from '../../lib/utils';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [labs, setLabs] = useState<any[]>([]);

    const fetchLabs = async () => {
        const res = await fetch('/api/labs');
        return res.json();
    };

    const generatePDF = async () => {
        setLoading(true);
        try {
            const fetchedLabs = await fetchLabs();
            setLabs(fetchedLabs);

            const doc = new jsPDF();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(2, 132, 199);
            doc.text("PKD Compass - Clinical Summary", 20, 20);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 28);
            doc.text("Patient: Alex (Demo User)", 20, 32);

            let y = 50;

            // eGFR Section
            const egfrs = fetchedLabs.filter((ol: any) => ol.type === 'EGFR');
            if (egfrs.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text("eGFR Trends", 20, y);
                y += 10;

                doc.setFontSize(10);
                egfrs.slice(0, 5).forEach((v: any) => {
                    doc.text(`${formatDate(v.timestamp)}: ${v.value} ${v.unit}`, 20, y);
                    y += 6;
                });
                y += 10;
            }

            // All Labs Table
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("Recent Labs", 20, y);
            y += 10;

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text("Date | Test | Value | Note", 20, y);
            y += 6;

            fetchedLabs.slice(0, 15).forEach((l: any) => {
                const line = `${formatDate(l.timestamp)} | ${l.type} | ${l.value} ${l.unit}`;
                doc.text(line, 20, y);
                y += 6;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });

            doc.save("pkd-summary.pdf");
        } catch (e) {
            console.error(e);
            alert("Error generating PDF");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-4 text-center">Clinical Reports</h1>
            <p className="text-muted mb-8 text-center max-w-sm">
                Generate a PDF summary of your recent lab trends and medication adherence to share with your nephrologist.
            </p>

            <button
                onClick={generatePDF}
                disabled={loading}
                className="btn btn-primary bg-sky-600 text-white px-8 py-3 rounded-full text-lg shadow-lg hover:bg-sky-700 transition-transform hover:scale-105"
            >
                {loading ? 'Generating...' : 'Download PDF Summary'}
            </button>
        </main>
    );
}
