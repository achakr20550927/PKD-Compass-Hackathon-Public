import SwiftUI
import UserNotifications

struct NotificationsCenterView: View {
    private let notificationService: NotificationScheduling = NotificationService()
    @State private var pending: [UNNotificationRequest] = []
    @State private var isLoading = false
    @Environment(\.dismiss) private var dismiss

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

                VStack(alignment: .leading, spacing: 2) {
                    Text("Notifications")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                }
                Spacer()
            }
            .pkdGlassHeader()

            if pending.isEmpty && !isLoading {
                Spacer()
                VStack(spacing: 10) {
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .fill(Color.white.opacity(0.6))
                        .frame(width: 76, height: 76)
                        .overlay {
                            Image(systemName: "bell.slash")
                                .font(.system(size: 28))
                                .foregroundStyle(PKDPalette.textMuted.opacity(0.5))
                        }
                    Text("No new notifications")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("We'll let you know when there's something to report regarding your meds or health.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 430)
                }
                .padding(.horizontal, 24)
                Spacer()
            } else {
                ScrollView(showsIndicators: false) {
                    HStack {
                        Spacer()
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text("Pending (\(pending.count))")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Spacer()
                                if !pending.isEmpty {
                                    Button("Clear All") {
                                        notificationService.clearPendingRequests()
                                        pending = []
                                    }
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.danger)
                                }
                            }

                            ForEach(pending, id: \.identifier) { request in
                                VStack(alignment: .leading, spacing: 5) {
                                    HStack {
                                        Text(request.content.title.isEmpty ? "Reminder" : request.content.title)
                                            .font(.system(size: 14, weight: .bold, design: .rounded))
                                            .foregroundStyle(PKDPalette.textMain)
                                        Spacer()
                                        PKDStatusCapsule(
                                            text: triggerText(request.trigger).uppercased(),
                                            color: PKDPalette.primary
                                        )
                                    }
                                    Text(request.content.body)
                                        .font(.system(size: 12, weight: .medium, design: .rounded))
                                        .foregroundStyle(PKDPalette.textMuted)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                    Text(request.identifier)
                                        .font(.system(size: 10, weight: .medium, design: .rounded))
                                        .foregroundStyle(PKDPalette.textMuted.opacity(0.8))
                                        .lineLimit(1)
                                }
                                .pkdCard()
                            }
                        }
                        .frame(maxWidth: 440)
                        Spacer()
                    }
                    .padding()
                    .padding(.bottom, 18)
                }
            }
        }
        .pkdPageBackground()
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await refreshPending()
        }
    }

    private func refreshPending() async {
        isLoading = true
        let requests = await notificationService.pendingRequests()
        pending = requests.sorted { $0.identifier < $1.identifier }
        isLoading = false
    }

    private func triggerText(_ trigger: UNNotificationTrigger?) -> String {
        if let trigger = trigger as? UNTimeIntervalNotificationTrigger {
            return "\(Int(trigger.timeInterval))s"
        }
        if let trigger = trigger as? UNCalendarNotificationTrigger {
            let hour = trigger.dateComponents.hour ?? 0
            let minute = trigger.dateComponents.minute ?? 0
            if trigger.repeats {
                if let weekday = trigger.dateComponents.weekday {
                    let symbols = Calendar.current.shortWeekdaySymbols
                    let idx = max(1, min(weekday, symbols.count)) - 1
                    return "Weekly \(symbols[idx]) \(String(format: "%02d:%02d", hour, minute))"
                }
                return "Daily \(String(format: "%02d:%02d", hour, minute))"
            }
            return "One-time \(String(format: "%02d:%02d", hour, minute))"
        }
        return "Scheduled"
    }
}
