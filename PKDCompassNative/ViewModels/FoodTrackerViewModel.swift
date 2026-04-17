import Foundation
import SwiftData

struct RecipeParsedIngredient: Identifiable {
    enum MatchStatus {
        case matched
        case noMatch
    }

    let id = UUID()
    let raw: String
    var name: String
    var quantity: Double
    var unit: String
    var match: IngredientSearchItem?
    var status: MatchStatus
}

@MainActor
final class FoodTrackerViewModel: ObservableObject {
    @Published var entries: [FoodLogEntry] = []
    @Published var mealType: MealType = .breakfast

    @Published var itemName = ""
    @Published var calories = ""
    @Published var sodium = ""
    @Published var potassium = ""
    @Published var phosphorus = ""
    @Published var protein = ""
    @Published var fluid = ""

    @Published var query = ""
    @Published var selectedCategory: String?
    @Published var activeSearchType: FoodSearchType = .all
    @Published var searchResults: [FoodSearchItem] = []
    @Published var suggestions: [FoodSearchItem] = []
    @Published var isSearching = false

    @Published var recipeTitle = ""
    @Published var recipeYield = 1.0
    @Published var servingsConsumed = 1.0
    @Published var rawIngredients = ""
    @Published var parsedIngredients: [RecipeParsedIngredient] = []
    @Published var isAnalyzingRecipe = false

    @Published var errorMessage: String?
    @Published var message: String?

    let categories = [
        "Fruits",
        "Vegetables",
        "Grains & Carbs",
        "Meats & Proteins",
        "Dairy & Alternatives",
        "Fish & Seafood",
        "Condiments",
        "Spices & Herbs",
        "Oils & Fats",
        "Meals",
        "Recipe"
    ]
    private let searchService = FoodSearchService()
    private var searchTask: Task<Void, Never>?

    func load(context: ModelContext, date: Date) {
        do {
            entries = try FoodRepository.entriesForDate(context: context, date: date)
        } catch {
            errorMessage = "Failed to load food diary"
        }
    }

    func searchFood() async {
        isSearching = true
        defer { isSearching = false }
        searchService.backendBaseURL = AppConfig.defaultBackendURL
        let results = await searchService.searchFoods(
            query: query,
            type: activeSearchType,
            category: selectedCategory
        )

        if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedCategory == nil && activeSearchType != .recent {
            suggestions = Array(results.prefix(30))
            searchResults = []
        } else if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedCategory != nil {
            searchResults = results
            suggestions = []
        } else {
            searchResults = results
            suggestions = []
        }
    }

