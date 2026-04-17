import SwiftUI
import SwiftData
import Charts

struct SymptomsView: View {
    @Environment(\.modelContext) private var modelContext
    @StateObject private var viewModel = SymptomsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        symptomForm
                        trendChart
                        entriesList
                    }
                    .padding()
                    .padding(.bottom, 24)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .onAppear { viewModel.load(context: modelContext) }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Symptoms")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("Track pain, fatigue, and episodes")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            Spacer()
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(PKDPalette.primary.opacity(0.12))
                .frame(width: 36, height: 36)
                .overlay {
                    Image(systemName: "cross.case.fill")
                        .foregroundStyle(PKDPalette.primary)
                }
        }
        .pkdGlassHeader()
    }

    private var symptomForm: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Log Symptom")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)

            Picker("Type", selection: $viewModel.type) {
                ForEach(viewModel.symptomTypes, id: \.self) { type in
                    Text(type)
                }
            }
            .pickerStyle(.menu)
            .padding(12)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Severity")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Spacer()
                    PKDStatusCapsule(text: "\(viewModel.severity)/10", color: severityColor(viewModel.severity))
                }
                Slider(
                    value: Binding(
                        get: { Double(viewModel.severity) },
                        set: { viewModel.severity = Int($0) }
                    ),
                    in: 0...10,
                    step: 1
                )
                .tint(PKDPalette.primary)
            }
            .padding(12)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

            TextField("Notes", text: $viewModel.notes, axis: .vertical)
                .lineLimit(3, reservesSpace: true)
                .padding(12)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.danger)
            }

            Button("Save Symptom") {
                viewModel.add(context: modelContext)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
        }
        .pkdCard()
    }

    private var trendChart: some View {
        Group {
            if !viewModel.entries.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Severity Trend")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)

                    Chart(viewModel.entries.prefix(10).reversed(), id: \.id) { entry in
                        AreaMark(
                            x: .value("Date", entry.timestamp),
                            y: .value("Severity", entry.severity)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [PKDPalette.primary.opacity(0.22), PKDPalette.primary.opacity(0.04)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )

                        LineMark(
                            x: .value("Date", entry.timestamp),
                            y: .value("Severity", entry.severity)
                        )
                        .interpolationMethod(.catmullRom)
                        .lineStyle(StrokeStyle(lineWidth: 2.6, lineCap: .round))
                        .foregroundStyle(PKDPalette.primary)
                    }
                    .chartYAxis {
                        AxisMarks(values: [0, 2, 4, 6, 8, 10])
                    }
                    .frame(height: 170)
                }
                .pkdCard()
            }
        }
    }

    private var entriesList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("History")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)

            if viewModel.entries.isEmpty {
                ContentUnavailableView(
                    "No symptoms logged yet",
                    systemImage: "cross.case.fill",
                    description: Text("Create your first symptom log above.")
                )
                .padding(.vertical, 8)
            } else {
                ForEach(viewModel.entries, id: \.id) { entry in
                    HStack(alignment: .top, spacing: 12) {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(severityColor(entry.severity).opacity(0.12))
                            .frame(width: 34, height: 34)
                            .overlay {
                                Image(systemName: "cross.case.fill")
                                    .foregroundStyle(severityColor(entry.severity))
                                    .font(.system(size: 14))
                            }

                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 6) {
                                Text(entry.type)
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                PKDStatusCapsule(text: "Severity \(entry.severity)/10", color: severityColor(entry.severity))
                            }

                            Text(entry.timestamp.formatted(date: .abbreviated, time: .shortened))
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                            if let notes = entry.notes, !notes.isEmpty {
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
                }
            }
        }
    }

    private func severityColor(_ severity: Int) -> Color {
        if severity >= 8 { return PKDPalette.danger }
        if severity >= 4 { return PKDPalette.warning }
        return PKDPalette.success
    }
}
