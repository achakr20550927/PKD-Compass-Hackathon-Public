import Foundation
import PDFKit
import UIKit

struct DocumentAnalysisResponse: Decodable {
    let id: String?
    let aiSummary: String?
    let aiFeedback: String?
}

enum DocumentAnalysisError: LocalizedError {
    case invalidServerURL
    case uploadFailed

    var errorDescription: String? {
        switch self {
        case .invalidServerURL: return "Invalid backend URL"
        case .uploadFailed: return "Document upload failed"
        }
    }
}

final class DocumentAnalysisService {
    /// Point this to your deployed backend domain, e.g. https://pkdcompass.app
    var backendBaseURL: String = AppConfig.defaultBackendURL
    private let keychain: KeychainServiceProtocol = KeychainService()

    func uploadAndAnalyze(
        fileURL: URL,
        title: String,
        category: String,
        docDate: Date,
        tags: String,
        clientId: UUID,
        enableAnalysis: Bool
    ) async throws -> DocumentAnalysisResponse {
        guard let url = URL(string: "\(backendBaseURL)/api/mobile/documents") else {
            throw DocumentAnalysisError.invalidServerURL
        }

        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = keychain.read(key: KeychainKeys.authToken(for: AppConfig.currentUserEmail)) ?? keychain.read(key: KeychainKeys.authToken) {
            if !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        }

        let fileData = try Data(contentsOf: fileURL)
        let mimeType = mimeTypeForURL(fileURL)
        let analysisPreview = enableAnalysis ? buildAnalysisPreview(fileURL: fileURL, mimeType: mimeType) : nil

        var body = Data()
        body.appendMultipartField(named: "title", value: title, boundary: boundary)
        body.appendMultipartField(named: "category", value: category, boundary: boundary)
        body.appendMultipartField(named: "docDate", value: ISO8601DateFormatter().string(from: docDate), boundary: boundary)
        body.appendMultipartField(named: "tags", value: tags, boundary: boundary)
        body.appendMultipartField(named: "clientId", value: clientId.uuidString, boundary: boundary)
        body.appendMultipartField(named: "enableAnalysis", value: enableAnalysis ? "true" : "false", boundary: boundary)
        if let analysisPreview {
            body.appendMultipartField(named: "analysisPreviewImageMimeType", value: analysisPreview.mimeType, boundary: boundary)
            body.appendMultipartField(named: "analysisPreviewImageBase64", value: analysisPreview.base64Data, boundary: boundary)
        }
        body.appendMultipartFile(named: "file", filename: fileURL.lastPathComponent, mimeType: mimeType, fileData: fileData, boundary: boundary)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw DocumentAnalysisError.uploadFailed
        }

        return (try? JSONDecoder().decode(DocumentAnalysisResponse.self, from: data))
            ?? DocumentAnalysisResponse(id: nil, aiSummary: nil, aiFeedback: nil)
    }

    private func mimeTypeForURL(_ url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "pdf": return "application/pdf"
        case "jpg", "jpeg": return "image/jpeg"
        case "png": return "image/png"
        default: return "application/octet-stream"
        }
    }

    private func buildAnalysisPreview(fileURL: URL, mimeType: String) -> (mimeType: String, base64Data: String)? {
        if mimeType.hasPrefix("image/"), let imageData = try? Data(contentsOf: fileURL) {
            return (mimeType, imageData.base64EncodedString())
        }

        guard mimeType == "application/pdf",
              let pdfDocument = PDFDocument(url: fileURL),
              let firstPage = pdfDocument.page(at: 0)
        else {
            return nil
        }

        let thumbnail = firstPage.thumbnail(of: CGSize(width: 1400, height: 1800), for: .mediaBox)
        guard let jpegData = thumbnail.jpegData(compressionQuality: 0.9) else {
            return nil
        }

        return ("image/jpeg", jpegData.base64EncodedString())
    }
}

private extension Data {
    mutating func appendMultipartField(named name: String, value: String, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8)!)
        append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
        append("\(value)\r\n".data(using: .utf8)!)
    }

    mutating func appendMultipartFile(named name: String, filename: String, mimeType: String, fileData: Data, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8)!)
        append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        append(fileData)
        append("\r\n".data(using: .utf8)!)
    }
}
