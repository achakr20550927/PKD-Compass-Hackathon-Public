import SwiftUI
import SwiftData
import UserNotifications

@main
struct PKDCompassNativeApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    init() {
        // Ensure notifications are shown even when the app is in the foreground.
        UNUserNotificationCenter.current().delegate = ForegroundNotificationDelegate.shared
    }

    var body: some Scene {
        WindowGroup {
            RootAppView()
                .environmentObject(authViewModel)
                .modelContainer(PersistenceController.shared.container)
        }
    }
}

final class ForegroundNotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = ForegroundNotificationDelegate()

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge, .list]
    }
}

struct RootAppView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.modelContext) private var modelContext
    @Environment(\.scenePhase) private var scenePhase
    private let notificationService: NotificationScheduling = NotificationService()
    private let reminderSyncService = ReminderSyncService()

    var body: some View {
        Group {
            switch authViewModel.sessionState {
            case .loading:
                ProgressView("Loading...")
            case .unauthenticated:
                AuthStackView()
            case .authenticated:
                if authViewModel.requiresCoreConsents {
                    ConsumerConsentGateView()
                } else if authViewModel.shouldForceProfileOnboarding {
                    NavigationStack {
                        ProfileSetupView(isRequiredOnboarding: true)
                    }
                } else if authViewModel.shouldShowPostAuthHero {
                    PostAuthHeroView {
                        authViewModel.dismissPostAuthHero()
                    }
                } else {
                    RootTabView()
                }
            }
        }
        .task {
            await authViewModel.restoreSession()
            await authViewModel.refreshConsents()
            let granted = await notificationService.ensurePermissionIfNeeded()
            if granted, authViewModel.sessionState == .authenticated {
                await reminderSyncService.resyncAllReminders(
                    context: modelContext,
                    ownerEmail: authViewModel.currentEmail
                )
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                authViewModel.touchSessionActivity()
                Task { await authViewModel.refreshConsents() }
                authViewModel.showHeroOnAppOpenIfAuthenticated()
                Task {
                    let granted = await notificationService.ensurePermissionIfNeeded()
                    if granted, authViewModel.sessionState == .authenticated {
                        await reminderSyncService.resyncAllReminders(
                            context: modelContext,
                            ownerEmail: authViewModel.currentEmail
                        )
                    }
                }
            }
        }
    }
}

private struct ConsumerConsentGateView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [PKDPalette.backgroundLight, Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Privacy & Data Use")
                            .font(.system(size: 30, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("Before you use PKD Compass, review how your data is stored and how privacy-sensitive features work.")
                            .font(.system(size: 15, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }

                    consentCard(
                        title: "Terms of Use",
                        body: "You are using PKD Compass as a consumer health app. By continuing, you agree that PKD Compass may collect and use the information you choose to enter or upload to provide account access, tracking, reminders, reports, exports, and optional support features. PKD Compass does not diagnose, prescribe, or replace clinical care."
                    )

                    consentCard(
                        title: "Privacy Policy",
                        body: "Your account data, profile details, blood pressure readings, laboratory values, symptoms, medications, nutrition entries, care-planning items, and any documents you choose to upload may be transmitted to backend services for storage, synchronization, reminders, summaries, and restoration when you sign in again. Only enter or upload information if you want PKD Compass to process it for those purposes."
                    )

                    consentCard(
                        title: "Cloud Health Storage",
                        body: "Your profile, labs, blood pressure logs, medications, symptoms, nutrition entries, appointments, tasks, reports, exports, and any documents you choose to upload are stored on secure cloud services used by PKD Compass so your account works across sessions and devices. Declining this means the authenticated app experience cannot be used."
                    )

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Optional feature consent")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("Blood pressure tracking, labs, medications, care organizer, document upload, AI analysis, reports/exports, and notifications can each ask for additional permission later. You can decline optional features, but any feature you decline will remain blocked until you accept its terms.")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Security reminder")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("Protect your device with a passcode or Face ID, keep your password private, and only share reports or records through destinations you trust. PKD Compass reduces risk with authentication and consent controls, but no consumer app can guarantee absolute security.")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.danger)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(PKDPalette.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }

                    Button(isSubmitting ? "Saving..." : "Accept & Continue") {
                        Task {
                            isSubmitting = true
                            defer { isSubmitting = false }
                            do {
                                try await authViewModel.updateConsents([
                                    (.termsOfUse, true),
                                    (.privacyPolicy, true),
                                    (.cloudHealthStorage, true),
                                ])
                                errorMessage = nil
                            } catch {
                                errorMessage = (error as? LocalizedError)?.errorDescription ?? "Could not save consent. Try again."
                            }
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .disabled(isSubmitting)

                    Button("Decline and Sign Out") {
                        authViewModel.logout()
                    }
                    .buttonStyle(PKDOutlineButtonStyle())
                }
                .padding(20)
            }
        }
    }

    private func consentCard(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
            Text(body)
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.08), lineWidth: 1)
        )
    }
}

