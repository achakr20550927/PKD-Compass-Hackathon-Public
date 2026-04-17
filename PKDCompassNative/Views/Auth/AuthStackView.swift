import SwiftUI

struct AuthStackView: View {
    @State private var route: AuthRoute = .login

    enum AuthRoute {
        case login
        case signup
    }

    var body: some View {
        NavigationStack {
            switch route {
            case .login, .signup:
                AuthLandingView(
                    initialRoute: route,
                    onLoginComplete: { },
                    onSignupComplete: { }
                )
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct AuthLandingView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var selected: AuthTab

    enum AuthTab { case login, signup }

    @State private var loginEmail = ""
    @State private var loginPassword = ""
    @State private var loginPasswordRevealed = false
    @State private var loginError: String?
    @State private var isLoginLoading = false
    @State private var showForgotPassword = false
    @State private var resetEmail = ""
    @State private var resetError: String?
    @State private var resetSuccessMessage: String?

    @State private var signupFirstName = ""
    @State private var signupLastName = ""
    @State private var signupSex: SexAtBirth = .male
    @State private var signupEmail = ""
    @State private var signupPassword = ""
    @State private var signupConfirmPassword = ""
    @State private var signupPasswordRevealed = false
    @State private var signupConfirmPasswordRevealed = false
    @State private var signupError: String?
    @State private var isSignupLoading = false
    @State private var showServerConfig = false
    @State private var backendURLText = AppConfig.defaultBackendURL

    let onLoginComplete: () -> Void
    let onSignupComplete: () -> Void

    init(initialRoute: AuthStackView.AuthRoute, onLoginComplete: @escaping () -> Void, onSignupComplete: @escaping () -> Void) {
        _selected = State(initialValue: initialRoute == .signup ? .signup : .login)
        self.onLoginComplete = onLoginComplete
        self.onSignupComplete = onSignupComplete
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [PKDPalette.backgroundLight, Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    HStack { Spacer() }
                    appHeader

                    segmentToggle

                    if selected == .login {
                        loginForm
                    } else {
                        signupForm
                    }
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

                disclaimer
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordSheet(
                email: $resetEmail,
                errorMessage: $resetError,
                successMessage: $resetSuccessMessage
            ) {
                Task {
                    do {
                        try await authViewModel.requestPasswordReset(email: resetEmail)
                        resetError = nil
                        resetSuccessMessage = "If an account exists for that email, you’ll receive a reset link shortly."
                        loginEmail = resetEmail
                    } catch {
                        resetError = (error as? LocalizedError)?.errorDescription ?? "Could not send reset email."
                        resetSuccessMessage = nil
                    }
                }
            }
        }
        // Removed backend server override sheet for production UX.
    }

    private var appHeader: some View {
        VStack(spacing: 10) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(PKDGradients.hero)
                    .frame(width: 70, height: 70)
                    .overlay {
                        Image(systemName: "cross.case.fill")
                            .foregroundStyle(.white)
                            .font(.system(size: 30, weight: .bold))
                    }
                Circle()
                    .fill(Color(hex: "#10B981"))
                    .frame(width: 22, height: 22)
                    .overlay {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    .offset(x: 8, y: -8)
            }
            Text("PKD Compass")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
            Text("Navigating Kidney Health Together")
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
        }
    }

    private var segmentToggle: some View {
        HStack(spacing: 0) {
            segmentButton("SIGN IN", isSelected: selected == .login) { selected = .login }
            segmentButton("SIGN UP", isSelected: selected == .signup) { selected = .signup }
        }
        .padding(6)
        .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private func segmentButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(isSelected ? PKDPalette.primary : PKDPalette.textMuted)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(isSelected ? Color.white : Color.clear)
                        .shadow(color: isSelected ? Color.black.opacity(0.06) : .clear, radius: 6, x: 0, y: 3)
                )
        }
        .buttonStyle(.plain)
    }

    private var loginForm: some View {
        VStack(spacing: 10) {
            field(label: "Email Address", placeholder: "name@example.com", text: $loginEmail, isSecure: false, keyboardType: .emailAddress, autocap: .never)
            passwordField(label: "Password", placeholder: "Enter your password", text: $loginPassword, revealed: $loginPasswordRevealed)

            HStack {
                Spacer()
                Button("Forgot?") {
                    resetEmail = loginEmail
                    resetError = nil
                    resetSuccessMessage = nil
                    showForgotPassword = true
                }
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.primary)
            }

            if let loginError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Text(loginError)
                }
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(PKDPalette.danger)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(PKDPalette.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button(isLoginLoading ? "Signing In..." : "Sign In") {
                Task { await login() }
            }
            .overlay(alignment: .trailing) {
                Image(systemName: "arrow.right")
                    .foregroundStyle(.white)
                    .padding(.trailing, 18)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
            .disabled(isLoginLoading)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
        }
    }

