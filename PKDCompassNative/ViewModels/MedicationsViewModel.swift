import Foundation
import SwiftData

@MainActor
final class MedicationsViewModel: ObservableObject {
    @Published var medications: [MedicationItem] = []
    @Published var latestStatuses: [UUID: String] = [:]

    @Published var name = ""
    @Published var dosageAmount = ""
    @Published var dosageUnit = "mg"
    @Published var frequency: MedicationFrequency = .daily
    @Published var reminderText = ""
    @Published var reminderTime = Date()
    @Published var secondDoseTime = Calendar.current.date(byAdding: .hour, value: 8, to: .now) ?? .now
    @Published var thirdDoseTime = Calendar.current.date(byAdding: .hour, value: 16, to: .now) ?? .now
    @Published var customDoses: [MedicationDoseScheduleEntry] = [
        MedicationDoseScheduleEntry(date: .now)
    ]
    @Published var enableReminder = true
    @Published var isTolvaptan = false
    @Published var errorMessage: String?
    @Published var editingMedicationID: UUID?

    let dosageUnits = ["mg", "mcg", "g", "mL", "IU", "units", "tablet", "capsule", "drop", "patch", "puff"]

    func load(context: ModelContext) {
        do {
            medications = try MedicationRepository.fetchActive(context: context)
            var statuses: [UUID: String] = [:]
            for med in medications {
                statuses[med.id] = try MedicationRepository.latestLogStatus(context: context, medicationId: med.id)
            }
            latestStatuses = statuses
        } catch {
            errorMessage = "Failed to load medications"
        }

        Task { await syncFromServer(context: context) }
    }

