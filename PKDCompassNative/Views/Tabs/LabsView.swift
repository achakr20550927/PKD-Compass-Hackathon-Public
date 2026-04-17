import SwiftUI
import Charts
import SwiftData

struct LabsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject private var appRouter: AppRouter
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var viewModel = LabsViewModel()
    @State private var showingAddForm = false
    @State private var showingEditLabForm = false
    @State private var showingSymptomForm = false
    @State private var showingEditSymptomForm = false
    @State private var showSymptomTypeDialog = false
    @State private var isSavingFeatureConsent = false
    @State private var featureConsentError: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        viewToggle

                        if viewModel.view == .labs {
                            labsContent
                        } else {
                            symptomsContent
                        }
                    }
                    .padding()
                    .padding(.bottom, 32)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .fullScreenCover(isPresented: $showingAddForm) {
                AddLabSheet(
                    selectedMetric: $viewModel.selectedMetric,
                    inputValue: $viewModel.inputValue,
                    inputUnit: $viewModel.inputUnit,
                    inputDate: $viewModel.inputDate,
                    isEditing: false,
                    errorMessage: viewModel.errorMessage,
                    onSave: {
                        viewModel.addLab(context: modelContext)
                        if viewModel.errorMessage == nil {
                            showingAddForm = false
                        }
                    }
                )
            }
            .fullScreenCover(isPresented: $showingEditLabForm) {
                AddLabSheet(
                    selectedMetric: $viewModel.selectedMetric,
                    inputValue: $viewModel.inputValue,
                    inputUnit: $viewModel.inputUnit,
                    inputDate: $viewModel.inputDate,
                    isEditing: true,
                    errorMessage: viewModel.errorMessage,
                    onSave: {
                        viewModel.saveEditedLab(context: modelContext)
                        if viewModel.errorMessage == nil {
                            showingEditLabForm = false
                        }
                    }
                )
            }
            .fullScreenCover(isPresented: $showingSymptomForm) {
                AddSymptomSheet(
                    symptomType: $viewModel.symptomType,
                    symptomSeverity: $viewModel.symptomSeverity,
                    symptomNotes: $viewModel.symptomNotes,
                    symptomDate: $viewModel.symptomDate,
                    symptomTypes: viewModel.symptomTypes,
                    isEditing: false,
                    errorMessage: viewModel.errorMessage,
                    onSave: {
                        viewModel.addSymptom(context: modelContext)
                        if viewModel.errorMessage == nil {
                            showingSymptomForm = false
                        }
                    }
                )
            }
            .fullScreenCover(isPresented: $showingEditSymptomForm) {
                AddSymptomSheet(
                    symptomType: $viewModel.symptomType,
                    symptomSeverity: $viewModel.symptomSeverity,
                    symptomNotes: $viewModel.symptomNotes,
                    symptomDate: $viewModel.symptomDate,
                    symptomTypes: viewModel.symptomTypes,
                    isEditing: true,
                    errorMessage: viewModel.errorMessage,
                    onSave: {
                        viewModel.saveEditedSymptom(context: modelContext)
                        if viewModel.errorMessage == nil {
                            showingEditSymptomForm = false
                        }
                    }
                )
            }
            .sheet(isPresented: $viewModel.isFilterOpen) {
                filterSheet
            }
            .onChange(of: viewModel.selectedMetric) { _, _ in
                viewModel.refreshSeries(context: modelContext)
            }
            .onChange(of: viewModel.timeframe) { _, _ in
                viewModel.refreshSeries(context: modelContext)
            }
            .onChange(of: appRouter.labsDestination) { _, destination in
                viewModel.view = destination == .labs ? .labs : .symptoms
            }
            .onChange(of: appRouter.shouldPresentAddLabSheet) { _, shouldOpen in
                guard shouldOpen else { return }
                viewModel.view = .labs
                showingAddForm = true
                appRouter.shouldPresentAddLabSheet = false
            }
            .onChange(of: appRouter.shouldPresentAddSymptomSheet) { _, shouldOpen in
                guard shouldOpen else { return }
                viewModel.view = .symptoms
                showingSymptomForm = true
                appRouter.shouldPresentAddSymptomSheet = false
            }
            .onAppear {
                viewModel.view = appRouter.labsDestination == .labs ? .labs : .symptoms
                if appRouter.shouldPresentAddLabSheet {
                    viewModel.resetLabForm()
                    showingAddForm = true
                    appRouter.shouldPresentAddLabSheet = false
                }
                if appRouter.shouldPresentAddSymptomSheet {
                    viewModel.resetSymptomForm()
                    showingSymptomForm = true
                    appRouter.shouldPresentAddSymptomSheet = false
                }
                viewModel.load(context: modelContext)
            }
            .overlay {
                if !authViewModel.hasConsent(.labsAndSymptoms) {
                    FeatureBlockedCard(
                        title: "Labs & Symptoms Locked",
                        message: "By accepting these terms, you authorize PKD Compass to store, synchronize, and display the lab values, units, dates, symptom entries, symptom severity ratings, notes, charts, trend lines, status indicators, and related uploads that you enter or provide. These features are informational organization tools only. Values may be entered incorrectly, mapped to the wrong unit, delayed in sync, duplicated, omitted, or shown with incomplete history. Symptom notes and trend summaries may fail to reflect your real clinical condition. PKD Compass does not provide medical advice, diagnosis, triage, or treatment. To the fullest extent permitted by law, PKD Compass is not liable for missed abnormalities, delayed care, treatment changes, hospitalizations, worsening symptoms, data-entry mistakes, upload errors, chart inaccuracies, or any injury, loss, claim, or dispute arising from your use of this section. By continuing, you agree to verify all results and symptoms with official records and a qualified clinician, and you agree not to bring claims against PKD Compass based on reliance on this feature.",
                        errorMessage: featureConsentError,
                        isLoading: isSavingFeatureConsent,
                        accept: {
                            guard !isSavingFeatureConsent else { return }
                            featureConsentError = nil
                            isSavingFeatureConsent = true
                            Task {
                                do {
                                    try await authViewModel.updateConsents([(.labsAndSymptoms, true)])
                                    await MainActor.run {
                                        isSavingFeatureConsent = false
                                    }
                                } catch {
                                    await MainActor.run {
                                        isSavingFeatureConsent = false
                                        featureConsentError = "Could not save your Labs & Symptoms consent. Please try again."
                                    }
                                }
                            }
                        },
                        decline: {
                            appRouter.selectedTab = .dashboard
                        }
                    )
                }
            }
            .overlay(alignment: .bottomTrailing) {
                Button {
                    if viewModel.view == .labs {
                        viewModel.resetLabForm()
                        showingAddForm = true
                    } else {
                        viewModel.resetSymptomForm()
                        showingSymptomForm = true
                    }
                } label: {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(PKDPalette.primary)
                        .frame(width: 56, height: 56)
                        .overlay {
                            Image(systemName: "plus")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .shadow(color: PKDPalette.primary.opacity(0.35), radius: 14, x: 0, y: 8)
                }
                .padding(.trailing, 16)
                .padding(.bottom, 96)
            }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Health Logs")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("Track your progress")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            Spacer()
            Button {
                viewModel.isFilterOpen = true
            } label: {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill((viewModel.startDate != nil || viewModel.endDate != nil) ? PKDPalette.primary : Color.clear)
                    .frame(width: 36, height: 36)
                    .overlay {
                        Image(systemName: (viewModel.startDate != nil || viewModel.endDate != nil) ? "line.3.horizontal.decrease.circle.fill" : "calendar")
                            .foregroundStyle((viewModel.startDate != nil || viewModel.endDate != nil) ? .white : PKDPalette.textMuted)
                    }
            }
            .buttonStyle(.plain)
        }
        .pkdGlassHeader()
    }

    private var viewToggle: some View {
        HStack(spacing: 8) {
            ForEach(LabsViewModel.MainView.allCases) { current in
                Button {
                    withAnimation(.easeInOut(duration: 0.16)) {
                        viewModel.view = current
                    }
                } label: {
                    Text(current.rawValue)
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .foregroundStyle(viewModel.view == current ? .white : PKDPalette.textMuted)
                        .frame(maxWidth: .infinity, minHeight: 42)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(viewModel.view == current ? PKDPalette.primary : Color.clear)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 6)
    }

    private var labsContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            timeframeTabs
            metricHero
            summaryCards
            recentLabs
        }
    }

    private var timeframeTabs: some View {
        HStack(spacing: 6) {
            ForEach(LabsViewModel.Timeframe.allCases) { tf in
                Button {
                    viewModel.timeframe = tf
                } label: {
                    Text(tf.rawValue)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(viewModel.timeframe == tf ? .white : PKDPalette.textMuted)
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(viewModel.timeframe == tf ? PKDPalette.primary : Color.clear)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
        )
    }

    private var metricHero: some View {
        let metric = viewModel.selectedMetric
        let statusText = viewModel.series.isEmpty ? "Unknown" : "Updated"

        return ZStack {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(PKDGradients.hero)
                .overlay(alignment: .topTrailing) {
                    Circle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 140, height: 140)
                        .offset(x: 18, y: -18)
                }
                .overlay(alignment: .bottomLeading) {
                    Circle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 110, height: 110)
                        .offset(x: -20, y: 20)
                }

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(metricTitle(metric).uppercased())
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .tracking(1.6)
                            .foregroundStyle(.white.opacity(0.8))
                        Text(defaultUnit(metric))
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    Spacer()
                    Text("\(statusText) • \(viewModel.timeframe.rawValue.uppercased())")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.white.opacity(0.2), in: Capsule())
                }

                if viewModel.series.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "chart.bar.xaxis")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.7))
                        Text("No \(metricTitle(metric)) data found")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity, minHeight: 150)
                    .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                } else {
                    Chart(viewModel.series, id: \.id) { point in
                        AreaMark(
                            x: .value("Date", point.date),
                            y: .value(metric.rawValue, point.value)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white.opacity(0.35), .white.opacity(0.02)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )

                        LineMark(
                            x: .value("Date", point.date),
                            y: .value(metric.rawValue, point.value)
                        )
                        .interpolationMethod(.catmullRom)
                        .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                        .foregroundStyle(.white)
                    }
                    .chartXAxis(.hidden)
                    .chartYAxis(.hidden)
                    .frame(height: 160)
                    .padding(12)
                    .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                HStack(spacing: 6) {
                    ForEach(0..<5, id: \.self) { index in
                        Circle()
                            .fill(index == timeframeIndex ? Color.white : Color.white.opacity(0.35))
                            .frame(width: index == timeframeIndex ? 14 : 6, height: 6)
                            .animation(.easeInOut(duration: 0.2), value: timeframeIndex)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .padding(18)
        }
        .shadow(color: PKDPalette.primary.opacity(0.28), radius: 18, x: 0, y: 10)
    }

    private var summaryCards: some View {
        let cards: [(String, LabResult?)] = [
            ("Creatinine", viewModel.latestCreatinine),
            ("BUN", viewModel.latestBUN),
            ("UACR", viewModel.latestUACR)
        ]

        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(cards, id: \.0) { card in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(card.0.uppercased())
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .tracking(1.4)
                            .foregroundStyle(PKDPalette.textMuted)
                        Text(card.1.map { String(format: "%.1f", $0.value) } ?? "--")
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                            .lineLimit(1)
                        Text(card.1?.unit ?? (card.0 == "UACR" ? "mg/g" : "mg/dL"))
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                        PKDStatusCapsule(
                            text: viewModel.status(for: card.1) == "NORMAL" ? "--" : viewModel.status(for: card.1),
                            color: statusColor(viewModel.status(for: card.1))
                        )
                    }
                    .frame(width: horizontalSizeClass == .compact ? 132 : 160, alignment: .leading)
                    .pkdCard()
                }
            }
        }
    }

    private var recentLabs: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Recent Results")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                if viewModel.startDate != nil || viewModel.endDate != nil {
                    Button("Clear") {
                        viewModel.clearFilters()
                    }
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.danger)
                }
                Text("\(viewModel.recentLabs.count) entries")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            if viewModel.recentLabs.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(PKDPalette.textMuted)
                    Text("No lab results yet")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .frame(maxWidth: .infinity, minHeight: 110)
                .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                        .foregroundStyle(PKDPalette.primary.opacity(0.2))
                )
            } else {
                VStack(spacing: 8) {
                    ForEach(viewModel.recentLabs) { lab in
                        let status = viewModel.status(for: lab)
                        HStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(statusColor(status))
                                .frame(width: 4, height: 48)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(lab.typeRaw)
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text(lab.timestamp.formatted(date: .abbreviated, time: .shortened))
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 3) {
                                Text("\(lab.value, specifier: "%.1f") \(lab.unit)")
                                    .font(.system(size: 14, weight: .black, design: .rounded))
                                    .foregroundStyle(statusColor(status))
                                PKDStatusCapsule(text: status, color: statusColor(status))
                            }
                        }
                        .pkdCard()
                        .contextMenu {
                            Button("Edit") {
                                viewModel.beginEditingLab(lab)
                                showingEditLabForm = true
                            }
                            Button("Delete", role: .destructive) {
                                viewModel.deleteLab(context: modelContext, lab: lab)
                            }
                        }
                    }
                }
            }
        }
    }

    private var symptomsContent: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Symptom History")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Text("\(viewModel.recentSymptoms.count) entries")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            if viewModel.recentSymptoms.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "cross.case")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(PKDPalette.textMuted)
                    Text("No symptoms logged yet")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .frame(maxWidth: .infinity, minHeight: 110)
                .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                        .foregroundStyle(PKDPalette.primary.opacity(0.2))
                )
            } else {
                VStack(spacing: 10) {
                    ForEach(viewModel.recentSymptoms) { symptom in
                        HStack(alignment: .top, spacing: 12) {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [PKDPalette.primary, Color(hex: "#6366F1")],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 38, height: 38)
                                .overlay {
                                    Image(systemName: "cross.case.fill")
                                        .foregroundStyle(.white)
                                        .font(.system(size: 16, weight: .bold))
                                }

                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 6) {
                                    Text(symptom.type)
                                        .font(.system(size: 14, weight: .black, design: .rounded))
                                        .foregroundStyle(PKDPalette.primary)
                                    PKDStatusCapsule(
                                        text: "Severity \(symptom.severity)/10",
                                        color: symptom.severity >= 8 ? PKDPalette.danger : (symptom.severity >= 4 ? PKDPalette.warning : PKDPalette.success)
                                    )
                                }
                                Text(symptom.timestamp.formatted(date: .abbreviated, time: .shortened))
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                                if let notes = symptom.notes, !notes.isEmpty {
                                    Text("\"\(notes)\"")
                                        .font(.system(size: 12, weight: .medium, design: .rounded))
                                        .foregroundStyle(PKDPalette.textMain)
                                        .padding(8)
                                        .background(Color(hex: "#F8FAFC"), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                            }
                            Spacer()
                        }
                        .pkdCard()
                        .contextMenu {
                            Button("Edit") {
                                viewModel.beginEditingSymptom(symptom)
                                showingEditSymptomForm = true
                            }
                            Button("Delete", role: .destructive) {
                                viewModel.deleteSymptom(context: modelContext, symptom: symptom)
                            }
                        }
                    }
                }
            }
        }
    }

    private var symptomFormCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Symptom Log")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("How are you feeling?")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "chart.bar")
                        .foregroundStyle(PKDPalette.primary)
                    Text("Symptom Severity")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                }
                VStack(spacing: 8) {
                    HStack {
                        Text("None (0)")
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.success)
                        Spacer()
                        Text("Severe (10)")
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.danger)
                    }
                    Slider(
                        value: Binding(
                            get: { Double(viewModel.symptomSeverity) },
                            set: { viewModel.symptomSeverity = Int($0) }
                        ),
                        in: 0...10,
                        step: 1
                    )
                    .tint(PKDPalette.primary)

                    HStack(spacing: 0) {
                        ForEach(0..<11, id: \.self) { value in
                            Text("\(value)")
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .foregroundStyle(value == viewModel.symptomSeverity ? PKDPalette.primary : PKDPalette.textMuted)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            .padding(12)
            .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Image(systemName: "checklist")
                        .foregroundStyle(PKDPalette.primary)
                    Text("Symptom Type")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                }
                Button {
                    showSymptomTypeDialog = true
                } label: {
                    HStack {
                        Text(viewModel.symptomType.isEmpty ? "Select symptom" : viewModel.symptomType)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                    .padding(12)
                    .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .confirmationDialog("Symptom Type", isPresented: $showSymptomTypeDialog, titleVisibility: .visible) {
                    ForEach(viewModel.symptomTypes, id: \.self) { type in
                        Button(type) { viewModel.symptomType = type }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Image(systemName: "line.3.horizontal")
                        .foregroundStyle(PKDPalette.primary)
                    Text("Additional Details")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                }
                TextField("Any other details...", text: $viewModel.symptomNotes, axis: .vertical)
                    .lineLimit(4, reservesSpace: true)
                    .padding(12)
                    .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button("Log Symptom") {
                viewModel.addSymptom(context: modelContext)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
        }
        .pkdCard()
    }

    private var filterSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    PKDSectionLabel(text: "Start Date")
                    DatePicker(
                        "Start Date",
                        selection: Binding(
                            get: { viewModel.startDate ?? Date() },
                            set: { viewModel.startDate = $0 }
                        ),
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .datePickerStyle(.graphical)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 8) {
                    PKDSectionLabel(text: "End Date")
                    DatePicker(
                        "End Date",
                        selection: Binding(
                            get: { viewModel.endDate ?? Date() },
                            set: { viewModel.endDate = $0 }
                        ),
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .datePickerStyle(.graphical)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                Button("Apply Filters") {
                    viewModel.isFilterOpen = false
                }
                .buttonStyle(PKDPrimaryButtonStyle())
                .padding(.top, 6)
            }
            .padding()
            .pkdPageBackground()
            .navigationTitle("Filter Records")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.isFilterOpen = false
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
                ToolbarItem(placement: .topBarLeading) {
                    Button("Reset") {
                        viewModel.clearFilters()
                    }
                }
            }
        }
        .presentationDetents([.large])
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "CRITICAL":
            return PKDPalette.danger
        case "DANGER":
            return Color(hex: "#F97316")
        case "ATTENTION":
            return PKDPalette.warning
        default:
            return PKDPalette.success
        }
    }

    private func severityColor(_ severity: Int) -> Color {
        if severity >= 8 { return PKDPalette.danger }
        if severity >= 4 { return PKDPalette.warning }
        return PKDPalette.success
    }

    private func metricTitle(_ metric: ObservationType) -> String {
        switch metric {
        case .egfr: return "Estimated GFR"
        case .creatinine: return "Serum Creatinine"
        case .potassium: return "Potassium"
        case .sodium: return "Sodium"
        case .phosphorus: return "Phosphorus"
        case .bun: return "BUN"
        case .uacr: return "uACR"
        }
    }

    private func defaultUnit(_ metric: ObservationType) -> String {
        switch metric {
        case .egfr: return "mL/min/1.73m²"
        case .creatinine, .phosphorus, .bun: return "mg/dL"
        case .potassium, .sodium: return "mEq/L"
        case .uacr: return "mg/g"
        }
    }

    private func metricValueText(_ metric: ObservationType, value: Double) -> String {
        switch metric {
        case .egfr, .uacr:
            return String(Int(value))
        default:
            return String(format: "%.1f", value)
        }
    }

    private var timeframeIndex: Int {
        switch viewModel.timeframe {
        case .threeMonths: return 1
        case .sixMonths: return 2
        case .oneYear: return 3
        }
    }
}

