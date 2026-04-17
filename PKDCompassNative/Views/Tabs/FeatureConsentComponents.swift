import SwiftUI

struct FeatureBlockedCard: View {
    let title: String
    let body: String
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
                        Text(body)
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
    let body: String
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

            Text(body)
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
