import Foundation
import SwiftData
import UserNotifications

protocol NotificationScheduling {
    func requestPermission() async -> Bool
    func ensurePermissionIfNeeded() async -> Bool
    func scheduleReminder(id: String, title: String, body: String, date: Date) async throws
    func scheduleOneHourAndAtTime(idPrefix: String, title: String, body: String, date: Date) async throws
    func scheduleDailyOneHourAndAtTime(idPrefix: String, title: String, body: String, hour: Int, minute: Int) async throws
    func scheduleWeeklyOneHourAndAtTime(idPrefix: String, title: String, body: String, weekday: Int, hour: Int, minute: Int) async throws
    func scheduleTestNotification(id: String, title: String, body: String, seconds: TimeInterval) async throws
    func pendingRequests() async -> [UNNotificationRequest]
    func removePendingNotifications(idPrefix: String) async throws
    func clearPendingRequests()
}

final class NotificationService: NotificationScheduling {
    private let enabledKey = "pkd.settings.notifications.enabled"

    func requestPermission() async -> Bool {
        await ensurePermissionIfNeeded(forcePrompt: true)
    }

    func ensurePermissionIfNeeded() async -> Bool {
        await ensurePermissionIfNeeded(forcePrompt: false)
    }

    private func ensurePermissionIfNeeded(forcePrompt: Bool) async -> Bool {
        let enabled = UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true
        guard enabled else { return false }

        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined:
            do {
                return try await center.requestAuthorization(options: authorizationOptions)
            } catch {
                return false
            }
        case .denied:
            return false
        @unknown default:
            if forcePrompt {
                do {
                    return try await center.requestAuthorization(options: authorizationOptions)
                } catch {
                    return false
                }
            }
            return false
        }
    }

    func scheduleReminder(id: String, title: String, body: String, date: Date) async throws {
        let content = makeContent(title: title, body: body)

        let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)

        try await UNUserNotificationCenter.current().add(request)
    }

    func scheduleOneHourAndAtTime(idPrefix: String, title: String, body: String, date: Date) async throws {
        let oneHourBefore = date.addingTimeInterval(-3600)
        if oneHourBefore > Date() {
            try await scheduleReminder(
                id: "\(idPrefix).oneHour",
                title: title,
                body: "Starts in 1 hour. \(body)",
                date: oneHourBefore
            )
        }

        if date > Date() {
            try await scheduleReminder(
                id: "\(idPrefix).atTime",
                title: title,
                body: body,
                date: date
            )
        }
    }

    func scheduleDailyOneHourAndAtTime(idPrefix: String, title: String, body: String, hour: Int, minute: Int) async throws {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [
            "\(idPrefix).daily.oneHour",
            "\(idPrefix).daily.atTime"
        ])

        let atTimeContent = makeContent(title: title, body: body)

        var atTimeComponents = DateComponents()
        atTimeComponents.hour = hour
        atTimeComponents.minute = minute
        let atTimeTrigger = UNCalendarNotificationTrigger(dateMatching: atTimeComponents, repeats: true)
        let atTimeReq = UNNotificationRequest(
            identifier: "\(idPrefix).daily.atTime",
            content: atTimeContent,
            trigger: atTimeTrigger
        )
        try await center.add(atTimeReq)

        let oneHour = Calendar.current.date(byAdding: .hour, value: -1, to: dateFrom(hour: hour, minute: minute)) ?? Date()
        let oneHourParts = Calendar.current.dateComponents([.hour, .minute], from: oneHour)
        let oneHourContent = makeContent(title: title, body: "Due in 1 hour. \(body)")

        var oneHourComponents = DateComponents()
        oneHourComponents.hour = oneHourParts.hour
        oneHourComponents.minute = oneHourParts.minute
        let oneHourTrigger = UNCalendarNotificationTrigger(dateMatching: oneHourComponents, repeats: true)
        let oneHourReq = UNNotificationRequest(
            identifier: "\(idPrefix).daily.oneHour",
            content: oneHourContent,
            trigger: oneHourTrigger
        )
        try await center.add(oneHourReq)
    }

    func scheduleWeeklyOneHourAndAtTime(idPrefix: String, title: String, body: String, weekday: Int, hour: Int, minute: Int) async throws {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [
            "\(idPrefix).weekly.oneHour",
            "\(idPrefix).weekly.atTime"
        ])

        let atTimeContent = makeContent(title: title, body: body)

        var atTimeComponents = DateComponents()
        atTimeComponents.weekday = weekday
        atTimeComponents.hour = hour
        atTimeComponents.minute = minute
        let atTimeTrigger = UNCalendarNotificationTrigger(dateMatching: atTimeComponents, repeats: true)
        let atTimeReq = UNNotificationRequest(
            identifier: "\(idPrefix).weekly.atTime",
            content: atTimeContent,
            trigger: atTimeTrigger
        )
        try await center.add(atTimeReq)

        let oneHour = Calendar.current.date(byAdding: .hour, value: -1, to: dateFrom(hour: hour, minute: minute)) ?? Date()
        let oneHourParts = Calendar.current.dateComponents([.hour, .minute], from: oneHour)
        let oneHourContent = makeContent(title: title, body: "Due in 1 hour. \(body)")

        var oneHourComponents = DateComponents()
        oneHourComponents.weekday = weekday
        oneHourComponents.hour = oneHourParts.hour
        oneHourComponents.minute = oneHourParts.minute
        let oneHourTrigger = UNCalendarNotificationTrigger(dateMatching: oneHourComponents, repeats: true)
        let oneHourReq = UNNotificationRequest(
            identifier: "\(idPrefix).weekly.oneHour",
            content: oneHourContent,
            trigger: oneHourTrigger
        )
        try await center.add(oneHourReq)
    }

    func scheduleTestNotification(id: String, title: String, body: String, seconds: TimeInterval) async throws {
        let content = makeContent(title: title, body: body)

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(seconds, 1), repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        try await UNUserNotificationCenter.current().add(request)
    }

    func pendingRequests() async -> [UNNotificationRequest] {
        await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
                continuation.resume(returning: requests)
            }
        }
    }

    func removePendingNotifications(idPrefix: String) async throws {
        let requests = await pendingRequests()
        let ids = requests
            .map(\.identifier)
            .filter { $0.hasPrefix(idPrefix) }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
    }

    func clearPendingRequests() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    private func dateFrom(hour: Int, minute: Int) -> Date {
        var comps = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        comps.hour = hour
        comps.minute = minute
        return Calendar.current.date(from: comps) ?? Date()
    }

    private var authorizationOptions: UNAuthorizationOptions {
        if #available(iOS 15.0, *) {
            return [.alert, .sound, .badge, .timeSensitive]
        }
        return [.alert, .sound, .badge]
    }

    private func makeContent(title: String, body: String) -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
        }
        return content
    }
}

