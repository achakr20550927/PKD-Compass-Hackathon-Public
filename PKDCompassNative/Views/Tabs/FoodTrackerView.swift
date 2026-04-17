import SwiftUI
import SwiftData

struct FoodTrackerView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var viewModel = FoodTrackerViewModel()

    @State private var selectedDate = Date()
    @State private var showingAddSearch = false
    @State private var showingRecipeBuilder = false
    @State private var selectedSearchItem: FoodSearchItem?
    @State private var pendingSearchItem: FoodSearchItem?
    @State private var pendingRecipeBuilder = false
    @State private var addQuantity = 1.0
    @State private var addUnit = "serving"

    @AppStorage("pkd.nutrition.sodium") private var sodiumTarget = 2300.0
    @AppStorage("pkd.nutrition.potassium") private var potassiumTarget = 3500.0
    @AppStorage("pkd.nutrition.phosphorus") private var phosphorusTarget = 1000.0
    @AppStorage("pkd.nutrition.protein") private var proteinTarget = 60.0
    @AppStorage("pkd.nutrition.fluid") private var fluidTarget = 2500.0

    private let mealOrder: [MealType] = [.breakfast, .lunch, .dinner, .snacks, .other]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        foodSummary

                        VStack(spacing: 10) {
                            ForEach(mealOrder) { meal in
                                mealSection(meal)
                            }
                        }
                    }
                    .padding()
                    .padding(.bottom, 24)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showingAddSearch) {
                FoodSearchSheet(
                    viewModel: viewModel,
                    onSelect: { item in
                        // Avoid presenting a sheet on top of an already-presented sheet.
                        pendingSearchItem = item
                        addQuantity = 1
                        addUnit = item.servingSizes?.first?.name ?? "serving"
                        showingAddSearch = false
                    },
                    onBuildRecipe: {
                        pendingRecipeBuilder = true
                        showingAddSearch = false
                    }
                )
            }
            .sheet(isPresented: $showingRecipeBuilder) {
                RecipeBuilderSheet(
                    viewModel: viewModel,
                    date: selectedDate,
                    mealType: viewModel.mealType,
                    onSaveOnly: {
                        viewModel.resetRecipeBuilder()
                        showingRecipeBuilder = false
                    },
                    onSaveAndLog: {
                        viewModel.addParsedRecipeToDiary(context: modelContext, date: selectedDate, mealType: viewModel.mealType)
                        showingRecipeBuilder = false
                    }
                )
            }
            .sheet(item: $selectedSearchItem) { item in
                FoodDetailAddSheet(
                    item: item,
                    quantity: $addQuantity,
                    unit: $addUnit,
                    onAdd: {
                        viewModel.addFromSearch(
                            context: modelContext,
                            date: selectedDate,
                            mealType: viewModel.mealType,
                            item: item,
                            quantity: addQuantity,
                            unit: addUnit
                        )
                        selectedSearchItem = nil
                    }
                )
                .presentationDetents([.large])
            }
            .onAppear {
                viewModel.load(context: modelContext, date: selectedDate)
            }
            .onChange(of: showingAddSearch) { _, open in
                guard open == false else { return }
                if selectedSearchItem == nil, let pendingSearchItem {
                    // Present the detail add sheet only after the search sheet is dismissed.
                    selectedSearchItem = pendingSearchItem
                    self.pendingSearchItem = nil
                }
                if pendingRecipeBuilder {
                    showingRecipeBuilder = true
                    pendingRecipeBuilder = false
                }
            }
            .onChange(of: selectedDate) { _, date in
                viewModel.load(context: modelContext, date: date)
            }
        }
    }

    private var header: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Food Diary")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                HStack(spacing: 8) {
                    NavigationLink {
                        CheckedFoodsView(entries: viewModel.entries)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "checklist")
                            Text("Checked")
                        }
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                        .lineLimit(1)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
                        )
                    }

                    NavigationLink {
                        NutritionSettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(PKDPalette.textMuted)
                            .frame(width: 30, height: 30)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
                            )
                    }
                }
            }

            HStack {
                Button {
                    selectedDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)

                Spacer()

                VStack(spacing: 2) {
                    Text(selectedDate.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    if isToday {
                        Text("Today")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                    }
                }

                Spacer()

                Button {
                    guard !isToday else { return }
                    selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
                } label: {
                    Image(systemName: "chevron.right")
                        .foregroundStyle(isToday ? Color.gray.opacity(0.4) : PKDPalette.textMuted)
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)
                .disabled(isToday)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 6)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
            )
        }
        .pkdGlassHeader()
    }

    private var foodSummary: some View {
        let totals = viewModel.totals
        let sodiumRisk = upperLimitRisk(current: totals.sodium, target: sodiumTarget)
        let potassiumRisk = upperLimitRisk(current: totals.potassium, target: potassiumTarget)
        let phosphorusRisk = upperLimitRisk(current: totals.phosphorus, target: phosphorusTarget)
        let proteinRisk = lowerGoalRisk(current: totals.protein, target: proteinTarget)
        let fluidRisk = lowerGoalRisk(current: totals.fluid, target: fluidTarget)
        let overallRisk = max(sodiumRisk, potassiumRisk, phosphorusRisk, proteinRisk, fluidRisk)

        return VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("TODAY'S CALORIES")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .tracking(1.3)
                        .foregroundStyle(.white.opacity(0.7))
                    HStack(alignment: .lastTextBaseline, spacing: 6) {
                        Text("\(Int(totals.calories))")
                            .font(.system(size: 44, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                        Text("kcal")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("PKD RISK")
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.7))
                    let status = overallRisk >= 100 ? "High" : (overallRisk >= 70 ? "Caution" : "Healthy")
                    HStack(spacing: 6) {
                        Circle()
                            .fill(status == "High" ? PKDPalette.danger : (status == "Caution" ? PKDPalette.warning : PKDPalette.success))
                            .frame(width: 6, height: 6)
                        Text(status)
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.25), in: Capsule())
                }
            }
            .padding(16)
            .background(PKDGradients.hero)

            VStack(spacing: 10) {
                nutrientRow("Sodium", totals.sodium, target: sodiumTarget, unit: "mg", mode: .upperLimit)
                nutrientRow("Potassium", totals.potassium, target: potassiumTarget, unit: "mg", mode: .upperLimit)
                nutrientRow("Phosphorus", totals.phosphorus, target: phosphorusTarget, unit: "mg", mode: .upperLimit)
                nutrientRow("Protein", totals.protein, target: proteinTarget, unit: "g", mode: .lowerGoal)
                nutrientRow("Fluid", totals.fluid, target: fluidTarget, unit: "ml", mode: .lowerGoal)
            }
            .padding(16)
            .background(Color.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 14, x: 0, y: 8)
    }

    private enum NutrientMode {
        case upperLimit
        case lowerGoal
    }

    private func nutrientRow(_ label: String, _ value: Double, target: Double, unit: String, mode: NutrientMode) -> some View {
        let progressPct = percentage(current: value, target: target)
        let risk = mode == .upperLimit ? upperLimitRisk(current: value, target: target) : lowerGoalRisk(current: value, target: target)
        let color = risk < 70 ? PKDPalette.success : (risk < 100 ? PKDPalette.warning : PKDPalette.danger)
        let statusText = mode == .upperLimit
            ? (risk < 70 ? "GOOD" : (risk < 100 ? "CAUTION" : "HIGH"))
            : (progressPct >= 100 ? "GOOD" : (progressPct >= 70 ? "CAUTION" : "LOW"))

        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                HStack(spacing: 6) {
                    Circle().fill(color).frame(width: 6, height: 6)
                    Text(label)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                }
                Spacer()
                Text("\(Int(value))/\(Int(target))\(unit)")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color(hex: "#E2E8F0"))
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(color)
                        .frame(width: proxy.size.width * min(progressPct, 100) / 100)
                }
            }
            .frame(height: 6)

            HStack {
                Spacer()
                Text(statusText)
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
            }
        }
    }

    private func mealSection(_ meal: MealType) -> some View {
        let entries = entries(for: meal)
        let totals = mealTotals(entries)
        let sodiumTotal = Int(entries.reduce(0) { $0 + $1.sodiumMg })
        let potassiumTotal = Int(entries.reduce(0) { $0 + $1.potassiumMg })

        return VStack(spacing: 0) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: mealGradient(meal),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 34, height: 34)
                    .overlay {
                        Image(systemName: mealIcon(meal))
                            .foregroundStyle(.white)
                            .font(.system(size: 14, weight: .bold))
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(meal.rawValue.capitalized)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("\(Int(totals.calories)) kcal\(totals.protein > 0 ? " · \(Int(totals.protein))g protein" : "")")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
                if !entries.isEmpty && horizontalSizeClass != .compact {
                    Text("Na \(sodiumTotal) · K \(potassiumTotal)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                HStack(spacing: 6) {
                    Button {
                        viewModel.mealType = meal
                        showingAddSearch = true
                    } label: {
                        Image(systemName: "plus")
                            .foregroundStyle(PKDPalette.primary)
                            .frame(width: 28, height: 28)
                            .background(PKDPalette.primary.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    Image(systemName: "chevron.down")
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 22, height: 22)
                }
            }
            .padding(14)

            if horizontalSizeClass == .compact, !entries.isEmpty {
                HStack {
                    Spacer()
                    Text("Na \(sodiumTotal) · K \(potassiumTotal)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 6)
            }

            Divider().opacity(0.2)

            if entries.isEmpty {
                VStack(spacing: 4) {
                    Image(systemName: mealIcon(meal))
                        .font(.system(size: 22))
                        .foregroundStyle(Color.gray.opacity(0.45))
                    Text("Nothing logged yet")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                VStack(spacing: 0) {
                    ForEach(entries) { entry in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(PKDPalette.primary.opacity(0.15))
                                .frame(width: 26, height: 26)
                                .overlay {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(PKDPalette.primary)
                                }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.itemName)
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text("\(Int(entry.calories)) kcal · K \(Int(entry.potassiumMg)) · Na \(Int(entry.sodiumMg))")
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                viewModel.delete(context: modelContext, id: entry.id, date: selectedDate)
                            } label: {
                                Image(systemName: "trash")
                                    .foregroundStyle(PKDPalette.danger)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        if entry.id != entries.last?.id {
                            Divider().padding(.leading, 14)
                        }
                    }
                }
            }

            Button {
                viewModel.mealType = meal
                showingAddSearch = true
            } label: {
                HStack {
                    Image(systemName: "plus")
                    Text("Add Food")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                }
                .frame(maxWidth: .infinity, minHeight: 42)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
            .padding(14)
        }
        .background(Color.white, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 12, x: 0, y: 6)
    }

    private func mealIcon(_ meal: MealType) -> String {
        switch meal {
        case .breakfast: return "sun.max.fill"
        case .lunch: return "sun.horizon.fill"
        case .dinner: return "moon.stars.fill"
        case .snacks: return "birthday.cake.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }

    private func mealGradient(_ meal: MealType) -> [Color] {
        switch meal {
        case .breakfast: return [Color(hex: "#F59E0B"), Color(hex: "#FB923C")]
        case .lunch: return [Color(hex: "#34D399"), Color(hex: "#14B8A6")]
        case .dinner: return [Color(hex: "#6366F1"), Color(hex: "#8B5CF6")]
        case .snacks: return [Color(hex: "#F472B6"), Color(hex: "#FB7185")]
        case .other: return [Color(hex: "#94A3B8"), Color(hex: "#64748B")]
        }
    }

    private var isToday: Bool {
        Calendar.current.isDateInToday(selectedDate)
    }

    private func entries(for meal: MealType) -> [FoodLogEntry] {
        viewModel.entries.filter { $0.mealTypeRaw == meal.rawValue }
    }

    private func mealTotals(_ entries: [FoodLogEntry]) -> (calories: Double, protein: Double) {
        entries.reduce((0, 0)) { partial, entry in
            (partial.calories + entry.calories, partial.protein + entry.proteinG)
        }
    }

    private func percentage(current: Double, target: Double) -> Double {
        guard target > 0 else { return 0 }
        return (current / target) * 100
    }

    private func upperLimitRisk(current: Double, target: Double) -> Double {
        percentage(current: current, target: target)
    }

    private func lowerGoalRisk(current: Double, target: Double) -> Double {
        let progress = percentage(current: current, target: target)
        return max(0, 100 - min(progress, 100))
    }
}

private struct FoodSearchSheet: View {
    @ObservedObject var viewModel: FoodTrackerViewModel
    let onSelect: (FoodSearchItem) -> Void
    let onBuildRecipe: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    searchInput
                    tabs
                    categories
                    suggestionsLabel
                    results
                    buildRecipeCard
                }
                .padding()
                .padding(.bottom, 18)
            }
            .pkdPageBackground()
            .onAppear {
                viewModel.scheduleSearch()
            }
            .onChange(of: viewModel.query) { _, _ in
                viewModel.scheduleSearch()
            }
            .onChange(of: viewModel.activeSearchType) { _, _ in
                viewModel.scheduleSearch()
            }
            .onChange(of: viewModel.selectedCategory) { _, _ in
                viewModel.scheduleSearch()
            }
        }
    }

    private var searchInput: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(PKDPalette.primary.opacity(0.5))
            TextField("Search foods, recipes, or meals...", text: $viewModel.query)
                .textInputAutocapitalization(.never)
        }
        .padding(12)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
        )
    }

    private var tabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(FoodSearchType.allCases.filter { $0 != .recent }) { type in
                    Button {
                        viewModel.activeSearchType = type
                    } label: {
                        Text(type.rawValue.uppercased())
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundStyle(viewModel.activeSearchType == type ? .white : PKDPalette.textMuted)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(
                                Capsule()
                                    .fill(viewModel.activeSearchType == type ? PKDPalette.primary : Color.white)
                            )
                            .overlay(
                                Capsule()
                                    .stroke(PKDPalette.primary.opacity(0.15), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var categories: some View {
        VStack(alignment: .leading, spacing: 8) {
                Text("BROWSE CATEGORIES")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .tracking(1.2)
                    .foregroundStyle(PKDPalette.textMuted)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    categoryIcon("Fruits", "leaf")
                    categoryIcon("Vegetables", "leaf.circle")
                    categoryIcon("Grains & Carbs", "square.grid.2x2")
                    categoryIcon("Meats & Proteins", "fish")
                    categoryIcon("Dairy & Alternatives", "drop")
                }
            }
        }
    }

    private func categoryIcon(_ title: String, _ icon: String) -> some View {
        Button {
            let mapped = title == "Fruits" ? "Fruits" :
                title == "Vegetables" ? "Vegetables" :
                title == "Grains & Carbs" ? "Grains & Carbs" :
                title == "Meats & Proteins" ? "Meats & Proteins" :
                "Dairy & Alternatives"
            if viewModel.selectedCategory == mapped {
                viewModel.selectedCategory = nil
            } else {
                viewModel.selectedCategory = mapped
                viewModel.activeSearchType = .foods
            }
        } label: {
            VStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(viewModel.selectedCategory == title ? PKDPalette.primary.opacity(0.25) : PKDPalette.primary.opacity(0.12))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Image(systemName: icon)
                            .foregroundStyle(PKDPalette.primary)
                    }
                Text(title.uppercased())
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundStyle(viewModel.selectedCategory == title ? PKDPalette.primary : PKDPalette.textMuted)
            }
            .padding(6)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var suggestionsLabel: some View {
        HStack(spacing: 6) {
            Image(systemName: "sparkles")
                .font(.system(size: 10))
                .foregroundStyle(PKDPalette.primary)
            Text("SUGGESTIONS")
                .font(.system(size: 9, weight: .black, design: .rounded))
                .tracking(1.2)
                .foregroundStyle(PKDPalette.textMuted)
        }
    }

    private var results: some View {
        VStack(alignment: .leading, spacing: 10) {
            if viewModel.isSearching {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 12)
            } else {
                let list = viewModel.searchResults.isEmpty ? viewModel.suggestions : viewModel.searchResults
                ForEach(list, id: \.id) { item in
                    Button {
                        onSelect(item)
                    } label: {
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(PKDPalette.primary.opacity(0.1))
                                .frame(width: 32, height: 32)
                                .overlay {
                                    Image(systemName: item.type == "RECIPE" ? "book.pages" : "fork.knife")
                                        .foregroundStyle(PKDPalette.primary)
                                }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                let left = (item.brand ?? item.type).uppercased()
                                let right = item.category?.uppercased() ?? ""
                                Text(right.isEmpty ? left : "\(left) · \(right)")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                            VStack(alignment: .trailing, spacing: 1) {
                                Text("\(Int(item.nutrients?.calories ?? 0)) kcal")
                                    .font(.system(size: 12, weight: .black, design: .rounded))
                                    .foregroundStyle(PKDPalette.primary)
                                Text("per 100g")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                        }
                        .pkdCard()
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var buildRecipeCard: some View {
        VStack(spacing: 10) {
            Text("CAN'T FIND IT?")
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.primary)
            Text("Create a custom dish or recipe tailored to your PKD needs.")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
                .multilineTextAlignment(.center)
            Button {
                onBuildRecipe()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                    Text("BUILD CUSTOM RECIPE")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
            }
            .buttonStyle(PKDPrimaryButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct FoodDetailAddSheet: View {
    @Environment(\.dismiss) private var dismiss

    let item: FoodSearchItem
    @Binding var quantity: Double
    @Binding var unit: String
    let onAdd: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Text("Add Food")
                        .font(.system(size: 30, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(PKDPalette.textMuted)
                            .frame(width: 36, height: 36)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)
                .padding(.bottom, 10)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                                .lineLimit(2)
                            Text((item.category ?? item.type).uppercased())
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.primary)
                        }

                        VStack(spacing: 10) {
                            metricRow("Calories", value: item.nutrients?.calories ?? 0, unit: "kcal", isInt: true)
                            metricRow("Sodium", value: item.nutrients?.sodium ?? 0, unit: "mg", isInt: true)
                            metricRow("Potassium", value: item.nutrients?.potassium ?? 0, unit: "mg", isInt: true)
                            metricRow("Phosphorus", value: item.nutrients?.phosphorus ?? 0, unit: "mg", isInt: true)
                        }
                        .padding(12)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
                        )

                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                PKDSectionLabel(text: "Quantity")
                                TextField("1", value: $quantity, format: .number)
                                    .keyboardType(.decimalPad)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 18, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                    .padding(14)
                                    .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                                            .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                                    )
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                PKDSectionLabel(text: "Unit")
                                Picker("Unit", selection: $unit) {
                                    ForEach(item.servingSizes?.map(\.name) ?? ["serving"], id: \.self) { name in
                                        Text(name).tag(name)
                                    }
                                }
                                .pickerStyle(.menu)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                                )
                            }
                        }

                        if let ingredients = item.ingredients, !ingredients.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("INGREDIENTS")
                                    .font(.system(size: 10, weight: .black, design: .rounded))
                                    .tracking(1.2)
                                    .foregroundStyle(PKDPalette.textMuted)
                                VStack(alignment: .leading, spacing: 8) {
                                    ForEach(ingredients, id: \.self) { line in
                                        HStack(alignment: .top, spacing: 8) {
                                            Circle()
                                                .fill(PKDPalette.primary.opacity(0.35))
                                                .frame(width: 6, height: 6)
                                                .padding(.top, 5)
                                            Text(line)
                                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                                .foregroundStyle(PKDPalette.textMain)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                    }
                                }
                                .padding(14)
                                .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                                )
                            }
                        }

                        Button {
                            onAdd()
                            dismiss()
                        } label: {
                            Text("Add to Diary")
                        }
                        .buttonStyle(PKDPrimaryButtonStyle())
                        .padding(.top, 6)
                    }
                    .padding(16)
                    .padding(.bottom, 24)
                }
            }
            .pkdPageBackground()
            .navigationBarBackButtonHidden(true)
        }
    }

    private func metricRow(_ label: String, value: Double, unit: String, isInt: Bool) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
            Spacer()
            Text(isInt ? "\(Int(value)) \(unit)" : "\(value, specifier: "%.1f") \(unit)")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.primary)
        }
        .padding(.vertical, 6)
    }
}

