import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    // Server-backed auth:
    // - Credentials are stored only on the server (hashed).
    // - This client stores only a session token in Keychain + lightweight profile display fields in UserDefaults.
    private struct RemoteAuthResponse: Codable {
        struct RemoteUser: Codable {
            let id: String
            let email: String
            let firstName: String?
            let lastName: String?
        }

        let sessionToken: String
        let user: RemoteUser
    }

    private struct RemoteMeResponse: Codable {
        struct Profile: Codable {
            let firstName: String?
            let lastName: String?
        }
        let id: String
        let email: String
        let consents: [String: Bool]?
        let profile: Profile?
    }

    enum SessionState {
        case loading
        case unauthenticated
        case authenticated
    }

    @Published private(set) var sessionState: SessionState = .loading
    @Published var currentEmail: String = ""
    @Published var needsProfileCompletion: Bool = true
    @Published var shouldShowPostAuthHero: Bool = false
    private var heroDismissedThisSession = false
    @Published var shouldForceProfileOnboarding: Bool = false
    @Published var consentSnapshot = ConsentStatusSnapshot()

    private let keychainService: KeychainServiceProtocol
    private let defaults: UserDefaults

    init(
        keychainService: KeychainServiceProtocol = KeychainService(),
        defaults: UserDefaults = .standard
    ) {
        self.keychainService = keychainService
        self.defaults = defaults
    }

    private var baseURL: URL {
        URL(string: AppConfig.defaultBackendURL) ?? URL(string: "http://localhost:3000")!
    }

    func restoreSession() async {
        let savedEmail = normalized(defaults.string(forKey: DefaultsKeys.userEmail) ?? "")
        // One-time cleanup: remove legacy local account store (it contained password hashes in UserDefaults).
        defaults.removeObject(forKey: DefaultsKeys.accountsStore)

        var token = savedEmail.isEmpty ? nil : keychainService.read(key: KeychainKeys.authToken(for: savedEmail))
        if token == nil, !savedEmail.isEmpty, let legacy = keychainService.read(key: KeychainKeys.authToken), !legacy.isEmpty {
            keychainService.save(legacy, key: KeychainKeys.authToken(for: savedEmail))
            keychainService.delete(key: KeychainKeys.authToken)
            token = legacy
        }
        currentEmail = savedEmail
        needsProfileCompletion = !defaults.bool(forKey: DefaultsKeys.profileCompleted(for: savedEmail))

        guard token?.isEmpty == false && !savedEmail.isEmpty else {
            if !savedEmail.isEmpty {
                keychainService.delete(key: KeychainKeys.authToken(for: savedEmail))
            }
            keychainService.delete(key: KeychainKeys.authToken)
            sessionState = .unauthenticated
            return
        }

        do {
            let me = try await fetchMe(sessionToken: token!)
            cacheName(firstName: me.profile?.firstName, lastName: me.profile?.lastName, email: me.email)
            consentSnapshot = ConsentStatusSnapshot(values: me.consents ?? [:])
            if let _ = try? await MobileProfileService.fetch() {
                defaults.set(true, forKey: DefaultsKeys.profileCompleted(for: savedEmail))
                needsProfileCompletion = false
            }
            shouldForceProfileOnboarding = false
            // Only show on app open if it hasn't been dismissed this session.
            if !heroDismissedThisSession {
                shouldShowPostAuthHero = true
            } else {
                shouldShowPostAuthHero = false
            }
            sessionState = .authenticated
        } catch {
            // If the server is unreachable, keep the user signed in locally and re-validate later.
            // If the token is actually invalid, we must sign out.
            if (error as? AuthError) == .invalidCredentials {
                keychainService.delete(key: KeychainKeys.authToken(for: savedEmail))
                defaults.removeObject(forKey: DefaultsKeys.userEmail)
                sessionState = .unauthenticated
            } else {
                shouldShowPostAuthHero = false
                sessionState = .authenticated
            }
        }
    }

    func login(email: String, password: String) async throws {
        let normalizedEmail = normalized(email)
        guard normalizedEmail.count <= 254 else { throw AuthError.invalidEmail }
        guard Validators.isValidEmail(normalizedEmail) else { throw AuthError.invalidEmail }
        guard !password.isEmpty else { throw AuthError.invalidCredentials }

        let res: RemoteAuthResponse = try await post(
            path: "/api/mobile/auth/login",
            body: [
                "email": normalizedEmail,
                "password": password
            ]
        )

        keychainService.save(res.sessionToken, key: KeychainKeys.authToken(for: normalizedEmail))
        keychainService.delete(key: KeychainKeys.authToken)
        defaults.set(normalizedEmail, forKey: DefaultsKeys.userEmail)
        defaults.set(Date(), forKey: DefaultsKeys.lastActivityAt)

        currentEmail = normalizedEmail
        cacheName(firstName: res.user.firstName, lastName: res.user.lastName, email: normalizedEmail)
        needsProfileCompletion = !defaults.bool(forKey: DefaultsKeys.profileCompleted(for: normalizedEmail))
        if let latestConsents = try? await MobileConsentService.fetch() {
            consentSnapshot = latestConsents
        } else {
            consentSnapshot = ConsentStatusSnapshot()
        }
        shouldForceProfileOnboarding = false
        heroDismissedThisSession = false
        shouldShowPostAuthHero = true
        sessionState = .authenticated
    }

    func signup(
        firstName: String,
        lastName: String,
        sexAtBirth: SexAtBirth,
        email: String,
        password: String,
        confirmPassword: String
    ) async throws {
        let normalizedEmail = normalized(email)
        let cleanFirst = firstName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanLast = lastName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard normalizedEmail.count <= 254 else { throw AuthError.invalidEmail }
        guard Validators.isValidName(cleanFirst) else { throw AuthError.invalidFirstName }
        guard Validators.isValidName(cleanLast) else { throw AuthError.invalidLastName }
        guard Validators.isValidEmail(normalizedEmail) else { throw AuthError.invalidEmail }
        guard Validators.isValidPassword(password) else { throw AuthError.weakPassword }
        guard password == confirmPassword else { throw AuthError.passwordMismatch }

        let res: RemoteAuthResponse = try await post(
            path: "/api/mobile/auth/signup",
            body: [
                "firstName": cleanFirst,
                "lastName": cleanLast,
                "sexAtBirth": sexAtBirth.rawValue,
                "email": normalizedEmail,
                "password": password
            ]
        )

        keychainService.save(res.sessionToken, key: KeychainKeys.authToken(for: normalizedEmail))
        keychainService.delete(key: KeychainKeys.authToken)
        defaults.set(normalizedEmail, forKey: DefaultsKeys.userEmail)
        defaults.set(Date(), forKey: DefaultsKeys.lastActivityAt)

        currentEmail = normalizedEmail
        cacheName(firstName: res.user.firstName, lastName: res.user.lastName, email: normalizedEmail)
        needsProfileCompletion = true
        shouldForceProfileOnboarding = true
        if let latestConsents = try? await MobileConsentService.fetch() {
            consentSnapshot = latestConsents
        } else {
            consentSnapshot = ConsentStatusSnapshot()
        }
        heroDismissedThisSession = false
        shouldShowPostAuthHero = true
        sessionState = .authenticated
    }

    func markProfileCompleted() {
        let email = normalized(currentEmail)
        guard !email.isEmpty else { return }
        defaults.set(true, forKey: DefaultsKeys.profileCompleted(for: email))
        needsProfileCompletion = false
        shouldForceProfileOnboarding = false
    }

    // Secure reset: request an email with a reset link.
    // Response is intentionally generic to avoid account enumeration.
    func requestPasswordReset(email: String) async throws {
        let normalizedEmail = normalized(email)
        guard Validators.isValidEmail(normalizedEmail) else { throw AuthError.invalidEmail }
        _ = try await post(
            path: "/api/mobile/password-reset/request",
            body: ["email": normalizedEmail] as [String: String]
        ) as EmptyResponse
    }

    func logout() {
        let email = normalized(currentEmail)
        if !email.isEmpty {
            keychainService.delete(key: KeychainKeys.authToken(for: email))
            defaults.removeObject(forKey: DefaultsKeys.firstName(for: email))
            defaults.removeObject(forKey: DefaultsKeys.lastName(for: email))
            defaults.removeObject(forKey: DefaultsKeys.profileCompleted(for: email))
        }
        keychainService.delete(key: KeychainKeys.authToken)
        defaults.removeObject(forKey: DefaultsKeys.userEmail)
        defaults.removeObject(forKey: DefaultsKeys.lastActivityAt)

        currentEmail = ""
        needsProfileCompletion = true
        shouldShowPostAuthHero = false
        shouldForceProfileOnboarding = false
        consentSnapshot = ConsentStatusSnapshot()
        sessionState = .unauthenticated
    }

    func deleteAccount() async throws {
        let email = normalized(currentEmail)
        guard !email.isEmpty else { throw AuthError.invalidCredentials }

        let api = MobileAuthedAPI()
        try await api.requestVoid(path: "/api/mobile/auth/delete-account", method: "DELETE", body: nil)

        keychainService.delete(key: KeychainKeys.authToken(for: email))
        keychainService.delete(key: KeychainKeys.authToken)
        defaults.removeObject(forKey: DefaultsKeys.firstName(for: email))
        defaults.removeObject(forKey: DefaultsKeys.lastName(for: email))
        defaults.removeObject(forKey: DefaultsKeys.profileCompleted(for: email))
        defaults.removeObject(forKey: DefaultsKeys.userEmail)
        defaults.removeObject(forKey: DefaultsKeys.lastActivityAt)

        currentEmail = ""
        needsProfileCompletion = true
        shouldShowPostAuthHero = false
        shouldForceProfileOnboarding = false
        consentSnapshot = ConsentStatusSnapshot()
        sessionState = .unauthenticated
    }

    var requiresCoreConsents: Bool {
        !consentSnapshot.isGranted(.termsOfUse) ||
        !consentSnapshot.isGranted(.privacyPolicy) ||
        !consentSnapshot.isGranted(.cloudHealthStorage)
    }

    func hasConsent(_ type: ConsentType) -> Bool {
        consentSnapshot.isGranted(type)
    }

    func refreshConsents() async {
        do {
            consentSnapshot = try await MobileConsentService.fetch()
        } catch {
            // keep cached state if offline
        }
    }

    func updateConsents(_ entries: [(ConsentType, Bool)]) async throws {
        consentSnapshot = try await MobileConsentService.update(entries)
    }

    func touchSessionActivity() {
        guard sessionState == .authenticated else { return }
        defaults.set(Date(), forKey: DefaultsKeys.lastActivityAt)
    }

    func dismissPostAuthHero() {
        heroDismissedThisSession = true
        shouldShowPostAuthHero = false
    }

    // User requirement: show the hero screen every time the app is opened/activated.
    func showHeroOnAppOpenIfAuthenticated() {
        guard sessionState == .authenticated, needsProfileCompletion == false else { return }
        guard !heroDismissedThisSession else { return }
        shouldShowPostAuthHero = true
    }

    var currentUserFirstName: String {
        let email = normalized(currentEmail)
        let value = defaults.string(forKey: DefaultsKeys.firstName(for: email))?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return sanitizedDisplayNameComponent(value)
    }

    var currentUserLastName: String {
        let email = normalized(currentEmail)
        let value = defaults.string(forKey: DefaultsKeys.lastName(for: email))?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return sanitizedDisplayNameComponent(value)
    }

    func cacheCurrentUserNameFromProfile(fullName: String) {
        let email = normalized(currentEmail)
        guard !email.isEmpty else { return }
        let pieces = fullName
            .split(separator: " ")
            .map(String.init)
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard let first = pieces.first else { return }
        let last = pieces.dropFirst().joined(separator: " ")
        defaults.set(first, forKey: DefaultsKeys.firstName(for: email))
        if last.isEmpty {
            defaults.removeObject(forKey: DefaultsKeys.lastName(for: email))
        } else {
            defaults.set(last, forKey: DefaultsKeys.lastName(for: email))
        }
    }

    private func cacheName(firstName: String?, lastName: String?, email: String) {
        let cleanEmail = normalized(email)
        if let firstName {
            let cleanFirst = sanitizedDisplayNameComponent(firstName)
            if !cleanFirst.isEmpty {
                defaults.set(cleanFirst, forKey: DefaultsKeys.firstName(for: cleanEmail))
            }
        }
        if let lastName {
            let cleanLast = sanitizedDisplayNameComponent(lastName)
            if !cleanLast.isEmpty {
                defaults.set(cleanLast, forKey: DefaultsKeys.lastName(for: cleanEmail))
            }
        }
    }

    private func sanitizedDisplayNameComponent(_ value: String) -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }
        guard !trimmed.contains("@") else { return "" }
        return trimmed
    }

    private func normalized(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private struct EmptyResponse: Codable {}

    private func post<T: Decodable, Body: Encodable>(path: String, body: Body) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw AuthError.networkError }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 30
        req.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw AuthError.networkError }
        if (200...299).contains(http.statusCode) {
            return try JSONDecoder().decode(T.self, from: data)
        }
        if let msg = try? JSONDecoder().decode([String: String].self, from: data)["error"] {
            let lower = msg.lowercased()
            if lower.contains("exists") || lower.contains("already") {
                throw AuthError.emailAlreadyInUse
            }
            if lower.contains("weak") || lower.contains("password") {
                throw AuthError.weakPassword
            }
            if lower.contains("invalid email") {
                throw AuthError.invalidEmail
            }
            // Fall back to the server message for clarity.
            throw AuthError.serverMessage(msg)
        }
        if http.statusCode == 401 {
            throw AuthError.invalidCredentials
        }
        throw AuthError.networkError
    }

    private func fetchMe(sessionToken: String) async throws -> RemoteMeResponse {
        guard let url = URL(string: "/api/mobile/auth/me", relativeTo: baseURL) else { throw AuthError.networkError }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        req.timeoutInterval = 30
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw AuthError.networkError }
        if http.statusCode == 401 { throw AuthError.invalidCredentials }
        guard (200...299).contains(http.statusCode) else { throw AuthError.networkError }
        return try JSONDecoder().decode(RemoteMeResponse.self, from: data)
    }

}

