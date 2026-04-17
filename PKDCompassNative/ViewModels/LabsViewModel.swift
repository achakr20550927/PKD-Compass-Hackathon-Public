import Foundation
import SwiftData

@MainActor
final class LabsViewModel: ObservableObject {
    enum MainView: String, CaseIterable, Identifiable {
        case labs = "LABS"
        case symptoms = "SYMPTOMS"
        var id: String { rawValue }
    }

    enum Timeframe: String, CaseIterable, Identifiable {
        case threeMonths = "3M"
        case sixMonths = "6M"
        case oneYear = "1Y"
        var id: String { rawValue }
    }

    @Published var view: MainView = .labs
    @Published var timeframe: Timeframe = .sixMonths
    @Published var isFilterOpen = false
    @Published var startDate: Date?
    @Published var endDate: Date?

    @Published var selectedMetric: ObservationType = .egfr
    @Published var allLabs: [LabResult] = []
    @Published var allSymptoms: [SymptomEntry] = []
    @Published var series: [ChartPoint] = []

    @Published var inputValue: String = ""
    @Published var inputUnit: String = ""
    @Published var inputDate: Date = .now
    @Published var editingLabID: UUID?

    @Published var symptomType = "Pain (Flank/Back)"
    @Published var symptomSeverity = 3
    @Published var symptomNotes = ""
    @Published var symptomDate: Date = .now
    @Published var editingSymptomID: UUID?

    @Published var errorMessage: String?
    private var profile: NativeClinicalProfile = .standard

    let symptomTypes = [
        "Pain (Flank/Back)",
        "Fatigue",
        "Hematuria (Blood in urine)",
        "Swelling (Edema)",
        "Shortness of Breath",
        "UTI symptoms",
        "Other"
    ]

    func load(context: ModelContext) {
        do {
            allLabs = try LabRepository.fetchLabs(context: context)
            allSymptoms = try SymptomRepository.all(context: context)
            profile = ClinicalRules.profile(context: context)
            refreshSeries(context: context)
        } catch {
            errorMessage = "Failed to load health logs"
        }

        Task { await syncLabsFromServer(context: context) }
    }

    func refreshSeries(context: ModelContext) {
        do {
            let metricLabs = try LabRepository.fetchLabs(context: context, type: selectedMetric)
            let filtered = applyTimeframe(metricLabs)
            series = filtered.map { ChartPoint(date: $0.timestamp, value: $0.value) }
        } catch {
            errorMessage = "Failed to load chart"
        }
    }

    func addLab(context: ModelContext) {
        guard let value = Double(inputValue) else {
            errorMessage = "Enter a numeric value"
            return
        }

        let defaultUnits: [ObservationType: String] = [
            .egfr: "mL/min/1.73m²",
            .creatinine: "mg/dL",
            .potassium: "mEq/L",
            .sodium: "mEq/L",
            .phosphorus: "mg/dL",
            .bun: "mg/dL",
            .uacr: "mg/g"
        ]

        let unit = inputUnit.isEmpty ? (defaultUnits[selectedMetric] ?? "") : inputUnit

        do {
            let saved = try LabRepository.addLab(
                context: context,
                type: selectedMetric,
                value: value,
                unit: unit,
                date: inputDate
            )

            inputValue = ""
            inputUnit = ""
            errorMessage = nil
            load(context: context)

            Task {
                _ = try? await MobileLabsService.create(
                    id: saved.id,
                    type: saved.typeRaw,
                    value: saved.value,
                    unit: saved.unit,
                    timestamp: saved.timestamp
                )
            }
        } catch {
            errorMessage = "Failed to save lab"
        }
    }

    func beginEditingLab(_ lab: LabResult) {
        editingLabID = lab.id
        selectedMetric = ObservationType(rawValue: lab.typeRaw) ?? .egfr
        inputValue = String(lab.value)
        inputUnit = lab.unit
        inputDate = lab.timestamp
        errorMessage = nil
    }

    func saveEditedLab(context: ModelContext) {
        guard let id = editingLabID,
              let lab = allLabs.first(where: { $0.id == id })
        else {
            errorMessage = "Lab record not found"
            return
        }
        guard let value = Double(inputValue) else {
            errorMessage = "Enter a numeric value"
            return
        }
        let unit = inputUnit.isEmpty ? defaultUnit(selectedMetric) : inputUnit
        do {
            try LabRepository.updateLab(
                context: context,
                lab: lab,
                type: selectedMetric,
                value: value,
                unit: unit,
                date: inputDate
            )
            resetLabForm()
            load(context: context)
        } catch {
            errorMessage = "Failed to update lab"
        }
    }

    func deleteLab(context: ModelContext, lab: LabResult) {
        do {
            try LabRepository.deleteLab(context: context, lab: lab)
            load(context: context)
        } catch {
            errorMessage = "Failed to delete lab"
        }
    }

