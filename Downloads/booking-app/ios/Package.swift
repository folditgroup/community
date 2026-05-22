// swift-tools-version: 5.9
// Fieldbase Crew — iOS companion app (Supabase backend, v0.3)
import PackageDescription

let package = Package(
  name: "FieldbaseCrew",
  platforms: [.iOS(.v17)],
  products: [
    .library(name: "FieldbaseCrew", targets: ["FieldbaseCrew"])
  ],
  dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.20.0"),
  ],
  targets: [
    .target(
      name: "FieldbaseCrew",
      dependencies: [
        .product(name: "Supabase", package: "supabase-swift"),
      ],
      path: "Sources/FieldbaseCrew"
    )
  ]
)