    func scheduleSearch() {
        searchTask?.cancel()
        searchTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard let self else { return }
            await self.searchFood()
        }
    }

    func add(context: ModelContext, date: Date) {
        guard !itemName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Food name is required"
            return
        }

        do {
            try FoodRepository.addEntry(
                context: context,
                mealType: mealType,
                itemName: itemName,
                calories: Double(calories) ?? 0,
                sodiumMg: Double(sodium) ?? 0,
                potassiumMg: Double(potassium) ?? 0,
                phosphorusMg: Double(phosphorus) ?? 0,
                proteinG: Double(protein) ?? 0,
                fluidMl: Double(fluid) ?? 0,
                loggedAt: date
            )
            resetManualFields()
            errorMessage = nil
            load(context: context, date: date)
        } catch {
            errorMessage = "Failed to save meal"
        }
    }

    func addFromSearch(
        context: ModelContext,
        date: Date,
        mealType: MealType,
        item: FoodSearchItem,
        quantity: Double,
        unit: String
    ) {
        guard let nutrients = item.nutrients else {
            errorMessage = "Nutrient data unavailable for this item"
            return
        }
        let scaled = searchService.scaleNutrients(
            nutrientsPer100g: nutrients,
            quantity: quantity,
            unit: unit,
            servingSizes: item.servingSizes
        )

        do {
            try FoodRepository.addEntry(
                context: context,
                mealType: mealType,
                itemName: item.name,
                calories: scaled.calories,
                sodiumMg: scaled.sodium,
                potassiumMg: scaled.potassium,
                phosphorusMg: scaled.phosphorus,
                proteinG: scaled.protein,
                fluidMl: scaled.fluid,
                loggedAt: date
            )
            load(context: context, date: date)
            message = "\(item.name) added to \(mealType.rawValue.capitalized)"
        } catch {
            errorMessage = "Failed to add selected food"
        }
    }

    func addParsedRecipeToDiary(context: ModelContext, date: Date, mealType: MealType) {
        let matched = parsedIngredients.compactMap(\.match)
        guard !matched.isEmpty else {
            errorMessage = "No matched ingredients to log"
            return
        }

        var totals = NutrientSnapshot.zero
        for ingredient in parsedIngredients {
            guard let match = ingredient.match else { continue }
            let scaled = searchService.scaleNutrients(
                nutrientsPer100g: match.nutrients,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                servingSizes: match.servingSizes
            )
            totals.calories += scaled.calories
            totals.protein += scaled.protein
            totals.sodium += scaled.sodium
            totals.potassium += scaled.potassium
            totals.phosphorus += scaled.phosphorus
            totals.fluid += scaled.fluid
        }

        let servings = max(recipeYield, 1)
        let consumed = max(servingsConsumed, 0.25)
        let ratio = consumed / servings

        do {
            try FoodRepository.addEntry(
                context: context,
                mealType: mealType,
                itemName: recipeTitle.isEmpty ? "Custom Recipe" : recipeTitle,
                calories: totals.calories * ratio,
                sodiumMg: totals.sodium * ratio,
                potassiumMg: totals.potassium * ratio,
                phosphorusMg: totals.phosphorus * ratio,
                proteinG: totals.protein * ratio,
                fluidMl: totals.fluid * ratio,
                loggedAt: date
            )
            message = "Recipe logged successfully"
            load(context: context, date: date)
            resetRecipeBuilder()
        } catch {
            errorMessage = "Failed to log recipe"
        }
    }

    func parseAndMatchIngredients() async {
        let lines = rawIngredients
            .split(separator: "\n")
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { line in
                guard !line.isEmpty else { return false }
                if line.count < 2 { return false }
                let noiseRegex = try? NSRegularExpression(
                    pattern: "preheat|oven|minutes|instruction|step|storage|tips|serve|how to|recipe notes",
                    options: [.caseInsensitive]
                )
                if let noiseRegex {
                    let range = NSRange(location: 0, length: (line as NSString).length)
                    if noiseRegex.firstMatch(in: line, options: [], range: range) != nil, line.split(separator: " ").count > 2 {
                        return false
                    }
                }
                return true
            }

        guard !lines.isEmpty else {
            errorMessage = "Paste ingredient lines to analyze"
            return
        }

        isAnalyzingRecipe = true
        defer { isAnalyzingRecipe = false }
        searchService.backendBaseURL = AppConfig.defaultBackendURL
        let service = searchService

        var parsed: [RecipeParsedIngredient] = []
        let trimmed = Array(lines.prefix(24))
        await withTaskGroup(of: (Int, RecipeParsedIngredient).self) { group in
            for (idx, line) in trimmed.enumerated() {
                let item = parseIngredientLine(line)
                group.addTask { [item, line] in
                    let matches = await service.searchIngredients(query: item.name)
                        .filter { $0.name.unicodeScalars.allSatisfy { $0.isASCII } }
                    let best = FoodTrackerViewModel.bestIngredientMatch(for: item.name, in: matches)
                    if let best {
                        return (idx,
                            RecipeParsedIngredient(
                                raw: line,
                                name: item.name,
                                quantity: item.quantity,
                                unit: item.unit,
                                match: best,
                                status: .matched
                            )
                        )
                    } else {
                        return (idx,
                            RecipeParsedIngredient(
                                raw: line,
                                name: item.name,
                                quantity: item.quantity,
                                unit: item.unit,
                                match: nil,
                                status: .noMatch
                            )
                        )
                    }
                }
            }

            var collected: [(Int, RecipeParsedIngredient)] = []
            for await result in group {
                collected.append(result)
            }
            parsed = collected.sorted(by: { $0.0 < $1.0 }).map { $0.1 }
        }

        parsedIngredients = parsed
    }

    nonisolated private static func bestIngredientMatch(for name: String, in matches: [IngredientSearchItem]) -> IngredientSearchItem? {
        guard !matches.isEmpty else { return nil }
        let target = normalizedIngredientName(name)
        let targetTokens = ingredientTokens(target)
        if targetTokens.isEmpty { return matches.first }

        var best: (IngredientSearchItem, Double)?
        for match in matches {
            let candidateRaw = match.name.lowercased()
            let candidate = normalizedIngredientName(candidateRaw)
            if candidate == target || candidateRaw == name.lowercased() {
                return match
            }

            var score = 0.0
            if candidate.contains(target) { score += 0.85 }

            let candidateTokens = ingredientTokens(candidate)
            let overlap = Double(targetTokens.intersection(candidateTokens).count)
            let union = Double(max(1, targetTokens.union(candidateTokens).count))
            score += overlap / union

            if overlap > 0 { score += 0.2 }

            if !target.contains("powder") && !target.contains("ground") && !target.contains("spice") {
                if candidateRaw.contains("powder") || candidateRaw.contains("ground") || candidateRaw.contains("spice") {
                    score -= 0.35
                }
            }

            if !target.contains("clove") && candidateRaw.contains("clove") {
                score -= 0.2
            }

            // Strong domain-specific disambiguation.
            if targetTokens.contains("garlic") {
                if candidateRaw.contains("garlic") { score += 0.9 }
                if candidateRaw.contains("spice") || candidateRaw.contains("ground") || candidateRaw.contains("clove") {
                    score -= 0.45
                }
            }
            if targetTokens.contains("pea") || targetTokens.contains("peas") {
                if candidateRaw.contains("pea") { score += 0.6 }
                if candidateRaw.contains("wasabi") { score -= 0.35 }
            }
            if targetTokens.contains("spaghetti") || targetTokens.contains("pasta") || targetTokens.contains("linguine") || targetTokens.contains("fettuccine") || targetTokens.contains("macaroni") {
                if candidateRaw.contains("spaghetti") || candidateRaw.contains("pasta") || candidateRaw.contains("linguine") || candidateRaw.contains("fettuccine") || candidateRaw.contains("macaroni") {
                    score += 0.85
                }
                if candidateRaw.contains("sauce") || candidateRaw.contains("meal") || candidateRaw.contains("frozen dinner") {
                    score -= 0.35
                }
            }
            if targetTokens.contains("egg") || targetTokens.contains("eggs") {
                if candidateRaw.contains("egg") { score += 0.7 }
                if candidateRaw.contains("noodle") || candidateRaw.contains("cake") { score -= 0.3 }
            }
            if targetTokens.contains("carrot") {
                if candidateRaw.contains("carrot") { score += 0.7 }
                if candidateRaw.contains("prepared") || candidateRaw.contains("salad") { score -= 0.2 }
            }

            if let category = match.category?.lowercased() {
                if isProduceKeyword(targetTokens), category.contains("veget") { score += 0.15 }
                if !isSpiceKeyword(targetTokens), category.contains("spice") { score -= 0.1 }
            }

            if let bestScore = best?.1, score <= bestScore { continue }
            best = (match, score)
        }

        if let best, best.1 >= 0.25 {
            return best.0
        }
        return nil
    }

    func pickIngredientMatch(index: Int, match: IngredientSearchItem) {
        guard parsedIngredients.indices.contains(index) else { return }
        parsedIngredients[index].match = match
        parsedIngredients[index].status = .matched
    }

    func ingredientSearch(query: String) async -> [IngredientSearchItem] {
        searchService.backendBaseURL = AppConfig.defaultBackendURL
        return await searchService.searchIngredients(query: query)
    }

    func delete(context: ModelContext, id: UUID, date: Date) {
        do {
            try FoodRepository.deleteEntry(context: context, id: id)
            load(context: context, date: date)
        } catch {
            errorMessage = "Failed to remove meal entry"
        }
    }

    var totals: (calories: Double, sodium: Double, potassium: Double, phosphorus: Double, protein: Double, fluid: Double) {
        entries.reduce((0, 0, 0, 0, 0, 0)) { partial, item in
            (
                partial.calories + item.calories,
                partial.sodium + item.sodiumMg,
                partial.potassium + item.potassiumMg,
                partial.phosphorus + item.phosphorusMg,
                partial.protein + item.proteinG,
                partial.fluid + item.fluidMl
            )
        }
    }

    private func parseIngredientLine(_ line: String) -> (name: String, quantity: Double, unit: String) {
        let cleaned = normalizeFractionCharacters(
            in: line
                .lowercased()
                .replacingOccurrences(of: "•", with: "")
                .replacingOccurrences(of: "-", with: " ")
                .replacingOccurrences(of: "(", with: " (")
                .replacingOccurrences(of: ")", with: ") ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
        )

        let units: Set<String> = [
            "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
            "g", "gram", "grams", "kg", "ml", "l", "oz", "ounce", "ounces", "lb", "lbs",
            "clove", "cloves", "slice", "slices", "piece", "pieces", "serving", "servings", "pinch"
        ]

        let tokens = cleaned.split(whereSeparator: \.isWhitespace).map(String.init)
        guard !tokens.isEmpty else { return (line, 1, "serving") }

        var quantity = 1.0
        var unit = "serving"
        var consumed = 0

        // "1 1/2" or "3/4" or "2.5"
        if let firstQuantity = parseQuantityToken(tokens[safe: 0]) {
            quantity = firstQuantity
            consumed = 1
            if tokens.count > 1, let extraFraction = parseFractionToken(tokens[1]) {
                quantity += extraFraction
                consumed = 2
            }
        } else if let rangeValue = parseRangeQuantity(tokens[safe: 0]) {
            quantity = rangeValue
            consumed = 1
        }

        if tokens.count > consumed {
            let unitCandidate = tokens[consumed]
            if units.contains(unitCandidate) {
                unit = normalizeUnit(unitCandidate)
                consumed += 1
            }
        }

        let extra = additionalQuantity(tokens: tokens, consumed: consumed, baseUnit: unit)
        quantity += extra

        let remainder = tokens.dropFirst(consumed).joined(separator: " ")
            let normalizedName = remainder
            .replacingOccurrences(of: "\\(.*?\\)", with: "", options: .regularExpression)
            .replacingOccurrences(of: ",.*$", with: "", options: .regularExpression)
            .replacingOccurrences(of: " plus .*", with: "", options: .regularExpression)
            .replacingOccurrences(of: " divided$", with: "", options: .regularExpression)
            .replacingOccurrences(of: " to taste$", with: "", options: .regularExpression)
            .replacingOccurrences(of: " as needed$", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let fallbackName = cleaned
            .replacingOccurrences(of: "\\(.*?\\)", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        return (normalizedName.isEmpty ? fallbackName : normalizedName, max(0.01, quantity), unit)
    }

    nonisolated private static func normalizedIngredientName(_ value: String) -> String {
        let lowered = value.lowercased()
        let stripped = lowered
            .replacingOccurrences(of: "\\(.*?\\)", with: "", options: .regularExpression)
            .replacingOccurrences(of: ",.*$", with: "", options: .regularExpression)
        let removals = ["fresh", "raw", "ground", "powder", "spices", "spice", "to taste", "optional", "divided"]
        var cleaned = stripped
        for token in removals {
            cleaned = cleaned.replacingOccurrences(of: token, with: "")
        }
        return cleaned.replacingOccurrences(of: "  ", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    nonisolated private static func ingredientTokens(_ value: String) -> Set<String> {
        Set(value.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map { String($0) })
    }

    nonisolated private static func isProduceKeyword(_ tokens: Set<String>) -> Bool {
        let produce = ["garlic", "onion", "scallion", "carrot", "celery", "tomato", "pepper", "spinach", "kale"]
        return tokens.contains(where: { produce.contains($0) })
    }

    nonisolated private static func isSpiceKeyword(_ tokens: Set<String>) -> Bool {
        let spices = ["spice", "spices", "clove", "cloves", "cumin", "paprika", "chili", "pepper", "cinnamon"]
        return tokens.contains(where: { spices.contains($0) })
    }

    private func parseQuantityToken(_ token: String?) -> Double? {
        guard let token else { return nil }
        let cleaned = normalizeFractionCharacters(in: token.replacingOccurrences(of: ",", with: ""))
            .trimmingCharacters(in: .punctuationCharacters)
        if let fraction = parseFractionToken(cleaned) { return fraction }
        if let mixed = parseMixedFraction(cleaned) { return mixed }
        return Double(cleaned)
    }

    private func parseFractionToken(_ token: String?) -> Double? {
        guard let token, token.contains("/") else { return nil }
        let parts = token.split(separator: "/")
        guard parts.count == 2, let num = Double(parts[0]), let den = Double(parts[1]), den != 0 else { return nil }
        return num / den
    }

    private func parseMixedFraction(_ token: String) -> Double? {
        let pattern = #"^(\d+)\s+(\d+)\/(\d+)$|^(\d+)(\d+)\/(\d+)$"#
        guard
            let regex = try? NSRegularExpression(pattern: pattern),
            let match = regex.firstMatch(in: token, range: NSRange(token.startIndex..., in: token))
        else { return nil }

        func group(_ idx: Int) -> String? {
            let range = match.range(at: idx)
            guard range.location != NSNotFound, let r = Range(range, in: token) else { return nil }
            return String(token[r])
        }

        let whole = Double(group(1) ?? group(4) ?? "") ?? 0
        let num = Double(group(2) ?? group(5) ?? "") ?? 0
        let den = Double(group(3) ?? group(6) ?? "") ?? 1
        guard den != 0 else { return nil }
        return whole + (num / den)
    }

    private func parseRangeQuantity(_ token: String?) -> Double? {
        guard let token else { return nil }
        let cleaned = token.replacingOccurrences(of: "–", with: "-")
        let parts = cleaned.split(separator: "-")
        guard parts.count == 2, let low = Double(parts[0]), let high = Double(parts[1]), high >= low else { return nil }
        return (low + high) / 2
    }

    private func normalizeUnit(_ rawUnit: String) -> String {
        switch rawUnit {
        case "cups": return "cup"
        case "tablespoon", "tablespoons": return "tbsp"
        case "teaspoon", "teaspoons": return "tsp"
        case "gram", "grams": return "g"
        case "cloves": return "clove"
        case "pieces": return "piece"
        case "servings": return "serving"
        case "ounces": return "oz"
        case "lbs": return "lb"
        default: return rawUnit
        }
    }

    private func additionalQuantity(tokens: [String], consumed: Int, baseUnit: String) -> Double {
        guard tokens.count > consumed + 2 else { return 0 }
        var bonus = 0.0
        var index = consumed

        while index < tokens.count {
            if tokens[index] == "plus" || tokens[index] == "+" {
                let quantityToken = tokens[safe: index + 1]
                let unitToken = tokens[safe: index + 2]
                if
                    let q = parseQuantityToken(quantityToken),
                    let u = unitToken
                {
                    bonus += convertQuantity(q, from: normalizeUnit(u), to: normalizeUnit(baseUnit))
                    index += 3
                    continue
                }
            }
            index += 1
        }

        return bonus
    }

    private func convertQuantity(_ quantity: Double, from sourceUnit: String, to targetUnit: String) -> Double {
        guard sourceUnit != targetUnit else { return quantity }

        let volumeToMl: [String: Double] = [
            "tsp": 4.92892,
            "tbsp": 14.7868,
            "cup": 236.588,
            "ml": 1.0,
            "l": 1000
        ]
        let massToG: [String: Double] = [
            "g": 1.0,
            "kg": 1000,
            "oz": 28.3495,
            "lb": 453.592
        ]

        if
            let sourceMl = volumeToMl[sourceUnit],
            let targetMl = volumeToMl[targetUnit]
        {
            return quantity * (sourceMl / targetMl)
        }

        if
            let sourceG = massToG[sourceUnit],
            let targetG = massToG[targetUnit]
        {
            return quantity * (sourceG / targetG)
        }

        return 0
    }

    private func normalizeFractionCharacters(in token: String) -> String {
        let replacements: [String: String] = [
            "½": " 1/2",
            "¼": " 1/4",
            "¾": " 3/4",
            "⅓": " 1/3",
            "⅔": " 2/3",
            "⅛": " 1/8",
            "⅜": " 3/8",
            "⅝": " 5/8",
            "⅞": " 7/8"
        ]

        var value = token
        for (symbol, replacement) in replacements {
            value = value.replacingOccurrences(of: symbol, with: replacement)
        }
        return value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
    }

    private func resetManualFields() {
        itemName = ""
        calories = ""
        sodium = ""
        potassium = ""
        phosphorus = ""
        protein = ""
        fluid = ""
    }

    func resetRecipeBuilder() {
        recipeTitle = ""
        recipeYield = 1
        servingsConsumed = 1
        rawIngredients = ""
        parsedIngredients = []
    }
}

private extension Collection {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
