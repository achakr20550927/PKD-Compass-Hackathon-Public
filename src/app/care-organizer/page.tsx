'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

export default function CareOrganizerPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'appointments' | 'tasks' | 'timeline' | 'progress'>('appointments');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isApptModalOpen, setIsApptModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Form states
    const [apptForm, setApptForm] = useState({
        title: '',
        type: 'Nephrology',
        startAt: '',
        locationText: '',
        providerName: '',
        notes: '',
        reminders: [] as any[]
    });

    const [taskForm, setTaskForm] = useState({
        title: '',
        dueAt: '',
        appointmentId: ''
    });

    const [timeline, setTimeline] = useState<any[]>([]);

    // Request permissions on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            Notification.requestPermission();
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [apptRes, taskRes, analyticsRes, timelineRes] = await Promise.all([
                fetch('/api/appointments'),
                fetch('/api/tasks'),
                fetch('/api/analytics'),
                fetch('/api/timeline')
            ]);
            if (apptRes.ok) setAppointments(await apptRes.json());
            if (taskRes.ok) setTasks(await taskRes.json());
            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
            if (timelineRes.ok) setTimeline(await timelineRes.json());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchData();
        }
    }, [status]);

    const scheduleNotification = (title: string, body: string, targetTime: number, immediate: boolean = false) => {
        const delay = targetTime - Date.now();

        // 1. Bridge to Expo for Native Notifications
        if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
            try {
                (window as any).ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SCHEDULE_NOTIFICATION',
                    title: title,
                    body: body,
                    seconds: Math.max(0, Math.floor(delay / 1000))
                }));
            } catch (e) {
                console.error('Native bridge error:', e);
            }
        }

        // 2. Browser Notifications (Web)
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                if (immediate) {
                    console.log(`Sending immediate feedback for: ${title}`);
                    new Notification('Reminder Set', {
                        body: `Notification scheduled: ${title}`,
                        icon: '/favicon.ico'
                    });
                }

                if (delay > 0) {
                    console.log(`Scheduling web notification for "${title}" with delay: ${delay}ms`);
                    window.dispatchEvent(new CustomEvent('SCHEDULE_WEB_NOTIFICATION', {
                        detail: { title, body, delay }
                    }));
                }
            }
        }
    };

    const handleAddAppt = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apptForm)
            });
            if (res.ok) {
                const data = await res.json();

                const startAt = new Date(apptForm.startAt).getTime();

                // 24 hours before
                scheduleNotification(
                    `Upcoming Appointment: ${apptForm.title}`,
                    `Your ${apptForm.type} appointment is tomorrow at ${new Date(startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    startAt - (24 * 60 * 60 * 1000),
                    true // Immediate feedback for the first one
                );

                // 1 hour before
                scheduleNotification(
                    `Appointment in 1 hour: ${apptForm.title}`,
                    `Your appointment starts at ${new Date(startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    startAt - (60 * 60 * 1000)
                );

                setIsApptModalOpen(false);
                fetchData();
                setApptForm({ title: '', type: 'Nephrology', startAt: '', locationText: '', providerName: '', notes: '', reminders: [] });
            }
        } catch (error) {
            console.error('Error adding appointment:', error);
        }
    };

    const handleDeleteAppt = async (id: string) => {
        try {
            const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Error deleting appointment:', error);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskForm)
            });
            if (res.ok) {
                const data = await res.json();

                if (taskForm.dueAt) {
                    const scheduled = new Date(taskForm.dueAt);
                    scheduled.setHours(8, 0, 0, 0); // 8:00 AM on due date

                    scheduleNotification(
                        `Task Due Today: ${taskForm.title}`,
                        `Remember to complete your task: ${taskForm.title}`,
                        scheduled.getTime(),
                        true // Immediate feedback
                    );
                }

                setIsTaskModalOpen(false);
                fetchData();
                setTaskForm({ title: '', dueAt: '', appointmentId: '' });
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    const handleToggleTask = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'COMPLETED' ? 'OPEN' : 'COMPLETED';
            const res = await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    };

    const handleDeleteTask = async (id: string) => {
        try {
            const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            <header className="mb-6">
                <h1 className="text-3xl font-display font-bold text-text-main dark:text-white mb-2">Care Organizer</h1>
                <p className="text-text-muted">Manage your appointments, tasks, and care timeline.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/50 dark:bg-card-dark/50 backdrop-blur-md rounded-2xl mb-6 sticky top-4 z-40 border border-white/20 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('appointments')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 min-w-[120px] ${activeTab === 'appointments'
                        ? 'bg-primary text-white shadow-glow-primary'
                        : 'text-text-muted hover:bg-white/10'
                        }`}
                >
                    Appointments
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 min-w-[100px] ${activeTab === 'tasks'
                        ? 'bg-primary text-white shadow-glow-primary'
                        : 'text-text-muted hover:bg-white/10'
                        }`}
                >
                    Tasks
                </button>
                <button
                    onClick={() => setActiveTab('progress')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 min-w-[100px] ${activeTab === 'progress'
                        ? 'bg-primary text-white shadow-glow-primary'
                        : 'text-text-muted hover:bg-white/10'
                        }`}
                >
                    Progress
                </button>
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 min-w-[100px] ${activeTab === 'timeline'
                        ? 'bg-primary text-white shadow-glow-primary'
                        : 'text-text-muted hover:bg-white/10'
                        }`}
                >
                    Timeline
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'appointments' && (
                    <div className="animate-fade-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:text-white">Appointments</h2>
                            <button
                                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                onClick={() => setIsApptModalOpen(true)}
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Add New
                            </button>
                        </div>

                        {appointments.length === 0 ? (
                            <div className="bg-white dark:bg-card-dark rounded-3xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">calendar_today</span>
                                <p className="text-slate-500">No appointments scheduled.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <section>
                                    <h2 className="text-sm font-bold text-text-muted uppercase mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">event_upcoming</span>
                                        Upcoming Appointments
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {appointments.filter(a => new Date(a.startAt) >= new Date()).map(a => (
                                            <AppointmentCard key={a.id} appointment={a} onDelete={handleDeleteAppt} />
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-sm font-bold text-text-muted uppercase mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">history</span>
                                        Past Appointments
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {appointments.filter(a => new Date(a.startAt) < new Date()).map(a => (
                                            <AppointmentCard key={a.id} appointment={a} onDelete={handleDeleteAppt} />
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="animate-fade-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:text-white">My Tasks</h2>
                            <button
                                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                onClick={() => setIsTaskModalOpen(true)}
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                New Task
                            </button>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="bg-white dark:bg-card-dark rounded-3xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">check_circle</span>
                                <p className="text-slate-500">All caught up! No open tasks.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={() => handleToggleTask(task.id, task.status)}
                                        onDelete={() => handleDeleteTask(task.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'progress' && analytics && (
                    <div className="animate-fade-up space-y-6">
                        {/* Progression Flag */}
                        <div className={`p-6 rounded-3xl flex items-center gap-4 ${analytics.summary.status === 'RAPID_DECLINE'
                            ? 'bg-danger/10 border border-danger/20'
                            : 'bg-success/10 border border-success/20'
                            }`}>
                            <div className={`p-3 rounded-2xl ${analytics.summary.status === 'RAPID_DECLINE' ? 'bg-danger text-white' : 'bg-success text-white'
                                }`}>
                                <span className="material-symbols-outlined">
                                    {analytics.summary.status === 'RAPID_DECLINE' ? 'warning' : 'verified_user'}
                                </span>
                            </div>
                            <div>
                                <h3 className={`font-bold ${analytics.summary.status === 'RAPID_DECLINE' ? 'text-danger' : 'text-success'
                                    }`}>
                                    {analytics.summary.status === 'RAPID_DECLINE' ? 'Rapid Progressor Flag' : 'Stable Trend'}
                                </h3>
                                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                                    {analytics.summary.recommendation}
                                </p>
                            </div>
                        </div>

                        {/* Analytic Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">eGFR Slope</span>
                                <div className="flex items-end gap-2">
                                    <span className={`text-4xl font-display font-bold dark:text-white ${analytics.egfr.slopePerYear <= -5 ? 'text-danger' : ''
                                        }`}>
                                        {analytics.egfr.slopePerYear > 0 ? '+' : ''}{analytics.egfr.slopePerYear ?? 'N/A'}
                                    </span>
                                    <span className="text-sm text-text-muted pb-1 mb-1">mL/min/yr</span>
                                </div>
                                <p className="text-xs text-text-muted mt-2">
                                    Based on {analytics.egfr.historyCount} data points.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Avg Blood Pressure</span>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-display font-bold dark:text-white">
                                        {analytics.bp.avgSystolic}/{analytics.bp.avgDiastolic}
                                    </span>
                                    <span className="text-sm text-text-muted pb-1 mb-1">mmHg</span>
                                </div>
                                <p className="text-xs text-text-muted mt-2">
                                    Average from last {analytics.bp.readingCount} readings.
                                </p>
                            </div>
                        </div>

                        {/* Secondary CTAs */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => router.push('/imaging')}
                                className="bg-white dark:bg-card-dark p-4 rounded-3xl border border-white/10 flex items-center gap-3 hover:border-primary/50 transition-all"
                            >
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl">
                                    <span className="material-symbols-outlined">visibility</span>
                                </div>
                                <span className="font-bold text-sm dark:text-white">Imaging Log</span>
                            </button>
                            <button
                                onClick={() => router.push('/wellness')}
                                className="bg-white dark:bg-card-dark p-4 rounded-3xl border border-white/10 flex items-center gap-3 hover:border-primary/50 transition-all"
                            >
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-xl">
                                    <span className="material-symbols-outlined">self_care</span>
                                </div>
                                <span className="font-bold text-sm dark:text-white">Wellness Log</span>
                            </button>
                        </div>

                        {/* Weekly BP Mode CTA */}
                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">

                            <div>
                                <h4 className="font-bold dark:text-white">Weekly BP Monitoring</h4>
                                <p className="text-sm text-text-muted">Perform a standard 7-day home monitor for your next nephrology visit.</p>
                            </div>
                            <button
                                onClick={() => router.push('/bp-monitoring')}
                                className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-glow-primary hover:scale-[1.02] transition-all whitespace-nowrap"
                            >
                                Start Weekly Mode
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="animate-fade-up space-y-8 py-4 px-2">
                        {timeline.length === 0 ? (
                            <div className="p-12 text-center bg-white dark:bg-card-dark rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">timeline</span>
                                <p className="text-slate-500">No activity recorded for your timeline yet.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-primary/20 ml-4 pb-8 space-y-10">
                                {timeline.map((item, idx) => (
                                    <TimelineItem key={`${item.type}-${idx}`} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Appointment Modal */}
            <Modal
                isOpen={isApptModalOpen}
                onClose={() => setIsApptModalOpen(false)}
                title="Schedule Appointment"
            >
                <form onSubmit={handleAddAppt} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="e.g., Nephrology Follow-up"
                            value={apptForm.title}
                            onChange={e => setApptForm({ ...apptForm, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={apptForm.type}
                                onChange={e => setApptForm({ ...apptForm, type: e.target.value })}
                            >
                                <option>Nephrology</option>
                                <option>LabDraw</option>
                                <option>Imaging</option>
                                <option>PrimaryCare</option>
                                <option>DialysisConsult</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Date & Time</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={apptForm.startAt}
                                onChange={e => setApptForm({ ...apptForm, startAt: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Location</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="Clinic name or address"
                            value={apptForm.locationText}
                            onChange={e => setApptForm({ ...apptForm, locationText: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
                        <textarea
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="Questions to ask, prep info..."
                            rows={3}
                            value={apptForm.notes}
                            onChange={e => setApptForm({ ...apptForm, notes: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-2xl shadow-glow-primary transition-all active:scale-[0.98]"
                    >
                        Schedule
                    </button>
                </form>
            </Modal>

            {/* Task Modal */}
            <Modal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                title="New Task"
            >
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">What needs to be done?</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="e.g., Schedule labs"
                            value={taskForm.title}
                            onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Due Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            value={taskForm.dueAt}
                            onChange={e => setTaskForm({ ...taskForm, dueAt: e.target.value })}
                        />
                    </div>
                    {appointments.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Link to Appointment (Optional)</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={taskForm.appointmentId}
                                onChange={e => setTaskForm({ ...taskForm, appointmentId: e.target.value })}
                            >
                                <option value="">None</option>
                                {appointments.map(a => (
                                    <option key={a.id} value={a.id}>{a.title} ({new Date(a.startAt).toLocaleDateString()})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-2xl shadow-glow-primary transition-all active:scale-[0.98]"
                    >
                        Add Task
                    </button>
                </form>
            </Modal>
        </div>
    );
}


function TimelineItem({ item }: { item: any }) {
    const date = new Date(item.date);

    const getConfig = () => {
        switch (item.type) {
            case 'APPOINTMENT':
                return { icon: 'calendar_month', color: 'bg-primary', label: 'Appointment' };
            case 'LAB':
                return { icon: 'lab_profile', color: 'bg-emerald-500', label: 'Lab Result' };
            case 'IMAGING':
                return { icon: 'visibility', color: 'bg-indigo-500', label: 'Imaging' };
            case 'BP':
                return { icon: 'monitor_heart', color: 'bg-rose-500', label: 'Blood Pressure' };
            case 'WELLNESS':
                return { icon: 'self_care', color: 'bg-amber-500', label: 'Wellness Log' };
            default:
                return { icon: 'event', color: 'bg-slate-500', label: 'Event' };
        }
    };

    const config = getConfig();

    return (
        <div className="mb-10 ml-6 relative">
            <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full ${config.color} border-4 border-white dark:border-card-dark shadow-sm`}></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase text-white ${config.color}`}>
                        {config.label}
                    </span>
                    <span className="text-xs text-text-muted font-medium">
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-card-dark/50 p-4 rounded-2xl border border-white/10 shadow-sm transition-all hover:border-primary/30">
                <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-xl ${config.color.replace('bg-', 'text-')}`}>
                        {config.icon}
                    </span>
                    <div>
                        <h4 className="font-bold dark:text-white text-sm">
                            {item.type === 'APPOINTMENT' && item.data.title}
                            {item.type === 'LAB' && `${item.data.type} Result: ${item.data.value}`}
                            {item.type === 'IMAGING' && `Imaging Event: ${item.data.treatmentArea || 'Kidneys'}`}
                            {item.type === 'BP' && `BP: ${item.data.systolic}/${item.data.diastolic} mmHg`}
                            {item.type === 'WELLNESS' && `Mood: ${item.data.mood || 'N/A'}`}
                        </h4>
                        {item.type === 'APPOINTMENT' && item.data.providerName && (
                            <p className="text-xs text-text-muted mt-1">Provider: {item.data.providerName}</p>
                        )}
                        {item.type === 'WELLNESS' && item.data.notes && (
                            <p className="text-xs text-text-muted mt-1 italic">"{item.data.notes}"</p>
                        )}
                        {item.type === 'IMAGING' && item.data.metrics?.length > 0 && (
                            <p className="text-xs text-text-muted mt-1">
                                {item.data.metrics.map((m: any) => `${m.name}: ${m.value}`).join(' • ')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AppointmentCard({ appointment, onDelete }: { appointment: any; onDelete: (id: string) => void }) {
    const [showMenu, setShowMenu] = useState(false);
    const date = new Date(appointment.startAt);
    const isPast = date < new Date();

    return (
        <div className={`bg-white dark:bg-card-dark rounded-2xl p-4 border border-white/10 shadow-card transition-all hover:scale-[1.01] ${isPast ? 'opacity-60' : ''} relative`}>
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-xl min-w-[50px] p-2">
                        <span className="text-xs font-bold uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl font-display font-bold">{date.getDate()}</span>
                    </div>
                    <div>
                        <h3 className="font-bold dark:text-white">{appointment.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-text-muted flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded uppercase dark:text-slate-300">
                                {appointment.type}
                            </span>
                        </div>
                        {appointment.locationText && (
                            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">location_on</span>
                                {appointment.locationText}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="text-slate-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5"
                    >
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>

                    {showMenu && (
                        <div className="absolute top-10 right-0 z-50 bg-white dark:bg-slate-800 border border-white/10 rounded-xl shadow-xl py-2 min-w-[140px] animate-scale-in">
                            <button
                                onClick={() => {
                                    if (confirm('Delete this appointment?')) onDelete(appointment.id);
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-danger hover:bg-danger/5 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Delete
                            </button>
                        </div>
                    )}

                    {appointment.reminders?.length > 0 && (
                        <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">notifications_active</span>
                            Set
                        </span>
                    )}
                </div>
            </div>
            {/* Click outside to close menu */}
            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>}
        </div>
    );
}

function TaskCard({ task, onToggle, onDelete }: { task: any; onToggle: () => void; onDelete: () => void }) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-white/10 shadow-card flex justify-between items-center transition-all hover:scale-[1.01] relative">
            <div className="flex items-center gap-4 flex-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center ${task.status === 'COMPLETED'
                        ? 'bg-primary border-primary'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary'
                        }`}
                >
                    {task.status === 'COMPLETED' && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                    )}
                </button>
                <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onToggle()}
                >
                    <h3 className={`font-bold dark:text-white ${task.status === 'COMPLETED' ? 'line-through text-text-muted' : ''}`}>
                        {task.title}
                    </h3>
                    {task.dueAt && (
                        <p className="text-xs text-danger font-medium mt-0.5">
                            Due {new Date(task.dueAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {task.appointment && (
                    <div className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-lg flex items-center gap-1 hidden sm:flex">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        Linked
                    </div>
                )}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="text-slate-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-primary/5"
                    >
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>

                    {showMenu && (
                        <div className="absolute top-8 right-0 z-50 bg-white dark:bg-slate-800 border border-white/10 rounded-xl shadow-xl py-2 min-w-[120px] animate-scale-in">
                            <button
                                onClick={() => {
                                    if (confirm('Delete this task?')) onDelete();
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-danger hover:bg-danger/5 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Click outside to close menu */}
            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>}
        </div>
    );
}
