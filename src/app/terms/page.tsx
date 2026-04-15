'use client';

import Link from 'next/link';

export default function TermsOfUse() {
    return (
        <div className="min-h-screen bg-[#f8faff] dark:bg-background-dark p-6 pb-24 font-lexend">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/settings" className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shadow-sm border border-slate-100">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-2xl font-bold">Terms of Use</h1>
            </header>

            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        By accessing and using PKD Compass, you agree to comply with and be bound by these Terms of Use. If you do not agree, please do not use the application.
                    </p>

                    <h2 className="text-xl font-bold mb-4">2. Medical Disclaimer</h2>
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4 mb-6">
                        <p className="text-amber-800 dark:text-amber-400 text-sm font-bold">
                            This app is for informational purposes only and does not provide medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified healthcare provider.
                        </p>
                    </div>

                    <h2 className="text-xl font-bold mb-4">3. Consumer App Position</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        PKD Compass is a consumer-directed health tracking application. It is not offered as a hospital, clinic, physician, or insurer portal. It helps you organize your own records and health-tracking information, but it does not replace a licensed clinician, medical record system, or emergency service.
                    </p>

                    <h2 className="text-xl font-bold mb-4">4. Data Transmission & Optional Processing</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        PKD Compass transmits account, health-tracking, and document data from your device to secure backend services so your data can be stored, synchronized across sessions, and made available to features you choose to use. This can include your name, email address, profile details, birth date, sex at birth, height, weight, blood pressure readings, pulse values, laboratory values, symptoms, medications, dosage schedules, nutrition entries, appointments, tasks, uploaded documents, and report or export content. If you explicitly enable optional document analysis, uploaded documents and extracted text may be processed by an external AI service to generate an informational summary. You must affirmatively accept these features before using them.
                    </p>

                    <h2 className="text-xl font-bold mb-4">5. Authorized Use of Your Data</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        By accepting these Terms, you authorize PKD Compass to collect, store, organize, synchronize, display, and process the information you choose to provide so the app can deliver account access, charts, reminders, summaries, vault storage, reports, exports, and other consumer self-management features. This authorization applies only to the information you intentionally provide through the app and only for operation of PKD Compass features, security monitoring, fraud prevention, troubleshooting, and related support.
                    </p>

                    <h2 className="text-xl font-bold mb-4">6. Feature-Specific Risk Acknowledgements</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        By using blood pressure logs, lab uploads, medication reminders, symptom tracking, food estimates, appointments, task planning, provider listings, reports, exports, OCR extraction, or optional document analysis, you acknowledge that those features may contain user-entry mistakes, stale information, third-party data errors, delayed processing, missed reminders, incomplete uploads, incorrect summaries, incorrect unit interpretation, synchronization failures, export-delivery failures, and device-level delivery failures. You agree to independently verify prescriptions, lab values, provider details, appointment times, exported reports, and other medical or logistical information with your clinician, pharmacist, laboratory, or official records before acting on it.
                    </p>

                    <h2 className="text-xl font-bold mb-4">7. Blood Pressure Terms</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Blood pressure readings, pulse values, weekly averages, trend charts, and exported reports are convenience tools only. Readings may be entered incorrectly, sync late, reflect stale device time, display incomplete averages, or fail to trigger reminders. PKD Compass is not liable for emergency decisions, treatment changes, missed high readings, export mistakes, or harms caused by reliance on blood pressure cards, charts, reports, or reminder timing instead of direct clinical guidance.
                    </p>

                    <h2 className="text-xl font-bold mb-4">8. Labs, Medications, and Care Terms</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Lab tracking, medication reminders, symptom logs, appointment scheduling, tasks, and care-planning features are organizational and informational tools only. They may contain missing records, stale provider details, missed reminders, wrong time-zone handling, incorrect units, incomplete histories, duplicate entries, export issues, or timing mistakes. PKD Compass is not liable for missed appointments, refill errors, dosing mistakes, delayed care, adverse events, travel costs, or any other loss caused by reliance on these features instead of direct confirmation with clinicians, pharmacies, laboratories, or official records.
                    </p>

                    <h2 className="text-xl font-bold mb-4">9. Document Upload and AI Analysis Terms</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        If you choose to upload documents, files are transmitted from your device to backend services for storage. If you separately opt into AI analysis, uploaded documents and extracted content may be processed by an external AI provider to generate an informational summary. Uploads may fail, extracted text may be incomplete, and summaries may be inaccurate, delayed, or misleading. PKD Compass is not liable for treatment decisions, diagnosis, medication changes, emergency actions, filing mistakes, privacy consequences of documents you choose to upload, or harms caused by reliance on uploaded-document handling, OCR extraction, or AI summaries.
                    </p>

                    <h2 className="text-xl font-bold mb-4">10. Limitation of Liability and Claims Restriction</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        To the fullest extent permitted by applicable law, PKD Compass and its operators disclaim liability for losses, injuries, treatment delays, missed reminders, incorrect summaries, data-entry mistakes, synchronization failures, provider-directory inaccuracies, export or sharing mistakes, appointment or medication timing errors, travel losses, device-notification failures, privacy incidents caused by your sharing decisions, or decisions made using app content. By using the app, you agree not to bring claims or sue PKD Compass or its operators based solely on informational summaries, reminder timing, planner content, blood pressure trends, report or export content, food estimates, provider listings, uploaded document handling, OCR extraction, AI analysis, lab interpretation support, or other non-clinical support features, except where that limitation is prohibited by law.
                    </p>

                    <h2 className="text-xl font-bold mb-4">11. User Conduct</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Users are responsible for the accuracy of the data they input. You agree not to use the app for any unlawful purpose, not to share your account credentials, and not to upload documents or health data belonging to other people without lawful authority to do so.
                    </p>

                    <h2 className="text-xl font-bold mb-4">12. Data Deletion & Account Controls</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        You may delete your account from the app settings. Deleting your account is intended to remove your account records from supported backend services and clear locally cached data from your device. You are responsible for reviewing the consequences before confirming deletion.
                    </p>

                    <h2 className="text-xl font-bold mb-4">13. Emergency & High-Risk Use</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Do not rely on PKD Compass in an emergency. If you believe you may be experiencing a medical emergency, call emergency services or contact a licensed clinician immediately.
                    </p>

                    <h2 className="text-xl font-bold mb-4">14. Intellectual Property</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        All content, code, and designs within PKD Compass are protected by copyright. "No stealing data" applies both ways—we respect your health data, and we expect you to respect our platform's intellectual property.
                    </p>
                </div>
            </div>
        </div>
    );
}
