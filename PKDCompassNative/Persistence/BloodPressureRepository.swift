import Foundation
import SwiftData

enum BloodPressureRepository {
    @discardableResult
    static func addReading(
        context: ModelContext,
        systolic: Int,
        diastolic: Int,
        heartRate: Int?,
        timestamp: Date
    ) throws -> BloodPressureReading {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { throw NSError(domain: "BloodPressureRepository", code: 401) }
        let reading = BloodPressureReading(
            ownerEmail: ownerEmail,
            systolic: systolic,
            diastolic: diastolic,
            heartRate: heartRate,
            timestamp: timestamp
        )
        context.insert(reading)
        try context.save()
        return reading
    }

    static func readings(
        context: ModelContext,
        from startDate: Date? = nil,
        to endDate: Date? = nil
    ) throws -> [BloodPressureReading] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        var descriptor = FetchDescriptor<BloodPressureReading>(sortBy: [SortDescriptor(\.timestamp, order: .forward)])
        if let startDate, let endDate {
            descriptor.predicate = #Predicate<BloodPressureReading> { $0.ownerEmail == ownerEmail && $0.timestamp >= startDate && $0.timestamp <= endDate }
        } else if let startDate {
            descriptor.predicate = #Predicate<BloodPressureReading> { $0.ownerEmail == ownerEmail && $0.timestamp >= startDate }
        } else if let endDate {
            descriptor.predicate = #Predicate<BloodPressureReading> { $0.ownerEmail == ownerEmail && $0.timestamp <= endDate }
        } else {
            descriptor.predicate = #Predicate<BloodPressureReading> { $0.ownerEmail == ownerEmail }
        }
        return try context.fetch(descriptor)
    }
}
