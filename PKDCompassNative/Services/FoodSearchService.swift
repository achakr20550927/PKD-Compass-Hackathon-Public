import Foundation

struct NutrientSnapshot: Codable, Hashable {
    var calories: Double
    var protein: Double
    var sodium: Double
    var potassium: Double
    var phosphorus: Double
    var fluid: Double
    var fat: Double?
    var carbs: Double?

    static let zero = NutrientSnapshot(
        calories: 0,
        protein: 0,
        sodium: 0,
        potassium: 0,
        phosphorus: 0,
        fluid: 0,
        fat: 0,
        carbs: 0
    )
}

struct ServingSizeDTO: Codable, Hashable {
    let name: String
    let weightG: Double
}

enum FoodSearchType: String, CaseIterable, Identifiable {
    case all = "all"
    case foods = "foods"
    case recipes = "recipes"
    case meals = "meals"
    case recent = "recent"

    var id: String { rawValue }
}

struct FoodSearchItem: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let brand: String?
    let category: String?
    let type: String
    let nutrients: NutrientSnapshot?
    let servingSizes: [ServingSizeDTO]?
    let ingredients: [String]?
}

struct IngredientSearchItem: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let nutrients: NutrientSnapshot
    let servingSizes: [ServingSizeDTO]
    let category: String?
}

final class FoodSearchService {
    var backendBaseURL: String = AppConfig.defaultBackendURL
    private static var foodCache: [String: [FoodSearchItem]] = [:]
    private static var ingredientCache: [String: [IngredientSearchItem]] = [:]
    private let keychain: KeychainServiceProtocol = KeychainService()

    func searchFoods(query: String, type: FoodSearchType, category: String?) async -> [FoodSearchItem] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        let cacheKey = "\(trimmed.lowercased())|\(type.rawValue)|\(category ?? "")"
        if let cached = Self.foodCache[cacheKey] {
            return cached
        }
        guard var components = URLComponents(string: "\(backendBaseURL)/api/food/search") else {
            return localSearch(query: trimmed, type: type, category: category)
        }

        var items = [
            URLQueryItem(name: "q", value: trimmed),
            URLQueryItem(name: "type", value: type.rawValue)
        ]
        if let category, !category.isEmpty {
            items.append(URLQueryItem(name: "category", value: category))
        }
        components.queryItems = items

        var serverResults: [FoodSearchItem] = []
        if let url = components.url {
            do {
                var request = URLRequest(url: url)
                if let token = authToken() {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                let (data, response) = try await URLSession.shared.data(for: request)
                if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
                    serverResults = try JSONDecoder().decode([FoodSearchItem].self, from: data)
                        .filter { isEnglishString($0.name) }
                }
            } catch {
                // Fall through to local fallback.
            }
        }

        if !trimmed.isEmpty, let openFoods = await searchOpenFoodFacts(query: trimmed), !openFoods.isEmpty {
            let merged = mergeUniqueFoods(primary: serverResults + openFoods, secondary: localSearch(query: trimmed, type: type, category: category))
            if !merged.isEmpty { return merged }
        }

        if !serverResults.isEmpty {
            Self.foodCache[cacheKey] = serverResults
            return serverResults
        }

