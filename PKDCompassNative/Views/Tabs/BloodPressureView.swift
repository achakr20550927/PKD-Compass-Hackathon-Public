import SwiftUI
import SwiftData
import UIKit

struct BloodPressureView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject private var appRouter: AppRouter
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var viewModel = BloodPressureViewModel()
    @State private var clinicalProfile: NativeClinicalProfile = .standard
    @State private var showingReportDisclosure = false
    @State private var showingReportConsent = false
    @State private var showingFeatureConsent = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if viewModel.weekStart != nil {
                    header
                } else {
                    Spacer(minLength: 0)
                        .frame(height: 12)
                }

                ScrollView(showsIndicators: false) {
                    if viewModel.weekStart == nil {
                        startModeCard
                            .padding()
                    } else {
                        VStack(alignment: .leading, spacing: 14) {
                            weeklyGrid
                            statsRow
                        }
                        .padding()
                        .padding(.bottom, 24)
                    }
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $viewModel.isLogSheetPresented) {
                logSheet
            }
            .sheet(isPresented: $viewModel.isShareSheetPresented, onDismiss: {
                viewModel.reportURL = nil
            }) {
                if let reportURL = viewModel.reportURL {
                    ActivityViewController(activityItems: [reportURL])
                }
            }
            .alert("Export Report Disclosure", isPresented: $showingReportDisclosure) {
                Button("Cancel", role: .cancel) { }
                Button("Continue") {
                    viewModel.generateReport()
                }
            } message: {
                Text("This report may contain sensitive health information and will leave the app when you share or export it. Share it only through destinations you trust. The report is informational only and does not replace professional medical advice.")
            }
            .alert("Reports & Exports Terms", isPresented: $showingReportConsent) {
                Button("Decline", role: .cancel) { }
                Button("Accept") {
                    Task {
                        try? await authViewModel.updateConsents([(.reportExports, true)])
                        await MainActor.run {
                            showingReportDisclosure = true
                        }
                    }
                }
            } message: {
                Text("Reports and exports may include sensitive health information, summary values, trends, and timestamps that leave PKD Compass when shared. Exported files can be copied, forwarded, or stored by other apps or recipients outside PKD Compass protections. PKD Compass is not liable for disclosures, recipient misuse, delivery failures, stale values, or actions taken from exported content. By continuing, you agree to share reports only through destinations you trust and to verify critical information before acting on it.")
            }
            .onAppear {
                viewModel.load(context: modelContext)
                clinicalProfile = ClinicalRules.profile(context: modelContext)
                if !authViewModel.hasConsent(.bloodPressure) {
                    showingFeatureConsent = true
                }
                openQuickLogIfNeeded()
            }
            .onChange(of: appRouter.shouldOpenBPQuickLog) { _, _ in
                openQuickLogIfNeeded()
            }
            .alert("Blood Pressure Terms", isPresented: $showingFeatureConsent) {
                Button("Decline", role: .cancel) {
                    appRouter.selectedTab = .dashboard
                }
                Button("Accept") {
                    Task {
                        try? await authViewModel.updateConsents([(.bloodPressure, true)])
                    }
                }
            } message: {
                Text("Blood pressure readings, pulse values, weekly averages, trend charts, and exported reports are convenience tools only. Readings may be entered incorrectly, sync late, reflect stale device time, display incomplete averages, or fail to trigger reminders. PKD Compass is not liable for emergency decisions, treatment changes, missed high readings, export mistakes, or harm caused by relying on this feature instead of direct clinical guidance. By continuing, you agree to verify important information with your clinician and official records.")
            }
            .overlay {
                if !authViewModel.hasConsent(.bloodPressure) {
                    FeatureBlockedCard(
                        title: "Blood Pressure Tracking Locked",
                        message: "You must accept the Blood Pressure Terms before using BP logging, trend charts, weekly monitoring, or BP report exports.",
                        accept: {
                            Task { try? await authViewModel.updateConsents([(.bloodPressure, true)]) }
                        },
                        decline: {
                            appRouter.selectedTab = .dashboard
                        }
                    )
                }
            }
        }
    }

    private var header: some View {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Weekly Monitor")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text(viewModel.weekStart == nil ? "" : "Day \(viewModel.currentDayIndex + 1) of 7")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.primary)
                }
                Spacer()
                if viewModel.weekStart != nil {
                    Button("Restart Week") {
                        viewModel.startWeeklyMode(context: modelContext)
                    }
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                }
            }
        .pkdGlassHeader()
    }

    private var startModeCard: some View {
        VStack(spacing: 18) {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(PKDPalette.primary.opacity(0.12))
                .frame(width: 72, height: 72)
                .overlay {
                    Image(systemName: "rectangle.split.3x1")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(PKDPalette.primary)
                }

            VStack(spacing: 6) {
                Text("Weekly BP Mode")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)

                Text("Nephrologists recommend a 7-day monitoring period (2x daily) to accurately assess your blood pressure trend.")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                    .multilineTextAlignment(.center)
            }

            Button("Start 7-Day Monitor") {
                viewModel.startWeeklyMode(context: modelContext)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }

    private var weeklyGrid: some View {
        VStack(spacing: 0) {
            LazyVGrid(columns: gridColumns, spacing: 0) {
                headerCell("TIME")
                ForEach(1...7, id: \.self) { day in
                    headerCell("DAY \(day)")
                }
            }
            .padding(.vertical, 14)
            .background(Color(hex: "#EEF2FF"))

            row(period: .am, icon: "sun.max", iconColor: Color(hex: "#F59E0B"))
            Divider().opacity(0.08)
            row(period: .pm, icon: "moon.stars", iconColor: PKDPalette.primary)
        }
        .background(Color.white, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 8)
    }

    private var statsRow: some View {
        HStack(spacing: 10) {
            statCard(title: "Weekly Average", value: viewModel.averageText)
            statCard(title: "Completion", value: "\(viewModel.completionPercent)%")
            reportCard
        }
    }

    private var reportCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button("Generate Report") {
                if authViewModel.hasConsent(.reportExports) {
                    showingReportDisclosure = true
                } else {
                    showingReportConsent = true
                }
            }
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(viewModel.canGenerateReport ? PKDPalette.primary : PKDPalette.primary.opacity(0.5))
                )
                .disabled(!viewModel.canGenerateReport)

            Text("Exports may contain sensitive health information. Continue only if you intend to share it securely.")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .pkdCard()
    }

    private func statCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.3)
                .foregroundStyle(PKDPalette.textMuted)
            Text(value)
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .pkdCard()
    }

    private func row(period: BloodPressureViewModel.ReadingPeriod, icon: String, iconColor: Color) -> some View {
        LazyVGrid(columns: gridColumns, spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                Text(period.rawValue)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            .frame(maxWidth: .infinity, minHeight: 72, alignment: .leading)
            .padding(.leading, 12)

            ForEach(0..<7, id: \.self) { day in
                let reading = viewModel.reading(for: day, period: period)
                Button {
                    viewModel.openLog(day: day, period: period)
                } label: {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(reading == nil ? Color.clear : PKDPalette.primary.opacity(0.12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(
                                    reading == nil ? PKDPalette.primary.opacity(0.2) : PKDPalette.primary.opacity(0.5),
                                    style: StrokeStyle(lineWidth: 2, dash: reading == nil ? [5, 4] : [])
                                )
                        )
                        .frame(width: 44, height: 44)
                        .overlay {
                            if let reading {
                                VStack(spacing: 0) {
                                    Text("\(reading.systolic)")
                                    Text("\(reading.diastolic)")
                                }
                                .font(.system(size: 10, weight: .black, design: .rounded))
                                .foregroundStyle(PKDPalette.primary)
                            } else {
                                Image(systemName: "plus")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundStyle(PKDPalette.primary.opacity(0.45))
                            }
                        }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity, minHeight: 72)
            }
        }
        .padding(.horizontal, 4)
    }

    private var logSheet: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    bpHeroCard

                    HStack(spacing: 12) {
                        metricField(
                            title: "Systolic",
                            subtitle: "Top number",
                            icon: "arrow.up.circle.fill",
                            accent: Color(hex: "#FF6B6B"),
                            text: $viewModel.systolicInput
                        )

                        metricField(
                            title: "Diastolic",
                            subtitle: "Bottom number",
                            icon: "arrow.down.circle.fill",
                            accent: Color(hex: "#7C5CFF"),
                            text: $viewModel.diastolicInput
                        )
                    }

                    metricField(
                        title: "Pulse",
                        subtitle: "Optional heart rate",
                        icon: "heart.circle.fill",
                        accent: Color(hex: "#EC4899"),
                        text: $viewModel.pulseInput,
                        unit: "bpm"
                    )

                    if let errorMessage = viewModel.errorMessage {
                        HStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(PKDPalette.danger)
                            Text(errorMessage)
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(PKDPalette.danger)
                            Spacer()
                        }
                        .padding(14)
                        .background(PKDPalette.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(PKDPalette.danger.opacity(0.14), lineWidth: 1)
                        )
                    }

                    Button {
                        viewModel.saveReading(context: modelContext)
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 18, weight: .bold))
                            Text("Save Reading")
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .padding(.top, 4)
                }
                .padding()
                .padding(.bottom, 24)
            }
            .pkdPageBackground()
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("Log BP Reading")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text(selectedSlotText)
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.isLogSheetPresented = false
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

    private var bpHeroCard: some View {
        let interpretation = bpInterpretation
        let accent = statusColor(for: interpretation.status)

        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#0E172F"), Color(hex: "#1F2D63"), Color(hex: "#5B6BFF")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Circle()
                .fill(Color.white.opacity(0.09))
                .frame(width: 180, height: 180)
                .offset(x: 170, y: -40)

            Circle()
                .fill(accent.opacity(0.16))
                .frame(width: 120, height: 120)
                .offset(x: -18, y: 92)

            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Blood Pressure Entry")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .tracking(1.6)
                            .foregroundStyle(Color.white.opacity(0.72))
                        Text(selectedSlotText)
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    Image(systemName: "heart.text.square.fill")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(accent)
                        .padding(12)
                        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }

                HStack(spacing: 12) {
                    heroValueCard(
                        label: "Systolic",
                        value: viewModel.systolicInput.isEmpty ? "--" : viewModel.systolicInput,
                        unit: "mmHg"
                    )
                    heroValueCard(
                        label: "Diastolic",
                        value: viewModel.diastolicInput.isEmpty ? "--" : viewModel.diastolicInput,
                        unit: "mmHg"
                    )
                }

                HStack(spacing: 10) {
                    PKDStatusCapsule(text: interpretation.label.uppercased(), color: accent)
                    if !viewModel.pulseInput.isEmpty {
                        PKDStatusCapsule(text: "\(viewModel.pulseInput) BPM", color: Color(hex: "#F97316"))
                    }
                }

                Text(interpretation.message)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.86))
                    .multilineTextAlignment(.leading)
            }
            .padding(22)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 250)
        .shadow(color: Color.black.opacity(0.14), radius: 18, x: 0, y: 10)
    }

    private func heroValueCard(label: String, value: String, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(Color.white.opacity(0.64))
            HStack(alignment: .lastTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text(unit)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private func metricField(
        title: String,
        subtitle: String,
        icon: String,
        accent: Color,
        text: Binding<String>,
        unit: String? = "mmHg"
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(accent)
                    .frame(width: 40, height: 40)
                    .background(accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text(subtitle)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            HStack(alignment: .lastTextBaseline, spacing: 8) {
                TextField("0", text: text)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.plain)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                if let unit {
                    Text(unit)
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(Color.white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(accent.opacity(0.14), lineWidth: 1)
            )
            .shadow(color: accent.opacity(0.08), radius: 12, x: 0, y: 8)
        }
    }

    private func headerCell(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .black, design: .rounded))
            .foregroundStyle(PKDPalette.textMuted)
            .frame(maxWidth: .infinity, minHeight: 26)
    }

    private var gridColumns: [GridItem] {
        [GridItem(.fixed(72))] + Array(repeating: GridItem(.flexible(minimum: 32)), count: 7)
    }

    private func openQuickLogIfNeeded() {
        guard appRouter.shouldOpenBPQuickLog else { return }
        if viewModel.weekStart == nil {
            viewModel.startWeeklyMode(context: modelContext)
        }
        let hour = Calendar.current.component(.hour, from: Date())
        let preferredPeriod: BloodPressureViewModel.ReadingPeriod = hour < 15 ? .am : .pm
        viewModel.openLog(day: viewModel.currentDayIndex, period: preferredPeriod)
        appRouter.shouldOpenBPQuickLog = false
    }

    private var selectedSlotText: String {
        guard let slot = viewModel.selectedSlot, let weekStart = viewModel.weekStart else {
            return "New reading"
        }
        let targetDate = Calendar.current.date(byAdding: .day, value: slot.day, to: weekStart) ?? weekStart
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        return "\(formatter.string(from: targetDate)) · \(slot.period.rawValue)"
    }

    private var bpInterpretation: ClinicalInterpretation {
        guard
            let systolic = Int(viewModel.systolicInput),
            let diastolic = Int(viewModel.diastolicInput)
        else {
            return .init(
                status: .attention,
                label: "Waiting for values",
                message: "Enter systolic and diastolic readings to preview whether this BP is at target."
            )
        }
        return ClinicalRules.interpretBP(systolic: systolic, diastolic: diastolic, profile: clinicalProfile)
    }

    private func statusColor(for status: ClinicalStatus) -> Color {
        switch status {
        case .normal:
            return PKDPalette.success
        case .attention:
            return PKDPalette.warning
        case .danger, .critical:
            return PKDPalette.danger
        }
    }
}

private struct ActivityViewController: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
