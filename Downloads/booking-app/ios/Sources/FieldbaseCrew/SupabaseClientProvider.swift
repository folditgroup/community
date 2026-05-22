import Foundation
import Supabase

/// Реєструє Supabase клієнт як singleton. URL і anon key читаються з
/// Info.plist (ключі SUPABASE_URL та SUPABASE_ANON_KEY). Це дозволяє
/// не комітити секрети в код.
enum SupabaseClientProvider {
  static let shared: SupabaseClient = {
    guard
      let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
      let url = URL(string: urlString),
      let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
      !key.isEmpty
    else {
      fatalError("Missing SUPABASE_URL / SUPABASE_ANON_KEY in Info.plist. See README.")
    }
    return SupabaseClient(supabaseURL: url, supabaseKey: key)
  }()
}
