import Foundation

struct ProviderDTO: Decodable, Identifiable {
    let id: String
    let name: String
    let specialty: String
    let address: String
    let city: String?
    let state: String?
    let country: String
    let phone: String?
    let website: String?
    let distanceMiles: Double?
}

struct ProvidersResponse: Decodable {
    let providers: [ProviderDTO]
}

struct ResourceEntryDTO: Decodable, Identifiable {
    let id: String
    let name: String
    let summary: String
    let city: String?
    let state: String?
    let country: String
    let continent: String?
    let phone: String?
    let website: String?
    let cost: String?
    let labels: String?
    let services: String?
    let category: ResourceCategoryDTO?
}

struct ResourceCategoryDTO: Decodable {
    let name: String
    let label: String?
}

struct DirectoryHierarchyDTO: Decodable {
    let data: [String: [String: [String]]]

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.data = try container.decode([String: [String: [String]]].self)
    }
}

struct ResourcesResponse: Decodable {
    let resources: [ResourceEntryDTO]
    let hierarchy: DirectoryHierarchyDTO?
    let pagination: ResourcesPaginationDTO?
}

struct ResourcesPaginationDTO: Decodable {
    let offset: Int
    let limit: Int
    let total: Int
    let hasMore: Bool
    let nextOffset: Int?
}

struct ResourceLocationOptionsDTO: Decodable {
    let regions: [String]
    let countries: [String]
    let states: [String]
    let cities: [String]
}

final class ResourcesAPIService {
    func fetchDirectory(category: String?, continent: String?, country: String?, state: String?, city: String?, search: String?, offset: Int = 0, limit: Int = 400) async throws -> ResourcesResponse {
        let api = MobileAuthedAPI()
        let base = AppConfig.defaultBackendURL
        var components = URLComponents(string: "\(base)/api/resources")
        var items: [URLQueryItem] = []
        if let category, !category.isEmpty { items.append(URLQueryItem(name: "category", value: category)) }
        if let continent, !continent.isEmpty { items.append(URLQueryItem(name: "continent", value: continent)) }
        if let country, !country.isEmpty { items.append(URLQueryItem(name: "country", value: country)) }
        if let state, !state.isEmpty { items.append(URLQueryItem(name: "state", value: state)) }
        if let city, !city.isEmpty { items.append(URLQueryItem(name: "city", value: city)) }
        if let search, !search.isEmpty { items.append(URLQueryItem(name: "search", value: search)) }
        items.append(URLQueryItem(name: "offset", value: String(offset)))
        items.append(URLQueryItem(name: "limit", value: String(limit)))
        components?.queryItems = items.isEmpty ? nil : items

        guard let url = components?.url else { return ResourcesResponse(resources: [], hierarchy: nil, pagination: nil) }
        let path = url.absoluteString.replacingOccurrences(of: base, with: "")
        return try await api.request(path: path)
    }

    func searchProviders(locationQuery: String, radius: Int, specialty: String?) async throws -> [ProviderDTO] {
        let api = MobileAuthedAPI()
        let base = AppConfig.defaultBackendURL

        let geocoded = try await geocode(locationQuery)
        guard let lat = geocoded?.lat, let lng = geocoded?.lng else {
            return []
        }

        var components = URLComponents(string: "\(base)/api/providers")
        components?.queryItems = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
            URLQueryItem(name: "radius", value: String(radius))
        ]

        if let specialty, !specialty.isEmpty {
            components?.queryItems?.append(URLQueryItem(name: "specialty", value: specialty))
        }

        guard let url = components?.url else { return [] }
        let path = url.absoluteString.replacingOccurrences(of: base, with: "")
        let response: ProvidersResponse = try await api.request(path: path)
        return response.providers
    }

    func fetchLocationOptions(continent: String?, country: String?, state: String?, city: String?, search: String?) async throws -> ResourceLocationOptionsDTO {
        let api = MobileAuthedAPI()
        let base = AppConfig.defaultBackendURL
        var components = URLComponents(string: "\(base)/api/resources/locations")
        var items: [URLQueryItem] = []
        if let continent, !continent.isEmpty { items.append(URLQueryItem(name: "continent", value: continent)) }
        if let country, !country.isEmpty { items.append(URLQueryItem(name: "country", value: country)) }
        if let state, !state.isEmpty { items.append(URLQueryItem(name: "state", value: state)) }
        if let city, !city.isEmpty { items.append(URLQueryItem(name: "city", value: city)) }
        if let search, !search.isEmpty { items.append(URLQueryItem(name: "search", value: search)) }
        components?.queryItems = items.isEmpty ? nil : items

        guard let url = components?.url else {
            return ResourceLocationOptionsDTO(regions: [], countries: [], states: [], cities: [])
        }
        let path = url.absoluteString.replacingOccurrences(of: base, with: "")
        return try await api.request(path: path)
    }

    private func geocode(_ query: String) async throws -> (lat: Double, lng: Double)? {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        guard let url = URL(string: "https://nominatim.openstreetmap.org/search?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&format=json&limit=1") else { return nil }

        var req = URLRequest(url: url)
        req.setValue("PKDCompass/1.0", forHTTPHeaderField: "User-Agent")

        let (data, _) = try await URLSession.shared.data(for: req)
        guard
            let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            let first = arr.first,
            let latStr = first["lat"] as? String,
            let lngStr = first["lon"] as? String,
            let lat = Double(latStr),
            let lng = Double(lngStr)
        else { return nil }

        return (lat, lng)
    }
}
