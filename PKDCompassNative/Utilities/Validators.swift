import Foundation

enum Validators {
    static func isValidEmail(_ email: String) -> Bool {
        let pattern = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return email.range(of: pattern, options: .regularExpression) != nil
    }

    static func isValidPassword(_ password: String) -> Bool {
        guard password.count >= 8, password.count <= 128 else { return false }
        let hasUpper = password.range(of: "[A-Z]", options: .regularExpression) != nil
        let hasLower = password.range(of: "[a-z]", options: .regularExpression) != nil
        let hasDigit = password.range(of: "[0-9]", options: .regularExpression) != nil
        let hasSymbol = password.range(of: "[^A-Za-z0-9]", options: .regularExpression) != nil
        return hasUpper && hasLower && hasDigit && hasSymbol
    }

    static func isValidName(_ text: String) -> Bool {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, value.count <= 50 else { return false }
        let allowed = CharacterSet.letters.union(.whitespaces).union(CharacterSet(charactersIn: "-'"))
        return value.unicodeScalars.allSatisfy { allowed.contains($0) }
    }
}
