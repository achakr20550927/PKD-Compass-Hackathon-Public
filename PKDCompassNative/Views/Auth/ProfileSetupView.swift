import SwiftUI
import SwiftData

struct ProfileSetupView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var viewModel = ProfileViewModel()
    @State private var firstName = ""
    @State private var lastName = ""

    let isRequiredOnboarding: Bool

    init(isRequiredOnboarding: Bool = false) {
        self.isRequiredOnboarding = isRequiredOnboarding
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            HStack {
                Spacer()
                VStack(spacing: 12) {
                    sectionCard(title: "Basic Information", icon: "person") {
                        nameFields
                        field("Email (Immutable)", text: .constant(authViewModel.currentEmail), placeholder: "")
                            .disabled(true)
                        field("Phone (Optional)", text: $viewModel.phone, placeholder: "Add phone number")
                        dateField
                        sexPicker
                    }

                    sectionCard(title: "Clinical Profile", icon: "waveform.path.ecg") {
                        measurementFields
                        field("Country", text: $viewModel.country, placeholder: "Country")
                        field("City", text: $viewModel.city, placeholder: "City")
                        field("ZIP / Postcode", text: $viewModel.zipCode, placeholder: "ZIP")
                    }

                    sectionCard(title: "Conditions", icon: "stethoscope") {
                        ToggleRow(title: "Hypertension", isOn: $viewModel.hasHypertension)
                        ToggleRow(title: "Diabetes", isOn: $viewModel.hasDiabetes)
                    }

                    if let message = viewModel.message {
                        Text(message)
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(viewModel.isSaving ? "Saving..." : (isRequiredOnboarding ? "Save Profile" : "Save Changes")) {
                        let composed = [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
                        if !composed.isEmpty {
                            viewModel.fullName = composed
                        }
                        viewModel.save(to: modelContext, email: authViewModel.currentEmail)
                        authViewModel.cacheCurrentUserNameFromProfile(fullName: viewModel.fullName)
                        authViewModel.markProfileCompleted()
                        Task { await viewModel.syncToServer() }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())

                    Text("For educational purposes only. Always consult your clinician.")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: 440)
                Spacer()
            }
            .padding()
            .padding(.bottom, 22)
        }
        .pkdPageBackground()
        .navigationTitle(isRequiredOnboarding ? "Complete Profile" : "Edit Profile")
        .onAppear {
            viewModel.load(from: modelContext, email: authViewModel.currentEmail)
            let parts = viewModel.fullName.split(separator: " ").map(String.init)
            firstName = parts.first ?? authViewModel.currentUserFirstName
            lastName = parts.dropFirst().joined(separator: " ")
            if lastName.isEmpty {
                lastName = authViewModel.currentUserLastName
            }
        }
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

    private func sectionCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
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
                .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                )
        }
    }

    private var nameFields: some View {
        Group {
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
        }
    }

    private var measurementFields: some View {
        Group {
            if horizontalSizeClass == .compact {
                VStack(spacing: 10) {
                    field("Height (cm)", text: $viewModel.heightCm, placeholder: "170")
                    field("Weight (kg)", text: $viewModel.weightKg, placeholder: "70")
                }
            } else {
                HStack(spacing: 10) {
                    field("Height (cm)", text: $viewModel.heightCm, placeholder: "170")
                    field("Weight (kg)", text: $viewModel.weightKg, placeholder: "70")
                }
            }
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
