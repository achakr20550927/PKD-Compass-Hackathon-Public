import SwiftUI
import SwiftData

struct OrganizerView: View {
    enum OrganizerTab: String, CaseIterable, Identifiable {
        case appointments = "Appointments"
        case tasks = "Tasks"
        case progress = "Progress"
        case timeline = "Timeline"
        var id: String { rawValue }
    }

    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject private var appRouter: AppRouter
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var viewModel = OrganizerViewModel()
    @State private var tab: OrganizerTab = .appointments
    @State private var showAppointmentSheet = false
    @State private var isSavingFeatureConsent = false
    @State private var featureConsentError: String?
    private let notificationService: NotificationScheduling = NotificationService()

    private var isCompact: Bool { horizontalSizeClass == .compact }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        tabStrip
                        content
                    }
                    .padding()
                    .padding(.bottom, 28)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                viewModel.load(context: modelContext)
            }
            .overlay {
                if !authViewModel.hasConsent(.careOrganizer) {
                    FeatureBlockedCard(
                        title: "Care Organizer Locked",
                        message: "By accepting these terms, you authorize PKD Compass to store, synchronize, and display the appointments, provider names, locations, notes, task lists, timeline items, preparation details, and reminder schedules that you enter. This section is an organizational planning tool only. Appointment times, locations, task status, reminder alerts, and provider information may be wrong, delayed, duplicated, incomplete, or changed without notice. PKD Compass does not confirm provider availability, transportation needs, insurance coverage, urgent scheduling, or clinical readiness. To the fullest extent permitted by law, PKD Compass is not liable for missed appointments, travel costs, rescheduling disputes, missed deadlines, provider no-shows, delayed care, emergency escalation failures, or any injury, loss, claim, or dispute arising from your use of this section. By continuing, you agree to verify all appointment and care details directly with the relevant provider or service, and you agree not to bring claims against PKD Compass based on reliance on this feature.",
                        errorMessage: featureConsentError,
                        isLoading: isSavingFeatureConsent,
                        accept: {
                            guard !isSavingFeatureConsent else { return }
                            featureConsentError = nil
                            isSavingFeatureConsent = true
                            Task {
                                do {
                                    try await authViewModel.updateConsents([(.careOrganizer, true)])
                                    await MainActor.run {
                                        isSavingFeatureConsent = false
                                    }
                                } catch {
                                    await MainActor.run {
                                        isSavingFeatureConsent = false
                                        featureConsentError = "Could not save your Care Organizer consent. Please try again."
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
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Care Organizer")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("Manage your appointments, tasks, and care timeline.")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            Spacer()
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(PKDPalette.primary.opacity(0.12))
                .frame(width: 36, height: 36)
                .overlay {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(PKDPalette.primary)
                }
        }
        .pkdGlassHeader()
    }

    private var tabStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(OrganizerTab.allCases) { value in
                    Button {
                        tab = value
                    } label: {
                        Text(value.rawValue)
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .foregroundStyle(tab == value ? .white : PKDPalette.textMuted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .fixedSize(horizontal: true, vertical: false)
                            .padding(.horizontal, 18)
                            .frame(height: 40)
                            .frame(minWidth: isCompact ? 96 : 108)
                            .background(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(tab == value ? PKDPalette.primary : Color(hex: "#F8FAFF"))
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(6)
        }
        .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var content: some View {
        if tab == .appointments {
            appointmentsContent
        } else if tab == .tasks {
            tasksContent
        } else if tab == .progress {
            progressContent
        } else {
            timelineContent
        }
    }

    private var appointmentsContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Appointments")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Button {
                    showAppointmentSheet = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text("Add New")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(PKDPalette.primary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            if viewModel.appointments.isEmpty {
                VStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color(hex: "#F8FAFF"))
                        .frame(height: 160)
                        .overlay {
                            VStack(spacing: 6) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 24))
                                    .foregroundStyle(PKDPalette.textMuted)
                                Text("No appointments scheduled.")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                                .foregroundStyle(PKDPalette.primary.opacity(0.2))
                        )
                }
            } else {
                ForEach(viewModel.appointments, id: \.id) { appt in
                    HStack(alignment: .top, spacing: 10) {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(PKDPalette.primary.opacity(0.12))
                            .frame(width: 34, height: 34)
                            .overlay {
                                Image(systemName: "calendar")
                                    .foregroundStyle(PKDPalette.primary)
                            }

                        VStack(alignment: .leading, spacing: 3) {
                            Text(appt.title)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                            Text(appt.date.formatted(date: .abbreviated, time: .shortened))
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                            if let provider = appt.providerName {
                                Text(provider)
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                            }
                            if let location = appt.location {
                                Text(location)
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                        }
                        Spacer()
                    }
                    .pkdCard()
                    .contextMenu {
                        Button("Delete Appointment", role: .destructive) {
                            viewModel.deleteAppointment(context: modelContext, appointment: appt)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showAppointmentSheet) {
            appointmentSheet
                .presentationDetents([.large])
        }
    }

    private var appointmentSheet: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    appointmentHeroCard
                    LegalWarningCard(
                        title: "Appointment Planning Warning",
                        message: "Appointment details, times, reminders, provider names, and locations are organizational tools only. Provider schedules, office locations, and notification timing may change or fail. By continuing, you agree to confirm all appointment details directly with the provider. To the fullest extent permitted by law, PKD Compass is not liable for missed appointments, travel costs, scheduling disputes, or care delays caused by relying on planner data."
                    )

                    appointmentFieldCard {
                        field("Title", text: $viewModel.appointmentTitle, placeholder: "e.g., Nephrology Follow-up")
                    }

                    appointmentFieldCard {
                        HStack(alignment: .top, spacing: 12) {
                            appointmentTypeField
                            appointmentDateTimeField
                        }
                    }

                    appointmentFieldCard {
                        field("Location", text: $viewModel.location, placeholder: "Clinic name or address")
                    }

                    appointmentFieldCard {
                        field("Notes", text: $viewModel.appointmentNotes, placeholder: "Questions to ask, prep info...")
                    }

                    Button("Schedule") {
                        Task {
                            await viewModel.addAppointment(context: modelContext, notificationService: notificationService)
                            showAppointmentSheet = false
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                }
                .frame(maxWidth: .infinity, alignment: .top)
                .padding()
                .padding(.bottom, 26)
            }
            .pkdPageBackground()
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAppointmentSheet = false
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

    private var appointmentHeroCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Schedule Appointment")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Set up your next visit with clean details, timing, and location in one place.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.9))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(0.14))
                    .frame(width: 54, height: 54)
                    .overlay {
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white.opacity(0.95))
                    }
            }

            HStack(spacing: 10) {
                appointmentHeroMetric(
                    title: "Visit Type",
                    value: viewModel.appointmentType
                )
                appointmentHeroMetric(
                    title: "Date",
                    value: viewModel.appointmentDate.formatted(.dateTime.month(.abbreviated).day().hour().minute())
                )
            }

            HStack(spacing: 8) {
                Image(systemName: "bell.badge.fill")
                    .foregroundStyle(Color.white.opacity(0.95))
                Text("Reminder will trigger 1 hour before and at appointment time.")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(PKDGradients.hero)
        )
        .shadow(color: PKDPalette.primary.opacity(0.28), radius: 22, x: 0, y: 12)
    }

    private func appointmentHeroMetric(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .tracking(1.1)
                .foregroundStyle(Color.white.opacity(0.7))
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func appointmentFieldCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            content()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.white.opacity(0.96))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 14, x: 0, y: 8)
    }

    private var appointmentTypeField: some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: "Type")
            Menu {
                Button("Nephrology") { viewModel.appointmentType = "Nephrology" }
                Button("Dialysis") { viewModel.appointmentType = "Dialysis" }
                Button("Imaging") { viewModel.appointmentType = "Imaging" }
                Button("General Follow-up") { viewModel.appointmentType = "General Follow-up" }
            } label: {
                HStack(spacing: 10) {
                    Text(viewModel.appointmentType)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Spacer(minLength: 8)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(PKDPalette.primary)
                }
                .padding(14)
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var appointmentDateTimeField: some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: "Date & Time")
            HStack(spacing: 8) {
                Text(viewModel.appointmentDate.formatted(.dateTime.month(.abbreviated).day().year()))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.7), in: Capsule())
                    .lineLimit(1)

                Text(viewModel.appointmentDate.formatted(.dateTime.hour().minute()))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.7), in: Capsule())
                    .lineLimit(1)

                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                DatePicker("", selection: $viewModel.appointmentDate, displayedComponents: [.date, .hourAndMinute])
                    .labelsHidden()
                    .blendMode(.destinationOver)
                    .opacity(0.02)
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var tasksContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            formCard(title: "Tasks", icon: "checklist") {
                field("Task title", text: $viewModel.taskTitle, placeholder: "Take BP reading")
                Toggle("Set due date", isOn: $viewModel.setTaskDue)
                    .tint(PKDPalette.primary)
                    .padding(12)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                if viewModel.setTaskDue {
                    DatePicker("Due", selection: $viewModel.taskDueDate, displayedComponents: [.date, .hourAndMinute])
                        .padding(12)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Button("Save Task") {
                    Task { await viewModel.addTask(context: modelContext, notificationService: notificationService) }
                }
                .buttonStyle(PKDPrimaryButtonStyle())
            }

            if viewModel.tasks.isEmpty {
                VStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color(hex: "#F8FAFF"))
                        .frame(height: 140)
                        .overlay {
                            VStack(spacing: 6) {
                                Image(systemName: "checkmark.circle")
                                    .font(.system(size: 24))
                                    .foregroundStyle(PKDPalette.textMuted)
                                Text("No tasks")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                                .foregroundStyle(PKDPalette.primary.opacity(0.2))
                        )
                }
            } else {
                ForEach(viewModel.tasks, id: \.id) { task in
                    HStack(spacing: 10) {
                        Button {
                            viewModel.toggleTask(context: modelContext, task: task)
                        } label: {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(task.status == "COMPLETED" ? PKDPalette.success : PKDPalette.primary.opacity(0.12))
                                .frame(width: 28, height: 28)
                                .overlay {
                                    Image(systemName: task.status == "COMPLETED" ? "checkmark" : "circle")
                                        .foregroundStyle(task.status == "COMPLETED" ? .white : PKDPalette.primary)
                                        .font(.system(size: 12, weight: .bold))
                                }
                        }
                        .buttonStyle(.plain)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(task.title)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                                .strikethrough(task.status == "COMPLETED")
                            if let due = task.dueAt {
                                Text("Due: \(due.formatted(date: .abbreviated, time: .shortened))")
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                        }
                        Spacer()
                        PKDStatusCapsule(text: task.status, color: task.status == "COMPLETED" ? PKDPalette.success : PKDPalette.warning)
                    }
                    .pkdCard()
                    .contextMenu {
                        Button("Delete Task", role: .destructive) {
                            viewModel.deleteTask(context: modelContext, task: task)
                        }
                    }
                }
            }
        }
    }

    private var progressContent: some View {
        return VStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(PKDPalette.success.opacity(0.15))
                        .frame(width: 38, height: 38)
                        .overlay {
                            Image(systemName: "shield.fill")
                                .foregroundStyle(PKDPalette.success)
                        }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Stable Trend")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.success)
                        Text("Your kidney function appears stable based on recent trends.")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(hex: "#ECFDF3"), in: RoundedRectangle(cornerRadius: 18, style: .continuous))

            HStack(spacing: 10) {
                metricCard("eGFR Slope", "N/A", icon: "chart.line.uptrend.xyaxis")
                metricCard("Avg Blood Pressure", "--/--", icon: "heart")
            }

            HStack(spacing: 10) {
                metricCard("Imaging Log", "", icon: "eye")
                metricCard("Wellness Log", "", icon: "figure.walk")
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weekly BP Monitoring")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Perform a standard 7-day home monitor for your next nephrology visit.")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
                Button("Start Weekly Mode") {
                    appRouter.selectedTab = .bp
                }
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(PKDPalette.primary, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .padding(14)
            .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }

    private var timelineContent: some View {
        let appointmentEvents: [(Date, String, String)] = viewModel.appointments.map {
            ($0.date, "Appointment", $0.title)
        }
        let taskEvents: [(Date, String, String)] = viewModel.tasks.compactMap { task in
            guard let dueAt = task.dueAt else { return nil }
            return (dueAt, task.status == "COMPLETED" ? "Completed Task" : "Task Due", task.title)
        }
        let events = (appointmentEvents + taskEvents).sorted { $0.0 < $1.0 }

        return VStack(alignment: .leading, spacing: 10) {
            if events.isEmpty {
                VStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color(hex: "#F8FAFF"))
                        .frame(height: 140)
                        .overlay {
                            VStack(spacing: 6) {
                                Image(systemName: "timeline.selection")
                                    .font(.system(size: 24))
                                    .foregroundStyle(PKDPalette.textMuted)
                                Text("No timeline events")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                                .foregroundStyle(PKDPalette.primary.opacity(0.2))
                        )
                }
            } else {
                ForEach(Array(events.enumerated()), id: \.offset) { _, event in
                    HStack(alignment: .top, spacing: 10) {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(PKDPalette.primary.opacity(0.12))
                            .frame(width: 34, height: 34)
                            .overlay {
                                Image(systemName: event.1 == "Appointment" ? "calendar" : "checklist")
                                    .foregroundStyle(PKDPalette.primary)
                            }

                        VStack(alignment: .leading, spacing: 3) {
                            Text(event.1)
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.primary)
                            Text(event.2)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                            Text(event.0.formatted(date: .abbreviated, time: .shortened))
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                        }
                        Spacer()
                    }
                    .pkdCard()
                }
            }
        }
    }

    private func metricCard(_ title: String, _ value: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Image(systemName: icon)
                .foregroundStyle(PKDPalette.primary)
            Text(title)
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
            Text(value)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .pkdCard()
    }

    private func formCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundStyle(PKDPalette.primary)
                Text(title)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            content()
        }
        .pkdCard()
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            PKDSectionLabel(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}