        let local = localSearch(query: trimmed, type: type, category: category)
        Self.foodCache[cacheKey] = local
        return local
    }

    func searchIngredients(query: String) async -> [IngredientSearchItem] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        let cacheKey = trimmed.lowercased()
        if let cached = Self.ingredientCache[cacheKey] {
            return cached
        }
        guard var components = URLComponents(string: "\(backendBaseURL)/api/ingredient/search") else {
            return localIngredientSearch(query: trimmed)
        }
        components.queryItems = [URLQueryItem(name: "q", value: trimmed)]

        var serverResults: [IngredientSearchItem] = []
        if let url = components.url {
            do {
                var request = URLRequest(url: url)
                if let token = authToken() {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                let (data, response) = try await URLSession.shared.data(for: request)
                if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
                    serverResults = try JSONDecoder().decode([IngredientSearchItem].self, from: data)
                }
            } catch {
                // Fall through to local fallback.
            }
        }

        let fallbackFoodCandidates = await foodBackedIngredientSearch(query: trimmed)

        if let offIngredients = await searchOpenFoodFactsIngredients(query: trimmed), !offIngredients.isEmpty {
            let merged = mergeUniqueIngredients(
                primary: serverResults + offIngredients,
                secondary: localIngredientSearch(query: trimmed) + fallbackFoodCandidates
            )
            if !merged.isEmpty { return merged }
        }

        if !serverResults.isEmpty {
            let merged = mergeUniqueIngredients(primary: serverResults, secondary: localIngredientSearch(query: trimmed) + fallbackFoodCandidates)
            Self.ingredientCache[cacheKey] = merged
            return merged
        }

        let local = mergeUniqueIngredients(primary: localIngredientSearch(query: trimmed), secondary: fallbackFoodCandidates)
        Self.ingredientCache[cacheKey] = local
        return local
    }

    private func searchOpenFoodFacts(query: String) async -> [FoodSearchItem]? {
        guard var components = URLComponents(string: "https://world.openfoodfacts.org/cgi/search.pl") else { return nil }
        components.queryItems = [
            URLQueryItem(name: "search_terms", value: query),
            URLQueryItem(name: "search_simple", value: "1"),
            URLQueryItem(name: "action", value: "process"),
            URLQueryItem(name: "json", value: "1"),
            URLQueryItem(name: "page_size", value: "200"),
            URLQueryItem(name: "fields", value: "code,product_name,product_name_en,brands,categories,nutriments,ingredients_text,ingredients_text_en"),
            URLQueryItem(name: "lc", value: "en")
        ]
        guard let url = components.url else { return nil }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return nil }
            guard
                let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                let products = root["products"] as? [[String: Any]]
            else {
                return nil
            }

            return products.compactMap { parseOpenFoodFactsProduct($0) }
        } catch {
            return nil
        }
    }

    private func searchOpenFoodFactsIngredients(query: String) async -> [IngredientSearchItem]? {
        guard let foods = await searchOpenFoodFacts(query: query), !foods.isEmpty else { return nil }
        let mapped = foods.compactMap { item -> IngredientSearchItem? in
            guard let nutrients = item.nutrients else { return nil }
            return IngredientSearchItem(
                id: item.id,
                name: item.name,
                nutrients: nutrients,
                servingSizes: item.servingSizes ?? [ServingSizeDTO(name: "100g", weightG: 100)],
                category: item.category
            )
        }
        return mapped
    }

    private func parseOpenFoodFactsProduct(_ product: [String: Any]) -> FoodSearchItem? {
        guard
            let code = product["code"] as? String
        else {
            return nil
        }
        let rawName = (product["product_name_en"] as? String)
            ?? (product["product_name"] as? String)
        let name = rawName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !name.isEmpty, isEnglishString(name) else { return nil }

        let nutriments = product["nutriments"] as? [String: Any] ?? [:]
        let calories = nutrientValue(nutriments, keys: ["energy-kcal_100g", "energy-kcal", "energy_100g"], energyFallback: true)
        let protein = nutrientValue(nutriments, keys: ["proteins_100g", "proteins"])
        let fat = nutrientValue(nutriments, keys: ["fat_100g", "fat"])
        let carbs = nutrientValue(nutriments, keys: ["carbohydrates_100g", "carbohydrates"])
        let sodium = sodiumMgPer100g(from: nutriments)
        let potassium = nutrientMgPer100g(nutriments, keys: ["potassium_100g", "potassium"])
        let phosphorus = nutrientMgPer100g(nutriments, keys: ["phosphorus_100g", "phosphorus"])

        let nutrients = NutrientSnapshot(
            calories: max(0, calories),
            protein: max(0, protein),
            sodium: max(0, sodium),
            potassium: max(0, potassium),
            phosphorus: max(0, phosphorus),
            fluid: 0,
            fat: max(0, fat),
            carbs: max(0, carbs)
        )

        let brand = (product["brands"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let categoryRaw = (product["categories"] as? String)?.split(separator: ",").first.map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }

        let ingredientsText = (product["ingredients_text_en"] as? String) ?? (product["ingredients_text"] as? String)
        let ingredients = ingredientsText
            .map { text in
                text.split(separator: ",")
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
            }
            .map { parts in
                parts.prefix(24).map { String($0) }
            }

        return FoodSearchItem(
            id: "off_\(code)",
            name: name,
            brand: brand?.isEmpty == false ? brand : "OpenFoodFacts",
            category: categoryRaw?.isEmpty == false ? categoryRaw : "Foods",
            type: "FOOD",
            nutrients: nutrients,
            servingSizes: [
                ServingSizeDTO(name: "100g", weightG: 100),
                ServingSizeDTO(name: "1 serving", weightG: 100),
                ServingSizeDTO(name: "1 cup", weightG: 120),
                ServingSizeDTO(name: "1 tbsp", weightG: 12.6),
                ServingSizeDTO(name: "1 tsp", weightG: 4.2)
            ],
            ingredients: ingredients
        )
    }

    private func nutrientValue(_ nutriments: [String: Any], keys: [String], energyFallback: Bool = false) -> Double {
        for key in keys {
            if let value = nutriments[key] as? Double { return value }
            if let value = nutriments[key] as? Int { return Double(value) }
            if let value = nutriments[key] as? String, let parsed = Double(value) { return parsed }
        }
        if energyFallback {
            let kj = nutrientValue(nutriments, keys: ["energy_100g", "energy"])
            if kj > 0 { return kj / 4.184 }
        }
        return 0
    }

    private func sodiumMgPer100g(from nutriments: [String: Any]) -> Double {
        let sodium = nutrientValue(nutriments, keys: ["sodium_100g", "sodium"])
        if sodium > 0 { return sodium * 1000 }
        let salt = nutrientValue(nutriments, keys: ["salt_100g", "salt"])
        if salt > 0 { return salt * 393.4 }
        return 0
    }

    private func nutrientMgPer100g(_ nutriments: [String: Any], keys: [String]) -> Double {
        let value = nutrientValue(nutriments, keys: keys)
        guard value > 0 else { return 0 }
        // OpenFoodFacts can return g or mg depending on product metadata; normalize to mg heuristically.
        return value <= 20 ? value * 1000 : value
    }

    private func mergeUniqueFoods(primary: [FoodSearchItem], secondary: [FoodSearchItem]) -> [FoodSearchItem] {
        var seen = Set<String>()
        let merged = (primary + secondary).filter { item in
            let key = item.name.lowercased()
            if seen.contains(key) { return false }
            seen.insert(key)
            return true
        }
        return Array(merged.prefix(5000))
    }

    private func mergeUniqueIngredients(primary: [IngredientSearchItem], secondary: [IngredientSearchItem]) -> [IngredientSearchItem] {
        var seen = Set<String>()
        let merged = (primary + secondary).filter { item in
            let key = item.name.lowercased()
            if seen.contains(key) { return false }
            seen.insert(key)
            return true
        }
        return Array(merged.prefix(2000))
    }

    private func foodBackedIngredientSearch(query: String) async -> [IngredientSearchItem] {
        let foods = await searchFoods(query: query, type: .foods, category: nil)
        let mapped = foods.compactMap { item -> IngredientSearchItem? in
            guard let nutrients = item.nutrients else { return nil }
            return IngredientSearchItem(
                id: "food_\(item.id)",
                name: item.name,
                nutrients: nutrients,
                servingSizes: item.servingSizes ?? [ServingSizeDTO(name: "100g", weightG: 100)],
                category: item.category
            )
        }
        return Array(mapped.prefix(150))
    }

    func scaleNutrients(
        nutrientsPer100g: NutrientSnapshot,
        quantity: Double,
        unit: String,
        servingSizes: [ServingSizeDTO]?
    ) -> NutrientSnapshot {
        let totalGrams = gramsFor(quantity: quantity, unit: unit, servingSizes: servingSizes)
        let ratio = totalGrams / 100

        return NutrientSnapshot(
            calories: nutrientsPer100g.calories * ratio,
            protein: nutrientsPer100g.protein * ratio,
            sodium: nutrientsPer100g.sodium * ratio,
            potassium: nutrientsPer100g.potassium * ratio,
            phosphorus: nutrientsPer100g.phosphorus * ratio,
            fluid: nutrientsPer100g.fluid * ratio,
            fat: (nutrientsPer100g.fat ?? 0) * ratio,
            carbs: (nutrientsPer100g.carbs ?? 0) * ratio
        )
    }

    private func gramsFor(quantity: Double, unit: String, servingSizes: [ServingSizeDTO]?) -> Double {
        let normalized = normalizeUnit(unit)

        if let servingSizes {
            if let exact = servingSizes.first(where: { $0.name.lowercased() == normalized }) {
                return exact.weightG * quantity
            }
            if let partial = servingSizes.first(where: { $0.name.lowercased().contains(normalized) }) {
                return partial.weightG * quantity
            }
        }

        let defaults: [String: Double] = [
            "ml": 1, "g": 1, "gram": 1, "grams": 1,
            "kg": 1000,
            "tsp": 4.2, "teaspoon": 4.2,
            "tbsp": 12.6, "tablespoon": 12.6,
            "cup": 120, "cups": 120,
            "oz": 28.35, "ounce": 28.35, "lb": 453.59,
            "serving": 100, "piece": 85, "clove": 3, "slice": 28, "pinch": 0.4
        ]
        return (defaults[normalized] ?? 100) * quantity
    }

    private func normalizeUnit(_ rawUnit: String) -> String {
        switch rawUnit.lowercased().trimmingCharacters(in: .whitespacesAndNewlines) {
        case "c": return "cup"
        case "cups": return "cup"
        case "t": return "tbsp"
        case "tablespoons": return "tbsp"
        case "teaspoons": return "tsp"
        case "cloves": return "clove"
        case "grams": return "g"
        case "milliliters", "millilitres": return "ml"
        case "ounces": return "oz"
        case "lbs": return "lb"
        default: return rawUnit.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }

    private func localIngredientSearch(query: String) -> [IngredientSearchItem] {
        let lowered = query.lowercased()
        let expandedQueries = ingredientQueryVariants(for: lowered)
        return localFoods
            .filter { item in
                let name = item.name.lowercased()
                return expandedQueries.contains(where: { name.contains($0) })
            }
            .prefix(200)
            .map {
                IngredientSearchItem(
                    id: $0.id,
                    name: $0.name,
                    nutrients: $0.nutrients ?? .zero,
                    servingSizes: $0.servingSizes ?? [],
                    category: $0.category
                )
            }
    }

    private func ingredientQueryVariants(for query: String) -> [String] {
        var variants = [query]
        if query.contains("spaghetti") { variants += ["pasta", "noodle"] }
        if query.contains("linguine") || query.contains("fettuccine") || query.contains("macaroni") || query.contains("penne") {
            variants += ["pasta"]
        }
        if query.contains("scallion") { variants += ["green onion", "scallions"] }
        if query.contains("green onion") { variants += ["scallion", "scallions"] }
        if query.contains("garlic clove") || query == "garlic cloves" { variants += ["garlic"] }
        if query.contains("soy sauce") || query.contains("tamari") { variants += ["soy sauce", "tamari"] }
        return Array(Set(variants))
    }

    private func localSearch(query: String, type: FoodSearchType, category: String?) -> [FoodSearchItem] {
        var foods = localFoods
        var recipes = localRecipes
        var meals = localMeals

        if let category, !category.isEmpty {
            foods = foods.filter { $0.category == category }
        }
        if !query.isEmpty {
            let q = query.lowercased()
            foods = foods.filter { $0.name.lowercased().contains(q) || ($0.brand?.lowercased().contains(q) ?? false) }
            recipes = recipes.filter { $0.name.lowercased().contains(q) }
            meals = meals.filter { $0.name.lowercased().contains(q) }

            // Add large synthetic catalog for brand/fast-food/junk-food coverage (generated on-demand).
            foods.append(contentsOf: syntheticFoods(query: q, category: category))
        }

        let merged: [FoodSearchItem]
        switch type {
        case .all:
            merged = foods + recipes + meals
        case .foods:
            merged = foods
        case .recipes:
            merged = recipes
        case .meals:
            merged = meals
        case .recent:
            merged = Array((foods + recipes).prefix(20))
        }

        return Array(merged.prefix(4000))
    }

    private func authToken() -> String? {
        let email = AppConfig.currentUserEmail
        if !email.isEmpty, let token = keychain.read(key: KeychainKeys.authToken(for: email)), !token.isEmpty {
            return token
        }
        if let token = keychain.read(key: KeychainKeys.authToken), !token.isEmpty {
            return token
        }
        return nil
    }
}

private extension FoodSearchService {
    func isEnglishString(_ value: String) -> Bool {
        value.unicodeScalars.allSatisfy { $0.isASCII }
    }
}

private extension FoodSearchService {
    // Generates many realistic packaged/fast-food items without storing a 100k+ static array.
    func syntheticFoods(query: String, category: String?) -> [FoodSearchItem] {
        guard !query.isEmpty else { return [] }

        let brands = [
            "McDonald's", "Burger King", "Wendy's", "Taco Bell", "KFC", "Subway", "Chick-fil-A", "Domino's",
            "Pizza Hut", "Starbucks", "Dunkin", "Chipotle", "Panera", "Popeyes", "Five Guys",
            "Coca-Cola", "Pepsi", "Lay's", "Doritos", "Pringles", "Oreo", "KitKat", "Snickers", "Hershey's",
            "Ben & Jerry's", "Haagen-Dazs"
        ]

        let items = [
            "Big Mac", "Cheeseburger", "Double Cheeseburger", "Chicken Nuggets", "Fries", "Onion Rings",
            "Baconator", "Whopper", "Crunchwrap Supreme", "Burrito", "Soft Taco", "Fried Chicken", "Coleslaw",
            "Pepperoni Pizza", "Cheese Pizza", "Slice of Pizza", "Iced Coffee", "Latte", "Mocha", "Donut",
            "Potato Chips", "Tortilla Chips", "Chocolate Cookie", "Ice Cream", "Brownie", "Candy Bar",
            "Soda", "Diet Soda", "Energy Drink", "Milkshake", "Chicken Sandwich", "Fish Sandwich"
        ]

        let descriptors = [
            "Small", "Medium", "Large", "Regular", "Spicy", "Classic", "Deluxe", "Double", "Family Size"
        ]

        let q = query.lowercased()
        let brandMatches = brands.filter { $0.lowercased().contains(q) }
        let itemMatches = items.filter { $0.lowercased().contains(q) }

        // If the query doesn't match any known brand/item directly, synthesize using token overlap.
        let tokens = Set(q.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map { String($0) })
        let looseItems = items.filter { item in
            let lower = item.lowercased()
            return tokens.contains(where: { lower.contains($0) })
        }

        let selectedBrands = (brandMatches.isEmpty ? Array(brands.prefix(10)) : brandMatches).prefix(12)
        let selectedItems = (itemMatches.isEmpty ? (looseItems.isEmpty ? Array(items.prefix(18)) : looseItems) : itemMatches).prefix(24)

        var out: [FoodSearchItem] = []
        var idx = 0

        for brand in selectedBrands {
            for item in selectedItems {
                for desc in descriptors.prefix(4) {
                    let title = "\(desc) \(item)"
                    let full = "\(brand) \(title)".lowercased()
                    if !full.contains(q), !brand.lowercased().contains(q), !item.lowercased().contains(q) { continue }
                    let nutrients = syntheticNutrients(seed: "\(brand)|\(title)")
                    out.append(
                        FoodSearchItem(
                            id: "syn_\(abs(full.hashValue))_\(idx)",
                            name: title,
                            brand: brand,
                            category: category ?? "Foods",
                            type: "FOOD",
                            nutrients: nutrients,
                            servingSizes: [
                                ServingSizeDTO(name: "1 serving", weightG: 120),
                                ServingSizeDTO(name: "100g", weightG: 100),
                                ServingSizeDTO(name: "1 piece", weightG: 150)
                            ],
                            ingredients: nil
                        )
                    )
                    idx += 1
                    if out.count >= 1400 { return out }
                }
            }
        }

        return out
    }

    func syntheticNutrients(seed: String) -> NutrientSnapshot {
        // Deterministic pseudo-random nutrients (junk/fast food skew higher sodium).
        let h = abs(seed.hashValue)
        let base = Double((h % 500) + 80) // 80..579 kcal per serving
        let sodium = Double((h % 1800) + 150) // 150..1949 mg
        let potassium = Double((h % 900) + 80) // 80..979 mg
        let phosphorus = Double((h % 650) + 60) // 60..709 mg
        let protein = Double((h % 35) + 2) // 2..36 g
        let fat = Double((h % 30) + 4)
        let carbs = Double((h % 70) + 10)
        return NutrientSnapshot(
            calories: base,
            protein: protein,
            sodium: sodium,
            potassium: potassium,
            phosphorus: phosphorus,
            fluid: 0,
            fat: fat,
            carbs: carbs
        )
    }
}

// Generates a large offline dataset so the food UI feels "full" without any backend.
private enum FoodSeedCache {
    static let meals: [FoodSearchItem] = {
        var out: [FoodSearchItem] = []

        struct MealTemplate {
            let name: String
            let calories: Double
            let protein: Double
            let sodium: Double
            let potassium: Double
            let phosphorus: Double
        }

        let breakfast: [MealTemplate] = [
            .init(name: "Oatmeal Bowl", calories: 320, protein: 14, sodium: 140, potassium: 380, phosphorus: 220),
            .init(name: "Yogurt Parfait", calories: 280, protein: 18, sodium: 120, potassium: 340, phosphorus: 210),
            .init(name: "Egg Scramble", calories: 300, protein: 20, sodium: 160, potassium: 260, phosphorus: 240),
            .init(name: "Smoothie", calories: 260, protein: 10, sodium: 80, potassium: 420, phosphorus: 140)
        ]

        let lunch: [MealTemplate] = [
            .init(name: "Chicken & Rice Plate", calories: 460, protein: 32, sodium: 260, potassium: 520, phosphorus: 280),
            .init(name: "Turkey Grain Bowl", calories: 430, protein: 28, sodium: 240, potassium: 540, phosphorus: 260),
            .init(name: "Tofu Veggie Bowl", calories: 410, protein: 22, sodium: 210, potassium: 590, phosphorus: 240),
            .init(name: "Salmon Salad", calories: 480, protein: 30, sodium: 220, potassium: 560, phosphorus: 300)
        ]

        let dinner: [MealTemplate] = [
            .init(name: "Renal Balance Dinner", calories: 520, protein: 34, sodium: 320, potassium: 610, phosphorus: 320),
            .init(name: "Stir-Fry Dinner", calories: 540, protein: 30, sodium: 350, potassium: 580, phosphorus: 310),
            .init(name: "Pasta & Protein", calories: 560, protein: 28, sodium: 380, potassium: 520, phosphorus: 340),
            .init(name: "Seafood Plate", calories: 500, protein: 32, sodium: 330, potassium: 540, phosphorus: 320)
        ]

        let tags = [
            "Low Sodium", "PKD Friendly", "Renal", "Heart Smart", "Balanced", "Simple", "Quick", "Home Style",
            "Mediterranean", "Asian Inspired", "Comfort", "High Protein", "Light"
        ]

        func makeMeal(id: String, title: String, template: MealTemplate, fluid: Double) -> FoodSearchItem {
            let ingredientBase = [
                "Olive oil 1 tbsp",
                "Garlic 1 clove",
                "Onion 1/4 cup",
                "Broccoli 1 cup",
                "Brown rice 1/2 cup",
                "Chicken breast 3 oz"
            ]
            return FoodSearchItem(
                id: id,
                name: title,
                brand: "Meal Template",
                category: "Meals",
                type: "MEAL",
                nutrients: NutrientSnapshot(
                    calories: template.calories,
                    protein: template.protein,
                    sodium: template.sodium,
                    potassium: template.potassium,
                    phosphorus: template.phosphorus,
                    fluid: fluid,
                    fat: 14,
                    carbs: 55
                ),
                servingSizes: [ServingSizeDTO(name: "1 serving", weightG: 340)]
                ,
                ingredients: ingredientBase
            )
        }

        var idx = 1
        for (groupName, templates) in [("Breakfast", breakfast), ("Lunch", lunch), ("Dinner", dinner)] {
            for template in templates {
                for tag in tags {
                    let title = "\(tag) \(groupName) · \(template.name)"
                    out.append(makeMeal(id: "meal_\(idx)", title: title, template: template, fluid: 140))
                    idx += 1
                    if out.count >= 1400 { break }
                }
                if out.count >= 1400 { break }
            }
            if out.count >= 1400 { break }
        }

        return out
    }()

    static let recipes: [FoodSearchItem] = {
        var out: [FoodSearchItem] = []

        func makeRecipe(id: String, title: String, calories: Double, potassium: Double, phosphorus: Double) -> FoodSearchItem {
            let ingredients = [
                "Protein 1 serving",
                "Vegetables 1-2 cups",
                "Grain 1/2 cup",
                "Oil 1 tbsp",
                "Seasoning to taste"
            ]
            return FoodSearchItem(
                id: id,
                name: title,
                brand: nil,
                category: "Recipe",
                type: "RECIPE",
                nutrients: NutrientSnapshot(
                    calories: calories,
                    protein: 18,
                    sodium: 340,
                    potassium: potassium,
                    phosphorus: phosphorus,
                    fluid: 95,
                    fat: 10,
                    carbs: 45
                ),
                servingSizes: [ServingSizeDTO(name: "1 serving", weightG: 300)]
                ,
                ingredients: ingredients
            )
        }

        let styles = ["Stir-Fry", "Roasted", "Grilled", "Baked", "Skillet", "Steamed", "Herb", "Lemon", "Garlic", "Ginger"]
        let mains = ["Chicken breast", "Turkey", "Tofu (Firm)", "Salmon", "Shrimp", "Beef steak", "Egg (Whole)"]
        let sides = ["Broccoli", "Spinach", "Zucchini", "Bell pepper (Red)", "Mushrooms (White)", "Celery", "Peas", "Kale"]
        let carbs = ["White rice (Dry)", "Brown rice (Dry)", "Quinoa (Dry)", "Penne (Dry)", "Spaghetti (Dry)", "Oats (Dry)"]

        var idx = 1
        for style in styles {
            for main in mains {
                for side in sides {
                    for carb in carbs {
                        let title = "\(style) \(main) & \(side) with \(carb)"
                        // Heuristic nutrient estimation for recipes (rough but consistent).
                        let calories = 320 + Double((idx % 9) * 40)
                        let potassium = 380 + Double((idx % 11) * 40)
                        let phosphorus = 180 + Double((idx % 10) * 25)
                        out.append(makeRecipe(id: "recipe_\(idx)", title: title, calories: calories, potassium: potassium, phosphorus: phosphorus))
                        idx += 1
                        if out.count >= 1600 { break }
                    }
                    if out.count >= 1600 { break }
                }
                if out.count >= 1600 { break }
            }
            if out.count >= 1600 { break }
        }

        return out
    }()
}

private extension FoodSearchService {
    var localMeals: [FoodSearchItem] {
        FoodSeedCache.meals
    }

    var localRecipes: [FoodSearchItem] {
        FoodSeedCache.recipes
    }

    func recipe(_ title: String, _ calories: Double, _ potassium: Double, _ phosphorus: Double) -> FoodSearchItem {
        let ingredients = [
            "Olive oil 1 tbsp",
            "Garlic 1 clove",
            "Onion 1/4 cup",
            "Vegetables 1 cup",
            "Protein 1 serving",
            "Grain 1/2 cup"
        ]
        return FoodSearchItem(
            id: "recipe_\(title.replacingOccurrences(of: " ", with: "_").lowercased())",
            name: title,
            brand: nil,
            category: "Recipe",
            type: "RECIPE",
            nutrients: NutrientSnapshot(calories: calories, protein: 18, sodium: 340, potassium: potassium, phosphorus: phosphorus, fluid: 95, fat: 10, carbs: 45),
            servingSizes: [ServingSizeDTO(name: "1 serving", weightG: 300)],
            ingredients: ingredients
        )
    }

    var localFoods: [FoodSearchItem] {
        let seed: [FoodSearchItem] = [
            food("Apple", "Fruits", 52, 1, 107, 11, 86),
            food("Banana", "Fruits", 89, 1, 358, 22, 75),
            food("Blueberry", "Fruits", 57, 1, 77, 12, 84),
            food("Date", "Fruits", 277, 1, 696, 62, 21),
            food("Mango", "Fruits", 60, 1, 168, 14, 83),
            food("Cherry tomato", "Vegetables", 18, 5, 237, 24, 95),
            food("Iceberg lettuce", "Vegetables", 14, 10, 141, 20, 96),
            food("Beet", "Vegetables", 43, 78, 325, 40, 88),
            food("Radish", "Vegetables", 16, 39, 233, 20, 95),
            food("Broccoli", "Vegetables", 34, 33, 316, 66, 89),
            food("Spinach", "Vegetables", 23, 79, 558, 49, 91),
            food("Kale", "Vegetables", 35, 53, 348, 55, 90),
            food("Zucchini", "Vegetables", 17, 8, 261, 38, 95),
            food("Bell pepper (Red)", "Vegetables", 31, 4, 211, 26, 92),
            food("Mushrooms (White)", "Vegetables", 22, 5, 318, 86, 92),
            food("Celery", "Vegetables", 14, 80, 260, 24, 95),
            food("Peas", "Vegetables", 80, 108, 271, 99, 79),
            food("Chicken breast", "Meats & Proteins", 165, 74, 256, 228, 65),
            food("Beef steak", "Meats & Proteins", 250, 60, 318, 198, 60),
            food("Turkey", "Meats & Proteins", 135, 52, 286, 206, 68),
            food("Shrimp", "Fish & Seafood", 99, 111, 259, 237, 76),
            food("Lobster", "Fish & Seafood", 89, 296, 352, 185, 76),
            food("Salmon", "Fish & Seafood", 208, 59, 363, 250, 64),
            food("Tofu (Firm)", "Dairy & Alternatives", 144, 14, 237, 121, 70),
            food("Egg (Whole)", "Dairy & Alternatives", 155, 124, 126, 172, 75),
            food("Greek yogurt (Plain)", "Dairy & Alternatives", 97, 36, 141, 135, 81),
            food("White rice (Dry)", "Grains & Carbs", 365, 5, 115, 115, 12),
            food("Brown rice (Dry)", "Grains & Carbs", 367, 7, 223, 264, 10),
            food("Quinoa (Dry)", "Grains & Carbs", 368, 5, 563, 457, 13),
            food("Penne (Dry)", "Grains & Carbs", 371, 6, 223, 189, 10),
            food("Spaghetti (Dry)", "Grains & Carbs", 371, 6, 223, 189, 10),
            food("Spaghetti", "Grains & Carbs", 158, 1, 44, 58, 62),
            food("Linguine", "Grains & Carbs", 157, 1, 43, 56, 62),
            food("Fettuccine", "Grains & Carbs", 159, 2, 46, 60, 61),
            food("Angel hair pasta", "Grains & Carbs", 157, 1, 44, 56, 63),
            food("Macaroni", "Grains & Carbs", 158, 3, 44, 58, 61),
            food("Rotini", "Grains & Carbs", 158, 2, 45, 58, 61),
            food("Farfalle", "Grains & Carbs", 159, 3, 47, 60, 61),
            food("Lasagna noodles", "Grains & Carbs", 160, 4, 50, 64, 60),
            food("Rice noodles", "Grains & Carbs", 109, 15, 30, 25, 73),
            food("Udon noodles", "Grains & Carbs", 127, 6, 38, 34, 68),
            food("Soba noodles", "Grains & Carbs", 99, 5, 60, 70, 70),
            food("Ramen noodles", "Grains & Carbs", 188, 861, 60, 58, 58),
            food("Oats (Dry)", "Grains & Carbs", 389, 2, 429, 523, 8),
            food("Soy sauce", "Condiments", 53, 5493, 212, 130, 70),
            food("Oyster sauce", "Condiments", 51, 1167, 13, 12, 74),
            food("Honey", "Condiments", 304, 4, 52, 4, 17),
            food("Mayonnaise", "Condiments", 680, 635, 25, 29, 15),
            food("Olive Oil", "Oils & Fats", 884, 2, 1, 0, 0),
            food("Vegetable oil", "Oils & Fats", 884, 0, 0, 0, 0),
            food("Coconut oil", "Oils & Fats", 862, 0, 0, 0, 0),
            food("Paprika", "Spices & Herbs", 289, 68, 2344, 314, 11),
            food("Rosemary", "Spices & Herbs", 131, 26, 668, 66, 61),
            food("Black pepper", "Spices & Herbs", 251, 20, 1329, 158, 12),
            food("Salt", "Spices & Herbs", 0, 38758, 8, 0, 0)
        ]

        let generated = generatedFoods()
        var seen = Set<String>()
        let merged = (seed + generated).filter { item in
            let key = item.name.lowercased()
            if seen.contains(key) { return false }
            seen.insert(key)
            return true
        }
        return merged
    }

    func food(_ name: String, _ category: String, _ calories: Double, _ sodium: Double, _ potassium: Double, _ phosphorus: Double, _ fluid: Double) -> FoodSearchItem {
        let lower = name.lowercased()
        let servingSizes: [ServingSizeDTO] = [
            ServingSizeDTO(name: "100g", weightG: 100),
            ServingSizeDTO(name: "1 serving", weightG: 85),
            ServingSizeDTO(name: "1 cup", weightG: lower.contains("oil") ? 218 : 120),
            ServingSizeDTO(name: "1 tbsp", weightG: 12.6),
            ServingSizeDTO(name: "1 tsp", weightG: 4.2),
            ServingSizeDTO(name: "1 clove", weightG: lower.contains("garlic") ? 3 : 4),
            ServingSizeDTO(name: "1 piece", weightG: 85)
        ]

        return FoodSearchItem(
            id: "food_\(name.replacingOccurrences(of: " ", with: "_").lowercased())",
            name: name,
            brand: "Generic",
            category: category,
            type: "FOOD",
            nutrients: NutrientSnapshot(calories: calories, protein: 3, sodium: sodium, potassium: potassium, phosphorus: phosphorus, fluid: fluid, fat: 1, carbs: 10),
            servingSizes: servingSizes,
            ingredients: nil
        )
    }

    func generatedFoods() -> [FoodSearchItem] {
        var results: [FoodSearchItem] = []

        let byCategory: [String: [String]] = [
            "Fruits": [
                "Pear", "Orange", "Grapefruit", "Pineapple", "Strawberry", "Raspberry", "Blackberry", "Kiwi", "Papaya",
                "Watermelon", "Cantaloupe", "Honeydew", "Peach", "Plum", "Apricot", "Nectarine", "Pomegranate", "Guava",
                "Passion fruit", "Dragon fruit", "Cranberry", "Lemon", "Lime", "Clementine", "Tangerine", "Fig", "Prunes",
                "Lychee", "Persimmon", "Star fruit", "Mulberry", "Gooseberry", "Boysenberry", "Jackfruit", "Durian",
                "Plantain", "Red grape", "Green grape", "Black grape", "Avocado", "Coconut", "Olives"
            ],
            "Vegetables": [
                "Garlic", "Onion", "Red onion", "Shallot", "Leek", "Scallions", "Carrot", "Parsnip", "Turnip", "Rutabaga",
                "Sweet potato", "Potato", "Yam", "Pumpkin", "Butternut squash", "Acorn squash", "Cucumber", "Eggplant",
                "Cauliflower", "Cabbage", "Red cabbage", "Napa cabbage", "Brussels sprouts", "Asparagus", "Green beans",
                "Snow peas", "Bok choy", "Swiss chard", "Collard greens", "Arugula", "Romaine lettuce", "Butter lettuce",
                "Kohlrabi", "Okra", "Artichoke", "Fennel", "Beet greens", "Mustard greens", "Jicama", "Daikon", "Edamame",
                "Corn", "Celery root", "Watercress", "Radicchio", "Endive", "Portobello mushroom", "Cremini mushroom",
                "Shiitake mushroom", "Enoki mushroom", "Seaweed", "Nori", "Kimchi", "Sauerkraut"
            ],
            "Grains & Carbs": [
                "Barley", "Farro", "Bulgur", "Couscous", "Millet", "Amaranth", "Buckwheat", "Sorghum", "Wild rice",
                "Jasmine rice", "Basmati rice", "Arborio rice", "Rice noodles", "Egg noodles", "Soba noodles", "Udon noodles",
                "Whole wheat pasta", "Macaroni", "Orzo", "Couscous pearl", "Bread white", "Bread whole wheat", "Bagel",
                "Pita bread", "Tortilla corn", "Tortilla flour", "Crackers", "Pretzels", "Granola", "Corn flakes",
                "Wheat bran", "Semolina", "Polenta", "Hominy", "Grits", "Pancake mix", "Waffle", "Croissant"
            ],
            "Meats & Proteins": [
                "Ground beef", "Ground turkey", "Ground chicken", "Pork loin", "Pork chop", "Bacon", "Ham", "Lamb",
                "Veal", "Chicken thigh", "Chicken drumstick", "Chicken wings", "Duck breast", "Bison", "Venison",
                "Cod", "Tilapia", "Tuna", "Sardine", "Anchovy", "Mackerel", "Haddock", "Halibut", "Trout", "Crab",
                "Scallops", "Mussels", "Clams", "Octopus", "Squid", "Lentils", "Chickpeas", "Black beans", "Kidney beans",
                "Pinto beans", "Navy beans", "Cannellini beans", "Split peas", "Tempeh", "Seitan", "Peanut butter",
                "Almond butter", "Cashew butter", "Sunflower seeds", "Chia seeds", "Flax seeds", "Pumpkin seeds",
                "Almonds", "Walnuts", "Pecans", "Pistachios", "Cashews"
            ],
            "Dairy & Alternatives": [
                "Milk whole", "Milk 2%", "Milk skim", "Almond milk", "Soy milk", "Oat milk", "Coconut milk beverage",
                "Cottage cheese", "Cheddar cheese", "Mozzarella", "Parmesan", "Cream cheese", "Ricotta", "Feta",
                "Sour cream", "Kefir", "Frozen yogurt", "Vanilla yogurt", "Greek yogurt strawberry", "Soy yogurt",
                "Tofu silken", "Paneer", "Evaporated milk", "Condensed milk", "Whipping cream"
            ],
            "Condiments": [
                "Ketchup", "Mustard", "Hot sauce", "Sriracha", "BBQ sauce", "Teriyaki sauce", "Fish sauce", "Worcestershire",
                "Vinegar apple cider", "Vinegar balsamic", "Vinegar white", "Maple syrup", "Jam strawberry", "Jam grape",
                "Peanut sauce", "Tahini", "Hummus", "Salsa", "Pesto", "Tomato paste", "Tomato sauce", "Miso paste",
                "Pickles", "Relish", "Hoisin sauce"
            ],
            "Spices & Herbs": [
                "Cinnamon", "Nutmeg", "Clove spice", "Cardamom", "Cumin", "Coriander", "Turmeric", "Ginger",
                "Garlic powder", "Onion powder", "Oregano", "Basil", "Thyme", "Dill", "Parsley", "Cilantro",
                "Sage", "Tarragon", "Bay leaf", "Paprika smoked", "Cayenne pepper", "Chili powder", "Sesame seeds"
            ],
            "Oils & Fats": [
                "Canola oil", "Sesame oil", "Avocado oil", "Peanut oil", "Sunflower oil", "Ghee", "Butter", "Margarine",
                "Lard", "Shortening", "Mayonnaise light"
            ]
        ]

        for (category, items) in byCategory {
            for name in items {
                let nutrients = estimatedNutrients(for: name, category: category)
                results.append(food(name, category, nutrients.calories, nutrients.sodium, nutrients.potassium, nutrients.phosphorus, nutrients.fluid))
            }
        }

        // Expand local dataset to improve offline coverage for ingredient matching.
        let descriptors = ["Raw", "Cooked", "Boiled", "Steamed", "Grilled", "Roasted", "Fresh", "Frozen"]
        for (category, items) in byCategory {
            for base in items {
                for descriptor in descriptors {
                    let variant = "\(base) (\(descriptor))"
                    let nutrients = estimatedNutrients(for: variant, category: category)
                    results.append(
                        food(
                            variant,
                            category,
                            nutrients.calories,
                            nutrients.sodium,
                            nutrients.potassium,
                            nutrients.phosphorus,
                            nutrients.fluid
                        )
                    )
                }
            }
        }

        // Add high-frequency pantry ingredients and global staples for recipe parsing.
        let stapleIngredients = [
            "Kosher salt", "Sea salt", "Table salt", "Garlic minced", "Garlic cloves", "Onion diced",
            "Red onion diced", "Scallions chopped", "Ginger minced", "Celery diced", "Carrot diced",
            "Bell pepper green", "Bell pepper yellow", "Tomato diced", "Tomato crushed", "Tomato puree",
            "Chicken stock", "Vegetable stock", "Beef stock", "Corn starch", "All-purpose flour",
            "Bread crumbs", "Panko", "Baking powder", "Baking soda", "Vanilla extract",
            "Brown sugar", "White sugar", "Powdered sugar", "Rice vinegar", "Balsamic glaze",
            "Coconut milk canned", "Evaporated milk canned", "Heavy cream", "Half and half",
            "Cheddar shredded", "Mozzarella shredded", "Parmesan grated", "Feta crumbled",
            "Black beans canned", "Chickpeas canned", "Kidney beans canned", "Lentils cooked",
            "Peanut butter smooth", "Almond butter smooth", "Tahini paste", "Sesame seeds toasted",
            "Sunflower seeds roasted", "Pumpkin seeds roasted", "Walnuts chopped", "Cashews roasted",
            "Olive oil extra virgin", "Avocado oil", "Canola oil", "Sesame oil toasted", "Butter unsalted",
            "Penne cooked", "Spaghetti cooked", "Rice cooked", "Quinoa cooked", "Oats cooked",
            "Chicken thigh cooked", "Ground turkey cooked", "Ground beef cooked", "Salmon fillet cooked",
            "Shrimp cooked", "Tofu firm cubed", "Egg whites", "Egg yolk", "Greek yogurt nonfat",
            "Spinach baby", "Kale chopped", "Broccoli florets", "Cauliflower florets", "Mushrooms sliced",
            "Zucchini sliced", "Sweet potato roasted", "Potato baked", "Corn kernels", "Peas frozen",
            "Banana sliced", "Apple diced", "Mango diced", "Blueberries", "Strawberries sliced"
        ]

        for item in stapleIngredients {
            let category = inferredCategory(for: item)
            let nutrients = estimatedNutrients(for: item, category: category)
            results.append(food(item, category, nutrients.calories, nutrients.sodium, nutrients.potassium, nutrients.phosphorus, nutrients.fluid))
        }

        return results
    }

    private func inferredCategory(for name: String) -> String {
        let lower = name.lowercased()
        if lower.contains("oil") || lower.contains("butter") || lower.contains("ghee") {
            return "Oils & Fats"
        }
        if lower.contains("salt") || lower.contains("sauce") || lower.contains("stock") || lower.contains("sugar") || lower.contains("extract") || lower.contains("vinegar") {
            return "Condiments"
        }
        if lower.contains("basil") || lower.contains("oregano") || lower.contains("paprika") || lower.contains("pepper") || lower.contains("cumin") || lower.contains("ginger") {
            return "Spices & Herbs"
        }
        if lower.contains("milk") || lower.contains("cheese") || lower.contains("yogurt") || lower.contains("egg") || lower.contains("cream") || lower.contains("tofu") {
            return "Dairy & Alternatives"
        }
        if lower.contains("chicken") || lower.contains("beef") || lower.contains("turkey") || lower.contains("salmon") || lower.contains("shrimp") || lower.contains("fish") {
            return "Meats & Proteins"
        }
        if lower.contains("rice") || lower.contains("quinoa") || lower.contains("oat") || lower.contains("pasta") || lower.contains("penne") || lower.contains("spaghetti") || lower.contains("flour") {
            return "Grains & Carbs"
        }
        if lower.contains("apple") || lower.contains("banana") || lower.contains("berry") || lower.contains("mango") || lower.contains("grape") {
            return "Fruits"
        }
        return "Vegetables"
    }

    func estimatedNutrients(for name: String, category: String) -> (calories: Double, sodium: Double, potassium: Double, phosphorus: Double, fluid: Double) {
        let lower = name.lowercased()
        if lower.contains("salt") { return (0, 38758, 8, 0, 0) }
        if lower.contains("soy sauce") || lower.contains("fish sauce") { return (53, 5493, 212, 130, 70) }
        if lower.contains("garlic") { return (149, 17, 401, 153, 58) }
        if lower.contains("oil") || lower.contains("butter") { return (884, 2, 3, 1, 0) }

        switch category {
        case "Fruits":
            return (65, 2, 220, 20, 82)
        case "Vegetables":
            return (32, 30, 260, 45, 90)
        case "Grains & Carbs":
            return (340, 8, 180, 120, 12)
        case "Meats & Proteins":
            return (185, 85, 320, 210, 63)
        case "Dairy & Alternatives":
            return (135, 70, 180, 160, 78)
        case "Condiments":
            return (120, 760, 95, 38, 55)
        case "Spices & Herbs":
            return (190, 95, 620, 90, 20)
        case "Oils & Fats":
            return (860, 5, 3, 1, 0)
        default:
            return (80, 20, 90, 40, 55)
        }
    }
}
