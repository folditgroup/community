import SwiftUI
import UIKit

struct LoginView: View {
  @Environment(AppState.self) private var state
  @State private var email = ""
  @State private var password = ""

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      VStack(alignment: .leading, spacing: 24) {
        HStack(spacing: 10) {
          RoundedRectangle(cornerRadius: 8).fill(Theme.ink800).frame(width: 36, height: 36)
            .overlay(Text("D").foregroundStyle(Theme.amber).font(.headline).bold())
          Text("Drevito").font(.displaySmall).foregroundStyle(Theme.ink800)
          Spacer()
        }

        VStack(alignment: .leading, spacing: 6) {
          Text("Welcome back.").font(.displayLarge).foregroundStyle(Theme.ink800)
          Text("Sign in to see today's route.").foregroundStyle(Theme.ink400)
        }

        VStack(spacing: 12) {
          Field(label: "Email", text: $email, keyboard: .emailAddress, contentType: .emailAddress)
          Field(label: "Password", text: $password, secure: true, contentType: .password)
        }

        if let err = state.errorMessage {
          Text(err).font(.footnote).foregroundStyle(.red)
        }

        Button {
          Task { await state.signIn(email: email, password: password) }
        } label: {
          HStack {
            if state.isLoading { ProgressView().tint(Theme.ink800) }
            Text("Sign in").bold()
          }
          .frame(maxWidth: .infinity).padding(.vertical, 14)
          .background(Theme.amber).foregroundStyle(Theme.ink800).clipShape(Capsule())
        }
        .disabled(state.isLoading || email.isEmpty || password.isEmpty)

        Spacer()
      }
      .padding(24)
    }
  }
}

private struct Field: View {
  let label: String
  @Binding var text: String
  var secure: Bool = false
  var keyboard: UIKeyboardType = .default
  var contentType: UITextContentType? = nil

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label.uppercased()).font(.caption).tracking(1).foregroundStyle(Theme.ink400)
      Group {
        if secure {
          SecureField("", text: $text)
        } else {
          TextField("", text: $text)
            .keyboardType(keyboard)
            .autocapitalization(.none)
            .autocorrectionDisabled()
        }
      }
      .textContentType(contentType)
      .padding(.horizontal, 14).padding(.vertical, 12)
      .background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
      .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink100))
    }
  }
}
