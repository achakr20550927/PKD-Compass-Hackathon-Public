'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#f8faff] dark:bg-background-dark p-6 pb-24 font-lexend">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/settings" className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shadow-sm border border-slate-100">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-2xl font-bold">Privacy Policy</h1>
            </header>

            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">privacy_tip</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-slate-200">Privacy Overview</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">This page describes how the app handles account and health-tracking data.</p>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold mb-4">1. Data Isolation & Security</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        We use account-based access controls and secure transport to reduce unauthorized access to your information. Access to account and health-tracking data is intended to be limited to the signed-in user and any explicitly authorized workflows supported by the product.
                    </p>

                    <h2 className="text-xl font-bold mb-4">2. Consumer App Position</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        PKD Compass is a consumer health application for self-management and record organization. It is not your hospital chart, not an electronic medical record, and not a substitute for licensed professional care. If you use it to store health information, you are choosing to place that information into your own account for convenience and tracking.
                    </p>

                    <h2 className="text-xl font-bold mb-4">3. Information We Collect</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        We collect information necessary to support tracking features that you choose to use, such as your name, email address, profile details, birth date, sex at birth, height, weight, health conditions, blood pressure readings, pulse values, laboratory values, medications, dosage schedules, symptoms, nutrition entries, appointments, tasks, report or export content, and uploaded documents.
                    </p>

                    <h2 className="text-xl font-bold mb-4">4. Storage, Sync, and Transmission</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        When you use PKD Compass, information you enter may be transmitted from your device to backend services so your account data can be stored, synchronized, processed for app functionality, and made available when you sign in again. This includes health-tracking data, reports, exports, and uploaded documents when you choose to use those features.
                    </p>

                    <h2 className="text-xl font-bold mb-4">5. How Your Data Is Used</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Your data is used to operate your account, preserve your records between sessions, generate charts and trend displays, deliver reminders you enable, produce reports and exports you request, support optional document vault storage, and perform optional AI document analysis only when you explicitly consent to that feature. We also use account and device activity data to protect the service, prevent abuse, troubleshoot issues, and respond to support requests.
                    </p>

                    <h2 className="text-xl font-bold mb-4">6. Optional Document Analysis</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Document vault uploads and AI-generated summaries are optional. If you enable AI analysis, your uploaded document and extracted text are sent from PKD Compass servers to an AI service to generate a consumer-facing informational summary. OCR and AI extraction may be incomplete or inaccurate. This feature is opt-in and can be declined or disabled.
                    </p>

                    <h2 className="text-xl font-bold mb-4">7. Privacy & Security Controls</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        PKD Compass uses account authentication, consent-gated sensitive features, secure network transport, and account deletion workflows intended to reduce unauthorized access to your information. You remain responsible for protecting your device, choosing strong credentials, and only exporting or sharing health information through destinations you trust.
                    </p>

                    <h2 className="text-xl font-bold mb-4">8. Feature-Specific Consents</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        PKD Compass may require explicit consent before you use certain features, including blood pressure tracking, labs and symptoms, medications and reminders, care organizer workflows, document uploads, AI document analysis, report and export workflows, and notifications. If you decline a feature-specific consent, that feature remains blocked until you later accept it.
                    </p>

                    <h2 className="text-xl font-bold mb-4">9. Data Deletion</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        You can delete your account from the app settings. Where supported by the configured backend, deleting your account removes account-linked records from backend services and clears locally cached data from this device.
                    </p>

                    <h2 className="text-xl font-bold mb-4">10. Consumer Use Only</h2>
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4">
                        <p className="text-amber-800 dark:text-amber-400 text-sm font-bold leading-relaxed">
                            This app is for informational purposes only and does not provide medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified healthcare provider.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
