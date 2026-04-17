import Foundation
import SwiftData

@MainActor
final class BloodPressureViewModel: ObservableObject {
    enum ReadingPeriod: String, CaseIterable, Identifiable {
        case am = "AM"
        case pm = "PM"
        var id: String { rawValue }
    }

    @Published var weekStart: Date?
    @Published var readings: [BloodPressureReading] = []
    @Published var systolicInput = ""
    @Published var diastolicInput = ""
    @Published var pulseInput = ""
    @Published var selectedSlot: (day: Int, period: ReadingPeriod)?
    @Published var isLogSheetPresented = false
    @Published var errorMessage: String?
    @Published var reportURL: URL?
    @Published var isShareSheetPresented = false

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load(context: ModelContext) {
        weekStart = defaults.object(forKey: weekStartKeyForCurrentUser()) as? Date
        guard let weekStart else {
            readings = []
            Task { await syncBPFromServer(context: context) }
            return
        }

        let end = Calendar.current.date(byAdding: .day, value: 7, to: weekStart) ?? weekStart
        do {
            readings = try BloodPressureRepository.readings(context: context, from: weekStart, to: end)
        } catch {
            errorMessage = "Failed to load blood pressure readings"
            readings = []
        }

        Task { await syncBPFromServer(context: context) }
    }

    func startWeeklyMode(context: ModelContext) {
        let startOfDay = Calendar.current.startOfDay(for: Date())
        defaults.set(startOfDay, forKey: weekStartKeyForCurrentUser())
        weekStart = startOfDay
        readings = []
        load(context: context)
    }

    func openLog(day: Int, period: ReadingPeriod) {
        selectedSlot = (day: day, period: period)
        systolicInput = ""
        diastolicInput = ""
        pulseInput = ""
        errorMessage = nil
        isLogSheetPresented = true
    }

    func saveReading(context: ModelContext) {
        guard let slot = selectedSlot, let weekStart else { return }
        guard let systolic = Int(systolicInput), let diastolic = Int(diastolicInput) else {
            errorMessage = "Enter valid systolic and diastolic values"
            return
        }

        var components = Calendar.current.dateComponents([.year, .month, .day], from: weekStart)
        components.day = (components.day ?? 1) + slot.day
        components.hour = slot.period == .am ? 8 : 20
        components.minute = 0
        guard let timestamp = Calendar.current.date(from: components) else {
            errorMessage = "Could not compute reading time"
            return
        }

        do {
            let saved = try BloodPressureRepository.addReading(
                context: context,
                systolic: systolic,
                diastolic: diastolic,
                heartRate: Int(pulseInput),
                timestamp: timestamp
            )
            isLogSheetPresented = false
            errorMessage = nil
            load(context: context)

            Task {
                _ = try? await MobileBPService.create(
                    id: saved.id,
                    systolic: saved.systolic,
                    diastolic: saved.diastolic,
                    heartRate: saved.heartRate,
                    timestamp: saved.timestamp
                )
            }
        } catch {
            errorMessage = "Failed to save reading"
        }
    }

    private func syncBPFromServer(context: ModelContext) async {
        do {
            let remote = try await MobileBPService.fetchAll()
            let ownerEmail = AppConfig.currentUserEmail
            guard !ownerEmail.isEmpty else { return }

            for row in remote {
                guard let uuid = UUID(uuidString: row.id) else { continue }
                var descriptor = FetchDescriptor<BloodPressureReading>()
                descriptor.predicate = #Predicate<BloodPressureReading> { $0.id == uuid && $0.ownerEmail == ownerEmail }
                if let existing = try? context.fetch(descriptor).first {
                    existing.systolic = row.systolic
                    existing.diastolic = row.diastolic
                    existing.heartRate = row.heartRate
                    existing.timestamp = row.timestamp
                } else {
                    context.insert(
                        BloodPressureReading(
                            id: uuid,
                            ownerEmail: ownerEmail,
                            systolic: row.systolic,
                            diastolic: row.diastolic,
                            heartRate: row.heartRate,
                            timestamp: row.timestamp
                        )
                    )
                }
            }
            try context.save()
            // Recompute displayed readings for current week
            if let weekStart {
                let end = Calendar.current.date(byAdding: .day, value: 7, to: weekStart) ?? weekStart
                readings = (try? BloodPressureRepository.readings(context: context, from: weekStart, to: end)) ?? readings
            } else {
                readings = (try? BloodPressureRepository.readings(context: context)) ?? readings
            }
        } catch {
            // ignore (offline)
        }
    }

    func reading(for day: Int, period: ReadingPeriod) -> BloodPressureReading? {
        guard let weekStart else { return nil }
        let targetDate = Calendar.current.date(byAdding: .day, value: day, to: weekStart) ?? weekStart
        return readings.first {
            Calendar.current.isDate($0.timestamp, inSameDayAs: targetDate) &&
            Calendar.current.component(.hour, from: $0.timestamp) == (period == .am ? 8 : 20)
        }
    }

    var currentDayIndex: Int {
        guard let weekStart else { return 0 }
        let diff = Calendar.current.dateComponents([.day], from: weekStart, to: Date()).day ?? 0
        return min(max(diff, 0), 6)
    }

    var completionPercent: Int {
        Int((Double(readings.count) / 14.0) * 100)
    }

    var averageText: String {
        guard !readings.isEmpty else { return "-- / --" }
        let avgSys = Int(readings.map(\.systolic).reduce(0, +) / readings.count)
        let avgDia = Int(readings.map(\.diastolic).reduce(0, +) / readings.count)
        return "\(avgSys) / \(avgDia)"
    }

    var canGenerateReport: Bool {
        !readings.isEmpty
    }

    func generateReport() {
        guard canGenerateReport else { return }

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short

        var lines: [String] = []
        lines.append("PKD Compass Blood Pressure Report")
        lines.append("")
        if let weekStart {
            lines.append("Week Start: \(formatter.string(from: weekStart))")
        }
        lines.append("Completion: \(completionPercent)%")
        lines.append("Weekly Average: \(averageText)")
        lines.append("")
        lines.append("Readings")
        lines.append("Date,Period,Systolic,Diastolic,Pulse")

        for reading in readings.sorted(by: { $0.timestamp < $1.timestamp }) {
            let period = Calendar.current.component(.hour, from: reading.timestamp) < 12 ? "AM" : "PM"
            let pulse = reading.heartRate.map(String.init) ?? ""
            lines.append("\(formatter.string(from: reading.timestamp)),\(period),\(reading.systolic),\(reading.diastolic),\(pulse)")
        }

        let filenameDate = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("pkd-bp-report-\(filenameDate).txt")

        do {
            try lines.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
            reportURL = url
            isShareSheetPresented = true
            errorMessage = nil
        } catch {
            errorMessage = "Failed to generate report"
        }
    }

    private func weekStartKeyForCurrentUser() -> String {
        "pkd.bp.weekStart.\(AppConfig.currentUserEmail)"
    }
}
