'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

const CATEGORIES = ['Labs', 'Imaging', 'Visit Summary', 'Insurance', 'Prescriptions', 'Other'];
const CONSENT_LABELS: Record<string, { title: string; description: string }> = {
    TERMS_OF_USE: {
        title: 'Terms of Use',
        description: 'You must accept the consumer-app terms before using sensitive document features.'
    },
    PRIVACY_POLICY: {
        title: 'Privacy Policy',
        description: 'You must accept the privacy policy before storing or reviewing health documents.'
    },
    CLOUD_HEALTH_STORAGE: {
        title: 'Cloud Health Storage',
        description: 'Documents are transmitted from your device to backend services for secure storage and sync.'
    },
    DOCUMENT_UPLOAD: {
        title: 'Document Upload',
        description: 'Uploads are stored in your vault and can include sensitive health information.'
    },
    DOCUMENT_AI_ANALYSIS: {
        title: 'AI Document Analysis',
        description: 'Optional summaries send extracted document content from backend services to an AI provider. Output is informational only.'
    },
};

async function buildPdfAnalysisPreview(file: File): Promise<{ mimeType: string; base64Data: string } | null> {
    try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = (pdfjs as any).getDocument({
            data: new Uint8Array(arrayBuffer),
            disableWorker: true,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const [, base64Data = ''] = dataUrl.split(',');
        return base64Data ? { mimeType: 'image/jpeg', base64Data } : null;
    } catch (error) {
        console.error('Failed to build PDF analysis preview:', error);
        return null;
    }
}

export default function DocumentVaultPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [consents, setConsents] = useState<Record<string, boolean>>({});
    const [consentError, setConsentError] = useState('');
    const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploading, setUploading] = useState(false);

    // Modal states
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);

    // Form states
    const [uploadForm, setUploadForm] = useState({
        title: '',
        category: 'Labs',
        docDate: '',
        tags: '',
        file: null as File | null,
        enableAnalysis: false
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            void bootstrap();
        }
    }, [status]);

    const bootstrap = async () => {
        await Promise.all([fetchConsents(), fetchDocuments()]);
    };

    const fetchConsents = async () => {
        try {
            const res = await fetch('/api/user/consents');
            if (res.ok) {
                const data = await res.json();
                setConsents(data.statuses || {});
            }
        } catch (error) {
            console.error('Consent fetch error:', error);
        }
    };

    const updateConsent = async (type: string, value: boolean) => {
        setConsentError('');
        setUpdatingConsent(type);
        try {
            const res = await fetch('/api/user/consents', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, status: value }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to update consent');
            }
            setConsents(data.statuses || {});
        } catch (error: any) {
            setConsentError(error?.message || 'Failed to update consent');
        } finally {
            setUpdatingConsent(null);
        }
    };

    const hasCoreDocumentConsents =
        !!consents.TERMS_OF_USE &&
        !!consents.PRIVACY_POLICY &&
        !!consents.CLOUD_HEALTH_STORAGE &&
        !!consents.DOCUMENT_UPLOAD;

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/documents');
            if (res.ok) setDocuments(await res.json());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError('');
        if (!uploadForm.file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('title', uploadForm.title);
        formData.append('category', uploadForm.category);
        if (uploadForm.docDate) formData.append('docDate', uploadForm.docDate);
        if (uploadForm.tags) formData.append('tags', uploadForm.tags);
        formData.append('enableAnalysis', uploadForm.enableAnalysis ? 'true' : 'false');

        try {
            if (uploadForm.enableAnalysis && uploadForm.file.type === 'application/pdf') {
                const preview = await buildPdfAnalysisPreview(uploadForm.file);
                if (preview) {
                    formData.append('analysisPreviewImageMimeType', preview.mimeType);
                    formData.append('analysisPreviewImageBase64', preview.base64Data);
                }
            }
            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Upload failed');
            }
            if (res.ok) {
                setIsUploadModalOpen(false);
                fetchDocuments();
                setUploadForm({ title: '', category: 'Labs', docDate: '', tags: '', file: null, enableAnalysis: false });
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const openDocument = async (doc: any) => {
        setViewLoading(true);
        try {
            const res = await fetch(`/api/documents/${doc.id}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || 'Failed to load document');
            setSelectedDoc(data);
        } catch (error: any) {
            alert(error?.message || 'Failed to load document');
        } finally {
            setViewLoading(false);
        }
    };

    const filteredDocs = activeFilter === 'All'
        ? documents
        : documents.filter(doc => doc.category === activeFilter);

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto px-4 py-6 pb-24">
            <header className="mb-6 flex justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-text-main dark:text-white mb-1">Document Vault</h1>
                    <p className="text-text-muted">Secure storage for your medical records.</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-2xl font-bold shadow-glow-primary transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    <span className="material-symbols-outlined">upload_file</span>
                    Upload
                </button>
            </header>

            <div className="bg-white dark:bg-card-dark rounded-3xl p-5 border border-white/10 shadow-card mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary">shield</span>
                    <h2 className="font-bold dark:text-white">Document Terms & Controls</h2>
                </div>
                <p className="text-sm text-text-muted mb-4">
                    Vault uploads and optional AI analysis are blocked until you explicitly accept the required terms below.
                </p>
                <div className="space-y-3">
                    {['TERMS_OF_USE', 'PRIVACY_POLICY', 'CLOUD_HEALTH_STORAGE', 'DOCUMENT_UPLOAD', 'DOCUMENT_AI_ANALYSIS'].map((type) => (
                        <div key={type} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                            <div>
                                <p className="font-semibold dark:text-white">{CONSENT_LABELS[type].title}</p>
                                <p className="text-sm text-text-muted">{CONSENT_LABELS[type].description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => updateConsent(type, !consents[type])}
                                disabled={updatingConsent === type}
                                className={`min-w-[92px] rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                                    consents[type]
                                        ? 'bg-success/15 text-success'
                                        : 'bg-primary text-white hover:bg-primary-dark'
                                } ${updatingConsent === type ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {updatingConsent === type ? 'Saving...' : consents[type] ? 'Accepted' : 'Accept'}
                            </button>
                        </div>
                    ))}
                </div>
                {consentError && <p className="mt-3 text-sm text-danger">{consentError}</p>}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {['All', ...CATEGORIES].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${activeFilter === cat
                            ? 'bg-primary text-white shadow-glow-primary'
                            : 'bg-white dark:bg-card-dark text-text-muted border border-white/10 hover:border-primary/50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Document Grid */}
            {filteredDocs.length === 0 ? (
                <div className="bg-white dark:bg-card-dark rounded-3xl p-16 text-center border border-dashed border-slate-200 dark:border-slate-800 animate-fade-up">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">folder_open</span>
                    <h3 className="text-xl font-bold dark:text-white mb-1">No documents found</h3>
                    <p className="text-slate-500">Upload your first lab report or visit summary.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredDocs.map(doc => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            onClick={() => void openDocument(doc)}
                        />
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Document"
            >
                {!hasCoreDocumentConsents ? (
                    <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5 text-sm text-slate-700 dark:text-slate-200">
                        Document upload is blocked until you accept Terms of Use, Privacy Policy, Cloud Health Storage, and Document Upload consent in the controls above.
                    </div>
                ) : (
                <form onSubmit={handleUpload} className="space-y-5">
                    {uploadError && (
                        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                            {uploadError}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Document Title</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="e.g., January Lab Results"
                            value={uploadForm.title}
                            onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Category</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={uploadForm.category}
                                onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Document Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={uploadForm.docDate}
                                onChange={e => setUploadForm({ ...uploadForm, docDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">File (PDF or Image)</label>
                        <div className="relative group">
                            <input
                                type="file"
                                required
                                accept=".pdf,image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                            />
                            <div className="w-full px-4 py-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-primary transition-colors text-center">
                                <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary mb-2">cloud_upload</span>
                                <p className="text-sm text-text-muted">
                                    {uploadForm.file ? uploadForm.file.name : 'Click or drag file to upload'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Tags (optional, comma separated)</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="e.g., PKD, High Potassium"
                            value={uploadForm.tags}
                            onChange={e => setUploadForm({ ...uploadForm, tags: e.target.value })}
                        />
                    </div>
                    <label className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                        <input
                            type="checkbox"
                            checked={uploadForm.enableAnalysis}
                            onChange={e => setUploadForm({ ...uploadForm, enableAnalysis: e.target.checked })}
                            disabled={!consents.DOCUMENT_AI_ANALYSIS}
                            className="mt-1"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                            <span className="block font-semibold dark:text-white">Enable AI document analysis</span>
                            Extracted document content will be sent from PKD Compass backend services to an AI provider to generate an informational summary. This is optional, consumer-facing, and not medical advice.
                            {!consents.DOCUMENT_AI_ANALYSIS && (
                                <span className="mt-2 block text-danger">
                                    Accept the AI Document Analysis consent above to enable this option.
                                </span>
                            )}
                        </span>
                    </label>
                    <button
                        type="submit"
                        disabled={uploading}
                        className={`w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-2xl shadow-glow-primary transition-all active:scale-[0.98] ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {uploading ? 'Saving…' : 'Save to Vault'}
                    </button>
                </form>
                )}
            </Modal>

            {/* View Modal */}
            <Modal
                isOpen={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                title={selectedDoc?.title || 'Document'}
            >
                {selectedDoc && (
                    <div className="space-y-6">
                        <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                            {selectedDoc.mimeType.startsWith('image/') && selectedDoc.viewUrl ? (
                                <img
                                    src={selectedDoc.viewUrl}
                                    className="w-full h-full object-contain"
                                    alt={selectedDoc.title}
                                />
                            ) : (
                                <div className="text-center p-8">
                                    <span className="material-symbols-outlined text-6xl text-primary mb-4">description</span>
                                    <p className="text-text-muted mb-4">PDF Document ({Math.round(selectedDoc.sizeBytes / 1024)} KB)</p>
                                    {selectedDoc.viewUrl ? (
                                        <a
                                            href={selectedDoc.viewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                                        >
                                            Open PDF
                                        </a>
                                    ) : (
                                        <p className="text-sm text-danger">Secure file link unavailable. Try reopening the document.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {(selectedDoc.aiSummary || selectedDoc.aiFeedback) && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/15 p-5">
                                <div className="flex items-center gap-2 text-primary mb-3">
                                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                    <h4 className="font-bold text-sm uppercase tracking-wider">Automated Summary</h4>
                                </div>
                                {selectedDoc.aiSummary && (
                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                        {selectedDoc.aiSummary}
                                    </p>
                                )}
                                {selectedDoc.aiFeedback && (
                                    <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-text-muted font-sans">
                                        {selectedDoc.aiFeedback}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                                <span className="block text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1">Category</span>
                                <span className="font-medium dark:text-white">{selectedDoc.category}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                                <span className="block text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1">Date</span>
                                <span className="font-medium dark:text-white">
                                    {selectedDoc.docDate ? new Date(selectedDoc.docDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 animate-fade-up">
                            <div className="flex items-center gap-2 text-primary mb-2">
                                <span className="material-symbols-outlined text-xl">shield</span>
                                <h4 className="font-bold text-sm uppercase tracking-wider">Stored Document</h4>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                                This file is stored in your vault for secure retrieval and recordkeeping. It is transmitted from your device to backend services for storage and sync. Automated summaries, where enabled, are optional, consumer-facing, and informational only. They do not provide medical advice, diagnosis, or treatment.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    if (confirm('Delete this document forever?')) {
                                        await fetch(`/api/documents/${selectedDoc.id}`, { method: 'DELETE' });
                                        setSelectedDoc(null);
                                        fetchDocuments();
                                    }
                                }}
                                className="flex-1 bg-danger/10 text-danger font-bold py-3 rounded-xl hover:bg-danger hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-xl">delete</span>
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function DocumentCard({ doc, onClick }: { doc: any; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-card-dark rounded-[28px] border border-white/10 shadow-card overflow-hidden hover:scale-[1.01] transition-all cursor-pointer group"
        >
            <div className="aspect-video bg-slate-50 dark:bg-slate-900 relative flex items-center justify-center overflow-hidden">
                <div className="text-secondary opacity-20">
                    <span className="material-symbols-outlined text-[64px]">
                        {doc.mimeType.startsWith('image/') ? 'image' : 'picture_as_pdf'}
                    </span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                    <span className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold dark:text-white">
                        {doc.category}
                    </span>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-bold dark:text-white truncate mb-1">{doc.title}</h3>
                {doc.aiSummary && (
                    <p className="text-xs text-text-muted line-clamp-2 mb-2">{doc.aiSummary}</p>
                )}
                <div className="flex justify-between items-center text-[10px] text-text-muted">
                    <span>{doc.docDate ? new Date(doc.docDate).toLocaleDateString() : new Date(doc.createdAt).toLocaleDateString()}</span>
                    <span>{Math.round(doc.sizeBytes / 1024)} KB</span>
                </div>
            </div>
        </div>
    );
}
