import Foundation

enum MobileAPIError: Error {
    case notAuthenticated
    case invalidURL
    case requestFailed(Int, String?)
    case decodeFailed
}

private struct MobileAPIErrorEnvelope: Decodable {
    let error: String?
}

struct MobileAuthedAPI {
    var backendBaseURL: String = AppConfig.defaultBackendURL
    var keychain: KeychainServiceProtocol = KeychainService()

    private var sessionToken: String? {
        let email = AppConfig.currentUserEmail
        if !email.isEmpty, let token = keychain.read(key: KeychainKeys.authToken(for: email)), !token.isEmpty {
            return token
        }
        return keychain.read(key: KeychainKeys.authToken)
    }

    func request<T: Decodable>(
        path: String,
        method: String = "GET",
        body: Data? = nil
    ) async throws -> T {
        guard let base = URL(string: backendBaseURL) else { throw MobileAPIError.invalidURL }
        guard let url = URL(string: path, relativeTo: base) else { throw MobileAPIError.invalidURL }
        guard let token = sessionToken, !token.isEmpty else { throw MobileAPIError.notAuthenticated }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.timeoutInterval = 30
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let uppercasedMethod = method.uppercased()
        let requiresJSONHeaders = ["POST", "PUT", "PATCH", "DELETE"].contains(uppercasedMethod)
        if requiresJSONHeaders {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let body {
            req.httpBody = body
        } else if requiresJSONHeaders {
            req.httpBody = Data("{}".utf8)
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(status) else {
            let message = (try? JSONDecoder().decode(MobileAPIErrorEnvelope.self, from: data))?.error
            throw MobileAPIError.requestFailed(status, message)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw MobileAPIError.decodeFailed
        }
    }

    func requestVoid(
        path: String,
        method: String = "POST",
        body: Data? = nil
    ) async throws {
        struct VoidResponse: Decodable { let success: Bool? }
        _ = try await request(path: path, method: method, body: body) as VoidResponse
    }
}
