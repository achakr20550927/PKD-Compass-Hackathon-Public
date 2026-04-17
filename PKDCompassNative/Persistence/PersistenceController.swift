import Foundation
import SwiftData

final class PersistenceController {
    static let shared = PersistenceController()

    let container: ModelContainer

    private init() {
        let schema = Schema([
            UserProfile.self,
            LabResult.self,
            FoodLogEntry.self,
            BloodPressureReading.self,
            SymptomEntry.self,
            MedicationItem.self,
            MedicationLog.self,
            AppointmentItem.self,
            CareTaskItem.self,
            ResourceItem.self,
            DocumentRecord.self
        ])

        let configuration = ModelConfiguration("PKDCompassStore", schema: schema, isStoredInMemoryOnly: false)

        do {
            container = try ModelContainer(for: schema, configurations: [configuration])
            applyLocalFileProtection()
        } catch {
            fatalError("Failed to initialize SwiftData container: \(error)")
        }
    }

    private func applyLocalFileProtection() {
        guard let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return
        }

        do {
            try FileManager.default.createDirectory(at: applicationSupport, withIntermediateDirectories: true)
            try FileManager.default.setAttributes(
                [.protectionKey: FileProtectionType.complete],
                ofItemAtPath: applicationSupport.path
            )
        } catch {
            print("Failed to apply local file protection: \(error)")
        }
    }
}
