import Foundation
import SwiftData

enum LabRepository {
    @discardableResult
    static func addLab(
        context: ModelContext,
        type: ObservationType,
        value: Double,
        unit: String,
        date: Date
    ) throws -> LabResult {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { throw NSError(domain: "LabRepository", code: 401) }
        let lab = LabResult(ownerEmail: ownerEmail, typeRaw: type.rawValue, value: value, unit: unit, timestamp: date)
        context.insert(lab)
        try context.save()
        return lab
    }

    static func fetchLabs(context: ModelContext, type: ObservationType? = nil) throws -> [LabResult] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        var descriptor = FetchDescriptor<LabResult>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
        if let type {
            descriptor.predicate = #Predicate<LabResult> { $0.ownerEmail == ownerEmail && $0.typeRaw == type.rawValue }
        } else {
            descriptor.predicate = #Predicate<LabResult> { $0.ownerEmail == ownerEmail }
        }
        return try context.fetch(descriptor)
    }

    static func latestByMetric(context: ModelContext) throws -> [String: LabResult] {
        let labs = try fetchLabs(context: context)
        var grouped: [String: LabResult] = [:]
        for lab in labs where grouped[lab.typeRaw] == nil {
            grouped[lab.typeRaw] = lab
        }
        return grouped
    }

    static func updateLab(
        context: ModelContext,
        lab: LabResult,
        type: ObservationType,
        value: Double,
        unit: String,
        date: Date
    ) throws {
        lab.typeRaw = type.rawValue
        lab.value = value
        lab.unit = unit
        lab.timestamp = date
        try context.save()
    }

    static func deleteLab(context: ModelContext, lab: LabResult) throws {
        context.delete(lab)
        try context.save()
    }
}
