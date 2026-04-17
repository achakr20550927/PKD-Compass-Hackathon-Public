import Foundation

// Lightweight global provider lookup using OpenStreetMap Overpass.
// This avoids needing a pre-baked database of every city/country.
final class OverpassProviderService {
    struct SearchResult: Decodable {
        struct Element: Decodable {
            let type: String
            let id: Int
            let lat: Double?
            let lon: Double?
            let center: Center?
            let tags: [String: String]?

            struct Center: Decodable {
                let lat: Double
                let lon: Double
            }
        }

        let elements: [Element]
    }

    func searchProviders(lat: Double, lng: Double, radiusMiles: Int, specialty: String?) async throws -> [ProviderDTO] {
        let radiusMeters = max(1, radiusMiles) * 1609
        let query = overpassQuery(lat: lat, lng: lng, radiusMeters: radiusMeters, specialty: specialty)

        guard let url = URL(string: "https://overpass-api.de/api/interpreter") else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.setValue("PKDCompass/1.0", forHTTPHeaderField: "User-Agent")
        request.httpBody = "data=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")".data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return [] }

        let decoded = try JSONDecoder().decode(SearchResult.self, from: data)
        return decoded.elements.compactMap { element in
            let tags = element.tags ?? [:]
            let name = tags["name"] ?? tags["operator"] ?? tags["brand"]
            guard let name, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }

            let address = buildAddress(tags: tags)
            let phone = tags["phone"] ?? tags["contact:phone"]
            let website = tags["website"] ?? tags["contact:website"]

            let derivedSpecialty = specialtyLabel(tags: tags, requested: specialty)
            let id = "osm_\(element.type)_\(element.id)"

            return ProviderDTO(
                id: id,
                name: name,
                specialty: derivedSpecialty,
                address: address,
                city: tags["addr:city"],
                state: tags["addr:state"],
                country: tags["addr:country"] ?? "GLOBAL",
                phone: phone,
                website: website,
                distanceMiles: nil
            )
        }
        .prefix(80)
        .map { $0 }
    }

    private func buildAddress(tags: [String: String]) -> String {
        let parts: [String?] = [
            tags["addr:housenumber"].flatMap { num in
                if let street = tags["addr:street"] { return "\(num) \(street)" }
                return num
            } ?? tags["addr:street"],
            tags["addr:city"],
            tags["addr:state"],
            tags["addr:postcode"],
            tags["addr:country"]
        ]
        let compact = parts.compactMap { value -> String? in
            guard let value else { return nil }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        return compact.isEmpty ? (tags["description"] ?? "Address unavailable") : compact.joined(separator: ", ")
    }

    private func specialtyLabel(tags: [String: String], requested: String?) -> String {
        if let requested, !requested.isEmpty { return requested }
        if tags["healthcare"] == "dialysis" { return "DIALYSIS_CENTER" }
        if tags["amenity"] == "hospital" { return "HOSPITAL" }
        if tags["amenity"] == "clinic" { return "CLINIC" }
        if tags["healthcare"] == "doctor" { return "DOCTOR" }
        return "RESOURCE"
    }

    private func overpassQuery(lat: Double, lng: Double, radiusMeters: Int, specialty: String?) -> String {
        // Default query: mix of hospitals/clinics/doctors/dialysis + associations.
        // If specialty is provided, bias the query.
        let s = (specialty ?? "").uppercased()
        let hospital = "node(around:\(radiusMeters),\(lat),\(lng))[\"amenity\"=\"hospital\"];way(around:\(radiusMeters),\(lat),\(lng))[\"amenity\"=\"hospital\"];relation(around:\(radiusMeters),\(lat),\(lng))[\"amenity\"=\"hospital\"];"
        let clinic = "node(around:\(radiusMeters),\(lat),\(lng))[\"amenity\"=\"clinic\"];way(around:\(radiusMeters),\(lat),\(lng))[\"amenity\"=\"clinic\"];relation(around:\(radiusMeters),\(lat),\(lng))[\"amenity\"=\"clinic\"];"
        let dialysis = "node(around:\(radiusMeters),\(lat),\(lng))[\"healthcare\"=\"dialysis\"];way(around:\(radiusMeters),\(lat),\(lng))[\"healthcare\"=\"dialysis\"];relation(around:\(radiusMeters),\(lat),\(lng))[\"healthcare\"=\"dialysis\"];"
        let doctors = "node(around:\(radiusMeters),\(lat),\(lng))[\"healthcare\"=\"doctor\"];way(around:\(radiusMeters),\(lat),\(lng))[\"healthcare\"=\"doctor\"];relation(around:\(radiusMeters),\(lat),\(lng))[\"healthcare\"=\"doctor\"];"
        let associations = "node(around:\(radiusMeters),\(lat),\(lng))[\"office\"=\"association\"];way(around:\(radiusMeters),\(lat),\(lng))[\"office\"=\"association\"];relation(around:\(radiusMeters),\(lat),\(lng))[\"office\"=\"association\"];"

        let body: String
        if s.contains("DIALYSIS") {
            body = dialysis + hospital + clinic
        } else if s.contains("HOSP") {
            body = hospital + clinic + dialysis
        } else if s.contains("SUPPORT") || s.contains("ADVOC") {
            body = associations + hospital + clinic
        } else {
            body = hospital + clinic + dialysis + doctors + associations
        }

        return """
        [out:json][timeout:25];
        (
          \(body)
        );
        out center 80;
        """
    }
}

