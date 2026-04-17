import SwiftUI
import SwiftData

struct MedicationsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var viewModel = MedicationsViewModel()
    @State private var showingAddSheet = false
    @State private var showingEditSheet = false
    @State private var editingMedication: MedicationItem?
    @State private var pendingDeleteMedication: MedicationItem?
    @State private var showingMedicationActions = false
    @State private var hasPermission = false
    @State private var testMessage: String?
    @State private var isSavingFeatureConsent = false
    @State private var featureConsentError: String?

    private let notificationService: NotificationScheduling = NotificationService()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        topStats
                        medicationList
                    }
                    .padding()
                    .padding(.bottom, 28)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .overlay(alignment: .bottomTrailing) {
                Button {
                    viewModel.resetForm()
                    showingAddSheet = true
                } label: {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(PKDPalette.primary)
                        .frame(width: 54, height: 54)
                        .overlay {
                            Image(systemName: "plus")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .shadow(color: PKDPalette.primary.opacity(0.35), radius: 14, x: 0, y: 8)
                }
                .padding(.trailing, 16)
                .padding(.bottom, 96)
            }
            .sheet(isPresented: $showingAddSheet) {
                addMedicationSheet
            }
            .sheet(isPresented: $showingEditSheet) {
                editMedicationSheet
            }
            .confirmationDialog(
                "Medication Actions",
                isPresented: $showingMedicationActions,
                titleVisibility: .visible
            ) {
                Button("Edit") {
                    guard let med = pendingDeleteMedication else { return }
                    editingMedication = med
                    viewModel.beginEditing(med)
                    showingEditSheet = true
                }
                Button("Delete Medication", role: .destructive) {
                    guard let med = pendingDeleteMedication else { return }
                    Task {
                        await viewModel.deleteMedication(context: modelContext, medication: med, notificationService: notificationService)
                    }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Edit or remove \(pendingDeleteMedication?.name ?? "this medication"). Deleting removes the medication and its local history.")
            }
            .onAppear {
                viewModel.load(context: modelContext)
            }
            .overlay {
                if !authViewModel.hasConsent(.medications) {
                    FeatureBlockedCard(
                        title: "Medication Features Locked",
                        message: "By accepting these terms, you authorize PKD Compass to store, synchronize, and display the medication names, dosage amounts, units, schedules, selected weekdays, reminder times, adherence marks, and related notes that you enter. This section is a convenience organizer only. Reminders may be missed, duplicated, delayed, silenced by device settings, or shown with outdated schedules. Medication cards may contain data-entry errors, outdated instructions, wrong units, or incomplete history. PKD Compass does not prescribe, dispense, verify, or supervise medication use and does not provide medical advice. To the fullest extent permitted by law, PKD Compass is not liable for missed doses, double doses, refill issues, adverse reactions, drug interactions, emergency events, treatment changes, or any injury, loss, claim, or dispute arising from your use of this section. By continuing, you agree to confirm all medication details with your clinician, pharmacist, and prescription label, and you agree not to bring claims against PKD Compass based on reliance on this feature.",
                        errorMessage: featureConsentError,
                        isLoading: isSavingFeatureConsent,
                        accept: {
                            guard !isSavingFeatureConsent else { return }
                            featureConsentError = nil
                            isSavingFeatureConsent = true
                            Task {
                                do {
                                    try await authViewModel.updateConsents([(.medications, true)])
                                    await MainActor.run {
                                        isSavingFeatureConsent = false
                                    }
                                } catch {
                                    await MainActor.run {
                                        isSavingFeatureConsent = false
                                        featureConsentError = "Could not save your Medication consent. Please try again."
                                    }
                                }
                            }
                        },
                        decline: {
                            // Keep user out of this feature until accepted.
                        }
                    )
                }
            }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Medications")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("Daily Adherence")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            Spacer()
        }
        .pkdGlassHeader()
    }

    private var topStats: some View {
        let total = max(viewModel.medications.count, 1)
        let taken = viewModel.medications.filter { viewModel.latestStatuses[$0.id] == "TAKEN" }.count
        let consistency = Int((Double(taken) / Double(total)) * 100)

        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    PKDSectionLabel(text: "Taken Today")
                    Text("\(taken)/\(viewModel.medications.count)")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text(taken == viewModel.medications.count && !viewModel.medications.isEmpty ? "All Completed" : "Pending Doses")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(taken == viewModel.medications.count && !viewModel.medications.isEmpty ? PKDPalette.success : PKDPalette.warning)
                }
                .frame(width: horizontalSizeClass == .compact ? 150 : 180, alignment: .leading)
                .pkdCard()

                VStack(alignment: .leading, spacing: 4) {
                    PKDSectionLabel(text: "Consistency")
                    Text("\(consistency)%")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Last 7 days")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .frame(width: horizontalSizeClass == .compact ? 150 : 180, alignment: .leading)
                .pkdCard()
            }
        }
    }

    private var medicationList: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Active Medications")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Button {
                    viewModel.resetForm()
                    showingAddSheet = true
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "plus")
                        Text("Add")
                            .lineLimit(1)
                    }
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(PKDPalette.primary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                Text("\(viewModel.medications.count) total")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            if viewModel.medications.isEmpty {
                VStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color(hex: "#F8FAFF"))
                        .frame(height: 180)
                        .overlay {
                            VStack(spacing: 8) {
                                Image(systemName: "pills")
                                    .font(.system(size: 28))
                                    .foregroundStyle(PKDPalette.textMuted)
                                Text("No medications yet")
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text("Add your first medication to get started")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                                .foregroundStyle(PKDPalette.primary.opacity(0.2))
                        )
                }
            } else {
                VStack(spacing: 10) {
                    ForEach(viewModel.medications, id: \.id) { med in
                        medicationCard(med)
                    }
                }
            }
        }
    }

    private func medicationCard(_ med: MedicationItem) -> some View {
        let latest = viewModel.latestStatuses[med.id] ?? "PENDING"
        let isTaken = latest == "TAKEN"

        return HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: med.isTolvaptan ? [Color(hex: "#8B5CF6"), Color(hex: "#A855F7")] : [PKDPalette.primary, Color(hex: "#6366F1")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 42, height: 42)
                .overlay {
                    Image(systemName: med.isTolvaptan ? "pills.circle.fill" : "pills.fill")
                        .foregroundStyle(.white)
                        .font(.system(size: 18, weight: .bold))
                }
                .opacity(isTaken ? 0.5 : 1)

            VStack(alignment: .leading, spacing: 3) {
                Text(med.name)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                    .opacity(isTaken ? 0.82 : 1)
                Text("\(med.dosage) · \(frequencyLabel(med.frequencyRaw))")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                if let schedule = scheduleLabel(med.reminderScheduleText), !schedule.isEmpty {
                    Text(schedule)
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 8) {
                Menu {
                    Button("Edit", systemImage: "square.and.pencil") {
                        editingMedication = med
                        viewModel.beginEditing(med)
                        showingEditSheet = true
                    }
                    if !isTaken {
                        Button("Mark Taken", systemImage: "checkmark.circle") {
                            viewModel.markTaken(context: modelContext, med: med)
                        }
                    }
                    Button("Mark Missed", systemImage: "xmark.circle") {
                        viewModel.markMissed(context: modelContext, med: med)
                    }
                    Button("Delete", systemImage: "trash", role: .destructive) {
                        pendingDeleteMedication = med
                        showingMedicationActions = true
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(PKDPalette.textMuted)
                        .frame(width: 34, height: 34)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)

                if isTaken {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark")
                        Text("Taken")
                    }
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(PKDPalette.success, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                } else {
                    Button("Mark Taken") {
                        viewModel.markTaken(context: modelContext, med: med)
                    }
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.25), lineWidth: 1)
                    )
                }
            }
        }
        .pkdCard()
        .onTapGesture {
            editingMedication = med
            viewModel.beginEditing(med)
            showingEditSheet = true
        }
    }

    private var addMedicationSheet: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                medicationHeroCard(isEditing: false)
                LegalWarningCard(
                    title: "Medication Reminder Warning",
                    message: "Medication names, dosages, units, schedules, recurring day selections, and reminder alerts are support tools only. Notifications can fail, repeat late, or be missed because of permissions, device settings, or system scheduling. By continuing, you agree to verify every medication detail against your prescription and clinician instructions. To the fullest extent permitted by law, PKD Compass is not liable for missed doses, refill issues, adverse events, or injuries caused by relying on reminders."
                )

                medicationIdentityCard
                medicationScheduleCard
                medicationSpecialCard

                Button {
                    Task {
                        hasPermission = await notificationService.requestPermission()
                        await viewModel.addMedication(context: modelContext, notificationService: notificationService)
                        if viewModel.errorMessage == nil {
                            showingAddSheet = false
                            viewModel.resetForm()
                        }
                    }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "bell.badge.fill")
                            .font(.system(size: 18, weight: .bold))
                        Text("Set Reminder")
                    }
                }
                .buttonStyle(PKDPrimaryButtonStyle())

                Button("Test Device Notification (5s)") {
                    Task {
                        let granted = await notificationService.requestPermission()
                        hasPermission = granted
                        guard granted else {
                            testMessage = "Notifications are disabled for this app."
                            return
                        }
                        do {
                            try await notificationService.scheduleTestNotification(
                                id: "med.test.\(UUID().uuidString)",
                                title: "PKD Compass Test",
                                body: "Medication notification is working.",
                                seconds: 5
                            )
                            testMessage = "Test notification scheduled."
                        } catch {
                            testMessage = "Could not schedule test notification."
                        }
                    }
                }
                .buttonStyle(PKDOutlineButtonStyle())

                if let testMessage {
                    HStack(spacing: 10) {
                        Image(systemName: "bell.badge")
                            .foregroundStyle(PKDPalette.primary)
                        Text(testMessage)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                        Spacer()
                    }
                    .padding(14)
                    .background(PKDPalette.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                if let error = viewModel.errorMessage {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(PKDPalette.danger)
                        Text(error)
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
            }
                .padding()
            }
            .pkdPageBackground()
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("Add Medication")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("New Prescription")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddSheet = false
                        viewModel.resetForm()
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

    private var editMedicationSheet: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    medicationHeroCard(isEditing: true)
                    LegalWarningCard(
                        title: "Medication Reminder Warning",
                        message: "Editing a medication changes reminder behavior and local adherence tracking. Always verify the final dosage, unit, selected days, and timing against your prescription. PKD Compass does not assume responsibility for dosing errors, schedule mistakes, or reminder failures."
                    )
                    medicationIdentityCard
                    medicationScheduleCard
                    medicationSpecialCard

                    Button("Save Changes") {
                        Task {
                            await viewModel.saveEdits(context: modelContext, notificationService: notificationService)
                            if viewModel.errorMessage == nil {
                                showingEditSheet = false
                            }
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())

                    if let error = viewModel.errorMessage {
                        HStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(PKDPalette.danger)
                            Text(error)
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

                    Button(role: .destructive) {
                        guard let editingMedication else { return }
                        Task {
                            await viewModel.deleteMedication(context: modelContext, medication: editingMedication, notificationService: notificationService)
                            showingEditSheet = false
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "trash.fill")
                            Text("Delete Medication")
                        }
                    }
                    .buttonStyle(PKDOutlineButtonStyle())
                }
                .padding()
            }
            .pkdPageBackground()
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("Edit Medication")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("Update Dose & Schedule")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingEditSheet = false
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

    private var medicationSummaryStatus: (label: String, color: Color, message: String) {
        switch viewModel.frequency {
        case .daily:
            return ("Daily", PKDPalette.success, "One scheduled reminder each day keeps the dose pattern simple and consistent.")
        case .bid:
            return ("BID", PKDPalette.warning, "Two reminders per day. Keep the spacing even to maintain a stable schedule.")
        case .tid:
            return ("TID", PKDPalette.warning, "Three reminders per day. Double-check the timing blocks before saving.")
        case .custom:
            return ("Weekly", PKDPalette.primary, "Custom weekday reminders repeat every week until the medication is edited or removed.")
        }
    }

    private func medicationHeroCard(isEditing: Bool) -> some View {
        let status = medicationSummaryStatus
        let displayName = viewModel.name.isEmpty ? "Untitled Medication" : viewModel.name
        let amount = viewModel.dosageAmount.trimmingCharacters(in: .whitespacesAndNewlines)
        let unit = viewModel.dosageUnit.trimmingCharacters(in: .whitespacesAndNewlines)
        let dosageDisplay = amount.isEmpty ? "--" : "\(amount) \(unit)"
        let scheduleDisplay = frequencyLabel(viewModel.frequency.rawValue)

        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#10172F"), Color(hex: "#4B2AA8"), Color(hex: "#7C3AED")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Circle()
                .fill(Color.white.opacity(0.08))
                .frame(width: 170, height: 170)
                .offset(x: 180, y: -34)

            Circle()
                .fill(status.color.opacity(0.16))
                .frame(width: 120, height: 120)
                .offset(x: -18, y: 110)

            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(isEditing ? "Medication Update" : "Medication Reminder")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .tracking(1.6)
                            .foregroundStyle(Color.white.opacity(0.72))
                        Text(displayName)
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                    }
                    Spacer()
                    Image(systemName: viewModel.isTolvaptan ? "pills.circle.fill" : "pills.fill")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(12)
                        .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }

                HStack(spacing: 12) {
                    medicationHeroValueCard(label: "Dose", value: dosageDisplay, detail: "Scheduled")
                    medicationHeroValueCard(label: "Plan", value: scheduleDisplay, detail: viewModel.frequency == .custom ? "\(viewModel.customDoses.count) slots" : reminderTimeLabel(viewModel.reminderTime))
                }

                HStack(spacing: 10) {
                    PKDStatusCapsule(text: status.label.uppercased(), color: status.color)
                    if viewModel.isTolvaptan {
                        PKDStatusCapsule(text: "TOLVAPTAN", color: Color(hex: "#A855F7"))
                    }
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

    private func medicationHeroValueCard(label: String, value: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(Color.white.opacity(0.62))
            Text(value)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.75)
            Text(detail.uppercased())
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

    private var medicationIdentityCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "pills.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(PKDPalette.primary)
                    .frame(width: 40, height: 40)
                    .background(PKDPalette.primary.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Medication Details")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Name the medication and set the exact prescribed dose.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            labeledField("Drug Name / Search", text: $viewModel.name, placeholder: "Search e.g. Lisinopril...")
            dosageField
        }
    }

    private var medicationScheduleCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#06B6D4"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#06B6D4").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Schedule")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Set the reminder cadence and the dose times to notify the user.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            Group {
                if viewModel.frequency == .custom {
                    frequencyField
                } else if horizontalSizeClass == .compact {
                    VStack(spacing: 10) {
                        frequencyField
                        reminderTimeField
                    }
                } else {
                    HStack(spacing: 10) {
                        frequencyField
                        reminderTimeField
                    }
                }
            }

            if viewModel.frequency == .bid {
                extraTimeField(title: "Second Time", selection: $viewModel.secondDoseTime)
            } else if viewModel.frequency == .tid {
                extraTimeField(title: "Second Time", selection: $viewModel.secondDoseTime)
                extraTimeField(title: "Third Time", selection: $viewModel.thirdDoseTime)
            } else if viewModel.frequency == .custom {
                customScheduleBuilder
            }
        }
    }

    private var medicationSpecialCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#F97316"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#F97316").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Special Flags")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Highlight PKD-specific medications that need extra awareness.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            Toggle("Tolvaptan / Jynarque", isOn: $viewModel.isTolvaptan)
                .tint(PKDPalette.primary)
                .padding(16)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
        }
    }

    private func reminderTimeLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    private var dosageField: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "scalemass.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#F97316"))
                    .frame(width: 40, height: 40)
                    .background(Color(hex: "#F97316").opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Dosage")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Set the prescribed amount and unit exactly as written.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            HStack(spacing: 8) {
                TextField("Amount", text: $viewModel.dosageAmount)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.plain)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                    .background(sheetFieldSurface(accent: Color(hex: "#F97316")))

                Picker("Unit", selection: $viewModel.dosageUnit) {
                    ForEach(viewModel.dosageUnits, id: \.self) { unit in
                        Text(unit).tag(unit)
                    }
                }
                .pickerStyle(.menu)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
                .frame(minWidth: 96)
                .background(sheetFieldSurface(accent: PKDPalette.primary))
            }
        }
    }

    private func labeledField(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
                .background(sheetFieldSurface(accent: PKDPalette.primary))
        }
    }

    private var frequencyField: some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: "Frequency")
            Picker("Frequency", selection: $viewModel.frequency) {
                ForEach(MedicationFrequency.allCases) { f in
                    Text(f.displayName).tag(f)
                }
            }
            .pickerStyle(.menu)
            .padding(.horizontal, 14)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(sheetFieldSurface(accent: Color(hex: "#06B6D4")))
        }
    }

    private var reminderTimeField: some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: "Time")
            DatePicker("", selection: $viewModel.reminderTime, displayedComponents: .hourAndMinute)
                .labelsHidden()
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(sheetFieldSurface(accent: Color(hex: "#06B6D4")))
        }
    }

    private func extraTimeField(title: String, selection: Binding<Date>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: title)
            DatePicker("", selection: selection, displayedComponents: .hourAndMinute)
                .labelsHidden()
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(sheetFieldSurface(accent: Color(hex: "#06B6D4")))
        }
    }

    private var customScheduleBuilder: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                PKDSectionLabel(text: "Custom Schedule (Days + Times)")
                Spacer()
                Button {
                    viewModel.customDoses.append(MedicationDoseScheduleEntry(date: .now.addingTimeInterval(3600)))
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text("Add Dose")
                    }
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.22), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }

            ForEach($viewModel.customDoses) { $entry in
                HStack(alignment: .center, spacing: 10) {
                    Picker("Day", selection: $entry.weekday) {
                        ForEach(weekdayOptions, id: \.value) { option in
                            Text(option.label).tag(option.value)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                    DatePicker("", selection: customTimeBinding(for: $entry), displayedComponents: .hourAndMinute)
                        .labelsHidden()
                        .padding(.horizontal, 12)
                        .padding(.vertical, 14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                    Button(role: .destructive) {
                        if let idx = viewModel.customDoses.firstIndex(where: { $0.id == entry.id }) {
                            viewModel.customDoses.remove(at: idx)
                        }
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(PKDPalette.danger)
                            .frame(width: 34, height: 34)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(PKDPalette.danger.opacity(0.18), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            if viewModel.customDoses.isEmpty {
                Text("Add at least one weekday/time reminder.")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }
        }
        .padding(14)
        .background(sheetFieldSurface(accent: PKDPalette.primary))
    }

    private func sheetFieldSurface(accent: Color) -> some View {
        RoundedRectangle(cornerRadius: 18, style: .continuous)
            .fill(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(accent.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: accent.opacity(0.08), radius: 12, x: 0, y: 8)
    }

    private func frequencyLabel(_ raw: String) -> String {
        MedicationFrequency(rawValue: raw)?.displayName ?? raw
    }

    private var weekdayOptions: [(value: Int, label: String)] {
        Calendar.current.weekdaySymbols.enumerated().map { ($0.offset + 1, $0.element) }
    }

    private func customTimeBinding(for entry: Binding<MedicationDoseScheduleEntry>) -> Binding<Date> {
        Binding<Date>(
            get: {
                Calendar.current.date(
                    bySettingHour: entry.wrappedValue.time.hour,
                    minute: entry.wrappedValue.time.minute,
                    second: 0,
                    of: .now
                ) ?? .now
            },
            set: { newValue in
                entry.wrappedValue.time = MedicationTimeOfDay(
                    hour: Calendar.current.component(.hour, from: newValue),
                    minute: Calendar.current.component(.minute, from: newValue)
                )
            }
        )
    }

    private func scheduleLabel(_ raw: String?) -> String? {
        guard let raw, !raw.isEmpty else { return nil }
        if let payload = decodeSchedule(raw) {
            return payload.displayLabel
        }
        return raw
    }

    private func decodeSchedule(_ raw: String) -> MedicationReminderSchedulePayload? {
        guard raw.first == "{" else { return nil }
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(MedicationReminderSchedulePayload.self, from: Data(raw.utf8))
        } catch {
            return nil
        }
    }
}
