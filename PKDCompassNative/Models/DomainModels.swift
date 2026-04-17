import Foundation
import SwiftData

enum SexAtBirth: String, Codable, CaseIterable, Identifiable {
    case male = "MALE"
    case female = "FEMALE"

    var id: String { rawValue }
}

enum ObservationType: String, Codable, CaseIterable, Identifiable {
    case egfr = "EGFR"
    case creatinine = "CREATININE"
    case potassium = "POTASSIUM"
    case sodium = "SODIUM"
    case phosphorus = "PHOSPHORUS"
    case bun = "BUN"
    case uacr = "UACR"

    var id: String { rawValue }
}

enum MedicationFrequency: String, Codable, CaseIterable, Identifiable {
    case daily = "DAILY"
    case bid = "BID"
    case tid = "TID"
    case custom = "CUSTOM"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .bid: return "Twice daily"
        case .tid: return "Three times daily"
        case .custom: return "Custom days"
        }
    }
}

enum MealType: String, Codable, CaseIterable, Identifiable {
    case breakfast = "BREAKFAST"
    case lunch = "LUNCH"
    case dinner = "DINNER"
    case snacks = "SNACKS"
    case other = "OTHER"

    var id: String { rawValue }
}

enum ConsentType: String, CaseIterable, Identifiable, Codable {
    case termsOfUse = "TERMS_OF_USE"
    case privacyPolicy = "PRIVACY_POLICY"
    case cloudHealthStorage = "CLOUD_HEALTH_STORAGE"
    case bloodPressure = "BLOOD_PRESSURE"
    case labsAndSymptoms = "LABS_AND_SYMPTOMS"
    case medications = "MEDICATIONS"
    case careOrganizer = "CARE_ORGANIZER"
    case documentUpload = "DOCUMENT_UPLOAD"
    case documentAIAnalysis = "DOCUMENT_AI_ANALYSIS"
    case reportExports = "REPORT_EXPORTS"
    case notifications = "NOTIFICATIONS"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .termsOfUse: return "Terms of Use"
        case .privacyPolicy: return "Privacy Policy"
        case .cloudHealthStorage: return "Cloud Health Storage"
        case .bloodPressure: return "Blood Pressure Terms"
        case .labsAndSymptoms: return "Labs & Symptoms Terms"
        case .medications: return "Medication Terms"
        case .careOrganizer: return "Care Organizer Terms"
        case .documentUpload: return "Document Vault Uploads"
        case .documentAIAnalysis: return "AI Document Analysis"
        case .reportExports: return "Reports & Exports"
        case .notifications: return "Notifications"
        }
    }
}

struct ConsentStatusSnapshot {
    var values: [String: Bool]

    init(values: [String: Bool] = [:]) {
        self.values = values
    }

    func isGranted(_ type: ConsentType) -> Bool {
        values[type.rawValue] == true
    }
}

// Stores dose schedules for non-standard medication reminders using recurring weekdays + time.
struct MedicationDoseScheduleEntry: Identifiable, Codable, Hashable {
    var id: UUID
    var weekday: Int
    var time: MedicationTimeOfDay

    init(id: UUID = UUID(), weekday: Int, time: MedicationTimeOfDay) {
        self.id = id
        self.weekday = weekday
        self.time = time
    }

    init(id: UUID = UUID(), date: Date) {
        self.id = id
        self.weekday = Calendar.current.component(.weekday, from: date)
        self.time = MedicationTimeOfDay(
            hour: Calendar.current.component(.hour, from: date),
            minute: Calendar.current.component(.minute, from: date)
        )
    }

    var weekdayLabel: String {
        let symbols = Calendar.current.weekdaySymbols
        let idx = max(1, min(weekday, symbols.count)) - 1
        return symbols[idx]
    }

    enum CodingKeys: String, CodingKey {
        case id
        case weekday
        case time
        case date
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        if let weekday = try container.decodeIfPresent(Int.self, forKey: .weekday),
           let time = try container.decodeIfPresent(MedicationTimeOfDay.self, forKey: .time) {
            self.weekday = weekday
            self.time = time
            return
        }

