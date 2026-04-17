import Foundation

struct RemoteObservationDTO: Codable {
    let id: String
    let type: String
    let value: Double
    let unit: String
    let timestamp: Date
}

struct RemoteBloodPressureDTO: Codable {
    let id: String
    let systolic: Int
    let diastolic: Int
    let heartRate: Int?
    let timestamp: Date
}

struct RemoteSymptomDTO: Codable {
    let id: String
    let type: String
    let severity: Int
    let details: String?
    let timestamp: Date
}

struct RemoteMedicationDTO: Codable {
    let id: String
    let name: String
    let dosage: String
    let frequency: String
    let isActive: Bool
    let isTolvaptan: Bool
    let startDate: Date
    let instructions: String?
    let latestStatus: String?
    let latestStatusAt: Date?
}

struct RemoteDocumentDTO: Codable {
    let id: String
    let title: String
    let category: String
    let mimeType: String
    let fileKey: String
    let aiSummary: String?
    let aiFeedback: String?
    let createdAt: Date
    let viewUrl: String?
}

struct RemoteDocumentDetailDTO: Codable {
    let id: String
    let title: String
    let category: String
    let mimeType: String
    let fileKey: String
    let aiSummary: String?
    let aiFeedback: String?
    let createdAt: Date
    let viewUrl: String?
}

struct RemoteProfileDTO: Codable {
    let userId: String
    let firstName: String?
    let lastName: String?
    let dob: Date?
    let sexAtBirth: String?
    let phone: String?
    let zipCode: String?
    let heightCm: Double?
    let weightKg: Double?
    let hasDiabetes: Bool?
    let hasHypertension: Bool?
}

struct RemoteConsentStatusesDTO: Codable {
    let statuses: [String: Bool]
}

enum MobileLabsService {
    static func fetchAll(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> [RemoteObservationDTO] {
        try await api.request(path: "/api/mobile/labs")
    }

    static func create(
        id: UUID,
        type: String,
        value: Double,
        unit: String,
        timestamp: Date,
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws -> RemoteObservationDTO {
        let payload: [String: Any] = [
            "id": id.uuidString,
            "type": type,
            "value": value,
            "unit": unit,
            "timestamp": ISO8601DateFormatter().string(from: timestamp)
        ]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        return try await api.request(path: "/api/mobile/labs", method: "POST", body: body)
    }
}

enum MobileBPService {
    static func fetchAll(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> [RemoteBloodPressureDTO] {
        try await api.request(path: "/api/mobile/bp")
    }

    static func create(
        id: UUID,
        systolic: Int,
        diastolic: Int,
        heartRate: Int?,
        timestamp: Date,
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws -> RemoteBloodPressureDTO {
        let payload: [String: Any] = [
            "id": id.uuidString,
            "systolic": systolic,
            "diastolic": diastolic,
            "heartRate": heartRate as Any,
            "timestamp": ISO8601DateFormatter().string(from: timestamp)
        ]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        return try await api.request(path: "/api/mobile/bp", method: "POST", body: body)
    }
}

enum MobileProfileService {
    static func fetch(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> RemoteProfileDTO? {
        // Backend returns null when profile doesn't exist yet.
        // Decode using a wrapper to handle null.
        let data: RemoteProfileDTO? = try await api.request(path: "/api/mobile/profile")
        return data
    }

    static func update(
        patch: [String: Any],
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws -> RemoteProfileDTO {
        let body = try JSONSerialization.data(withJSONObject: patch, options: [])
        return try await api.request(path: "/api/mobile/profile", method: "PATCH", body: body)
    }
}

enum MobileSymptomsService {
    static func fetchAll(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> [RemoteSymptomDTO] {
        try await api.request(path: "/api/mobile/symptoms")
    }

    static func create(
        id: UUID,
        type: String,
        severity: Int,
        notes: String?,
        timestamp: Date,
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws -> RemoteSymptomDTO {
        let payload: [String: Any] = [
            "id": id.uuidString,
            "type": type,
            "severity": severity,
            "notes": notes as Any,
            "timestamp": ISO8601DateFormatter().string(from: timestamp)
        ]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        return try await api.request(path: "/api/mobile/symptoms", method: "POST", body: body)
    }
}

enum MobileMedsService {
    static func fetchAll(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> [RemoteMedicationDTO] {
        try await api.request(path: "/api/mobile/meds")
    }

    static func create(
        id: UUID,
        name: String,
        dosage: String,
        frequency: String,
        isTolvaptan: Bool,
        instructions: String?,
        startDate: Date,
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws -> RemoteMedicationDTO {
        let payload: [String: Any] = [
            "id": id.uuidString,
            "name": name,
            "dosage": dosage,
            "frequency": frequency,
            "isTolvaptan": isTolvaptan,
            "instructions": instructions as Any,
            "startDate": ISO8601DateFormatter().string(from: startDate)
        ]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        return try await api.request(path: "/api/mobile/meds", method: "POST", body: body)
    }

    static func log(
        medicationId: UUID,
        status: String,
        timestamp: Date,
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws {
        let payload: [String: Any] = [
            "medicationId": medicationId.uuidString,
            "status": status,
            "timestamp": ISO8601DateFormatter().string(from: timestamp)
        ]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        struct VoidResponse: Decodable {}
        _ = try await api.request(path: "/api/mobile/meds/log", method: "POST", body: body) as VoidResponse
    }

    static func delete(id: UUID, api: MobileAuthedAPI = MobileAuthedAPI()) async throws {
        let path = "/api/mobile/meds?id=\(id.uuidString)"
        try await api.requestVoid(path: path, method: "DELETE", body: nil)
    }
}

enum MobileDocumentsService {
    static func fetchAll(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> [RemoteDocumentDTO] {
        try await api.request(path: "/api/mobile/documents")
    }

    static func fetchDetail(id: UUID, api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> RemoteDocumentDetailDTO {
        try await api.request(path: "/api/mobile/documents/\(id.uuidString)")
    }

    static func delete(id: UUID, api: MobileAuthedAPI = MobileAuthedAPI()) async throws {
        let path = "/api/mobile/documents?id=\(id.uuidString)"
        try await api.requestVoid(path: path, method: "DELETE", body: nil)
    }
}

enum MobileConsentService {
    static func fetch(api: MobileAuthedAPI = MobileAuthedAPI()) async throws -> ConsentStatusSnapshot {
        let response: RemoteConsentStatusesDTO = try await api.request(path: "/api/mobile/consents")
        return ConsentStatusSnapshot(values: response.statuses)
    }

    static func update(
        _ entries: [(ConsentType, Bool)],
        api: MobileAuthedAPI = MobileAuthedAPI()
    ) async throws -> ConsentStatusSnapshot {
        let payload: [String: Any] = [
            "entries": entries.map { ["type": $0.0.rawValue, "status": $0.1] }
        ]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        let response: RemoteConsentStatusesDTO = try await api.request(path: "/api/mobile/consents", method: "PATCH", body: body)
        return ConsentStatusSnapshot(values: response.statuses)
    }
}
