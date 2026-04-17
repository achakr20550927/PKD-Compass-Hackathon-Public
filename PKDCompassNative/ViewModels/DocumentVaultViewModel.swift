import Foundation
import SwiftData

@MainActor
final class DocumentVaultViewModel: ObservableObject {
    @Published var documents: [DocumentRecord] = []
    @Published var documentDetails: [UUID: RemoteDocumentDetailDTO] = [:]
    @Published var title = ""
    @Published var category = "Labs"
    @Published var documentDate = Date()
    @Published var backendURL = AppConfig.defaultBackendURL
    @Published var isUploading = false
    @Published var message: String?
    @Published var wantsAIAnalysis = false

    let categories = ["Labs", "Imaging", "Visit Summary", "Insurance", "Prescriptions", "Other"]

    private let uploadService = DocumentAnalysisService()

    func load(context: ModelContext) {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else {
            documents = []
            documentDetails = [:]
            return
        }
        var descriptor = FetchDescriptor<DocumentRecord>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
        descriptor.predicate = #Predicate<DocumentRecord> { $0.ownerEmail == ownerEmail }
        documents = (try? context.fetch(descriptor)) ?? []

        Task { await syncFromServer(context: context) }
    }

    func upload(fileURL: URL, tags: String, context: ModelContext) async {
        isUploading = true
        defer { isUploading = false }

        do {
            let accessed = fileURL.startAccessingSecurityScopedResource()
            defer {
                if accessed {
                    fileURL.stopAccessingSecurityScopedResource()
                }
            }

            let ext = fileURL.pathExtension.lowercased()
            let allowed = ["pdf", "png", "jpg", "jpeg", "heic"]
            guard allowed.contains(ext) else {
                message = "Unsupported file type. Use PDF or image."
                return
            }
            let fileSize = (try fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            guard fileSize > 0 && fileSize <= 10 * 1024 * 1024 else {
                message = "File must be 10MB or smaller."
                return
            }

            uploadService.backendBaseURL = backendURL
            AppConfig.setBackendURL(backendURL)
            let clientId = UUID()
            let response = try await uploadService.uploadAndAnalyze(
                fileURL: fileURL,
                title: title.isEmpty ? fileURL.lastPathComponent : title,
                category: category,
                docDate: documentDate,
                tags: tags,
                clientId: clientId,
                enableAnalysis: wantsAIAnalysis
            )

            let record = DocumentRecord(
                id: clientId,
                ownerEmail: AppConfig.currentUserEmail,
                title: title.isEmpty ? fileURL.lastPathComponent : title,
                category: category,
                mimeType: mimeType(fileURL),
                localPath: response.id ?? fileURL.path,
                aiSummary: response.aiSummary,
                aiFeedback: response.aiFeedback
            )
            context.insert(record)
            try context.save()
            message = wantsAIAnalysis ? "Uploaded and analyzed" : "Uploaded successfully"
            title = ""
            documentDate = Date()
            wantsAIAnalysis = false
            load(context: context)
        } catch {
            message = "Upload failed. Ensure backend is running and authenticated."
        }
    }

    private func mimeType(_ url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "pdf": return "application/pdf"
        case "jpg", "jpeg": return "image/jpeg"
        case "png": return "image/png"
        default: return "application/octet-stream"
        }
    }

    func delete(document: DocumentRecord, context: ModelContext) {
        context.delete(document)
        do {
            try context.save()
            load(context: context)
            message = "Document deleted"
        } catch {
            message = "Failed to delete document"
        }

        Task {
            try? await MobileDocumentsService.delete(id: document.id)
        }
    }

    private func syncFromServer(context: ModelContext) async {
        do {
            let remote = try await MobileDocumentsService.fetchAll()
            let ownerEmail = AppConfig.currentUserEmail
            guard !ownerEmail.isEmpty else { return }

            for doc in remote {
                guard let uuid = UUID(uuidString: doc.id) else { continue }
                documentDetails[uuid] = RemoteDocumentDetailDTO(
                    id: doc.id,
                    title: doc.title,
                    category: doc.category,
                    mimeType: doc.mimeType,
                    fileKey: doc.fileKey,
                    aiSummary: doc.aiSummary,
                    aiFeedback: doc.aiFeedback,
                    createdAt: doc.createdAt,
                    viewUrl: doc.viewUrl
                )
                var descriptor = FetchDescriptor<DocumentRecord>()
                descriptor.predicate = #Predicate<DocumentRecord> { $0.id == uuid && $0.ownerEmail == ownerEmail }
                if let existing = try? context.fetch(descriptor).first {
                    existing.title = doc.title
                    existing.category = doc.category
                    existing.mimeType = doc.mimeType
                    existing.localPath = doc.fileKey
                    existing.aiSummary = doc.aiSummary
                    existing.aiFeedback = doc.aiFeedback
                    existing.createdAt = doc.createdAt
                } else {
                    context.insert(
                        DocumentRecord(
                            id: uuid,
                            ownerEmail: ownerEmail,
                            title: doc.title,
                            category: doc.category,
                            mimeType: doc.mimeType,
                            localPath: doc.fileKey,
                            aiSummary: doc.aiSummary,
                            aiFeedback: doc.aiFeedback,
                            createdAt: doc.createdAt
                        )
                    )
                }
            }
            try context.save()
            var descriptor = FetchDescriptor<DocumentRecord>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
            descriptor.predicate = #Predicate<DocumentRecord> { $0.ownerEmail == ownerEmail }
            documents = (try? context.fetch(descriptor)) ?? documents
        } catch {
            // ignore offline
        }
    }
}
