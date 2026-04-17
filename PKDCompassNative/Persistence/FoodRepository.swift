import Foundation
import SwiftData

enum FoodRepository {
    static func addEntry(
        context: ModelContext,
        mealType: MealType,
        itemName: String,
        calories: Double,
        sodiumMg: Double,
        potassiumMg: Double,
        phosphorusMg: Double,
        proteinG: Double,
        fluidMl: Double,
        loggedAt: Date
    ) throws {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return }
        let entry = FoodLogEntry(
            ownerEmail: ownerEmail,
            mealTypeRaw: mealType.rawValue,
            itemName: itemName,
            calories: calories,
            sodiumMg: sodiumMg,
            potassiumMg: potassiumMg,
            phosphorusMg: phosphorusMg,
            proteinG: proteinG,
            fluidMl: fluidMl,
            loggedAt: loggedAt
        )
        context.insert(entry)
        try context.save()
    }

    static func entriesForDate(context: ModelContext, date: Date) throws -> [FoodLogEntry] {
        let ownerEmail = AppConfig.currentUserEmail
        guard !ownerEmail.isEmpty else { return [] }
        let cal = Calendar.current
        let start = cal.startOfDay(for: date)
        let end = cal.date(byAdding: .day, value: 1, to: start) ?? start

        var descriptor = FetchDescriptor<FoodLogEntry>(sortBy: [SortDescriptor(\.loggedAt, order: .reverse)])
        descriptor.predicate = #Predicate<FoodLogEntry> { $0.ownerEmail == ownerEmail && $0.loggedAt >= start && $0.loggedAt < end }
        return try context.fetch(descriptor)
    }

    static func deleteEntry(context: ModelContext, id: UUID) throws {
        let ownerEmail = AppConfig.currentUserEmail
        var descriptor = FetchDescriptor<FoodLogEntry>()
        descriptor.predicate = #Predicate<FoodLogEntry> { $0.id == id && $0.ownerEmail == ownerEmail }
        if let entry = try context.fetch(descriptor).first {
            context.delete(entry)
            try context.save()
        }
    }
}
