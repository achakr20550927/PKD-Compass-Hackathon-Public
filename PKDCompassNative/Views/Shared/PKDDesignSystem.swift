import SwiftUI

enum PKDPalette {
    static let primary = Color(hex: "#4F80FF")
    static let primaryDark = Color(hex: "#3563E9")
    static let backgroundLight = Color(hex: "#F0F4FF")
    static let backgroundDark = Color(hex: "#0A0E1A")
    static let surface = Color.white
    static let cardDark = Color(hex: "#1A2035")
    static let textMain = Color(hex: "#0F172A")
    static let textMuted = Color(hex: "#64748B")
    static let success = Color(hex: "#10B981")
    static let warning = Color(hex: "#F59E0B")
    static let danger = Color(hex: "#EF4444")
}

enum PKDGradients {
    static let hero = LinearGradient(
        colors: [PKDPalette.primary, Color(hex: "#6366F1"), Color(hex: "#8B5CF6")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let warm = LinearGradient(
        colors: [PKDPalette.warning, PKDPalette.danger],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct PKDCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(14)
            .background(PKDPalette.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.05), radius: 14, x: 0, y: 8)
    }
}

struct PKDGlassHeader: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .overlay(Color.white.opacity(0.55))
            )
            .overlay(alignment: .bottom) {
                Rectangle().fill(PKDPalette.primary.opacity(0.08)).frame(height: 1)
            }
    }
}

struct PKDPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(configuration.isPressed ? PKDPalette.primaryDark : PKDPalette.primary)
            )
            .shadow(color: PKDPalette.primary.opacity(0.35), radius: 14, x: 0, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct PKDOutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(PKDPalette.textMain)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PKDPalette.primary.opacity(0.2), lineWidth: 1)
                    )
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

struct PKDStatusCapsule: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.12), in: Capsule())
    }
}

struct PKDSectionLabel: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .tracking(1.4)
            .foregroundStyle(PKDPalette.textMuted)
    }
}

struct FeatureBlockedCard: View {
    let title: String
    let message: String
    var errorMessage: String? = nil
    var isLoading: Bool = false
    let accept: () -> Void
    let decline: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.16)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(PKDPalette.primary.opacity(0.14))
                        .frame(width: 54, height: 54)
                        .overlay {
                            Image(systemName: "checkmark.shield")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(PKDPalette.primary)
                        }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                        Text("Review and accept the terms to continue.")
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(message)
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                            .fixedSize(horizontal: false, vertical: true)

                        if let errorMessage, !errorMessage.isEmpty {
                            Text(errorMessage)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(PKDPalette.danger)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .frame(maxHeight: 210)

                HStack(spacing: 10) {
                    Button("Not Now", role: .cancel, action: decline)
                        .buttonStyle(PKDOutlineButtonStyle())
                        .disabled(isLoading)
                    Button(action: accept) {
                        HStack(spacing: 8) {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(isLoading ? "Saving..." : "Accept Terms")
                        }
                    }
                        .buttonStyle(PKDPrimaryButtonStyle())
                        .disabled(isLoading)
                }
            }
            .padding(18)
            .frame(maxWidth: 420)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.08), radius: 22, x: 0, y: 10)
            .padding(24)
        }
    }
}

struct LegalWarningCard: View {
    let title: String
    let message: String
    var tint: Color = PKDPalette.warning

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.shield.fill")
                    .foregroundStyle(tint)
                Text(title)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }

            Text(message)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color(hex: "#FFF8EE"))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(tint.opacity(0.18), lineWidth: 1)
        )
    }
}

extension View {
    func pkdCard() -> some View {
        modifier(PKDCard())
    }

    func pkdGlassHeader() -> some View {
        modifier(PKDGlassHeader())
    }

    func pkdPageBackground() -> some View {
        self
            .background(
                LinearGradient(
                    colors: [PKDPalette.backgroundLight, Color.white],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
            )
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 3:
            (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (79, 128, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: 1
        )
    }
}
