import SwiftUI
import SwiftData

struct AppSettingsView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @EnvironmentObject private var router: AppRouter
    @Environment(\.modelContext) private var modelContext
    @AppStorage("pkd.settings.notifications.enabled") private var notificationsEnabled = true
    @Environment(\.dismiss) private var dismiss
    private let notificationService: NotificationScheduling = NotificationService()
    private let reminderSyncService = ReminderSyncService()
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var message: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 34, height: 34)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)

                Text("Settings")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
            }
            .pkdGlassHeader()

            ScrollView(showsIndicators: false) {
                HStack {
                    Spacer()
                    VStack(spacing: 14) {
                        preferenceCard
                        consentCard
                        termsCard
                        Button(role: .destructive) {
                            authViewModel.logout()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Sign Out")
                            }
                        }
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.danger)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(Color(hex: "#FEE2E2"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "trash")
                                Text(isDeleting ? "Deleting..." : "Delete Account")
                            }
                        }
                        .disabled(isDeleting)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.danger)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(Color(hex: "#FEE2E2"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                        if let message {
                            Text(message)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .frame(maxWidth: 440)
                    Spacer()
                }
                .padding()
                .padding(.bottom, 18)
            }
        }
        .pkdPageBackground()
        .toolbar(.hidden, for: .navigationBar)
        .alert("Delete Account?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await deleteAccount() }
            }
        } message: {
            Text("Are you sure you want to delete your account? This removes your account data from active systems and clears locally cached data from this device. Backup copies may persist temporarily until normal retention windows expire.")
        }
    }

    private var preferenceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            PKDSectionLabel(text: "Preferences")
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(PKDPalette.primary.opacity(0.1))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Image(systemName: "bell.badge")
                            .foregroundStyle(PKDPalette.primary)
                    }

                Text("Notifications")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)

                Spacer()

                Toggle("", isOn: $notificationsEnabled)
                    .labelsHidden()
                    .tint(PKDPalette.primary)
                    .onChange(of: notificationsEnabled) { _, newValue in
                        Task {
                            if !newValue {
                                notificationService.clearPendingRequests()
                                try? await authViewModel.updateConsents([(.notifications, false)])
                                message = "Notifications are off."
                            } else {
                                let granted = await notificationService.requestPermission()
                                if !granted {
                                    notificationsEnabled = false
                                    message = "Enable notifications in iPhone Settings to receive reminders."
                                } else {
                                    try? await authViewModel.updateConsents([(.notifications, true)])
                                    await reminderSyncService.resyncAllReminders(
                                        context: modelContext,
                                        ownerEmail: authViewModel.currentEmail
                                    )
                                    message = "Notifications are enabled. Reminders will keep firing even when the app is closed."
                                }
                            }
                        }
                    }
            }
            .padding(12)
            .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .pkdCard()
    }

    private var consentCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            PKDSectionLabel(text: "Data & Analysis")

            consentRow(
                icon: "heart.text.square",
                title: "Blood Pressure Tracking",
                subtitle: authViewModel.hasConsent(.bloodPressure) ? "Accepted for this account" : "Blocked until accepted"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.bloodPressure) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.bloodPressure, newValue)])
                                message = newValue ? "Blood pressure tracking terms accepted." : "Blood pressure tracking is now blocked."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }

            consentRow(
                icon: "flask",
                title: "Labs & Symptoms",
                subtitle: authViewModel.hasConsent(.labsAndSymptoms) ? "Accepted for this account" : "Blocked until accepted"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.labsAndSymptoms) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.labsAndSymptoms, newValue)])
                                message = newValue ? "Labs and symptom tracking terms accepted." : "Labs and symptom tracking is now blocked."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }

            consentRow(
                icon: "pills",
                title: "Medications & Reminders",
                subtitle: authViewModel.hasConsent(.medications) ? "Accepted for this account" : "Blocked until accepted"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.medications) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.medications, newValue)])
                                message = newValue ? "Medication terms accepted." : "Medication features are now blocked."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }

            consentRow(
                icon: "calendar.badge.clock",
                title: "Care Organizer",
                subtitle: authViewModel.hasConsent(.careOrganizer) ? "Accepted for this account" : "Blocked until accepted"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.careOrganizer) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.careOrganizer, newValue)])
                                message = newValue ? "Care organizer terms accepted." : "Care organizer features are now blocked."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }

            consentRow(
                icon: "lock.doc",
                title: "Vault Uploads",
                subtitle: authViewModel.hasConsent(.documentUpload) ? "Allowed for this account" : "Not enabled"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.documentUpload) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.documentUpload, newValue)])
                                message = newValue ? "Document vault access enabled." : "Document uploads are now disabled."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }

            consentRow(
                icon: "sparkles.rectangle.stack",
                title: "AI Document Analysis",
                subtitle: authViewModel.hasConsent(.documentAIAnalysis) ? "Optional summaries enabled" : "Disabled"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.documentAIAnalysis) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.documentAIAnalysis, newValue)])
                                message = newValue
                                    ? "AI document analysis enabled for future uploads."
                                    : "AI document analysis disabled for future uploads."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }

            consentRow(
                icon: "square.and.arrow.up.on.square",
                title: "Reports & Exports",
                subtitle: authViewModel.hasConsent(.reportExports) ? "Sharing/export enabled" : "Blocked until accepted"
            ) {
                Toggle(
                    "",
                    isOn: Binding(
                        get: { authViewModel.hasConsent(.reportExports) },
                        set: { newValue in
                            Task {
                                try? await authViewModel.updateConsents([(.reportExports, newValue)])
                                message = newValue
                                    ? "Report and export terms accepted."
                                    : "Report generation and sharing are now blocked."
                            }
                        }
                    )
                )
                .labelsHidden()
                .tint(PKDPalette.primary)
            }
        }
        .pkdCard()
    }

    private var termsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            PKDSectionLabel(text: "Info & Terms")
            row(icon: "calendar", title: "Date Joined", value: "February 26, 2026")
            NavigationLink {
                LegalDocumentView(kind: .terms)
            } label: {
                row(icon: "doc.text", title: "Terms of Use", value: nil)
            }
            .buttonStyle(.plain)

            NavigationLink {
                LegalDocumentView(kind: .privacy)
            } label: {
                row(icon: "shield", title: "Privacy Policy", value: nil)
            }
            .buttonStyle(.plain)
        }
        .pkdCard()
    }

    private func row(icon: String, title: String, value: String?) -> some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(hex: "#F1F5F9"))
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: icon)
                        .foregroundStyle(PKDPalette.textMuted)
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                if let value {
                    Text(value)
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
            }
            Spacer()
            if value == nil {
                Image(systemName: "chevron.right")
                    .foregroundStyle(PKDPalette.textMuted.opacity(0.7))
            }
        }
    }

    private func consentRow<Accessory: View>(
        icon: String,
        title: String,
        subtitle: String,
        @ViewBuilder accessory: () -> Accessory
    ) -> some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(hex: "#F1F5F9"))
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: icon)
                        .foregroundStyle(PKDPalette.textMuted)
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text(subtitle)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }
            Spacer()
            accessory()
        }
    }

    private func deleteAccount() async {
        isDeleting = true
        defer { isDeleting = false }
        let email = authViewModel.currentEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        do {
            try await authViewModel.deleteAccount()
            purgeLocalData(email: email)
            message = "Account deleted."
        } catch {
            if case let MobileAPIError.requestFailed(status, serverMessage) = error {
                if status == 404 {
                    message = "Delete failed (404). The deployed backend is missing this route. Redeploy Netlify from the latest code."
                } else {
                    message = serverMessage ?? "Delete failed (\(status))."
                }
            } else if let localized = (error as? LocalizedError)?.errorDescription, !localized.isEmpty {
                message = localized
            } else {
                message = "Failed to delete account. Please try again."
            }
        }
    }

    private func purgeLocalData(email: String) {
        guard !email.isEmpty else { return }

        do {
            var p = FetchDescriptor<UserProfile>()
            p.predicate = #Predicate<UserProfile> { $0.email == email }
            try modelContext.fetch(p).forEach { modelContext.delete($0) }

            var labs = FetchDescriptor<LabResult>()
            labs.predicate = #Predicate<LabResult> { $0.ownerEmail == email }
            try modelContext.fetch(labs).forEach { modelContext.delete($0) }

            var bp = FetchDescriptor<BloodPressureReading>()
            bp.predicate = #Predicate<BloodPressureReading> { $0.ownerEmail == email }
            try modelContext.fetch(bp).forEach { modelContext.delete($0) }

            var symptoms = FetchDescriptor<SymptomEntry>()
            symptoms.predicate = #Predicate<SymptomEntry> { $0.ownerEmail == email }
            try modelContext.fetch(symptoms).forEach { modelContext.delete($0) }

            var meds = FetchDescriptor<MedicationItem>()
            meds.predicate = #Predicate<MedicationItem> { $0.ownerEmail == email }
            try modelContext.fetch(meds).forEach { modelContext.delete($0) }

            var medLogs = FetchDescriptor<MedicationLog>()
            medLogs.predicate = #Predicate<MedicationLog> { $0.ownerEmail == email }
            try modelContext.fetch(medLogs).forEach { modelContext.delete($0) }

            var food = FetchDescriptor<FoodLogEntry>()
            food.predicate = #Predicate<FoodLogEntry> { $0.ownerEmail == email }
            try modelContext.fetch(food).forEach { modelContext.delete($0) }

            var docs = FetchDescriptor<DocumentRecord>()
            docs.predicate = #Predicate<DocumentRecord> { $0.ownerEmail == email }
            try modelContext.fetch(docs).forEach { modelContext.delete($0) }

            var appts = FetchDescriptor<AppointmentItem>()
            appts.predicate = #Predicate<AppointmentItem> { $0.ownerEmail == email }
            try modelContext.fetch(appts).forEach { modelContext.delete($0) }

            var tasks = FetchDescriptor<CareTaskItem>()
            tasks.predicate = #Predicate<CareTaskItem> { $0.ownerEmail == email }
            try modelContext.fetch(tasks).forEach { modelContext.delete($0) }

            try modelContext.save()
        } catch {
            // Best-effort local cleanup.
        }
    }
}