private struct AddLabSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @Binding var selectedMetric: ObservationType
    @Binding var inputValue: String
    @Binding var inputUnit: String
    @Binding var inputDate: Date
    let isEditing: Bool
    let errorMessage: String?
    let onSave: () -> Void
    @State private var showInfoSheet = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    labHeroCard
                    LegalWarningCard(
                        title: "Lab Entry Warning",
                        message: "Lab uploads, manual entries, unit conversions, reference ranges, trend cards, and symptom correlations may be incomplete, delayed, duplicated, or wrong. By continuing, you agree to verify all results against your official records and clinician guidance. To the fullest extent permitted by law, PKD Compass is not liable for missed abnormalities, delayed care, dosing changes, treatment decisions, emergency decisions, or other harm caused by relying on this screen."
                    )

                    metricSelectionCard

                    valueEntryCard

                    dateEntryCard

                    if let errorMessage {
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
                        onSave()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: isEditing ? "square.and.arrow.down.fill" : "externaldrive.badge.checkmark")
                            Text(isEditing ? "Save Changes" : "Save Lab Result")
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                }
                .frame(maxWidth: .infinity, alignment: .top)
                .padding()
            }
            .pkdPageBackground()
            .sheet(isPresented: $showInfoSheet) {
                LabMetricInfoSheet(metric: selectedMetric)
            }
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(isEditing ? "Edit Lab Result" : "Add Lab Result")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text(isEditing ? "Update Lab Obs" : "New Lab Obs")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                    }
                }
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

    private var metricDisplayUnit: String {
        inputUnit.isEmpty ? defaultUnit(selectedMetric) : inputUnit
    }

    private var parsedValueText: String {
        guard !inputValue.isEmpty else { return "--" }
        return inputValue
    }

    private var metricStatus: (label: String, color: Color, message: String) {
        guard let numericValue = Double(inputValue) else {
            return ("Awaiting Value", PKDPalette.warning, "Enter the latest lab number to preview where this result sits relative to your saved profile, or standard ranges if no profile is available.")
        }
        let profile = ClinicalRules.profile(context: modelContext)
        let history = (try? LabRepository.fetchLabs(context: modelContext))?
            .filter { $0.typeRaw == selectedMetric.rawValue } ?? []
        let interpretation = ClinicalRules.interpretObservation(
            metric: selectedMetric,
            value: numericValue,
            history: history,
            profile: profile
        )

        let color: Color
        switch interpretation.status {
        case .normal:
            color = PKDPalette.success
        case .attention:
            color = PKDPalette.warning
        case .danger, .critical:
            color = PKDPalette.danger
        }
        return (interpretation.label, color, interpretation.message)
    }

    private var labHeroCard: some View {
        let status = metricStatus

        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#0F172A"), Color(hex: "#243B75"), PKDPalette.primary],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Circle()
                .fill(Color.white.opacity(0.09))
                .frame(width: 170, height: 170)
                .offset(x: 180, y: -36)

            Circle()
                .fill(status.color.opacity(0.18))
                .frame(width: 120, height: 120)
                .offset(x: -20, y: 112)

            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Lab Observation")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .tracking(1.6)
                            .foregroundStyle(Color.white.opacity(0.72))
                        Text(selectedMetric.rawValue)
                            .font(.system(size: 26, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    Button {
                        showInfoSheet = true
                    } label: {
                        Image(systemName: "info.circle.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                HStack(spacing: 12) {
                    labHeroValueCard(label: "Value", value: parsedValueText, unit: metricDisplayUnit)
                    labHeroValueCard(label: "Date", value: inputDate.formatted(.dateTime.month(.abbreviated).day()), unit: inputDate.formatted(.dateTime.year()))
                }

                HStack(spacing: 10) {
                    PKDStatusCapsule(text: status.label.uppercased(), color: status.color)
                    PKDStatusCapsule(text: metricDisplayUnit.uppercased(), color: .white.opacity(0.22))
                }

                Text(status.message)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.86))
            }
            .padding(22)
        }
        .frame(height: 252)
        .shadow(color: Color.black.opacity(0.14), radius: 18, x: 0, y: 10)
    }

    private func labHeroValueCard(label: String, value: String, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(Color.white.opacity(0.62))
            Text(value)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(unit)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.7))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private var metricSelectionCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "flask.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(PKDPalette.primary)
                    .frame(width: 40, height: 40)
                    .background(PKDPalette.primary.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Test Type")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Select the lab marker you just received.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            Picker("Metric", selection: $selectedMetric) {
                ForEach(ObservationType.allCases) { metric in
                    Text(metric.rawValue).tag(metric)
                }
            }
            .pickerStyle(.menu)
            .padding(.horizontal, 18)
            .padding(.vertical, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: PKDPalette.primary.opacity(0.07), radius: 12, x: 0, y: 8)
        }
    }

    private var valueEntryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#5B6BFF"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#5B6BFF").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Measured Value")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text(metricDisplayUnit)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            HStack(alignment: .lastTextBaseline, spacing: 8) {
                TextField("0.00", text: $inputValue)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.plain)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Text(metricDisplayUnit)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 20)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: Color(hex: "#5B6BFF").opacity(0.07), radius: 12, x: 0, y: 8)
        }
    }

    private var dateEntryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#06B6D4"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#06B6D4").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Collection Date")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Use the date printed on your lab report.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            HStack {
                Text(inputDate.formatted(.dateTime.month(.wide).day().year()))
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Image(systemName: "calendar")
                    .foregroundStyle(PKDPalette.textMuted)
            }
            .padding(18)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )
            .overlay(
                DatePicker("Date", selection: $inputDate, displayedComponents: [.date])
                    .labelsHidden()
                    .datePickerStyle(.compact)
                    .opacity(0.02)
            )
            .shadow(color: Color(hex: "#06B6D4").opacity(0.07), radius: 12, x: 0, y: 8)
        }
    }

    private func defaultUnit(_ metric: ObservationType) -> String {
        switch metric {
        case .egfr: return "mL/min/1.73m²"
        case .creatinine, .phosphorus, .bun: return "mg/dL"
        case .potassium, .sodium: return "mEq/L"
        case .uacr: return "mg/g"
        }
    }
}

