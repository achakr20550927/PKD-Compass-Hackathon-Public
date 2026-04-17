import SwiftUI

struct AdminConsoleView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "lock.slash")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(PKDPalette.warning)

                Text("Admin Console Removed")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)

                Text("This build does not ship the administrative console.")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .pkdPageBackground()
        }
    }
}
