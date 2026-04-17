import Foundation
import SwiftData

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var fullName = ""
    @Published var dob = Date()
    @Published var sexAtBirth: SexAtBirth = .male
    @Published var heightCm = ""
    @Published var weightKg = ""
    @Published var country = ""
    @Published var city = ""
    @Published var zipCode = ""
    @Published var phone = ""
    @Published var hasHypertension = false
    @Published var hasDiabetes = false

    @Published var isLoading = false
    @Published var isSaving = false
    @Published var message: String?

    func load(from context: ModelContext, email: String) {
        isLoading = true
        defer { isLoading = false }

        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let emailLocalPart = normalizedEmail.components(separatedBy: "@").first?.lowercased() ?? ""
        var descriptor = FetchDescriptor<UserProfile>()
        descriptor.predicate = #Predicate<UserProfile> { $0.email == normalizedEmail }
        let profile = try? context.fetch(descriptor).first

        guard let profile else {
            fullName = ""
            return
        }

        fullName = profile.fullName
        if fullName.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == emailLocalPart || fullName.contains("@") {
            fullName = ""
        }
        dob = profile.dob ?? Date()
        sexAtBirth = (profile.sexAtBirthRaw == SexAtBirth.female.rawValue) ? .female : .male
        heightCm = profile.heightCm.map { String($0) } ?? ""
        weightKg = profile.weightKg.map { String($0) } ?? ""
        country = profile.country ?? ""
        city = profile.city ?? ""
        zipCode = profile.zipCode ?? ""
        phone = profile.phone ?? ""
        hasHypertension = profile.hasHypertension
        hasDiabetes = profile.hasDiabetes

        Task { await syncFromServer(context: context) }
    }

    @discardableResult
    func save(to context: ModelContext, email: String) -> Bool {
        isSaving = true
        defer { isSaving = false }

        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        var descriptor = FetchDescriptor<UserProfile>()
        descriptor.predicate = #Predicate<UserProfile> { $0.email == normalizedEmail }
        let existing = try? context.fetch(descriptor).first

        let profile = existing ?? UserProfile(email: normalizedEmail)
        profile.email = normalizedEmail
        profile.fullName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        profile.dob = dob
        profile.sexAtBirthRaw = sexAtBirth.rawValue
        profile.heightCm = Double(heightCm)
        profile.weightKg = Double(weightKg)
        profile.country = country.isEmpty ? nil : country
        profile.city = city.isEmpty ? nil : city
        profile.zipCode = zipCode.isEmpty ? nil : zipCode
        profile.phone = phone.isEmpty ? nil : phone
        profile.hasHypertension = hasHypertension
        profile.hasDiabetes = hasDiabetes

        if existing == nil {
            context.insert(profile)
        }

        do {
            try context.save()
            message = "Profile saved"
            return true
        } catch {
            message = "Failed to save profile"
            return false
        }
    }

    func syncFromServer(context: ModelContext) async {
        do {
            guard !AppConfig.currentUserEmail.isEmpty else { return }
            guard let remote = try await MobileProfileService.fetch() else { return }

            // Update view model state
            if let first = remote.firstName, let last = remote.lastName {
                fullName = [first, last].filter { !$0.isEmpty }.joined(separator: " ")
            }
            if let dob = remote.dob { self.dob = dob }
            if (remote.sexAtBirth ?? "").uppercased() == SexAtBirth.female.rawValue { sexAtBirth = .female }
            if let h = remote.heightCm { heightCm = String(Int(h)) }
            if let w = remote.weightKg { weightKg = String(Int(w)) }
            phone = remote.phone ?? phone
            zipCode = remote.zipCode ?? zipCode
            hasHypertension = remote.hasHypertension ?? hasHypertension
            hasDiabetes = remote.hasDiabetes ?? hasDiabetes

            // Persist into local SwiftData cache
            let email = AppConfig.currentUserEmail
            var descriptor = FetchDescriptor<UserProfile>()
            descriptor.predicate = #Predicate<UserProfile> { $0.email == email }
            let existing = try? context.fetch(descriptor).first
            let profile = existing ?? UserProfile(email: email)
            profile.email = email
            profile.fullName = fullName
            profile.dob = self.dob
            profile.sexAtBirthRaw = sexAtBirth.rawValue
            profile.heightCm = Double(heightCm)
            profile.weightKg = Double(weightKg)
            profile.zipCode = zipCode.isEmpty ? nil : zipCode
            profile.phone = phone.isEmpty ? nil : phone
            profile.hasHypertension = hasHypertension
            profile.hasDiabetes = hasDiabetes
            if existing == nil { context.insert(profile) }
            try context.save()
            message = nil
        } catch {
            // ignore (offline)
        }
    }

    func syncToServer() async {
        do {
            guard !AppConfig.currentUserEmail.isEmpty else { return }
            let formatter = ISO8601DateFormatter()
            let patch: [String: Any] = [
                "firstName": fullName.split(separator: " ").first.map(String.init) ?? "",
                "lastName": fullName.split(separator: " ").dropFirst().joined(separator: " "),
                "dob": formatter.string(from: dob),
                "sexAtBirth": sexAtBirth.rawValue,
                "phone": phone,
                "zipCode": zipCode,
                "heightCm": Double(heightCm) as Any,
                "weightKg": Double(weightKg) as Any,
                "hasHypertension": hasHypertension,
                "hasDiabetes": hasDiabetes
            ]
            _ = try await MobileProfileService.update(patch: patch)
            message = "Profile saved"
        } catch {
            message = "Saved locally. Server sync failed."
        }
    }

    func saveAndSync(to context: ModelContext, email: String) async {
        let didSave = save(to: context, email: email)
        guard didSave else { return }
        await syncToServer()
    }
}
