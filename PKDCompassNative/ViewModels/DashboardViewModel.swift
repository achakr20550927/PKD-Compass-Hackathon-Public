import Foundation
import SwiftData

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var latestLabs: [LabResultCard] = []
    @Published var trendCards: [DashboardTrendCard] = []
    @Published var recentAlerts: [AlertBanner] = []
    private var didInitialServerSync = false
    private var profile: NativeClinicalProfile = .standard

    func load(context: ModelContext) {
        do {
            let allLabs = try LabRepository.fetchLabs(context: context)
            let latestByMetric = try LabRepository.latestByMetric(context: context)
            profile = ClinicalRules.profile(context: context)
            let dateFormatter = DateFormatter()
            dateFormatter.dateStyle = .medium

            var cards: [LabResultCard] = []
            let ordered: [ObservationType] = [.egfr, .creatinine, .potassium, .sodium, .phosphorus, .bun, .uacr]
            for metric in ordered {
                guard let lab = latestByMetric[metric.rawValue] else { continue }
                let status = statusText(for: metric, value: lab.value, allLabs: allLabs)
                cards.append(
                    LabResultCard(
                        metric: metric.rawValue,
                        value: formatValue(metric: metric, value: lab.value),
                        dateLabel: dateFormatter.string(from: lab.timestamp),
                        status: status,
                        trend: trendDirection(for: metric, allLabs: allLabs)
                    )
                )
            }
            latestLabs = cards
            recentAlerts = buildAlerts(from: cards)

            trendCards = ordered.map { metric in
                let history = allLabs
                    .filter { $0.typeRaw == metric.rawValue }
                    .sorted { $0.timestamp < $1.timestamp }
                let latest = latestByMetric[metric.rawValue]
                return DashboardTrendCard(
                    metric: metric,
                    title: "\(metric.rawValue) Trend",
                    unit: latest?.unit ?? defaultUnit(for: metric),
                    latestValueText: latest.map { formatValue(metric: metric, value: $0.value) } ?? "--",
                    status: latest.map { statusText(for: metric, value: $0.value, allLabs: allLabs) } ?? "--",
                    points: history.map { ChartPoint(date: $0.timestamp, value: $0.value) }
                )
            }
        } catch {
            latestLabs = []
            trendCards = []
            recentAlerts = []
        }

        if didInitialServerSync == false {
            didInitialServerSync = true
            Task { await syncLabsFromServer(context: context) }
        }
    }

    private func defaultUnit(for metric: ObservationType) -> String {
        switch metric {
        case .egfr: return "mL/min/1.73m²"
        case .creatinine, .phosphorus, .bun: return "mg/dL"
        case .potassium, .sodium: return "mEq/L"
        case .uacr: return "mg/g"
        }
    }

    private func trendDirection(for metric: ObservationType, allLabs: [LabResult]) -> TrendDirection {
        let values = allLabs
            .filter { $0.typeRaw == metric.rawValue }
            .sorted { $0.timestamp < $1.timestamp }
            .suffix(2)
            .map(\.value)
        guard values.count == 2 else { return .flat }
        if values[1] > values[0] { return .up }
        if values[1] < values[0] { return .down }
        return .flat
    }

    private func buildAlerts(from cards: [LabResultCard]) -> [AlertBanner] {
        cards.compactMap { card in
            if card.status == "NORMAL" || card.status == "--" { return nil }
            let level: AlertBanner.Level = card.status == "CRITICAL" ? .critical : .warning
            return AlertBanner(title: "\(card.metric) attention", message: "Latest \(card.metric) is \(card.value).", level: level)
        }
    }

    private func formatValue(metric: ObservationType, value: Double) -> String {
        switch metric {
        case .egfr, .uacr:
            return String(Int(value))
        default:
            return String(format: "%.1f", value)
        }
    }

    private func statusText(for metric: ObservationType, value: Double, allLabs: [LabResult]) -> String {
        let history = allLabs.filter { $0.typeRaw == metric.rawValue }
        let interpretation = ClinicalRules.interpretObservation(
            metric: metric,
            value: value,
            history: history,
            profile: profile
        )
        return interpretation.status.rawValue
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
            load(context: context)
        } catch {
            // ignore
        }
    }
}

struct DashboardTrendCard: Identifiable {
    let id = UUID()
    let metric: ObservationType
    let title: String
    let unit: String
    let latestValueText: String
    let status: String
    let points: [ChartPoint]
}

struct LabResultCard: Identifiable {
    let id = UUID()
    let metric: String
    let value: String
    let dateLabel: String
    let status: String
    let trend: TrendDirection
}

struct AlertBanner: Identifiable {
    enum Level { case info, warning, critical }

    let id = UUID()
    let title: String
    let message: String
    let level: Level
}

enum TrendDirection {
    case up, down, flat
}
