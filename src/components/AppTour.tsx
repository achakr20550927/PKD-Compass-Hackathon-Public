'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TourStep {
    title: string;
    description: string;
    icon: string;
}

const tourSteps: TourStep[] = [
    {
        title: "Welcome to PKD Compass",
        description: "This app helps you manage and track your Polycystic Kidney Disease journey with ease and precision.",
        icon: "explore"
    },
    {
        title: "eGFR Tracking",
        description: "The eGFR (Estimated Glomerular Filtration Rate) is the most important measure of your kidney function. We chart it over time so you can see your trends.",
        icon: "monitoring"
    },
    {
        title: "uACR (Proteinuria)",
        description: "Monitoring the protein in your urine is crucial. We help you stay within safe ranges and alert you if things change.",
        icon: "water_drop"
    },
    {
        title: "Medication Adherence",
        description: "Stay adherent with your meds, especially for drugs like Tolvaptan. You can mark doses as taken and review your schedule anytime.",
        icon: "pill"
    },
    {
        title: "Quick Data Entry",
        description: "Add new lab results, log blood pressure, or record symptoms instantly using the quick action buttons on your dashboard.",
        icon: "add_circle"
    },
    {
        title: "Data Pruning",
        description: "You have full control over your data. You can easily remove individual medication or lab entries if you made a mistake or stopped a treatment.",
        icon: "delete_sweep"
    },
    {
        title: "Privacy & Security",
        description: "Your health data is isolated and secure. No one else can see your data, and we strictly follow industry standards for encryption.",
        icon: "lock"
    },
    {
        title: "Settings & Profile",
        description: "Personalize your account, set up notifications, and read our terms and privacy policies at any time.",
        icon: "person_settings"
    }
];

export default function AppTour({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setCurrentStep(0);
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const nextStep = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-white/20 relative overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
                    {/* Background Accent */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 bg-primary/10 rounded-full blur-3xl"></div>

                    {/* Progress Bar */}
                    <div className="flex gap-1.5 mb-8">
                        {tourSteps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                            ></div>
                        ))}
                    </div>

                    <div className="text-center">
                        <div className="size-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6 shadow-sm border border-primary/5">
                            <span className="material-symbols-outlined text-[40px] !fill-1">
                                {tourSteps[currentStep].icon}
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold text-[#111318] dark:text-white mb-3">
                            {tourSteps[currentStep].title}
                        </h2>

                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed min-h-[80px]">
                            {tourSteps[currentStep].description}
                        </p>
                    </div>

                    <div className="mt-10 flex gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="flex-1 h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="flex-[2] h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>{currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next Step'}</span>
                            <span className="material-symbols-outlined text-sm">
                                {currentStep === tourSteps.length - 1 ? 'check' : 'arrow_forward'}
                            </span>
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.getElementById('portal-root') || document.body);
}
