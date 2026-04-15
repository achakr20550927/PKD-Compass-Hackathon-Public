'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteButtonProps {
    id: string;
    type: 'meds' | 'labs' | 'symptoms';
}

export default function DeleteButton({ id, type }: DeleteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to remove this entry?')) return;

        setIsDeleting(true);
        try {
            const endpoint = `/api/user/${type}/${id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });

            if (res.ok) {
                router.refresh();
            } else {
                alert('Failed to delete. Please try again.');
                setIsDeleting(false);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred.');
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`size-8 flex items-center justify-center rounded-lg border transition-all ${isDeleting ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'} active:scale-95`}
            title={`Remove ${type === 'meds' ? 'medication' : 'lab result'}`}
        >
            <span className={`material-symbols-outlined text-base ${isDeleting ? 'animate-spin' : ''}`}>
                {isDeleting ? 'progress_activity' : 'delete'}
            </span>
        </button>
    );
}
