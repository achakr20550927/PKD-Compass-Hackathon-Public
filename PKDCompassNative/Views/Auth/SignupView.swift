import SwiftUI

struct SignupView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel

    let onLoginTap: () -> Void
    let onComplete: () -> Void

    @State private var email = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var sexAtBirth: SexAtBirth = .male
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [PKDPalette.backgroundLight, Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    Text("Create Account")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.textMain)
                    Text("Use email and password to set up your PKD Compass account.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                        .multilineTextAlignment(.center)

                    field(label: "First Name", placeholder: "First name", text: $firstName, keyboard: .default, secure: false, autocap: .words)
                    field(label: "Last Name", placeholder: "Last name", text: $lastName, keyboard: .default, secure: false, autocap: .words)
                    HStack(spacing: 12) {
                        genderButton(label: "Male", value: .male)
                        genderButton(label: "Female", value: .female)
                    }

                    field(label: "Email", placeholder: "name@example.com", text: $email, keyboard: .emailAddress, secure: false, autocap: .never)
                    field(label: "Password", placeholder: "8+ characters", text: $password, keyboard: .default, secure: true, autocap: .never)
                    field(label: "Confirm Password", placeholder: "Re-enter password", text: $confirmPassword, keyboard: .default, secure: true, autocap: .never)

                    if let errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text(errorMessage)
                        }
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(PKDPalette.danger)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(PKDPalette.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    Button(isLoading ? "Creating..." : "Create Account") {
                        Task { await signup() }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .disabled(isLoading)

                    Button("Already have an account? Sign In") {
                        onLoginTap()
                    }
                    .buttonStyle(PKDOutlineButtonStyle())
                }
                .padding(20)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.08), radius: 22, x: 0, y: 12)
                .padding(20)
                .padding(.top, 32)
            }
        }
    }

    private func field(
        label: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType,
        secure: Bool,
        autocap: TextInputAutocapitalization
    ) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            PKDSectionLabel(text: label)
            Group {
                if secure {
                    SecureField(placeholder, text: text)
                } else {
                    TextField(placeholder, text: text)
                        .textInputAutocapitalization(autocap)
                        .keyboardType(keyboard)
                }
            }
            .textFieldStyle(.plain)
            .padding(14)
            .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
            )
        }
    }

    private func signup() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            try await authViewModel.signup(
                firstName: firstName,
                lastName: lastName,
                sexAtBirth: sexAtBirth,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            )
            onComplete()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Signup failed."
        }
    }

    private func genderButton(label: String, value: SexAtBirth) -> some View {
        Button {
            sexAtBirth = value
        } label: {
            HStack(spacing: 6) {
                Image(systemName: value == .male ? "figure.stand" : "figure.dress.line.vertical.figure")
                Text(label)
            }
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(sexAtBirth == value ? Color.white : PKDPalette.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(sexAtBirth == value ? PKDPalette.primary : Color(hex: "#F8FAFF"))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.18), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
