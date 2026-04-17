import Foundation

enum AppConfig {
    static let backendURLKey = "pkdcompass.backend.baseurl"
    static let currentUserEmailKey = "pkdcompass.user.email"

    static var defaultBackendURL: String {
        let fallback = "https://pkd-compass.netlify.app"
        UserDefaults.standard.set(fallback, forKey: backendURLKey)
        return fallback
    }

    static func setBackendURL(_ value: String) {
        UserDefaults.standard.set(value.trimmingCharacters(in: .whitespacesAndNewlines), forKey: backendURLKey)
    }

    static var currentUserEmail: String {
        UserDefaults.standard.string(forKey: currentUserEmailKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? ""
    }
}
