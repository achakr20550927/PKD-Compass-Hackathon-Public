'use client';

import { useRouter } from 'next/navigation';

export default function RoleSelectionPage() {
    const router = useRouter();

    return (
        <main className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center">
            {/* Main Container */}
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-white dark:bg-background-dark shadow-xl overflow-x-hidden">
                {/* Top App Bar */}
                <div className="flex items-center bg-white dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
                    <button onClick={() => router.back()} className="text-primary flex size-12 shrink-0 items-center cursor-pointer hover:bg-primary/10 rounded-full transition-colors justify-start">
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">PKD Compass</h2>
                </div>
                {/* Hero Section */}
                <div className="px-6 pt-10 pb-6 text-center">
                    <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[32px]">health_and_safety</span>
                    </div>
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-bold leading-tight">Tell us who you are</h1>
                    <p className="text-[#616f89] dark:text-slate-400 mt-2 text-base">Select your role to personalize your experience and health tracking tools.</p>
                </div>
                {/* Role Selection Cards */}
                <div className="flex flex-col gap-4 p-6 grow">
                    {/* Patient Card */}
                    <button onClick={() => router.push('/')} className="group flex flex-col items-stretch justify-start rounded-xl border-2 border-transparent bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-primary/50 transition-all text-left overflow-hidden active:scale-[0.98]">
                        <div className="w-full h-32 bg-primary/5 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBAZXdbDfrK0R-1xFXou1SKipQoJAC8BPyRNrFWEbW58Xq937FD-vU1qcQAbv68izVOi5gPWtq5O0QPhKi9NNUGNtXcOrew8v5mhMu_y13WckS4AfPexH-vvIwCpBv6kCiia6C-5kfiM9YiTbYv74TjhKNORtxj8hd9fwQyFNAHvIeNcplzYVzSX7SktKbelQAIQqfQqwsX2NMqaUrFp37oZBqX1lmPjdkp_smAE9wkanbCoCR5s7sqyujGj7sQkXXPZuC9AID6BuO5')` }}>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    <p className="text-[#111318] dark:text-white text-xl font-bold leading-tight">Patient</p>
                                </div>
                                <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">check_circle</span>
                            </div>
                            <p className="text-[#616f89] dark:text-slate-400 text-sm leading-relaxed">
                                Track my kidney health, manage lab results, and monitor my progress daily.
                            </p>
                        </div>
                    </button>
                    {/* Caregiver Card */}
                    <button onClick={() => router.push('/')} className="group flex flex-col items-stretch justify-start rounded-xl border-2 border-transparent bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-primary/50 transition-all text-left overflow-hidden active:scale-[0.98]">
                        <div className="w-full h-32 bg-primary/5 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA0_nFd6H90JOJcC9pUMO9YHq0ERFW5Lk_R769wupyydKmSBze_fC5aqSjiFU1EidtLfI_aa2sjbgV_j8VcFzWuNRUnSJi6mTH2VvzuBOa9_xEpmXf43tllstcy_nzkSfkx-xdQw8x9dqtsqUM4PIMjca59QOB7A1gKNp9oIc1kzBeHHPOXgCKvuD-I00rFKcXIUey3gG4Ly0k8Ck_GAtYKF_wXJfdfiB9rH8HH5rM3pixM6jQEqnUIYfzbQ7bkwgjJdcdde3nASUU0')` }}>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">volunteer_activism</span>
                                    <p className="text-[#111318] dark:text-white text-xl font-bold leading-tight">Caregiver</p>
                                </div>
                                <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">check_circle</span>
                            </div>
                            <p className="text-[#616f89] dark:text-slate-400 text-sm leading-relaxed">
                                Support a loved one, monitor their health trends, and manage their complex care plan.
                            </p>
                        </div>
                    </button>
                </div>
                {/* Footer Action */}
                <div className="p-6 bg-white dark:bg-background-dark border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => router.push('/')} className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95">
                        <span>Continue</span>
                    </button>
                    <p className="text-center text-[#616f89] dark:text-slate-500 text-xs mt-4">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
                <div className="h-4 bg-white dark:bg-background-dark"></div>
            </div>
        </main>
    );
}
