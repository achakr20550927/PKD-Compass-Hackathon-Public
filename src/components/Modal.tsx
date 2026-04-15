'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                ref={modalRef}
                className="relative bg-white dark:bg-card-dark w-full max-w-md rounded-[32px] shadow-float animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 overflow-hidden border border-white/20"
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-2xl font-display font-bold dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="size-10 rounded-full bg-slate-50 text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="px-6 py-5 max-h-[80vh] overflow-y-auto bg-[#f7f9ff] dark:bg-card-dark">
                    {children}
                </div>
            </div>
        </div>
    );
}
