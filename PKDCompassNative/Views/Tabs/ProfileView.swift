import SwiftUI
import SwiftData

struct ProfileView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var viewModel = ProfileViewModel()
    @State private var firstName = ""
    @State private var lastName = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            basicInfoCard
                            clinicalProfileCard
                            conditionsCard
                            Button(viewModel.isSaving ? "Saving..." : "Save Changes") {
                                let composed = [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
                                if !composed.isEmpty {
                                    viewModel.fullName = composed
                                }
                                Task {
                                    await viewModel.saveAndSync(to: modelContext, email: authViewModel.currentEmail)
                                    authViewModel.cacheCurrentUserNameFromProfile(fullName: viewModel.fullName)
                                }
                            }
                            .buttonStyle(PKDPrimaryButtonStyle())
                            .disabled(viewModel.isSaving)
                            if let message = viewModel.message {
                                Text(message)
                                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            disclaimer
                        }
                        .frame(maxWidth: 440)
                        Spacer()
                    }
                    .padding()
                    .padding(.bottom, 28)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                viewModel.load(from: modelContext, email: authViewModel.currentEmail)
                let parts = viewModel.fullName.split(separator: " ").map(String.init)
                firstName = parts.first ?? ""
                lastName = parts.dropFirst().joined(separator: " ")
            }
        }
    }

    private var header: some View {
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

            VStack(alignment: .leading, spacing: 2) {
                Text("Account Info")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            Spacer()
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(PKDPalette.primary.opacity(0.12))
                .frame(width: 36, height: 36)
                .overlay {
                    Image(systemName: "person.crop.circle")
                        .foregroundStyle(PKDPalette.primary)
                }
        }
        .pkdGlassHeader()
    }

    private var basicInfoCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "person.fill")
                    .foregroundStyle(PKDPalette.primary)
                Text("Basic Information")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            if horizontalSizeClass == .compact {
                VStack(spacing: 10) {
                    field("First Name", text: $firstName, placeholder: "First")
                    field("Last Name", text: $lastName, placeholder: "Last")
                }
            } else {
                HStack(spacing: 10) {
                    field("First Name", text: $firstName, placeholder: "First")
                    field("Last Name", text: $lastName, placeholder: "Last")
                }
            }
            field("Email (Immutable)", text: .constant(authViewModel.currentEmail), placeholder: "")
                .disabled(true)
            field("Phone (Optional)", text: $viewModel.phone, placeholder: "Add phone number")
        }
        .pkdCard()
    }

    private var clinicalProfileCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "waveform.path.ecg")
                    .foregroundStyle(PKDPalette.primary)
                Text("Clinical Profile")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Text("Required for labs")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            dateField
            sexPicker
            if horizontalSizeClass == .compact {
                VStack(spacing: 10) {
                    field("Weight (kg)", text: $viewModel.weightKg, placeholder: "e.g. 72")
                    field("Height (cm)", text: $viewModel.heightCm, placeholder: "e.g. 170")
                }
            } else {
                HStack(spacing: 10) {
                    field("Weight (kg)", text: $viewModel.weightKg, placeholder: "e.g. 72")
                    field("Height (cm)", text: $viewModel.heightCm, placeholder: "e.g. 170")
                }
            }
        }
        .pkdCard()
    }

    private var conditionsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "heart.text.square")
                    .foregroundStyle(PKDPalette.primary)
                Text("Health Conditions")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            ToggleRow(title: "Diabetes (Type 1 or Type 2)", isOn: $viewModel.hasDiabetes)
            ToggleRow(title: "Hypertension (High Blood Pressure)", isOn: $viewModel.hasHypertension)
        }
        .pkdCard()
    }

    private var disclaimer: some View {
        Text("For educational purposes only. Always consult your clinician for diagnosis and treatment decisions.")
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(PKDPalette.textMuted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 8)
    }

    private var dateField: some View {
        VStack(alignment: .leading, spacing: 4) {
            PKDSectionLabel(text: "Date of Birth")
            DatePicker("Date of Birth", selection: $viewModel.dob, displayedComponents: .date)
                .labelsHidden()
                .datePickerStyle(.compact)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                )
        }
    }

    private var sexPicker: some View {
        VStack(alignment: .leading, spacing: 4) {
            PKDSectionLabel(text: "Sex at Birth")
            HStack(spacing: 8) {
                ForEach(SexAtBirth.allCases) { sex in
                    Button {
                        viewModel.sexAtBirth = sex
                    } label: {
                        Text(sex.rawValue.capitalized)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(viewModel.sexAtBirth == sex ? .white : PKDPalette.textMuted)
                            .frame(maxWidth: .infinity, minHeight: 40)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(viewModel.sexAtBirth == sex ? PKDPalette.primary : Color(hex: "#F8FAFF"))
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            PKDSectionLabel(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                )
        }
    }
}

private struct ToggleRow: View {
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            Text(title)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
        }
        .tint(PKDPalette.primary)
        .padding(12)
        .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
        )
    }
}
