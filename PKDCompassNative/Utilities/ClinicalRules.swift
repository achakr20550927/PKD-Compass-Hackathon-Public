import Foundation
import SwiftData

enum ClinicalStatus: String {
    case normal = "NORMAL"
    case attention = "ATTENTION"
    case danger = "DANGER"
    case critical = "CRITICAL"
}

struct ClinicalInterpretation {
    let status: ClinicalStatus
    let label: String
    let message: String
}

struct NativeClinicalProfile {
    let dob: Date?
    let sexAtBirth: SexAtBirth?
    let heightCm: Double?
    let weightKg: Double?
    let hasHypertension: Bool
    let hasDiabetes: Bool

    var ageYears: Int? {
        guard let dob else { return nil }
        let now = Date()
        let calendar = Calendar.current
        var age = calendar.component(.year, from: now) - calendar.component(.year, from: dob)
        let birthMonthDay = calendar.dateComponents([.month, .day], from: dob)
        let currentMonthDay = calendar.dateComponents([.month, .day], from: now)
        if let birthMonth = birthMonthDay.month,
           let birthDay = birthMonthDay.day,
           let currentMonth = currentMonthDay.month,
           let currentDay = currentMonthDay.day,
           (currentMonth, currentDay) < (birthMonth, birthDay) {
            age -= 1
        }
        return max(age, 0)
    }

    var bmi: Double? {
        guard let heightCm, let weightKg, heightCm > 0 else { return nil }
        let heightMeters = heightCm / 100
        return weightKg / (heightMeters * heightMeters)
    }

    static let standard = NativeClinicalProfile(
        dob: nil,
        sexAtBirth: nil,
        heightCm: nil,
        weightKg: nil,
        hasHypertension: false,
        hasDiabetes: false
    )
}

enum ClinicalRules {
    static func profile(context: ModelContext, email: String = AppConfig.currentUserEmail) -> NativeClinicalProfile {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalizedEmail.isEmpty else { return .standard }

        var descriptor = FetchDescriptor<UserProfile>()
        descriptor.predicate = #Predicate<UserProfile> { $0.email == normalizedEmail }
        guard let record = try? context.fetch(descriptor).first else { return .standard }

        return NativeClinicalProfile(
            dob: record.dob,
            sexAtBirth: SexAtBirth(rawValue: record.sexAtBirthRaw ?? ""),
            heightCm: record.heightCm,
            weightKg: record.weightKg,
            hasHypertension: record.hasHypertension,
            hasDiabetes: record.hasDiabetes
        )
    }

    static func ckdStage(for eGFR: Double) -> String {
        if eGFR >= 90 { return "G1" }
        if eGFR >= 60 { return "G2" }
        if eGFR >= 45 { return "G3a" }
        if eGFR >= 30 { return "G3b" }
        if eGFR >= 15 { return "G4" }
        return "G5"
    }

    static func interpretEGFR(
        _ value: Double,
        history: [LabResult] = [],
        profile: NativeClinicalProfile = .standard
    ) -> ClinicalInterpretation {
        let stage = ckdStage(for: value)
        let sortedHistory = history.sorted { $0.timestamp < $1.timestamp }
        var message = "eGFR is \(Int(value)) mL/min/1.73m²."

        let status: ClinicalStatus
        switch stage {
        case "G1":
            status = .normal
            message += " This is in the normal or high range."
        case "G2":
            status = .attention
            message += " This is mildly decreased."
        case "G3a", "G3b":
            status = .danger
            message += " This is a moderate reduction in kidney filtration."
        default:
            status = .critical
            message += " This is a severe reduction in kidney filtration."
        }

        if let first = sortedHistory.first?.value, first > 0, let last = sortedHistory.last?.value, sortedHistory.count >= 2 {
            let decline = ((first - last) / first) * 100
            if decline >= 20 {
                message += " Trend shows about a \(Int(decline.rounded()))% decline from your earliest saved value."
            }
        }

        if profile.hasDiabetes || profile.hasHypertension {
            message += " Blood pressure and kidney-protective therapy are especially important with your profile."
        }

        return .init(status: status, label: stage, message: message)
    }

    static func interpretCreatinine(
        _ value: Double,
        profile: NativeClinicalProfile = .standard,
        history: [LabResult] = []
    ) -> ClinicalInterpretation {
        let isFemale = profile.sexAtBirth == .female
        let refLow = isFemale ? 0.5 : 0.7
        let refHigh = isFemale ? 1.1 : 1.3

        var status: ClinicalStatus = .normal
        var label = "Normal"
        var message = "Creatinine is \(String(format: "%.2f", value)) mg/dL."

        if value > refHigh {
            status = value > refHigh * 2 ? .danger : .attention
            label = "Elevated"
            message += " This is above the typical \(isFemale ? "female" : "male") reference range of \(String(format: "%.1f", refLow))-\(String(format: "%.1f", refHigh)) mg/dL."
        } else if value < refLow {
            status = .attention
            label = "Low"
            message += " This is slightly below the typical reference range."
        } else {
            message += " This is within a common \(isFemale ? "female" : "male") reference range."
        }

        if let previous = history.sorted(by: { $0.timestamp > $1.timestamp }).first {
            let delta = value - previous.value
            if delta >= 0.3 {
                status = .danger
                label = "Rapid Rise"
                message += " It has risen by \(String(format: "%.2f", delta)) mg/dL versus your latest prior result."
            }
        }

        if profile.bmi != nil {
            message += " Body size can shift the meaning of creatinine, so trends matter more than one reading alone."
        }

        return .init(status: status, label: label, message: message)
    }

