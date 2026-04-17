import Foundation

protocol APIClientProtocol {
    func request<T: Decodable>(_ endpoint: Endpoint, as type: T.Type) async throws -> T
}

struct APIClient: APIClientProtocol {
    let baseURL: URL

    init(baseURL: URL = URL(string: AppConfig.defaultBackendURL)!) {
        self.baseURL = baseURL
    }

    func request<T: Decodable>(_ endpoint: Endpoint, as type: T.Type) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(endpoint.path))
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = 30

        if let body = endpoint.body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw APIError.requestFailed
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

struct Endpoint {
    let path: String
    let method: HTTPMethod
    let body: Data?
}

enum APIError: Error {
    case requestFailed
}