enum DefaultsKeys {
    static let userEmail = "pkdcompass.user.email"
    static let accountsStore = "pkdcompass.accounts.store.v1"
    static let lastActivityAt = "pkdcompass.session.lastActivityAt"

    static func firstName(for email: String) -> String { "pkdcompass.user.firstname.\(email)" }
    static func lastName(for email: String) -> String { "pkdcompass.user.lastname.\(email)" }
    static func profileCompleted(for email: String) -> String { "pkdcompass.profile.completed.\(email)" }
}

enum AuthError: LocalizedError, Equatable {
    case invalidEmail
    case invalidFirstName
    case invalidLastName
    case weakPassword
    case passwordMismatch
    case invalidCredentials
    case emailAlreadyInUse
    case serverMessage(String)
    case networkError

    var errorDescription: String? {
        switch self {
        case .invalidEmail: return "Enter a valid email address."
        case .invalidFirstName: return "Enter a valid first name."
        case .invalidLastName: return "Enter a valid last name."
        case .weakPassword: return "Password must include upper, lower, number, symbol and be 8+ characters."
        case .passwordMismatch: return "Passwords do not match."
        case .invalidCredentials: return "Invalid credentials."
        case .emailAlreadyInUse: return "Email already in use."
        case .serverMessage(let msg): return msg
        case .networkError: return "Network error. Check your server URL and try again."
        }
    }
}
