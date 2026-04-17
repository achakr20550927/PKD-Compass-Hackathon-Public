import Foundation
import SwiftData

enum SymptomRepository {
    @discardableResult
    static func addEntry(context: ModelContext, type: String, severity: Int, notes: String, timestamp: Date = .now) throws -> SymptomEntry {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { throw NSError(domain: "SymptomRepository", code: 401) }
        let entry = SymptomEntry(ownerEmail: ownerEmail, type: type, severity: severity, notes: notes.isEmpty ? nil : notes, timestamp: timestamp)
        context.insert(entry)
        try context.save()
        return entry
    }

    static func all(context: ModelContext) throws -> [SymptomEntry] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        var descriptor = FetchDescriptor<SymptomEntry>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
        descriptor.predicate = #Predicate<SymptomEntry> { $0.ownerEmail == ownerEmail }
        return try context.fetch(descriptor)
    }

    static func updateEntry(
        context: ModelContext,
        entry: SymptomEntry,
        type: String,
        severity: Int,
        notes: String,
        timestamp: Date
    ) throws {
        entry.type = type
        entry.severity = severity
        entry.notes = notes.isEmpty ? nil : notes
        entry.timestamp = timestamp
        try context.save()
    }

    static func deleteEntry(context: ModelContext, entry: SymptomEntry) throws {
        context.delete(entry)
        try context.save()
    }
}