@MainActor
final class ReminderSyncService {
    private let notificationService: NotificationScheduling

    init(notificationService: NotificationScheduling = NotificationService()) {
        self.notificationService = notificationService
    }

    func resyncAllReminders(context: ModelContext, ownerEmail: String) async {
        let email = ownerEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !email.isEmpty else { return }
        guard await notificationService.ensurePermissionIfNeeded() else { return }

        await resyncMedicationReminders(context: context, ownerEmail: email)
        await resyncAppointmentReminders(context: context, ownerEmail: email)
        await resyncTaskReminders(context: context, ownerEmail: email)
    }

    private func resyncMedicationReminders(context: ModelContext, ownerEmail: String) async {
        var descriptor = FetchDescriptor<MedicationItem>()
        descriptor.predicate = #Predicate<MedicationItem> {
            $0.ownerEmail == ownerEmail && $0.isActive == true
        }

        guard let medications = try? context.fetch(descriptor) else { return }

        for medication in medications {
            try? await notificationService.removePendingNotifications(idPrefix: "med.\(medication.id.uuidString)")

            guard let scheduleText = medication.reminderScheduleText,
                  let payload = try? JSONDecoder().decode(MedicationReminderSchedulePayload.self, from: Data(scheduleText.utf8)) else { continue }

            let title = "Medication Reminder"
            let body = "\(medication.name) \(medication.dosage)"

            switch payload.kind {
            case .daily:
                if let time = payload.times?.first {
                    try? await notificationService.scheduleDailyOneHourAndAtTime(
                        idPrefix: "med.\(medication.id.uuidString).dose1",
                        title: title,
                        body: body,
                        hour: time.hour,
                        minute: time.minute
                    )
                }
            case .bid, .tid:
                for (index, time) in (payload.times ?? []).enumerated() {
                    try? await notificationService.scheduleDailyOneHourAndAtTime(
                        idPrefix: "med.\(medication.id.uuidString).dose\(index + 1)",
                        title: title,
                        body: body,
                        hour: time.hour,
                        minute: time.minute
                    )
                }
            case .customDates, .customWeekly:
                for entry in (payload.entries ?? []) {
                    try? await notificationService.scheduleWeeklyOneHourAndAtTime(
                        idPrefix: "med.\(medication.id.uuidString).custom.\(entry.id.uuidString)",
                        title: title,
                        body: body,
                        weekday: entry.weekday,
                        hour: entry.time.hour,
                        minute: entry.time.minute
                    )
                }
            }
        }
    }

    private func resyncAppointmentReminders(context: ModelContext, ownerEmail: String) async {
        var descriptor = FetchDescriptor<AppointmentItem>()
        descriptor.predicate = #Predicate<AppointmentItem> {
            $0.ownerEmail == ownerEmail
        }

        guard let appointments = try? context.fetch(descriptor) else { return }

        for appointment in appointments {
            try? await notificationService.removePendingNotifications(idPrefix: "appt.\(appointment.id.uuidString)")
            guard appointment.date > Date() else { continue }

            try? await notificationService.scheduleOneHourAndAtTime(
                idPrefix: "appt.\(appointment.id.uuidString)",
                title: "Appointment Reminder",
                body: "\(appointment.title) at \(appointment.date.formatted(date: .omitted, time: .shortened))",
                date: appointment.date
            )
        }
    }

    private func resyncTaskReminders(context: ModelContext, ownerEmail: String) async {
        var descriptor = FetchDescriptor<CareTaskItem>()
        descriptor.predicate = #Predicate<CareTaskItem> {
            $0.ownerEmail == ownerEmail
        }

        guard let tasks = try? context.fetch(descriptor) else { return }

        for task in tasks {
            try? await notificationService.removePendingNotifications(idPrefix: "task.\(task.id.uuidString)")
            guard task.status != "COMPLETED", let dueAt = task.dueAt, dueAt > Date() else { continue }

            try? await notificationService.scheduleOneHourAndAtTime(
                idPrefix: "task.\(task.id.uuidString)",
                title: "Care Task Reminder",
                body: task.title,
                date: dueAt
            )
        }
    }
}
