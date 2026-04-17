import Foundation
import SwiftData

enum MedicationRepository {
    static func fetchActive(context: ModelContext) throws -> [MedicationItem] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        var descriptor = FetchDescriptor<MedicationItem>(sortBy: [SortDescriptor(\.name, order: .forward)])
        descriptor.predicate = #Predicate<MedicationItem> { $0.ownerEmail == ownerEmail && $0.isActive == true }
        return try context.fetch(descriptor)
    }

    static func addMedication(
        context: ModelContext,
        name: String,
        dosage: String,
        frequency: MedicationFrequency,
        reminderScheduleText: String,
        isTolvaptan: Bool
    ) throws -> MedicationItem {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { throw NSError(domain: "MedicationRepository", code: 401) }
        let medication = MedicationItem(
            ownerEmail: ownerEmail,
            name: name,
            dosage: dosage,
            frequencyRaw: frequency.rawValue,
            startDate: .now,
            isTolvaptan: isTolvaptan,
            reminderScheduleText: reminderScheduleText.isEmpty ? nil : reminderScheduleText,
            isActive: true
        )
        context.insert(medication)
        try context.save()
        return medication
    }

    static func addLog(context: ModelContext, medicationId: UUID, status: String, timestamp: Date = .now) throws {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return }
        let log = MedicationLog(ownerEmail: ownerEmail, medicationId: medicationId, status: status, timestamp: timestamp)
        context.insert(log)
        try context.save()
    }

    static func latestLogStatus(context: ModelContext, medicationId: UUID) throws -> String? {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return nil }
        var descriptor = FetchDescriptor<MedicationLog>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
        descriptor.predicate = #Predicate<MedicationLog> { $0.ownerEmail == ownerEmail && $0.medicationId == medicationId }
        return try context.fetch(descriptor).first?.status
    }

    static func updateMedication(
        context: ModelContext,
        medication: MedicationItem,
        name: String,
        dosage: String,
        frequency: MedicationFrequency,
        reminderScheduleText: String?,
        isTolvaptan: Bool
    ) throws {
        medication.name = name
        medication.dosage = dosage
        medication.frequencyRaw = frequency.rawValue
        medication.reminderScheduleText = reminderScheduleText
        medication.isTolvaptan = isTolvaptan
        try context.save()
    }

    static func deactivateMedication(context: ModelContext, medication: MedicationItem) throws {
        medication.isActive = false
        try context.save()
    }

    static func deleteMedication(context: ModelContext, medication: MedicationItem) throws {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return }
        let medicationId = medication.id

        var logDescriptor = FetchDescriptor<MedicationLog>()
        logDescriptor.predicate = #Predicate<MedicationLog> { log in
            log.ownerEmail == ownerEmail && log.medicationId == medicationId
        }

        let logs = try context.fetch(logDescriptor)
        for log in logs {
            context.delete(log)
        }
        context.delete(medication)
        try context.save()
    }
}
