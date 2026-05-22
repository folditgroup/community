import SwiftUI

/// Drevito brand palette для iOS.
/// Імена змінних збережено (`amber`, `moss`) щоб не переписувати весь код,
/// але значення оновлено до drevito бренду:
///   amber → leaf green (CTA)
///   moss  → secondary forest green
///   ink-800 → deep forest green
enum Theme {
  // Paper-warm backgrounds + forest-green text
  static let ink50  = Color(red: 0.957, green: 0.945, blue: 0.910)  // #F4F1E8 paper
  static let ink100 = Color(red: 0.910, green: 0.890, blue: 0.823)  // #E8E3D2
  static let ink200 = Color(red: 0.831, green: 0.804, blue: 0.722)  // border-light
  static let ink300 = Color(red: 0.643, green: 0.620, blue: 0.557)  // muted
  static let ink400 = Color(red: 0.360, green: 0.353, blue: 0.306)  // muted text
  static let ink500 = Color(red: 0.235, green: 0.227, blue: 0.196)  // mid
  static let ink600 = Color(red: 0.165, green: 0.157, blue: 0.137)  // body
  static let ink700 = Color(red: 0.110, green: 0.165, blue: 0.125)  // dark with green tint
  static let ink800 = Color(red: 0.122, green: 0.227, blue: 0.149)  // #1F3A26 forest

  // CTA accent — leaf green з лого
  static let amber     = Color(red: 0.482, green: 0.714, blue: 0.380)  // #7BB661
  static let amberSoft = Color(red: 0.890, green: 0.929, blue: 0.851)  // #E3EDD9
  static let amberDeep = Color(red: 0.310, green: 0.541, blue: 0.235)  // #4F8A3C

  // Secondary forest
  static let moss     = Color(red: 0.247, green: 0.420, blue: 0.290)  // #3F6B4A
  static let mossSoft = Color(red: 0.831, green: 0.898, blue: 0.773)  // #D4E5C5
  static let mossDeep = Color(red: 0.176, green: 0.318, blue: 0.219)  // dark moss
}

extension Font {
  static let displayLarge   = Font.system(.largeTitle, design: .serif).weight(.regular)
  static let displayMedium  = Font.system(.title, design: .serif).weight(.regular)
  static let displaySmall   = Font.system(.title2, design: .serif).weight(.regular)
}