private struct LabMetricInfoSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    let metric: ObservationType

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    Text(info.title)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text(info.summary)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)

                    infoBand(title: "Good / Target", text: info.good, color: PKDPalette.success.opacity(0.14), foreground: PKDPalette.success)
                    infoBand(title: "Medium / Watch", text: info.medium, color: PKDPalette.warning.opacity(0.14), foreground: PKDPalette.warning)
                    infoBand(title: "Risky / High Concern", text: info.risk, color: PKDPalette.danger.opacity(0.10), foreground: PKDPalette.danger)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("WHY IT MATTERS")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                        Text(info.whyItMatters)
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
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func infoBand(title: String, text: String, color: Color, foreground: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .black, design: .rounded))
                .foregroundStyle(foreground)
            Text(text)
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(color, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var info: (title: String, summary: String, good: String, medium: String, risk: String, whyItMatters: String) {
        let profile = ClinicalRules.profile(context: modelContext)
        let ageText = profile.ageYears.map { "\($0)" } ?? "adult"
        let sexText = profile.sexAtBirth.map { $0.rawValue.lowercased() } ?? "your sex at birth"

        switch metric {
        case .egfr:
            return ("eGFR", "Estimated glomerular filtration rate. This estimates how well the kidneys are filtering blood and is interpreted in clinical context, including age.", "Around 90 or above is generally considered preserved filtration for a standard adult profile.", "60 to 89 may reflect mild loss and should be interpreted in context for age \(ageText).", "Below 60 suggests chronic kidney disease; below 30 is advanced and needs close nephrology follow-up.", "eGFR is one of the main markers used to stage chronic kidney disease and follow progression over time.")
        case .creatinine:
            return ("Creatinine", "Creatinine is a waste product from muscle activity. Higher values can reflect reduced kidney filtration and should be interpreted using sex, body size, and trend.", "Typical baseline is often about 0.5–1.1 mg/dL for females and 0.7–1.3 mg/dL for males. Your app uses \(sexText) when available and standard ranges when it is not.", "Mild elevation above baseline can be worth watching, especially if trending upward or if body size is lower.", "A clear rise above your usual baseline can mean worsening kidney function, dehydration, or acute kidney stress.", "Creatinine trends help interpret kidney function alongside eGFR and are more useful than a single isolated reading.")
        case .potassium:
            return ("Potassium", "Potassium helps control muscle and heart function. The kidneys regulate it.", "About 3.5 to 5.0 mEq/L is generally acceptable.", "5.1 to 5.4 mEq/L is borderline high and usually merits attention.", "5.5 mEq/L or above can become dangerous, especially at 6.0 or higher.", "High potassium can affect heart rhythm and is an important safety value in kidney disease.")
        case .sodium:
            return ("Sodium", "Sodium helps manage fluid balance and nerve function.", "Roughly 136 to 145 mEq/L is typically normal.", "130 to 135 or 146 to 150 is mildly abnormal and should be watched.", "Below 125 or above 150 can be dangerous and may need urgent review.", "Abnormal sodium can reflect fluid imbalance, medications, or kidney-related complications.")
        case .phosphorus:
            return ("Phosphorus", "Phosphorus is a mineral involved in bone and energy metabolism. Kidneys help remove excess phosphorus.", "About 2.5 to 4.5 mg/dL is typically acceptable.", "A mild rise above normal is worth monitoring for CKD mineral-bone disorder.", "Persistent high phosphorus can affect bones, vessels, and long-term kidney health.", "Phosphorus often rises as kidney disease advances and may influence diet recommendations.")
        case .bun:
            return ("BUN", "Blood urea nitrogen reflects protein waste in the blood. It can rise with dehydration or reduced kidney function.", "About 7 to 20 mg/dL is commonly considered normal.", "Mild elevation can occur with dehydration, high protein intake, or reduced filtration.", "Larger increases may reflect reduced kidney function or significant dehydration.", "BUN helps interpret kidney function in context with creatinine, hydration, and symptoms.")
        case .uacr:
            return ("uACR", "Urine albumin-to-creatinine ratio shows how much protein is leaking into the urine.", "Below 30 mg/g is the target normal range.", "30 to 300 mg/g suggests moderately increased albuminuria.", "Above 300 mg/g suggests severely increased albuminuria and higher kidney risk.", "uACR is important in PKD because it can signal kidney damage even when eGFR looks stable.")
        }
    }
}

