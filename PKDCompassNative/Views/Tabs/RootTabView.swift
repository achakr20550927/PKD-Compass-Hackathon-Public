import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case dashboard
    case bp
    case food
    case meds
    case labs
    case docs
    case resources
    case care
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .bp: return "BP"
        case .food: return "Food"
        case .meds: return "Meds"
        case .labs: return "Labs"
        case .docs: return "Docs"
        case .resources: return "Resources"
        case .care: return "Care"
        case .profile: return "Profile"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .bp: return "heart"
        case .food: return "fork.knife"
        case .meds: return "pills"
        case .labs: return "flask"
        case .docs: return "doc.text"
        case .resources: return "info.circle"
        case .care: return "calendar"
        case .profile: return "person.crop.circle"
        }
    }
}

enum LabsDestination {
    case labs
    case symptoms
}

enum DashboardRouteAction {
    case addLab
    case logBP
    case medications
    case foodLog
    case symptoms
    case vault
}

@MainActor
final class AppRouter: ObservableObject {
    @Published var selectedTab: AppTab = .dashboard
    @Published var labsDestination: LabsDestination = .labs
    @Published var shouldPresentAddLabSheet = false
    @Published var shouldPresentAddSymptomSheet = false
    @Published var shouldOpenBPQuickLog = false

    func routeFromDashboard(_ action: DashboardRouteAction) {
        switch action {
        case .addLab:
            selectedTab = .labs
            labsDestination = .labs
            shouldPresentAddLabSheet = true
        case .logBP:
            selectedTab = .bp
            shouldOpenBPQuickLog = true
        case .medications:
            selectedTab = .meds
        case .foodLog:
            selectedTab = .food
        case .symptoms:
            selectedTab = .labs
            labsDestination = .symptoms
            shouldPresentAddSymptomSheet = true
        case .vault:
            selectedTab = .docs
        }
    }
}

struct RootTabView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var router = AppRouter()

    var body: some View {
        ZStack {
            DashboardView()
                .opacity(router.selectedTab == .dashboard ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .dashboard)

            BloodPressureView()
                .opacity(router.selectedTab == .bp ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .bp)

            FoodTrackerView()
                .opacity(router.selectedTab == .food ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .food)

            MedicationsView()
                .opacity(router.selectedTab == .meds ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .meds)

            LabsView()
                .opacity(router.selectedTab == .labs ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .labs)

            DocumentVaultView()
                .opacity(router.selectedTab == .docs ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .docs)

            ResourcesView()
                .opacity(router.selectedTab == .resources ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .resources)

            OrganizerView()
                .opacity(router.selectedTab == .care ? 1 : 0)
                .allowsHitTesting(router.selectedTab == .care)

        }
        .animation(.easeInOut(duration: 0.15), value: router.selectedTab)
        .safeAreaInset(edge: .bottom) {
            bottomBar
        }
        .environmentObject(router)
    }

    private var visibleTabs: [AppTab] {
        [.dashboard, .bp, .food, .meds, .labs, .docs, .resources, .care]
    }

    private var bottomBar: some View {
        ScrollViewReader { proxy in
            bottomBarScrollContent(proxy: proxy)
            .onAppear {
                proxy.scrollTo(router.selectedTab.id, anchor: .center)
            }
            .onChange(of: router.selectedTab) { _, newValue in
                withAnimation(.easeInOut(duration: 0.2)) {
                    proxy.scrollTo(newValue.id, anchor: .center)
                }
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 6)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .overlay(Color.white.opacity(0.88))
        )
        .overlay(alignment: .top) {
            Rectangle()
                .fill(PKDPalette.primary.opacity(0.08))
                .frame(height: 1)
        }
    }

    private func bottomBarScrollContent(proxy: ScrollViewProxy) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(visibleTabs) { tab in
                    tabButton(for: tab)
                        .id(tab.id)
                }
            }
            .padding(.horizontal, 10)
        }
    }

    private func tabButton(for tab: AppTab) -> some View {
        let isSelected = router.selectedTab == tab

        return Button {
            router.selectedTab = tab
        } label: {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: 16, weight: .semibold))
                Text(tab.title)
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .foregroundStyle(isSelected ? PKDPalette.primary : PKDPalette.textMuted)
            .frame(width: 64, height: 44)
            .padding(.vertical, 4)
            .background(tabBackground(isSelected: isSelected))
        }
        .buttonStyle(.plain)
    }

    private func tabBackground(isSelected: Bool) -> some View {
        RoundedRectangle(cornerRadius: 10, style: .continuous)
            .fill(isSelected ? PKDPalette.primary.opacity(0.12) : .clear)
    }
}