    private var signupForm: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                field(label: "First Name", placeholder: "First", text: $signupFirstName, isSecure: false, keyboardType: .default, autocap: .words)
                field(label: "Last Name", placeholder: "Last", text: $signupLastName, isSecure: false, keyboardType: .default, autocap: .words)
            }

            HStack(spacing: 8) {
                genderButton("Male", value: .male)
                genderButton("Female", value: .female)
            }

            field(label: "Email Address", placeholder: "name@example.com", text: $signupEmail, isSecure: false, keyboardType: .emailAddress, autocap: .never)
            passwordField(label: "Password", placeholder: "Enter your password", text: $signupPassword, revealed: $signupPasswordRevealed)
            passwordField(label: "Confirm Password", placeholder: "Re-enter your password", text: $signupConfirmPassword, revealed: $signupConfirmPasswordRevealed)

            if let signupError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Text(signupError)
                }
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(PKDPalette.danger)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(PKDPalette.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button(isSignupLoading ? "Creating..." : "Create Account") {
                Task { await signup() }
            }
            .overlay(alignment: .trailing) {
                Image(systemName: "arrow.right")
                    .foregroundStyle(.white)
                    .padding(.trailing, 18)
            }
            .buttonStyle(PKDPrimaryButtonStyle())
            .disabled(isSignupLoading)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
        }
    }

    private func genderButton(_ title: String, value: SexAtBirth) -> some View {
        Button {
            signupSex = value
        } label: {
            HStack(spacing: 8) {
                Image(systemName: value == .male ? "figure.stand" : "figure.stand.dress")
                    .foregroundStyle(PKDPalette.textMuted)
                Text(title)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(signupSex == value ? PKDPalette.primary : PKDPalette.primary.opacity(0.12), lineWidth: signupSex == value ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var disclaimer: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "info.circle")
                .foregroundStyle(PKDPalette.primary)
            Text("PKD Compass is a consumer health app for informational use only. It is not medical advice, diagnosis, or treatment, and data you choose to store may be transmitted to backend services so it can sync across sessions.")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private func field(
        label: String,
        placeholder: String,
        text: Binding<String>,
        isSecure: Bool,
        keyboardType: UIKeyboardType,
        autocap: TextInputAutocapitalization
    ) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            PKDSectionLabel(text: label)
            if isSecure {
                SecureField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(Color(hex: "#EFF4FF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                    )
            } else {
                TextField(placeholder, text: text)
                    .textInputAutocapitalization(autocap)
                    .keyboardType(keyboardType)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(Color(hex: "#EFF4FF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                    )
            }
        }
    }

    private func passwordField(label: String, placeholder: String, text: Binding<String>, revealed: Binding<Bool>) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            PKDSectionLabel(text: label)
            ZStack(alignment: .trailing) {
                Group {
                    if revealed.wrappedValue {
                        TextField(placeholder, text: text)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField(placeholder, text: text)
                    }
                }
                .textFieldStyle(.plain)
                .padding(14)
                .background(Color(hex: "#EFF4FF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                )

                Button {
                    revealed.wrappedValue.toggle()
                } label: {
                    Image(systemName: revealed.wrappedValue ? "eye.slash" : "eye")
                        .foregroundStyle(PKDPalette.textMuted)
                        .padding(.trailing, 12)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func login() async {
        isLoginLoading = true
        loginError = nil
        defer { isLoginLoading = false }

        do {
            try await authViewModel.login(email: loginEmail, password: loginPassword)
            onLoginComplete()
        } catch {
            loginError = (error as? LocalizedError)?.errorDescription ?? "Sign in failed."
        }
    }

    private func signup() async {
        isSignupLoading = true
        signupError = nil
        defer { isSignupLoading = false }

        do {
            try await authViewModel.signup(
                firstName: signupFirstName,
                lastName: signupLastName,
                sexAtBirth: signupSex,
                email: signupEmail,
                password: signupPassword,
                confirmPassword: signupConfirmPassword
            )
            onSignupComplete()
        } catch {
            signupError = (error as? LocalizedError)?.errorDescription ?? "Signup failed."
        }
    }
}

private struct ForgotPasswordSheet: View {
    @Binding var email: String
    @Binding var errorMessage: String?
    @Binding var successMessage: String?

    let onSubmit: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Reset Password")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("We’ll email you a secure link to reset your password.")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    forgotField("Email Address", placeholder: "name@example.com", text: $email, secure: false)

                    if let errorMessage {
                        forgotMessage(errorMessage, color: PKDPalette.danger, background: PKDPalette.danger.opacity(0.08), icon: "exclamationmark.triangle.fill")
                    }

                    if let successMessage {
                        forgotMessage(successMessage, color: PKDPalette.success, background: PKDPalette.success.opacity(0.08), icon: "checkmark.circle.fill")
                    }

                    Button("Send Reset Email") {
                        onSubmit()
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .padding(.top, 4)
                }
                .padding(20)
            }
            .pkdPageBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                }
            }
        }
    }

    private func forgotField(_ label: String, placeholder: String, text: Binding<String>, secure: Bool) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            PKDSectionLabel(text: label)
            Group {
                if secure {
                    SecureField(placeholder, text: text)
                } else {
                    TextField(placeholder, text: text)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                }
            }
            .textFieldStyle(.plain)
            .padding(14)
            .background(Color(hex: "#EFF4FF"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
            )
        }
    }

    private func forgotMessage(_ message: String, color: Color, background: Color, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
            Text(message)
        }
        .font(.system(size: 12, weight: .semibold, design: .rounded))
        .foregroundStyle(color)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