private struct AddSymptomSheet: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var symptomType: String
    @Binding var symptomSeverity: Int
    @Binding var symptomNotes: String
    @Binding var symptomDate: Date
    let symptomTypes: [String]
    let isEditing: Bool
    let errorMessage: String?
    let onSave: () -> Void

    @State private var showTypeMenu = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    symptomHeroCard

                    symptomSeverityCard

                    symptomTypeCard

                    symptomDateCard

                    symptomNotesCard

                    if let errorMessage {
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
                        onSave()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: isEditing ? "square.and.arrow.down.fill" : "externaldrive.badge.checkmark")
                            Text(isEditing ? "Save Changes" : "Log Symptom")
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                }
                .frame(maxWidth: .infinity, alignment: .top)
                .padding()
            }
            .pkdPageBackground()
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(isEditing ? "Edit Symptom" : "Symptom Log")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text(isEditing ? "Update history entry" : "How are you feeling?")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                    }
                }
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

    private var symptomAccent: Color {
        if symptomSeverity >= 8 { return PKDPalette.danger }
        if symptomSeverity >= 4 { return PKDPalette.warning }
        return PKDPalette.success
    }

    private var severityLabel: String {
        if symptomSeverity >= 8 { return "Severe" }
        if symptomSeverity >= 4 { return "Moderate" }
        if symptomSeverity > 0 { return "Mild" }
        return "None"
    }

    private var symptomHeroCard: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#141B33"), Color(hex: "#3B2F79"), Color(hex: "#8B5CF6")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Circle()
                .fill(Color.white.opacity(0.09))
                .frame(width: 170, height: 170)
                .offset(x: 180, y: -36)

            Circle()
                .fill(symptomAccent.opacity(0.18))
                .frame(width: 118, height: 118)
                .offset(x: -18, y: 114)

            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Symptom Entry")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .tracking(1.6)
                            .foregroundStyle(Color.white.opacity(0.72))
                        Text(symptomType.isEmpty ? "Select Symptom" : symptomType)
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                    }
                    Spacer()
                    Image(systemName: "waveform.path.ecg.text.page.fill")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(symptomAccent)
                        .padding(12)
                        .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }

                HStack(spacing: 12) {
                    symptomHeroValueCard(label: "Severity", value: "\(symptomSeverity)/10", detail: severityLabel)
                    symptomHeroValueCard(label: "Date", value: symptomDate.formatted(.dateTime.month(.abbreviated).day()), detail: symptomDate.formatted(.dateTime.hour().minute()))
                }

                HStack(spacing: 10) {
                    PKDStatusCapsule(text: severityLabel.uppercased(), color: symptomAccent)
                    if !symptomNotes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        PKDStatusCapsule(text: "NOTES", color: .white.opacity(0.22))
                    }
                }

                Text("Track patterns early so pain, fatigue, urinary changes, or swelling are easier to compare against your labs and appointments.")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.86))
            }
            .padding(22)
        }
        .frame(height: 252)
        .shadow(color: Color.black.opacity(0.14), radius: 18, x: 0, y: 10)
    }

    private func symptomHeroValueCard(label: String, value: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(Color.white.opacity(0.62))
            Text(value)
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(detail.uppercased())
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.72))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private var symptomSeverityCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(symptomAccent)
                    .frame(width: 40, height: 40)
                    .background(symptomAccent.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Symptom Severity")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Update the slider to match how intense it feels right now.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
                PKDStatusCapsule(text: "\(symptomSeverity)/10", color: symptomAccent)
            }

            VStack(spacing: 10) {
                HStack(spacing: 12) {
                    symptomSeverityPreviewCard(
                        label: "Current",
                        value: "\(symptomSeverity)/10",
                        detail: severityLabel
                    )
                    symptomSeverityPreviewCard(
                        label: "Logged",
                        value: symptomDate.formatted(.dateTime.month(.abbreviated).day()),
                        detail: symptomDate.formatted(.dateTime.hour().minute())
                    )
                }

                HStack {
                    Text("None (0)")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.success)
                    Spacer()
                    Text("Severe (10)")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.danger)
                }
                Slider(
                    value: Binding(
                        get: { Double(symptomSeverity) },
                        set: { symptomSeverity = Int($0) }
                    ),
                    in: 0...10,
                    step: 1
                )
                .tint(PKDPalette.primary)

                HStack(spacing: 0) {
                    ForEach(0..<11, id: \.self) { value in
                        Text("\(value)")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundStyle(value == symptomSeverity ? PKDPalette.primary : PKDPalette.textMuted)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
            .padding(18)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: symptomAccent.opacity(0.08), radius: 12, x: 0, y: 8)
        }
    }

    private var symptomTypeCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "checklist")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#5B6BFF"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#5B6BFF").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Symptom Type")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Choose the symptom category you want to log.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            Button {
                showTypeMenu.toggle()
            } label: {
                HStack {
                    Text(symptomType.isEmpty ? "Select symptom" : symptomType)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .padding(18)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .confirmationDialog("Symptom Type", isPresented: $showTypeMenu, titleVisibility: .visible) {
                ForEach(symptomTypes, id: \.self) { type in
                    Button(type) { symptomType = type }
                }
            }
        }
        .shadow(color: Color(hex: "#5B6BFF").opacity(0.08), radius: 12, x: 0, y: 8)
    }

    private var symptomDateCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#06B6D4"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#06B6D4").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Date & Time")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Log when the symptom actually happened.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            DatePicker("", selection: $symptomDate, displayedComponents: [.date, .hourAndMinute])
                .labelsHidden()
                .padding(18)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
        }
        .shadow(color: Color(hex: "#06B6D4").opacity(0.08), radius: 12, x: 0, y: 8)
    }

    private var symptomNotesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#F97316"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#F97316").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Additional Details")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Capture context, triggers, duration, or anything unusual.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            TextField("Any other details...", text: $symptomNotes, axis: .vertical)
                .lineLimit(4, reservesSpace: true)
                .padding(18)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
        }
        .shadow(color: Color(hex: "#F97316").opacity(0.08), radius: 12, x: 0, y: 8)
    }

    private func symptomSeverityPreviewCard(label: String, value: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(PKDPalette.textMuted)
            Text(value)
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Text(detail.uppercased())
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(symptomAccent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(symptomAccent.opacity(0.12), lineWidth: 1)
        )
    }
}
