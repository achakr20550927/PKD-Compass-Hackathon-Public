import SwiftUI
import SwiftData
import Charts

struct DashboardQuickAction: Identifiable {
    let id = UUID()
    let title: String
    let icon: String
    let colors: [Color]
    let routeAction: DashboardRouteAction
}

struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject private var authViewModel: AuthViewModel
    @EnvironmentObject private var appRouter: AppRouter
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedTrendIndex = 0
    @State private var showUACRInfo = false
    @State private var showProfile = false
    @State private var profileName: String?

    private let quickActions: [DashboardQuickAction] = [
        .init(title: "Add Lab", icon: "waveform.path.ecg", colors: [PKDPalette.primary, Color(hex: "#6366F1")], routeAction: .addLab),
        .init(title: "Log BP", icon: "heart.fill", colors: [Color(hex: "#F43F5E"), Color(hex: "#EC4899")], routeAction: .logBP),
        .init(title: "Medications", icon: "pills", colors: [Color(hex: "#10B981"), Color(hex: "#14B8A6")], routeAction: .medications),
        .init(title: "Food Log", icon: "fork.knife", colors: [Color(hex: "#F59E0B"), Color(hex: "#FB923C")], routeAction: .foodLog),
        .init(title: "Symptoms", icon: "cross.case", colors: [Color(hex: "#8B5CF6"), Color(hex: "#A855F7")], routeAction: .symptoms),
        .init(title: "Vault", icon: "doc.text", colors: [Color(hex: "#475569"), Color(hex: "#334155")], routeAction: .vault)
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        greeting
                        trendHero
                        uacrCard
                        quickActionsGrid
                    }
                    .padding()
                    .padding(.bottom, 20)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showUACRInfo) {
                UACRInfoSheet()
            }
            .sheet(isPresented: $showProfile) {
                ProfileView()
            }
            .onAppear {
                viewModel.load(context: modelContext)
                selectedTrendIndex = min(selectedTrendIndex, max(viewModel.trendCards.count - 1, 0))
                loadProfileName()
            }
        }
    }

    private var header: some View {
        HStack {
            Button {
                showProfile = true
            } label: {
                HStack(spacing: 10) {
                    Circle()
                        .fill(PKDPalette.primary.opacity(0.15))
                        .frame(width: 34, height: 34)
                        .overlay {
                            Image(systemName: "info.circle.fill")
                                .foregroundStyle(PKDPalette.primary)
                        }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("PATIENT PORTAL")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .tracking(1.2)
                            .foregroundStyle(PKDPalette.textMuted)
                            .lineLimit(1)
                        Text(fullDisplayName)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
            }
            .buttonStyle(.plain)

            Spacer()

            HStack(spacing: 10) {
                NavigationLink {
                    NotificationsCenterView()
                } label: {
                    iconButton("bell")
                }
                .buttonStyle(.plain)

                NavigationLink {
                    AppSettingsView()
                } label: {
                    iconButton("gearshape")
                }
                .buttonStyle(.plain)
            }
        }
        .pkdGlassHeader()
    }

    private func iconButton(_ systemName: String) -> some View {
        RoundedRectangle(cornerRadius: 10, style: .continuous)
            .fill(Color.white.opacity(0.9))
            .frame(width: 36, height: 36)
            .overlay {
                Image(systemName: systemName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(PKDPalette.textMuted)
            }
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
            )
    }

    private var greeting: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(greetingText)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
            Text("\(displayName) 👋")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
        }
    }

    private var trendHero: some View {
        VStack(alignment: .leading, spacing: 10) {
            if viewModel.trendCards.isEmpty {
                Text("No trend data yet")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .background(PKDGradients.hero, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            } else {
                let card = viewModel.trendCards[selectedTrendIndex]
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Button {
                            selectedTrendIndex = selectedTrendIndex == 0 ? viewModel.trendCards.count - 1 : selectedTrendIndex - 1
                        } label: {
                            Image(systemName: "chevron.left")
                                .foregroundStyle(.white)
                                .frame(width: 34, height: 34)
                                .background(.white.opacity(0.14), in: Circle())
                        }
                        .buttonStyle(.plain)

                        Spacer()

                        VStack(spacing: 1) {
                            Text(card.title.uppercased())
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .tracking(1.2)
                                .foregroundStyle(.white.opacity(0.8))
                            Text(card.unit)
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                        }

                        Spacer()

                        Button {
                            selectedTrendIndex = (selectedTrendIndex + 1) % viewModel.trendCards.count
                        } label: {
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.white)
                                .frame(width: 34, height: 34)
                                .background(.white.opacity(0.14), in: Circle())
                        }
                        .buttonStyle(.plain)
                    }

                    if card.points.isEmpty {
                        VStack(spacing: 6) {
                            Image(systemName: "chart.line.uptrend.xyaxis")
                                .font(.system(size: 24))
                                .foregroundStyle(.white.opacity(0.35))
                            Text("No \(card.metric.rawValue.capitalized) data found")
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.45))
                        }
                        .frame(maxWidth: .infinity, minHeight: 180)
                        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    } else {
                        Chart(card.points.suffix(8), id: \.id) { point in
                            AreaMark(
                                x: .value("Date", point.date),
                                y: .value("Value", point.value)
                            )
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.white.opacity(0.35), .white.opacity(0.01)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )

                            LineMark(
                                x: .value("Date", point.date),
                                y: .value("Value", point.value)
                            )
                            .interpolationMethod(.catmullRom)
                            .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                            .foregroundStyle(.white)
                        }
                        .chartXAxis(.hidden)
                        .chartYAxis(.hidden)
                        .frame(height: 170)
                        .padding(10)
                        .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    }

                    HStack(spacing: 5) {
                        ForEach(Array(viewModel.trendCards.indices), id: \.self) { index in
                            Capsule()
                                .fill(index == selectedTrendIndex ? Color.white : Color.white.opacity(0.45))
                                .frame(width: index == selectedTrendIndex ? 18 : 5, height: 5)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.bottom, 2)
                }
                .padding(16)
                .background(
                    ZStack {
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(PKDGradients.hero)
                        Circle()
                            .fill(Color.white.opacity(0.12))
                            .frame(width: 140, height: 140)
                            .offset(x: 90, y: -60)
                        Circle()
                            .fill(Color.white.opacity(0.12))
                            .frame(width: 100, height: 100)
                            .offset(x: -90, y: 60)
                    }
                )
            }
        }
        .shadow(color: PKDPalette.primary.opacity(0.24), radius: 15, x: 0, y: 10)
    }

    private var uacrCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Text("UACR (PROTEINURIA)")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(1.3)
                    .foregroundStyle(PKDPalette.textMuted)
                Button {
                    showUACRInfo = true
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(Color(hex: "#D97706"))
                }
                .buttonStyle(.plain)
            }

            HStack(alignment: .lastTextBaseline, spacing: 6) {
                Text(uacrValue)
                    .font(.system(size: 42, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("mg/g")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            GeometryReader { proxy in
                let width = proxy.size.width
                let pct = max(0, min(uacrPercent, 1))
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color(hex: "#E2E8F0"))
                        .frame(height: 10)
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(uacrGradient)
                        .frame(width: width * pct, height: 10)
                }
            }
            .frame(height: 10)

            HStack {
                PKDStatusCapsule(text: uacrStatus == "NORMAL" ? "Normal Range" : uacrStatus, color: statusColor(uacrStatus))
                Spacer()
                Text("Target: <30 mg/g")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }
        }
        .pkdCard()
    }

    private var quickActionsGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            PKDSectionLabel(text: "Quick Actions")
                .padding(.horizontal, 2)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(quickActions) { action in
                    Button {
                        appRouter.routeFromDashboard(action.routeAction)
                    } label: {
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(LinearGradient(colors: action.colors, startPoint: .topLeading, endPoint: .bottomTrailing))
                                .frame(width: 38, height: 38)
                                .overlay {
                                    Image(systemName: action.icon)
                                        .foregroundStyle(.white)
                                        .font(.system(size: 17, weight: .bold))
                                }
                            Text(action.title)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                            Spacer(minLength: 0)
                        }
                        .pkdCard()
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "CRITICAL": return PKDPalette.danger
        case "DANGER": return Color(hex: "#F97316")
        case "ATTENTION": return PKDPalette.warning
        default: return PKDPalette.success
        }
    }

    private var displayName: String {
        let emailLocalPart = authViewModel.currentEmail
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .components(separatedBy: "@")
            .first ?? ""
        let cachedFirst = authViewModel.currentUserFirstName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cachedFirst.isEmpty, !cachedFirst.contains("@"), cachedFirst.lowercased() != emailLocalPart {
            return cachedFirst
        }
        if let profileName {
            let cleanProfileName = profileName.trimmingCharacters(in: .whitespacesAndNewlines)
            if !cleanProfileName.isEmpty, !cleanProfileName.contains("@"), cleanProfileName.lowercased() != emailLocalPart {
                return cleanProfileName.split(separator: " ").first.map(String.init) ?? cleanProfileName
            }
        }
        return "Patient"
    }

    private var fullDisplayName: String {
        let first = authViewModel.currentUserFirstName.trimmingCharacters(in: .whitespacesAndNewlines)
        let last = authViewModel.currentUserLastName.trimmingCharacters(in: .whitespacesAndNewlines)
        let combined = [first, last]
            .filter { !$0.isEmpty && !$0.contains("@") }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !combined.isEmpty {
            return combined
        }
        if let profileName {
            let clean = profileName.trimmingCharacters(in: .whitespacesAndNewlines)
            if !clean.isEmpty, !clean.contains("@") {
                return clean
            }
        }
        return displayName
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning," }
        if hour < 17 { return "Good afternoon," }
        return "Good evening,"
    }

    private func loadProfileName() {
        let email = authViewModel.currentEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        var descriptor = FetchDescriptor<UserProfile>()
        descriptor.predicate = #Predicate<UserProfile> { $0.email == email }
        if let profile = try? modelContext.fetch(descriptor).first {
            profileName = profile.fullName.isEmpty ? nil : profile.fullName
            return
        }
        let cachedFull = [authViewModel.currentUserFirstName, authViewModel.currentUserLastName]
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && !$0.contains("@") }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        profileName = cachedFull.isEmpty ? nil : cachedFull
    }

    private var uacrLab: LabResultCard? {
        viewModel.latestLabs.first(where: { $0.metric == ObservationType.uacr.rawValue })
    }

    private var uacrValue: String {
        uacrLab?.value ?? "--"
    }

    private var uacrStatus: String {
        uacrLab?.status ?? "NORMAL"
    }

    private var uacrPercent: Double {
        guard let value = Double(uacrLab?.value ?? "") else { return 0 }
        return min(value / 300, 1)
    }

    private var uacrGradient: LinearGradient {
        switch uacrStatus {
        case "CRITICAL":
            return PKDGradients.warm
        case "DANGER", "ATTENTION":
            return LinearGradient(colors: [Color(hex: "#F59E0B"), Color(hex: "#F97316")], startPoint: .leading, endPoint: .trailing)
        default:
            return LinearGradient(colors: [PKDPalette.success, Color(hex: "#34D399")], startPoint: .leading, endPoint: .trailing)
        }
    }
}