        if let date = try container.decodeIfPresent(Date.self, forKey: .date) {
            self.weekday = Calendar.current.component(.weekday, from: date)
            self.time = MedicationTimeOfDay(
                hour: Calendar.current.component(.hour, from: date),
                minute: Calendar.current.component(.minute, from: date)
            )
            return
        }

        self.weekday = Calendar.current.component(.weekday, from: .now)
        self.time = MedicationTimeOfDay(
            hour: Calendar.current.component(.hour, from: .now),
            minute: Calendar.current.component(.minute, from: .now)
        )
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(weekday, forKey: .weekday)
        try container.encode(time, forKey: .time)
    }
}

// Stores time-of-day schedules for repeating reminders.
struct MedicationTimeOfDay: Codable, Hashable {
    var hour: Int
    var minute: Int

    init(hour: Int, minute: Int) {
        self.hour = hour
        self.minute = minute
    }
}

struct MedicationReminderSchedulePayload: Codable, Hashable {
    enum Kind: String, Codable {
        case daily
        case bid
        case tid
        case customDates
        case customWeekly
    }

    var kind: Kind
    var times: [MedicationTimeOfDay]?
    var entries: [MedicationDoseScheduleEntry]?
    var displayLabel: String?
}

@Model
final class FoodLogEntry {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var mealTypeRaw: String
    var itemName: String
    var calories: Double
    var sodiumMg: Double
    var potassiumMg: Double
    var phosphorusMg: Double
    var proteinG: Double
    var fluidMl: Double
    var loggedAt: Date

    init(
        id: UUID = UUID(),
        ownerEmail: String,
        mealTypeRaw: String,
        itemName: String,
        calories: Double,
        sodiumMg: Double,
        potassiumMg: Double,
        phosphorusMg: Double,
        proteinG: Double,
        fluidMl: Double = 0,
        loggedAt: Date = .now
    ) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.mealTypeRaw = mealTypeRaw
        self.itemName = itemName
        self.calories = calories
        self.sodiumMg = sodiumMg
        self.potassiumMg = potassiumMg
        self.phosphorusMg = phosphorusMg
        self.proteinG = proteinG
        self.fluidMl = fluidMl
        self.loggedAt = loggedAt
    }
}

@Model
final class UserProfile {
    @Attribute(.unique) var id: UUID
    var fullName: String
    var email: String
    var dob: Date?
    var sexAtBirthRaw: String?
    var heightCm: Double?
    var weightKg: Double?
    var country: String?
    var city: String?
    var zipCode: String?
    var phone: String?
    var hasHypertension: Bool
    var hasDiabetes: Bool

    init(
        id: UUID = UUID(),
        fullName: String = "",
        email: String = "",
        dob: Date? = nil,
        sexAtBirthRaw: String? = nil,
        heightCm: Double? = nil,
        weightKg: Double? = nil,
        country: String? = nil,
        city: String? = nil,
        zipCode: String? = nil,
        phone: String? = nil,
        hasHypertension: Bool = false,
        hasDiabetes: Bool = false
    ) {
        self.id = id
        self.fullName = fullName
        self.email = email
        self.dob = dob
        self.sexAtBirthRaw = sexAtBirthRaw
        self.heightCm = heightCm
        self.weightKg = weightKg
        self.country = country
        self.city = city
        self.zipCode = zipCode
        self.phone = phone
        self.hasHypertension = hasHypertension
        self.hasDiabetes = hasDiabetes
    }
}

@Model
final class LabResult {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var typeRaw: String
    var value: Double
    var unit: String
    var timestamp: Date

    init(id: UUID = UUID(), ownerEmail: String, typeRaw: String, value: Double, unit: String, timestamp: Date = .now) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.typeRaw = typeRaw
        self.value = value
        self.unit = unit
        self.timestamp = timestamp
    }
}