    func addMedication(context: ModelContext, notificationService: NotificationScheduling) async {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Medication name is required"
            return
        }
        guard !dosageAmount.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Dosage is required"
            return
        }

        do {
            let schedulePayload = buildSchedulePayload()
            let scheduleText = encodeSchedulePayload(schedulePayload)

            let dosageText = composedDosage

            let medication = try MedicationRepository.addMedication(
                context: context,
                name: name,
                dosage: dosageText,
                frequency: frequency,
                reminderScheduleText: scheduleText,
                isTolvaptan: isTolvaptan
            )

            if enableReminder {
                let granted = await notificationService.requestPermission()
                if granted {
                    let title = "Medication Reminder"
                    let body = "\(medication.name) \(medication.dosage)"

                    switch schedulePayload.kind {
                    case .daily:
                        let hour = Calendar.current.component(.hour, from: reminderTime)
                        let minute = Calendar.current.component(.minute, from: reminderTime)
                        try await notificationService.scheduleDailyOneHourAndAtTime(
                            idPrefix: "med.\(medication.id.uuidString).dose1",
                            title: title,
                            body: body,
                            hour: hour,
                            minute: minute
                        )
                    case .bid:
                        let times = [reminderTime, secondDoseTime]
                        for (idx, t) in times.enumerated() {
                            let hour = Calendar.current.component(.hour, from: t)
                            let minute = Calendar.current.component(.minute, from: t)
                            try await notificationService.scheduleDailyOneHourAndAtTime(
                                idPrefix: "med.\(medication.id.uuidString).dose\(idx + 1)",
                                title: title,
                                body: body,
                                hour: hour,
                                minute: minute
                            )
                        }
                    case .tid:
                        let times = [reminderTime, secondDoseTime, thirdDoseTime]
                        for (idx, t) in times.enumerated() {
                            let hour = Calendar.current.component(.hour, from: t)
                            let minute = Calendar.current.component(.minute, from: t)
                            try await notificationService.scheduleDailyOneHourAndAtTime(
                                idPrefix: "med.\(medication.id.uuidString).dose\(idx + 1)",
                                title: title,
                                body: body,
                                hour: hour,
                                minute: minute
                            )
                        }
                    case .customDates, .customWeekly:
                        let doses = schedulePayload.entries ?? []
                        for entry in doses {
                            try await notificationService.scheduleWeeklyOneHourAndAtTime(
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

            name = ""
            dosageAmount = ""
            dosageUnit = "mg"
            reminderText = ""
            reminderTime = Date()
            secondDoseTime = Calendar.current.date(byAdding: .hour, value: 8, to: .now) ?? .now
            thirdDoseTime = Calendar.current.date(byAdding: .hour, value: 16, to: .now) ?? .now
            customDoses = [MedicationDoseScheduleEntry(date: .now)]
            enableReminder = true
            isTolvaptan = false
            errorMessage = nil
            load(context: context)

            Task {
                _ = try? await MobileMedsService.create(
                    id: medication.id,
                    name: medication.name,
                    dosage: medication.dosage,
                    frequency: medication.frequencyRaw,
                    isTolvaptan: medication.isTolvaptan,
                    instructions: medication.reminderScheduleText,
                    startDate: medication.startDate
                )
            }
        } catch {
            errorMessage = "Failed to add medication"
        }
    }

    func markTaken(context: ModelContext, med: MedicationItem) {
        updateStatus(context: context, med: med, status: "TAKEN")
    }

    func markMissed(context: ModelContext, med: MedicationItem) {
        updateStatus(context: context, med: med, status: "MISSED")
    }

    func beginEditing(_ medication: MedicationItem) {
        editingMedicationID = medication.id
        name = medication.name
        let parsed = parseDosage(medication.dosage)
        dosageAmount = parsed.amount
        dosageUnit = parsed.unit
        frequency = MedicationFrequency(rawValue: medication.frequencyRaw) ?? .daily
        isTolvaptan = medication.isTolvaptan
        if let raw = medication.reminderScheduleText, let payload = decodeSchedule(raw) {
            applySchedulePayload(payload)
        } else {
            reminderTime = .now
            secondDoseTime = Calendar.current.date(byAdding: .hour, value: 8, to: .now) ?? .now
            thirdDoseTime = Calendar.current.date(byAdding: .hour, value: 16, to: .now) ?? .now
            customDoses = [MedicationDoseScheduleEntry(date: .now)]
        }
        errorMessage = nil
    }

    func saveEdits(context: ModelContext, notificationService: NotificationScheduling) async {
        guard let id = editingMedicationID,
              let med = medications.first(where: { $0.id == id })
        else {
            errorMessage = "Medication not found"
            return
        }

        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Medication name is required"
            return
        }
        guard !dosageAmount.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Dosage is required"
            return
        }

        do {
            let schedulePayload = buildSchedulePayload()
            let scheduleText = encodeSchedulePayload(schedulePayload)
            let dosageText = composedDosage
            try MedicationRepository.updateMedication(
                context: context,
                medication: med,
                name: name,
                dosage: dosageText,
                frequency: frequency,
                reminderScheduleText: scheduleText,
                isTolvaptan: isTolvaptan
            )
            try? await notificationService.removePendingNotifications(idPrefix: "med.\(med.id.uuidString)")
            if enableReminder {
                let granted = await notificationService.requestPermission()
                if granted {
                    let title = "Medication Reminder"
                    let body = "\(name) \(dosageText)"
                    try await scheduleNotifications(for: med.id, title: title, body: body, payload: schedulePayload, notificationService: notificationService)
                }
            }
            resetForm()
            load(context: context)
        } catch {
            errorMessage = "Failed to update medication"
        }
    }

    func deleteMedication(context: ModelContext, medication: MedicationItem, notificationService: NotificationScheduling) async {
        do {
            try await MobileMedsService.delete(id: medication.id)
            try MedicationRepository.deleteMedication(context: context, medication: medication)
            try? await notificationService.removePendingNotifications(idPrefix: "med.\(medication.id.uuidString)")
            load(context: context)
        } catch {
            if let apiError = error as? MobileAPIError {
                switch apiError {
                case .requestFailed(_, let message):
                    errorMessage = message ?? "Failed to delete medication"
                default:
                    errorMessage = "Failed to delete medication"
                }
            } else {
                errorMessage = "Failed to delete medication"
            }
        }
    }

    private func updateStatus(context: ModelContext, med: MedicationItem, status: String) {
        do {
            let timestamp = Date()
            try MedicationRepository.addLog(context: context, medicationId: med.id, status: status, timestamp: timestamp)
            load(context: context)

            Task {
                try? await MobileMedsService.log(
                    medicationId: med.id,
                    status: status,
                    timestamp: timestamp
                )
            }
        } catch {
            errorMessage = "Failed to update medication status"
        }
    }

    private func buildSchedulePayload() -> MedicationReminderSchedulePayload {
        let formatter = DateFormatter()
        formatter.dateFormat = "hh:mm a"

        switch frequency {
        case .daily:
            let label = "Daily at \(formatter.string(from: reminderTime))"
            return MedicationReminderSchedulePayload(
                kind: .daily,
                times: [timeOfDay(from: reminderTime)],
                entries: nil,
                displayLabel: label
            )
        case .bid:
            let label = "Twice daily (\(formatter.string(from: reminderTime)), \(formatter.string(from: secondDoseTime)))"
            return MedicationReminderSchedulePayload(
                kind: .bid,
                times: [timeOfDay(from: reminderTime), timeOfDay(from: secondDoseTime)],
                entries: nil,
                displayLabel: label
            )
        case .tid:
            let label = "Three times daily (\(formatter.string(from: reminderTime)), \(formatter.string(from: secondDoseTime)), \(formatter.string(from: thirdDoseTime)))"
            return MedicationReminderSchedulePayload(
                kind: .tid,
                times: [timeOfDay(from: reminderTime), timeOfDay(from: secondDoseTime), timeOfDay(from: thirdDoseTime)],
                entries: nil,
                displayLabel: label
            )
        case .custom:
            let pruned = customDoses.sorted {
                ($0.weekday, $0.time.hour, $0.time.minute) < ($1.weekday, $1.time.hour, $1.time.minute)
            }
            let detail = pruned
                .prefix(3)
                .map { "\($0.weekdayLabel.prefix(3)) \(formattedTime(for: $0.time))" }
                .joined(separator: ", ")
            let suffix = pruned.count > 3 ? " +\(pruned.count - 3) more" : ""
            let label = pruned.isEmpty ? "Custom weekly" : "Custom weekly (\(detail)\(suffix))"
            return MedicationReminderSchedulePayload(
                kind: .customWeekly,
                times: nil,
                entries: pruned,
                displayLabel: label
            )
        }
    }

    private func timeOfDay(from date: Date) -> MedicationTimeOfDay {
        MedicationTimeOfDay(
            hour: Calendar.current.component(.hour, from: date),
            minute: Calendar.current.component(.minute, from: date)
        )
    }

    private func encodeSchedulePayload(_ payload: MedicationReminderSchedulePayload) -> String {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(payload)
            return String(data: data, encoding: .utf8) ?? payload.displayLabel ?? ""
        } catch {
            return payload.displayLabel ?? ""
        }
    }

    private func decodeSchedule(_ raw: String) -> MedicationReminderSchedulePayload? {
        guard raw.first == "{", let data = raw.data(using: .utf8) else { return nil }
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(MedicationReminderSchedulePayload.self, from: data)
        } catch {
            return nil
        }
    }

    private func applySchedulePayload(_ payload: MedicationReminderSchedulePayload) {
        switch payload.kind {
        case .daily:
            frequency = .daily
            if let first = payload.times?.first {
                reminderTime = dateFor(hour: first.hour, minute: first.minute)
            }
        case .bid:
            frequency = .bid
            if let times = payload.times {
                if let first = times.first { reminderTime = dateFor(hour: first.hour, minute: first.minute) }
                if times.count > 1 { secondDoseTime = dateFor(hour: times[1].hour, minute: times[1].minute) }
            }
        case .tid:
            frequency = .tid
            if let times = payload.times {
                if let first = times.first { reminderTime = dateFor(hour: first.hour, minute: first.minute) }
                if times.count > 1 { secondDoseTime = dateFor(hour: times[1].hour, minute: times[1].minute) }
                if times.count > 2 { thirdDoseTime = dateFor(hour: times[2].hour, minute: times[2].minute) }
            }
        case .customDates, .customWeekly:
            frequency = .custom
            customDoses = payload.entries?.isEmpty == false ? (payload.entries ?? []) : [MedicationDoseScheduleEntry(date: .now)]
        }
    }

    private var composedDosage: String {
        let amount = dosageAmount.trimmingCharacters(in: .whitespacesAndNewlines)
        let unit = dosageUnit.trimmingCharacters(in: .whitespacesAndNewlines)
        return unit.isEmpty ? amount : "\(amount) \(unit)"
    }

    private func parseDosage(_ dosage: String) -> (amount: String, unit: String) {
        let parts = dosage.split(separator: " ")
        guard let first = parts.first else { return ("", "mg") }
        if parts.count == 1 { return (String(first), "mg") }
        return (String(first), parts.dropFirst().joined(separator: " "))
    }

    private func dateFor(hour: Int, minute: Int) -> Date {
        Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: .now) ?? .now
    }

    private func scheduleNotifications(
        for medicationID: UUID,
        title: String,
        body: String,
        payload: MedicationReminderSchedulePayload,
        notificationService: NotificationScheduling
    ) async throws {
        switch payload.kind {
        case .daily:
            if let t = payload.times?.first {
                try await notificationService.scheduleDailyOneHourAndAtTime(
                    idPrefix: "med.\(medicationID.uuidString).dose1",
                    title: title,
                    body: body,
                    hour: t.hour,
                    minute: t.minute
                )
            }
        case .bid, .tid:
            let times = payload.times ?? []
            for (idx, t) in times.enumerated() {
                try await notificationService.scheduleDailyOneHourAndAtTime(
                    idPrefix: "med.\(medicationID.uuidString).dose\(idx + 1)",
                    title: title,
                    body: body,
                    hour: t.hour,
                    minute: t.minute
                )
            }
        case .customDates, .customWeekly:
            for entry in (payload.entries ?? []) {
                try await notificationService.scheduleWeeklyOneHourAndAtTime(
                    idPrefix: "med.\(medicationID.uuidString).custom.\(entry.id.uuidString)",
                    title: title,
                    body: body,
                    weekday: entry.weekday,
                    hour: entry.time.hour,
                    minute: entry.time.minute
                )
            }
        }
    }

    func resetForm() {
        editingMedicationID = nil
        name = ""
        dosageAmount = ""
        dosageUnit = "mg"
        reminderText = ""
        reminderTime = Date()
        secondDoseTime = Calendar.current.date(byAdding: .hour, value: 8, to: .now) ?? .now
        thirdDoseTime = Calendar.current.date(byAdding: .hour, value: 16, to: .now) ?? .now
        customDoses = [MedicationDoseScheduleEntry(date: .now)]
        enableReminder = true
        isTolvaptan = false
        errorMessage = nil
    }

    private func syncFromServer(context: ModelContext) async {
        do {
            let remote = try await MobileMedsService.fetchAll()
            let ownerEmail = AppConfig.currentUserEmail
            guard !ownerEmail.isEmpty else { return }
            let remoteIDs = Set(remote.compactMap { UUID(uuidString: $0.id) })

            var localDescriptor = FetchDescriptor<MedicationItem>()
            localDescriptor.predicate = #Predicate<MedicationItem> { $0.ownerEmail == ownerEmail }
            if let localItems = try? context.fetch(localDescriptor) {
                for local in localItems where local.isActive && !remoteIDs.contains(local.id) {
                    local.isActive = false
                }
            }

            for med in remote {
                guard let uuid = UUID(uuidString: med.id) else { continue }
                var descriptor = FetchDescriptor<MedicationItem>()
                descriptor.predicate = #Predicate<MedicationItem> { $0.id == uuid && $0.ownerEmail == ownerEmail }
                if let existing = try? context.fetch(descriptor).first {
                    existing.name = med.name
                    existing.dosage = med.dosage
                    existing.frequencyRaw = med.frequency
                    existing.isActive = med.isActive
                    existing.isTolvaptan = med.isTolvaptan
                    existing.startDate = med.startDate
                    existing.reminderScheduleText = med.instructions
                } else {
                    context.insert(
                        MedicationItem(
                            id: uuid,
                            ownerEmail: ownerEmail,
                            name: med.name,
                            dosage: med.dosage,
                            frequencyRaw: med.frequency,
                            startDate: med.startDate,
                            isTolvaptan: med.isTolvaptan,
                            reminderScheduleText: med.instructions,
                            isActive: med.isActive
                        )
                    )
                }

                if let latest = med.latestStatus {
                    let localStatus = try? MedicationRepository.latestLogStatus(context: context, medicationId: uuid)
                    if localStatus == nil || localStatus != latest {
                        try? MedicationRepository.addLog(
                            context: context,
                            medicationId: uuid,
                            status: latest,
                            timestamp: med.latestStatusAt ?? Date()
                        )
                    }
                }
            }
            try context.save()
            medications = try MedicationRepository.fetchActive(context: context)
            var statuses: [UUID: String] = [:]
            for med in medications {
                statuses[med.id] = try MedicationRepository.latestLogStatus(context: context, medicationId: med.id)
            }
            latestStatuses = statuses
        } catch {
            // ignore offline
        }
    }

    private func formattedTime(for time: MedicationTimeOfDay) -> String {
        let date = dateFor(hour: time.hour, minute: time.minute)
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}