    static func interpretPotassium(_ value: Double) -> ClinicalInterpretation {
        var status: ClinicalStatus = .normal
        var label = "Normal"
        var message = "Potassium is \(String(format: "%.1f", value)) mEq/L."

        if value >= 6.0 {
            status = .critical
            label = "Dangerous High"
            message += " This is dangerously high and can affect heart rhythm."
        } else if value >= 5.5 {
            status = .danger
            label = "High"
            message += " This is above the standard range of 3.5-5.0 mEq/L."
        } else if value > 5.0 {
            status = .attention
            label = "Borderline High"
            message += " This is mildly above the standard range."
        } else if value < 3.0 {
            status = .danger
            label = "Low"
            message += " This is dangerously low."
        } else if value < 3.5 {
            status = .attention
            label = "Borderline Low"
            message += " This is mildly below the standard range."
        } else {
            message += " This is within the standard range."
        }

        return .init(status: status, label: label, message: message)
    }

    static func interpretSodium(_ value: Double) -> ClinicalInterpretation {
        var status: ClinicalStatus = .normal
        var label = "Normal"
        var message = "Sodium is \(String(format: "%.1f", value)) mEq/L."

        if value < 125 || value > 150 {
            status = .danger
            label = "Major Imbalance"
            message += " This is far outside the standard 136-145 mEq/L range."
        } else if value < 136 || value > 145 {
            status = .attention
            label = "Mild Imbalance"
            message += " This is mildly outside the standard 136-145 mEq/L range."
        } else {
            message += " This is within the standard range."
        }

        return .init(status: status, label: label, message: message)
    }

    static func interpretPhosphorus(_ value: Double) -> ClinicalInterpretation {
        var status: ClinicalStatus = .normal
        var label = "Normal"
        var message = "Phosphorus is \(String(format: "%.1f", value)) mg/dL."

        if value > 6.0 {
            status = .danger
            label = "High"
            message += " This is clearly above the standard 2.5-4.5 mg/dL range."
        } else if value > 4.5 || value < 2.5 {
            status = .attention
            label = value > 4.5 ? "Borderline High" : "Low"
            message += " This is outside the standard 2.5-4.5 mg/dL range."
        } else {
            message += " This is within the standard range."
        }

        return .init(status: status, label: label, message: message)
    }

    static func interpretBUN(_ value: Double) -> ClinicalInterpretation {
        var status: ClinicalStatus = .normal
        var label = "Normal"
        var message = "BUN is \(String(format: "%.1f", value)) mg/dL."

        if value > 40 {
            status = .danger
            label = "High"
            message += " This is well above the common 7-20 mg/dL range."
        } else if value > 20 || value < 7 {
            status = .attention
            label = value > 20 ? "Elevated" : "Low"
            message += " This is outside the common 7-20 mg/dL range."
        } else {
            message += " This is within the common range."
        }

        return .init(status: status, label: label, message: message)
    }

    static func interpretUACR(_ value: Double) -> ClinicalInterpretation {
        if value >= 300 {
            return .init(status: .critical, label: "Severe Albuminuria", message: "uACR is severely elevated (>=300 mg/g).")
        }
        if value >= 30 {
            return .init(status: .danger, label: "Moderate Albuminuria", message: "uACR is elevated (30-299 mg/g).")
        }
        return .init(status: .normal, label: "Normal", message: "uACR is within target range (<30 mg/g).")
    }

    static func interpretBP(
        systolic: Int,
        diastolic: Int,
        ageYears: Int?
    ) -> ClinicalInterpretation {
        let profile = NativeClinicalProfile(
            dob: nil,
            sexAtBirth: nil,
            heightCm: nil,
            weightKg: nil,
            hasHypertension: false,
            hasDiabetes: false
        )
        return interpretBP(systolic: systolic, diastolic: diastolic, profile: profile, explicitAgeYears: ageYears)
    }

    static func interpretBP(
        systolic: Int,
        diastolic: Int,
        profile: NativeClinicalProfile = .standard,
        explicitAgeYears: Int? = nil
    ) -> ClinicalInterpretation {
        let ageYears = explicitAgeYears ?? profile.ageYears
        let targetSystolic = ((ageYears ?? 0) >= 65) ? 140 : 130
        let targetDiastolic = 80

        if systolic >= 160 || diastolic >= 100 {
            return .init(
                status: .danger,
                label: "High BP",
                message: "Blood pressure is significantly above the CKD target of <\(targetSystolic)/\(targetDiastolic) mmHg."
            )
        }
        if systolic > targetSystolic || diastolic > targetDiastolic {
            var message = "Blood pressure is above the CKD recommended target of <\(targetSystolic)/\(targetDiastolic) mmHg."
            if profile.hasDiabetes {
                message += " BP control is especially important with diabetes."
            }
            if profile.hasHypertension {
                message += " Your hypertension history increases the importance of trend monitoring."
            }
            return .init(status: .attention, label: "Above Target", message: message)
        }
        return .init(status: .normal, label: "At Target", message: "Blood pressure is within the target range for your profile.")
    }

    static func interpretObservation(
        metric: ObservationType,
        value: Double,
        history: [LabResult] = [],
        profile: NativeClinicalProfile = .standard
    ) -> ClinicalInterpretation {
        switch metric {
        case .egfr:
            return interpretEGFR(value, history: history, profile: profile)
        case .creatinine:
            return interpretCreatinine(value, profile: profile, history: history)
        case .potassium:
            return interpretPotassium(value)
        case .sodium:
            return interpretSodium(value)
        case .phosphorus:
            return interpretPhosphorus(value)
        case .bun:
            return interpretBUN(value)
        case .uacr:
            return interpretUACR(value)
        }
    }
}
