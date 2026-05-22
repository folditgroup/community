import Foundation
import Supabase

struct AuthService {
  private var client: SupabaseClient { SupabaseClientProvider.shared }

  func signIn(email: String, password: String) async throws {
    _ = try await client.auth.signIn(email: email, password: password)
  }

  func signOut() async throws {
    try await client.auth.signOut()
  }

  /// Повертає поточну сесію (якщо є збережена). nil якщо неавторизований.
  func currentSession() async -> Session? {
    try? await client.auth.session
  }
}