private struct RecipeBuilderSheet: View {
    @ObservedObject var viewModel: FoodTrackerViewModel
    let date: Date
    let mealType: MealType
    let onSaveOnly: () -> Void
    let onSaveAndLog: () -> Void

    @State private var pickerTargetIndex: Int?
    @State private var isPickerPresented = false
    @State private var pickerQuery = ""
    @State private var pickerResults: [IngredientSearchItem] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if viewModel.parsedIngredients.isEmpty {
                        setupSection
                    } else {
                        reviewSection
                    }
                }
                .padding()
                .padding(.bottom, 20)
            }
            .pkdPageBackground()
            .navigationTitle("Recipe Builder")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        onSaveOnly()
                    } label: {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(PKDPalette.textMuted)
                            .frame(width: 34, height: 34)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                            )
                    }
                }
            }
            .sheet(isPresented: $isPickerPresented) {
                ingredientPicker
            }
        }
    }

    private var setupSection: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                field("Recipe Name", text: $viewModel.recipeTitle, placeholder: "e.g., Mom's Special Pasta")
                HStack(spacing: 10) {
                    fieldNumber("Recipe Yield", value: $viewModel.recipeYield)
                    fieldNumber("Portion Consumed", value: $viewModel.servingsConsumed)
                }
            }
            .pkdCard()

            VStack(alignment: .leading, spacing: 8) {
                PKDSectionLabel(text: "Paste Ingredients or Recipe Article")
                Text("Smart Analysis will filter our instructions and extract ingredients.")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
                ZStack(alignment: .topLeading) {
                    TextEditor(text: $viewModel.rawIngredients)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .frame(minHeight: 190)
                        .padding(6)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    if viewModel.rawIngredients.isEmpty {
                        Text("Example: 1 cup chopped apples, 2 tbsp honey,\nor just paste the whole blog post...")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted.opacity(0.7))
                            .padding(14)
                    }
                }
            }
            .pkdCard()

            Button(viewModel.isAnalyzingRecipe ? "Analyzing..." : "PERFORM SMART AI ANALYSIS") {
                Task {
                    await viewModel.parseAndMatchIngredients()
                }
            }
            .disabled(viewModel.isAnalyzingRecipe)
            .overlay(alignment: .leading) {
                Image(systemName: "sparkles")
                    .foregroundStyle(.white)
                    .padding(.leading, 16)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
        }
    }

    private var reviewSection: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                PKDSectionLabel(text: "Review Matches")
                ForEach(Array(viewModel.parsedIngredients.enumerated()), id: \.element.id) { index, ingredient in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(ingredient.raw)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                        Text("Parsed quantity: \(ingredient.quantity, specifier: "%.2f") \(ingredient.unit)")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)

                        HStack {
                            HStack(spacing: 6) {
                                Image(systemName: ingredient.status == .matched ? "checkmark.circle.fill" : "questionmark.circle")
                                    .foregroundStyle(ingredient.status == .matched ? PKDPalette.success : PKDPalette.warning)
                                Text(matchText(ingredient))
                                    .foregroundStyle(ingredient.status == .matched ? PKDPalette.success : PKDPalette.warning)
                            }
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            Spacer()
                            Button(ingredient.status == .matched ? "Change" : "Pick") {
                                pickerTargetIndex = index
                                pickerQuery = ingredient.name.isEmpty ? ingredient.raw : ingredient.name
                                pickerResults = []
                                isPickerPresented = true
                                Task {
                                    pickerResults = await viewModel.ingredientSearch(query: pickerQuery)
                                }
                            }
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                        }
                    }
                    .padding(10)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                Button {
                    let newIngredient = RecipeParsedIngredient(
                        raw: "New ingredient",
                        name: "",
                        quantity: 1,
                        unit: "serving",
                        match: nil,
                        status: .noMatch
                    )
                    viewModel.parsedIngredients.append(newIngredient)
                    pickerTargetIndex = viewModel.parsedIngredients.count - 1
                    pickerQuery = ""
                    pickerResults = []
                    isPickerPresented = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Add Ingredient")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                    }
                    .foregroundStyle(PKDPalette.primary)
                    .frame(maxWidth: .infinity, minHeight: 40)
                    .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                            .foregroundStyle(PKDPalette.primary.opacity(0.2))
                    )
                }
                .buttonStyle(.plain)
            }
            .pkdCard()

            HStack(spacing: 10) {
                Button("BACK") {
                    viewModel.parsedIngredients = []
                }
                .buttonStyle(PKDOutlineButtonStyle())
                Button("SAVE ONLY") {
                    onSaveOnly()
                }
                .buttonStyle(PKDOutlineButtonStyle())
                Button("SAVE & LOG") {
                    onSaveAndLog()
                }
                .buttonStyle(PKDPrimaryButtonStyle())
            }
        }
    }

    private func matchText(_ ingredient: RecipeParsedIngredient) -> String {
        switch ingredient.status {
        case .matched:
            return "MATCHED TO: \(ingredient.match?.name.uppercased() ?? ingredient.name.uppercased())"
        case .noMatch:
            return "NO EXACT MATCH FOUND, PLEASE VERIFY"
        }
    }

    private var ingredientPicker: some View {
        NavigationStack {
            VStack(spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(PKDPalette.primary.opacity(0.6))
                    TextField("Search ingredient", text: $pickerQuery)
                }
                .padding(12)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                ScrollView {
                    VStack(spacing: 8) {
                        if pickerResults.isEmpty {
                            VStack(spacing: 10) {
                                Image(systemName: "fork.knife.circle")
                                    .font(.system(size: 34, weight: .semibold))
                                    .foregroundStyle(PKDPalette.primary.opacity(0.55))
                                Text(pickerQuery.isEmpty ? "Search for an ingredient" : "No direct ingredient match yet")
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text(pickerQuery.isEmpty
                                     ? "Type an ingredient name like garlic, spaghetti, spinach, or soy sauce."
                                     : "Try a broader term or another spelling. PKD Compass also searches food-based matches when an ingredient-specific result is missing.")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(24)
                            .pkdCard()
                        } else {
                            ForEach(pickerResults, id: \.id) { result in
                                Button {
                                    if let pickerTargetIndex {
                                        viewModel.pickIngredientMatch(index: pickerTargetIndex, match: result)
                                    }
                                    isPickerPresented = false
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(result.name)
                                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                                .foregroundStyle(PKDPalette.textMain)
                                            Text("\(Int(result.nutrients.calories)) kcal per 100g")
                                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                                .foregroundStyle(PKDPalette.textMuted)
                                        }
                                        Spacer()
                                    }
                                    .pkdCard()
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding()
            .pkdPageBackground()
            .navigationTitle("Pick Ingredient")
            .task(id: pickerQuery) {
                let trimmed = pickerQuery.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.isEmpty {
                    pickerResults = []
                } else {
                    pickerResults = await viewModel.ingredientSearch(query: trimmed)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isPickerPresented = false
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(PKDPalette.textMuted)
                            .frame(width: 34, height: 34)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func fieldNumber(_ label: String, value: Binding<Double>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: label)
            TextField("1", value: value, format: .number)
                .keyboardType(.decimalPad)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

private struct NutritionSettingsView: View {
    @AppStorage("pkd.nutrition.sodium") private var sodiumTarget = 2300.0
    @AppStorage("pkd.nutrition.potassium") private var potassiumTarget = 3500.0
    @AppStorage("pkd.nutrition.phosphorus") private var phosphorusTarget = 1000.0
    @AppStorage("pkd.nutrition.protein") private var proteinTarget = 60.0
    @AppStorage("pkd.nutrition.fluid") private var fluidTarget = 2500.0
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 34, height: 34)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)

                Text("NUTRITION SETTINGS")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
                Spacer()
            }
            .pkdGlassHeader()

            ScrollView {
                VStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle")
                            Text("MEDICAL DISCLAIMER")
                        }
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.danger)

                        Text("Educational only. Nutritional ranges vary based on your stage and health conditions. Please consult your clinician or renal dietitian before setting targets.")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.danger)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(hex: "#FFF1F2"), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(PKDPalette.danger.opacity(0.3), lineWidth: 1)
                    )

                    targetCard(label: "SALT", subtitle: "SODIUM LIMIT", value: $sodiumTarget, unit: "mg")
                    targetCard(label: "POTASSIUM", subtitle: "POTASSIUM LIMIT", value: $potassiumTarget, unit: "mg")
                    targetCard(label: "PHOSPHORUS", subtitle: "PHOSPHORUS LIMIT", value: $phosphorusTarget, unit: "mg")
                    targetCard(label: "PROTEIN", subtitle: "PROTEIN TARGET", value: $proteinTarget, unit: "g")
                    targetCard(label: "FLUID", subtitle: "FLUID TARGET", value: $fluidTarget, unit: "ml")

                    Button("SAVE TARGETS") {
                        dismiss()
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .padding(.top, 6)
                }
                .padding()
                .padding(.bottom, 20)
            }
        }
        .pkdPageBackground()
        .toolbar(.hidden, for: .navigationBar)
    }

    private func targetCard(label: String, subtitle: String, value: Binding<Double>, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.primary.opacity(0.5))
                Text(subtitle)
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary.opacity(0.4))
            }
            HStack {
                TextField("0", value: value, format: .number)
                    .keyboardType(.numberPad)
                    .font(.system(size: 26, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
                Text(unit.uppercased())
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.primary.opacity(0.5))
            }
            .padding(12)
            .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.2), lineWidth: 1)
            )
        }
        .pkdCard()
    }
}

