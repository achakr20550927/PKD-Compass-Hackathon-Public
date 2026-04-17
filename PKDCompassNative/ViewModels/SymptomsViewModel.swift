import Foundation
import SwiftData

@MainActor
final class SymptomsViewModel: ObservableObject {
    @Published var entries: [SymptomEntry] = []
    @Published var type = "Pain"
    @Published var severity = 3
    @Published var notes = ""
    @Published var errorMessage: String?

    let symptomTypes = ["Pain", "Fatigue", "Blood in urine", "UTI symptoms", "Other"]

    func load(context: ModelContext) {
        do {
            entries = try SymptomRepository.all(context: context)
        } catch {
            errorMessage = "Failed to load symptoms"
        }

        Task { await syncFromServer(context: context) }
    }

    func add(context: ModelContext) {
        do {
            let saved = try SymptomRepository.addEntry(context: context, type: type, severity: severity, notes: notes)
            notes = ""
            errorMessage = nil
            load(context: context)

            Task {
                _ = try? await MobileSymptomsService.create(
                    id: saved.id,
                    type: saved.type,
                    severity: saved.severity,
                    notes: saved.notes,
                    timestamp: saved.timestamp
                )
            }
        } catch {
            errorMessage = "Failed to save symptom"
        }
    }

    private func syncFromServer(context: ModelContext) async {
        do {
            let remote = try await MobileSymptomsService.fetchAll()
            let ownerEmail = AppConfig.currentUserEmail
            guard !ownerEmail.isEmpty else { return }

            for row in remote {
                guard let uuid = UUID(uuidString: row.id) else { continue }
                var descriptor = FetchDescriptor<SymptomEntry>()
                descriptor.predicate = #Predicate<SymptomEntry> { $0.id == uuid && $0.ownerEmail == ownerEmail }
                if let existing = try? context.fetch(descriptor).first {
                    existing.type = row.type
                    existing.severity = row.severity
                    existing.notes = row.details
                    existing.timestamp = row.timestamp
                } else {
                    context.insert(
                        SymptomEntry(
                            id: uuid,
                            ownerEmail: ownerEmail,
                            type: row.type,
                            severity: row.severity,
                            notes: row.details,
                            timestamp: row.timestamp
                        )
                    )
                }
            }
            try context.save()
            entries = try SymptomRepository.all(context: context)
        } catch {
            // ignore offline
        }
    }
}