@Model
final class BloodPressureReading {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var systolic: Int
    var diastolic: Int
    var heartRate: Int?
    var timestamp: Date

    init(id: UUID = UUID(), ownerEmail: String, systolic: Int, diastolic: Int, heartRate: Int? = nil, timestamp: Date = .now) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.systolic = systolic
        self.diastolic = diastolic
        self.heartRate = heartRate
        self.timestamp = timestamp
    }
}

@Model
final class SymptomEntry {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var type: String
    var severity: Int
    var notes: String?
    var timestamp: Date

    init(id: UUID = UUID(), ownerEmail: String, type: String, severity: Int, notes: String? = nil, timestamp: Date = .now) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.type = type
        self.severity = severity
        self.notes = notes
        self.timestamp = timestamp
    }
}

@Model
final class MedicationItem {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var name: String
    var dosage: String
    var frequencyRaw: String
    var startDate: Date
    var isTolvaptan: Bool
    var reminderScheduleText: String?
    var isActive: Bool

    init(
        id: UUID = UUID(),
        ownerEmail: String,
        name: String,
        dosage: String,
        frequencyRaw: String,
        startDate: Date = .now,
        isTolvaptan: Bool = false,
        reminderScheduleText: String? = nil,
        isActive: Bool = true
    ) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.name = name
        self.dosage = dosage
        self.frequencyRaw = frequencyRaw
        self.startDate = startDate
        self.isTolvaptan = isTolvaptan
        self.reminderScheduleText = reminderScheduleText
        self.isActive = isActive
    }
}

@Model
final class MedicationLog {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var medicationId: UUID
    var status: String // TAKEN, MISSED
    var timestamp: Date

    init(id: UUID = UUID(), ownerEmail: String, medicationId: UUID, status: String, timestamp: Date = .now) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.medicationId = medicationId
        self.status = status
        self.timestamp = timestamp
    }
}

@Model
final class AppointmentItem {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var title: String
    var providerName: String?
    var location: String?
    var date: Date
    var notes: String?

    init(id: UUID = UUID(), ownerEmail: String, title: String, providerName: String? = nil, location: String? = nil, date: Date = .now, notes: String? = nil) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.title = title
        self.providerName = providerName
        self.location = location
        self.date = date
        self.notes = notes
    }
}

@Model
final class CareTaskItem {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var title: String
    var dueAt: Date?
    var status: String // OPEN, COMPLETED
    var createdAt: Date

    init(id: UUID = UUID(), ownerEmail: String, title: String, dueAt: Date? = nil, status: String = "OPEN", createdAt: Date = .now) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.title = title
        self.dueAt = dueAt
        self.status = status
        self.createdAt = createdAt
    }
}

@Model
final class ResourceItem {
    @Attribute(.unique) var id: UUID
    var name: String
    var summary: String
    var website: String?
    var phone: String?
    var location: String?

    init(id: UUID = UUID(), name: String, summary: String, website: String? = nil, phone: String? = nil, location: String? = nil) {
        self.id = id
        self.name = name
        self.summary = summary
        self.website = website
        self.phone = phone
        self.location = location
    }
}

@Model
final class DocumentRecord {
    @Attribute(.unique) var id: UUID
    var ownerEmail: String = ""
    var title: String
    var category: String
    var mimeType: String
    var localPath: String
    var aiSummary: String?
    var aiFeedback: String?
    var createdAt: Date

    init(
        id: UUID = UUID(),
        ownerEmail: String,
        title: String,
        category: String,
        mimeType: String,
        localPath: String,
        aiSummary: String? = nil,
        aiFeedback: String? = nil,
        createdAt: Date = .now
    ) {
        self.id = id
        self.ownerEmail = ownerEmail
        self.title = title
        self.category = category
        self.mimeType = mimeType
        self.localPath = localPath
        self.aiSummary = aiSummary
        self.aiFeedback = aiFeedback
        self.createdAt = createdAt
    }
}
