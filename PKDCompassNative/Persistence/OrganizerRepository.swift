import Foundation
import SwiftData

enum OrganizerRepository {
    static func addAppointment(context: ModelContext, title: String, provider: String, location: String, date: Date, notes: String) throws -> AppointmentItem {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { throw NSError(domain: "OrganizerRepository", code: 401) }
        let appointment = AppointmentItem(
            ownerEmail: ownerEmail,
            title: title,
            providerName: provider.isEmpty ? nil : provider,
            location: location.isEmpty ? nil : location,
            date: date,
            notes: notes.isEmpty ? nil : notes
        )
        context.insert(appointment)
        try context.save()
        return appointment
    }

    static func addTask(context: ModelContext, title: String, dueAt: Date?) throws -> CareTaskItem {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { throw NSError(domain: "OrganizerRepository", code: 401) }
        let task = CareTaskItem(ownerEmail: ownerEmail, title: title, dueAt: dueAt)
        context.insert(task)
        try context.save()
        return task
    }

    static func appointments(context: ModelContext) throws -> [AppointmentItem] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        var descriptor = FetchDescriptor<AppointmentItem>(sortBy: [SortDescriptor(\.date, order: .forward)])
        descriptor.predicate = #Predicate<AppointmentItem> { $0.ownerEmail == ownerEmail }
        return try context.fetch(descriptor)
    }

    static func tasks(context: ModelContext) throws -> [CareTaskItem] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        var descriptor = FetchDescriptor<CareTaskItem>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
        descriptor.predicate = #Predicate<CareTaskItem> { $0.ownerEmail == ownerEmail }
        return try context.fetch(descriptor)
    }

    static func toggleTask(context: ModelContext, task: CareTaskItem) throws {
        task.status = (task.status == "COMPLETED") ? "OPEN" : "COMPLETED"
        try context.save()
    }

    static func deleteAppointment(context: ModelContext, appointment: AppointmentItem) throws {
        context.delete(appointment)
        try context.save()
    }

    static func deleteTask(context: ModelContext, task: CareTaskItem) throws {
        context.delete(task)
        try context.save()
    }
}
