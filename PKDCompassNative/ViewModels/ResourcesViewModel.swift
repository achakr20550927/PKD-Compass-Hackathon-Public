import Foundation

@MainActor
final class ResourcesViewModel: ObservableObject {
    @Published var location = ""
    @Published var radius = 50
    @Published var specialty = ""
    @Published var providers: [ProviderDTO] = []
    @Published var directoryEntries: [ResourceEntryDTO] = []
    @Published var directoryHierarchy: DirectoryHierarchyDTO? = nil
    @Published var locationOptions = ResourceLocationOptionsDTO(regions: [], countries: [], states: [], cities: [])
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ResourcesAPIService()
    private let overpass = OverpassProviderService()
    private var latestDirectoryRequestID: UUID?

    // Compatibility aliases used by older views/tests.
    var resources: [ResourceEntryDTO] { directoryEntries }
    var hierarchy: DirectoryHierarchyDTO? { directoryHierarchy }

    func search() async {
        isLoading = true
        defer { isLoading = false }

        do {
            providers = try await service.searchProviders(locationQuery: location, radius: radius, specialty: specialty.isEmpty ? nil : specialty)
            if providers.isEmpty {
                providers = try await fallbackOverpass()
            }
            errorMessage = providers.isEmpty ? "No providers found for this area" : nil
        } catch {
            do {
                providers = try await fallbackOverpass()
                errorMessage = providers.isEmpty ? "No providers found for this area" : nil
            } catch {
                errorMessage = "Search failed. Check your internet connection."
            }
        }
    }

    func fetchDirectory(category: String? = nil, continent: String? = nil, country: String? = nil, state: String? = nil, city: String? = nil, search: String? = nil) async {
        let requestID = UUID()
        latestDirectoryRequestID = requestID
        isLoading = true
        do {
            async let directoryResponse = service.fetchDirectory(
                category: category,
                continent: continent,
                country: country,
                state: state,
                city: city,
                search: search,
                offset: 0,
                limit: 200
            )
            async let locationResponse = service.fetchLocationOptions(
                continent: continent,
                country: country,
                state: state,
                city: city,
                search: search
            )

            let (response, locations) = try await (directoryResponse, locationResponse)
            guard latestDirectoryRequestID == requestID else { return }
            directoryEntries = response.resources
            directoryHierarchy = response.hierarchy
            locationOptions = locations
            errorMessage = directoryEntries.isEmpty ? "No resources found for this area" : nil
        } catch {
            guard latestDirectoryRequestID == requestID else { return }
            errorMessage = "Directory unavailable. Check your connection."
        }

        if latestDirectoryRequestID == requestID {
            isLoading = false
        }
    }

    private func fallbackOverpass() async throws -> [ProviderDTO] {
        // Use the same geocoding strategy as the API service (Nominatim).
        let geocoded = try await geocode(location)
        guard let lat = geocoded?.lat, let lng = geocoded?.lng else { return [] }
        return try await overpass.searchProviders(lat: lat, lng: lng, radiusMiles: radius, specialty: specialty.isEmpty ? nil : specialty)
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