private struct CheckedFoodsView: View {
    @Environment(\.dismiss) private var dismiss
    let entries: [FoodLogEntry]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 36, height: 36)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                Text("Checked Foods")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
            }
            .pkdGlassHeader()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 10) {
                    if entries.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "checklist")
                                .font(.system(size: 30, weight: .semibold))
                                .foregroundStyle(PKDPalette.primary.opacity(0.45))
                            Text("No checked foods yet")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                            Text("Go back to the food search to review checked items.")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                            Button {
                                dismiss()
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "chevron.left")
                                    Text("Back to Food Diary")
                                }
                            }
                            .buttonStyle(PKDOutlineButtonStyle())
                            .padding(.top, 6)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                    }
                    ForEach(entries, id: \.id) { entry in
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(PKDPalette.primary.opacity(0.12))
                                .frame(width: 34, height: 34)
                                .overlay {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(PKDPalette.primary)
                                }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.itemName)
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text("\(Int(entry.calories)) kcal · K \(Int(entry.potassiumMg)) · Na \(Int(entry.sodiumMg))")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                            Spacer()
                        }
                        .pkdCard()
                    }
                }
                .padding()
                .padding(.bottom, 18)
            }
        }
        .pkdPageBackground()
        .toolbar(.hidden, for: .navigationBar)
    }
}
