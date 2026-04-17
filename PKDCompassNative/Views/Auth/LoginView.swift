import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel

    let onSignupTap: () -> Void
    let onProfileRequired: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showPassword = false
    @State private var showForgotHint = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [PKDPalette.backgroundLight, Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 18) {
                    appHeader

                    VStack(spacing: 10) {
                        field(label: "Email Address", placeholder: "name@example.com", text: $email, isSecure: false)
                        field(label: "Password", placeholder: "Enter password", text: $password, isSecure: !showPassword)

                        HStack {
                            Button(showPassword ? "Hide Password" : "Show Password") {
                                showPassword.toggle()
                            }
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                            Spacer()
                            Button("Forgot?") {
                                showForgotHint = true
                            }
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                        }
                    }

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

                    Button(isLoading ? "Signing In..." : "Sign In") {
                        Task { await login() }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .disabled(isLoading)

                    Button("Create account") {
                        onSignupTap()
                    }
                    .buttonStyle(PKDOutlineButtonStyle())

                    Text("PKD Compass is for organization and educational support only. It does not provide medical diagnosis.")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                }
                .padding(20)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.08), radius: 22, x: 0, y: 12)
                .padding(20)
                .padding(.top, 20)
            }
        }
        .alert("Forgot Password", isPresented: $showForgotHint) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Use the integrated password reset flow on the main sign-in screen to update this account locally on your device.")
        }
    }

    private var appHeader: some View {
        VStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(PKDGradients.hero)
                .frame(width: 64, height: 64)
                .overlay {
                    Image(systemName: "cross.case.fill")
                        .foregroundStyle(.white)
                        .font(.system(size: 28, weight: .bold))
                }
            Text("PKD Compass")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
            Text("Navigating Kidney Health Together")
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
        }
    }

    private func field(label: String, placeholder: String, text: Binding<String>, isSecure: Bool) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            PKDSectionLabel(text: label)
            if isSecure {
                SecureField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                    )
            } else {
                TextField(placeholder, text: text)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                    )
            }
        }
    }

    private func login() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            try await authViewModel.login(email: email, password: password)
            onProfileRequired()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Sign in failed."
        }
    }
}