private struct UACRInfoSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 10) {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color(hex: "#FDE68A"))
                            .frame(width: 44, height: 44)
                            .overlay {
                                Image(systemName: "flask")
                                    .foregroundStyle(Color(hex: "#F59E0B"))
                            }
                        Text("What is UACR?")
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                    }
                    Text("Definition")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("UACR stands for Urine Albumin-to-Creatinine Ratio. It measures how much albumin (a protein) is leaking into your urine. Healthy kidneys keep albumin in your blood — when kidneys are damaged, albumin spills into urine.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("UACR Ranges (mg/g)")
                            .font(.system(size: 16, weight: .black, design: .rounded))
                        rangeCard("< 30 mg/g", "A1 — Normal", "Kidneys filtering protein properly", tint: PKDPalette.success)
                        rangeCard("30–300 mg/g", "A2 — Moderately Increased", "Early kidney damage signal", tint: Color(hex: "#F59E0B"))
                        rangeCard("> 300 mg/g", "A3 — Severely Increased", "Significant damage — see your doctor", tint: PKDPalette.danger)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("How to log your UACR")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                        VStack(alignment: .leading, spacing: 6) {
                            Text("1. Get a urine test from your doctor or lab — they'll give you a UACR value in mg/g.")
                            Text("2. Tap Add Lab from the dashboard quick actions (or go to Labs → Add Lab).")
                            Text("3. Select UACR as the lab type and enter your value.")
                            Text("4. Your dashboard will instantly update with the new reading and trend bar.")
                        }
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                        .padding(12)
                        .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .pkdCard()

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Why it matters for PKD")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                        Text("Even when your eGFR looks stable, rising UACR is an early warning sign of kidney damage. High UACR accelerates eGFR decline and increases cardiovascular risk — making it one of the most important values to track regularly.")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                    .pkdCard()
                }
                .padding()
            }
            .pkdPageBackground()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
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

    private func rangeCard(_ value: String, _ label: String, _ body: String, tint: Color) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(tint)
                Text(label)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text(body)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }
            Spacer()
        }
        .padding(12)
        .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