    private func syncLabsFromServer(context: ModelContext) async {
        do {
            let remote = try await MobileLabsService.fetchAll()
            let ownerEmail = AppConfig.currentUserEmail
            guard !ownerEmail.isEmpty else { return }

            for row in remote {
                guard let uuid = UUID(uuidString: row.id) else { continue }
                var descriptor = FetchDescriptor<LabResult>()
                descriptor.predicate = #Predicate<LabResult> { $0.id == uuid && $0.ownerEmail == ownerEmail }
                if let existing = try? context.fetch(descriptor).first {
                    existing.typeRaw = row.type
                    existing.value = row.value
                    existing.unit = row.unit
                    existing.timestamp = row.timestamp
                } else {
                    context.insert(
                        LabResult(
                            id: uuid,
                            ownerEmail: ownerEmail,
                            typeRaw: row.type,
                            value: row.value,
                            unit: row.unit,
                            timestamp: row.timestamp
                        )
                    )
                }
            }
            try context.save()
            allLabs = try LabRepository.fetchLabs(context: context)
            refreshSeries(context: context)
        } catch {
            // ignore (offline / server not configured)
        }
    }

    func addSymptom(context: ModelContext) {
        do {
            let saved = try SymptomRepository.addEntry(
                context: context,
                type: symptomType,
                severity: symptomSeverity,
                notes: symptomNotes,
                timestamp: symptomDate
            )
            symptomNotes = ""
            symptomDate = .now
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

    func beginEditingSymptom(_ symptom: SymptomEntry) {
        editingSymptomID = symptom.id
        symptomType = symptom.type
        symptomSeverity = symptom.severity
        symptomNotes = symptom.notes ?? ""
        symptomDate = symptom.timestamp
        errorMessage = nil
    }

    func saveEditedSymptom(context: ModelContext) {
        guard let id = editingSymptomID,
              let symptom = allSymptoms.first(where: { $0.id == id })
        else {
            errorMessage = "Symptom record not found"
            return
        }
        do {
            try SymptomRepository.updateEntry(
                context: context,
                entry: symptom,
                type: symptomType,
                severity: symptomSeverity,
                notes: symptomNotes,
                timestamp: symptomDate
            )
            resetSymptomForm()
            load(context: context)
        } catch {
            errorMessage = "Failed to update symptom"
        }
    }

    func deleteSymptom(context: ModelContext, symptom: SymptomEntry) {
        do {
            try SymptomRepository.deleteEntry(context: context, entry: symptom)
            load(context: context)
        } catch {
            errorMessage = "Failed to delete symptom"
        }
    }

    var recentLabs: [LabResult] {
        allLabs.filter { include(date: $0.timestamp) }
    }

    var recentSymptoms: [SymptomEntry] {
        allSymptoms.filter { include(date: $0.timestamp) }
    }

    var egfrHistory: [LabResult] {
        history(for: .egfr)
    }

    func history(for metric: ObservationType) -> [LabResult] {
        let labs = allLabs
            .filter { $0.typeRaw == metric.rawValue }
            .sorted { $0.timestamp < $1.timestamp }
        return applyTimeframe(labs)
    }

    var latestEGFR: LabResult? { latest(for: .egfr) }
    var latestCreatinine: LabResult? { latest(for: .creatinine) }
    var latestBUN: LabResult? { latest(for: .bun) }
    var latestUACR: LabResult? { latest(for: .uacr) }

    func latest(for metric: ObservationType) -> LabResult? {
        allLabs
            .filter { $0.typeRaw == metric.rawValue }
            .sorted { $0.timestamp > $1.timestamp }
            .first
    }

    func status(for lab: LabResult?) -> String {
        guard let lab else { return "--" }
        let metric = ObservationType(rawValue: lab.typeRaw) ?? .egfr
        let history = allLabs.filter { $0.typeRaw == metric.rawValue }
        return ClinicalRules.interpretObservation(
            metric: metric,
            value: lab.value,
            history: history,
            profile: profile
        ).status.rawValue
    }

    func clearFilters() {
        startDate = nil
        endDate = nil
    }

    func resetLabForm() {
        editingLabID = nil
        inputValue = ""
        inputUnit = ""
        inputDate = .now
        errorMessage = nil
    }

    func resetSymptomForm() {
        editingSymptomID = nil
        symptomType = symptomTypes.first ?? "Pain (Flank/Back)"
        symptomSeverity = 3
        symptomNotes = ""
        symptomDate = .now
        errorMessage = nil
    }

    private func include(date: Date) -> Bool {
        if let startDate, date < startDate { return false }
        if let endDate {
            let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: endDate) ?? endDate
            if date > nextDay { return false }
        }
        return true
    }

    private func applyTimeframe(_ labs: [LabResult]) -> [LabResult] {
        let now = Date()
        let calendar = Calendar.current
        let startDate: Date?
        switch timeframe {
        case .threeMonths:
            startDate = calendar.date(byAdding: .month, value: -3, to: now)
        case .sixMonths:
            startDate = calendar.date(byAdding: .month, value: -6, to: now)
        case .oneYear:
            startDate = calendar.date(byAdding: .year, value: -1, to: now)
        }
        guard let startDate else { return labs }
        return labs.filter { $0.timestamp >= startDate }
    }

    private func defaultUnit(_ metric: ObservationType) -> String {
        switch metric {
        case .egfr: return "mL/min/1.73m²"
        case .creatinine, .phosphorus, .bun: return "mg/dL"
        case .potassium, .sodium: return "mEq/L"
        case .uacr: return "mg/g"
        }
    }
}

struct ChartPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}