private struct PostAuthHeroView: View {
    let onContinue: () -> Void

    private let featureTiles: [(String, String, [Color])] = [
        ("LAB TRACKING", "flask.fill", [Color(hex: "#2563EB"), Color(hex: "#1D4ED8")]),
        ("HEART MONITOR", "heart.fill", [Color(hex: "#BE185D"), Color(hex: "#9D174D")]),
        ("EGFR TRENDS", "chart.line.uptrend.xyaxis", [Color(hex: "#065F46"), Color(hex: "#0F766E")]),
        ("FOOD TRACKER", "fork.knife", [Color(hex: "#92400E"), Color(hex: "#78350F")]),
        ("MEDICATIONS", "pills.fill", [Color(hex: "#6D28D9"), Color(hex: "#5B21B6")]),
        ("FLUID INTAKE", "drop.fill", [Color(hex: "#0E7490"), Color(hex: "#0369A1")])
    ]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#0B173A"), Color(hex: "#050A1F"), Color(hex: "#030712")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 18) {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(featureTiles, id: \.0) { tile in
                        VStack(spacing: 7) {
                            Image(systemName: tile.1)
                                .font(.system(size: 20, weight: .bold))
                            Text(tile.0)
                                .font(.system(size: 9, weight: .black, design: .rounded))
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                        }
                        .foregroundStyle(.white.opacity(0.9))
                        .frame(maxWidth: .infinity, minHeight: 86)
                        .background(
                            LinearGradient(colors: tile.2, startPoint: .topLeading, endPoint: .bottomTrailing),
                            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(Color.white.opacity(0.12), lineWidth: 1)
                        )
                    }
                }
                .padding(.top, 12)

                HStack(spacing: 6) {
                    Circle().fill(PKDPalette.primary).frame(width: 7, height: 7)
                    Text("PKD COMPASS")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .tracking(2.0)
                        .foregroundStyle(PKDPalette.primary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "#11224F"), in: Capsule())
                .overlay(
                    Capsule()
                        .stroke(PKDPalette.primary.opacity(0.45), lineWidth: 1)
                )

                Text("Take Control of Your")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.75)
                Text("Kidney Health")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(PKDGradients.hero)
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)

                Text("Monitor eGFR, manage Tolvaptan therapy, track nutrition, and stay ahead of your PKD journey.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.74))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)

                HStack(spacing: 12) {
                    statCard("6", "CKD Stages Tracked")
                    statCard("∞", "Lab Data Points")
                    statCard("24/7", "Health Insights")
                }

                Button {
                    onContinue()
                } label: {
                    HStack(spacing: 8) {
                        Text("Go to Dashboard")
                            .font(.system(size: 22, weight: .black, design: .rounded))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 20, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 60)
                    .background(PKDPalette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: PKDPalette.primary.opacity(0.35), radius: 16, x: 0, y: 10)
                }
                .buttonStyle(.plain)

                HStack(spacing: 20) {
                    footerTag("shield.fill", "SECURE DATA")
                    footerTag("lock.person.fill", "PRIVATE ACCOUNT")
                    footerTag("lock.shield.fill", "PROTECTED ACCESS")
                }
                .padding(.bottom, 10)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 24)
        }
    }

    private func statCard(_ value: String, _ label: String) -> some View {
        VStack(spacing: 5) {
            Text(value)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.72))
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, minHeight: 88)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
    }

    private func footerTag(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
            Text(text)
        }
        .font(.system(size: 10, weight: .black, design: .rounded))
        .foregroundStyle(Color.white.opacity(0.72))
    }
}