private struct LegalDocumentView: View {
    enum DocumentKind {
        case terms
        case privacy

        var title: String {
            switch self {
            case .terms: return "Terms of Use"
            case .privacy: return "Privacy Policy"
            }
        }

        var sections: [(String, String)] {
            switch self {
            case .terms:
                return [
                    ("Medical Disclaimer", "This app is for informational purposes only and does not provide medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified healthcare provider."),
                    ("Consumer App Position", "PKD Compass is a consumer health application for self-tracking and record organization. It is not a hospital portal, electronic medical record, or substitute for licensed clinical care."),
                    ("How to Use Safely", "Use reminders, tracking, and reports as support tools. Verify all lab values and medication instructions against your official medical records before acting."),
                    ("Data Collected & Allowed Use", "By accepting these terms, you authorize PKD Compass to collect, transmit, store, organize, and display the information you choose to enter or upload, including your name, email address, profile details, birth date, sex at birth, height, weight, country, city, postal code, health conditions, blood pressure readings, pulse values, laboratory values, symptom logs, medication names, dosage and schedule details, appointment and task information, nutrition entries, uploaded documents, and any optional report or export content. This data is used to provide your account, save your records between sessions, generate charts and reminders, create summaries, produce reports and exports, support optional document handling features, and restore your information when you sign back in."),
                    ("Storage & Transmission", "When you use PKD Compass, information you enter or upload may be transmitted from your device to backend services so your account data can be stored, synchronized, processed for app features, and made available when you sign in again. That includes health-tracking entries, reports, exports, and documents you intentionally upload."),
                    ("Blood Pressure Feature Terms", "Blood pressure readings, pulse values, weekly average cards, trend displays, report exports, notification reminders, and any interpretation support are convenience features only. Readings may be entered incorrectly, sync late, use stale device time, reflect wrong units, or display incomplete averages. Notifications may be delayed, duplicated, suppressed by iPhone settings, or never arrive. PKD Compass is not liable for treatment changes, emergency decisions, missed high readings, or harms caused by relying on blood pressure cards, exports, or reminder timing instead of direct clinical guidance."),
                    ("Labs, Medications, and Care Features", "Lab tracking, symptom logging, medication reminders, blood pressure logs, report generation, exports, and care-planning features are convenience tools only. They may contain user-input errors, incomplete records, delayed synchronizations, calculation errors, missed reminders, time-zone mistakes, stale provider data, incorrect unit handling, incorrect AI summaries, export-delivery failures, or incomplete educational content. You must independently verify prescriptions, lab values, appointment times, provider details, exported reports, and any related actions with your official records and clinicians."),
                    ("Document Upload & Analysis", "If you choose to upload lab or medical documents, files are transmitted from your device to backend services for storage. If you separately opt into analysis, extracted content may be processed by an external AI provider to generate an informational summary. Uploads may fail, extracted text may be incomplete, and summaries may be inaccurate, delayed, or misleading. You agree not to rely on uploads or summaries as your sole basis for treatment, diagnosis, emergency action, or medication changes."),
                    ("No Clinical Reliance", "You agree not to rely on PKD Compass as your sole basis for treatment decisions, medication dosing, emergency actions, diagnostic interpretation, or appointment timing. You remain responsible for checking all medical instructions, prescriptions, and results against your clinician and official medical records."),
                    ("Limitation of Liability", "To the fullest extent permitted by applicable law, PKD Compass and its operators disclaim liability for losses, injuries, treatment delays, missed reminders, incorrect summaries, data-entry mistakes, synchronization failures, provider-directory inaccuracies, export or sharing mistakes, appointment or medication timing errors, travel losses, device-notification failures, privacy incidents caused by user sharing decisions, or decisions made using app content. By using the app, you accept these risks as part of a consumer self-management tool."),
                    ("Dispute & Claims Limitation", "By continuing to use PKD Compass, you agree that you will not assert claims or sue PKD Compass or its operators based solely on informational summaries, reminder timing, planner content, blood pressure trends, report or export content, food estimates, provider listings, uploaded document handling, OCR extraction, AI summaries, lab interpretation support, or other non-clinical support features, except where such limitation is prohibited by law. This means you accept responsibility for verifying critical information before acting on it. If you do not agree, do not use those features."),
                    ("Sensitive Features", "Document storage and AI document summaries are optional features. AI analysis is only used when you explicitly enable it for a document and accept the related consent."),
                    ("Security Responsibilities", "Use a device passcode or biometric lock, protect your password, and only export or share health information through destinations you trust. PKD Compass uses authentication and consent controls, but no consumer service can guarantee absolute security."),
                    ("Deletion Controls", "You can delete your account from Settings. Where supported by the configured backend, deletion removes account-linked records from backend services and clears locally cached data from this device."),
                    ("Emergency Use", "Do not rely on this app for emergencies. If you believe you are in immediate danger, call local emergency services immediately."),
                    ("Account Responsibility", "You are responsible for keeping your device passcode-protected and for controlling who can access your logged-in session."),
                    ("Data Accuracy", "Nutrition, provider, and educational data may be incomplete or out of date. Confirm critical details directly with healthcare professionals.")
                ]
            case .privacy:
                return [
                    ("Data Collected", "Your account may store profile data, account identifiers, labs, blood pressure readings, pulse values, symptoms, medications, dosage schedules, appointments, tasks, nutrition entries, exports, and documents that you choose to upload."),
                    ("Consumer App Position", "PKD Compass is a consumer-directed health app. It is designed to help you manage your own information and is not offered as a hospital chart or substitute for professional care."),
                    ("How Data Is Used", "Your data is used to provide account access, secure sign-in, personalized tracking, graphs, reminders, summaries, secure account functionality, report generation, exports, and optional document vault and document analysis features that you explicitly enable."),
                    ("Storage, Sync, and Transmission", "Health-tracking data and uploaded documents may be transmitted from your device to backend services so they can be stored, synchronized, and made available when you sign in again."),
                    ("AI Analysis Consent", "If you opt into AI document analysis, the document is sent from PKD Compass servers to an external AI service to generate a consumer-facing informational summary. Declining this consent leaves document storage available but disables AI analysis."),
                    ("Security Controls", "Sessions use token-based authentication, sensitive features are consent-gated, and authenticated routes are intended to isolate account data to the signed-in user. You should still protect your device, keep your password private, and share exports carefully."),
                    ("Feature-Specific Consents", "Blood pressure tracking, labs, symptoms, medications, care organizer workflows, document uploads, AI document analysis, report/export workflows, and notifications can each require explicit consent in the app. If you decline a feature consent, that feature is blocked until you accept it."),
                    ("Sharing", "Your data is private to your account unless you explicitly use sharing functionality. Caregiver or shared links should be used carefully."),
                    ("Delete Account", "When you delete your account, live account records and stored vault files are removed from active systems and local cached profile/session data is cleared from this device. Backup copies may persist temporarily until normal retention windows expire."),
                    ("Medical Disclaimer", "This app is for informational purposes only and does not provide medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified healthcare provider."),
                    ("Contact", "If you suspect unauthorized access, change your password immediately and contact support.")
                ]
            }
        }
    }

    @Environment(\.dismiss) private var dismiss
    let kind: DocumentKind

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 34, height: 34)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)

                Text(kind.title)
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
            }
            .pkdGlassHeader()

            ScrollView(showsIndicators: false) {
                HStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(Array(kind.sections.enumerated()), id: \.offset) { _, section in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(section.0)
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text(section.1)
                                    .font(.system(size: 14, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .pkdCard()
                        }
                    }
                    .frame(maxWidth: 560)
                    Spacer()
                }
                .padding()
                .padding(.bottom, 16)
            }
        }
        .pkdPageBackground()
        .toolbar(.hidden, for: .navigationBar)
    }
}
