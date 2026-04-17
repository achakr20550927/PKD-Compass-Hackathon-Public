import Foundation
import Security

protocol KeychainServiceProtocol {
    func save(_ value: String, key: String)
    func read(key: String) -> String?
    func delete(key: String)
}

enum KeychainKeys {
    static let authToken = "pkdcompass.auth.token"

    static func authToken(for email: String) -> String {
        "pkdcompass.auth.token.\(email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())"
    }
}

final class KeychainService: KeychainServiceProtocol {
    func save(_ value: String, key: String) {
        let data = Data(value.utf8)
        delete(key: key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: data
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        return value
    }

    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
