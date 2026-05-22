import Foundation

struct Client: Identifiable, Codable, Hashable {
  let id: UUID
  let businessId: UUID?
  let name: String
  let phone: String?
  let email: String?
  let address: String?
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case id
    case businessId = "business_id"
    case name
    case phone
    case email
    case address
    case notes
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id         = try c.decode(UUID.self, forKey: .id)
    businessId = try c.decodeIfPresent(UUID.self, forKey: .businessId)
    name       = try c.decode(String.self, forKey: .name)
    phone      = try c.decodeIfPresent(String.self, forKey: .phone)
    email      = try c.decodeIfPresent(String.self, forKey: .email)
    address    = try c.decodeIfPresent(String.self, forKey: .address)
    notes      = try c.decodeIfPresent(String.self, forKey: .notes)
  }

  init(id: UUID = UUID(), businessId: UUID?, name: String, phone: String? = nil,
       email: String? = nil, address: String? = nil, notes: String? = nil) {
    self.id = id
    self.businessId = businessId
    self.name = name
    self.phone = phone
    self.email = email
    self.address = address
    self.notes = notes
  }
}

struct Service: Identifiable, Codable, Hashable {
  let id: UUID
  let businessId: UUID
  let name: String
  let durationMin: Int
  let basePrice: Double
  let bufferMin: Int
  let active: Bool
  let priceType: String   // "fixed" | "from" | "quote"

  enum CodingKeys: String, CodingKey {
    case id
    case businessId  = "business_id"
    case name
    case durationMin = "duration_min"
    case basePrice   = "base_price"
    case bufferMin   = "buffer_min"
    case active
    case priceType   = "price_type"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id          = try c.decode(UUID.self, forKey: .id)
    businessId  = try c.decode(UUID.self, forKey: .businessId)
    name        = try c.decode(String.self, forKey: .name)
    durationMin = (try? c.decode(Int.self, forKey: .durationMin)) ?? 60
    basePrice   = (try? c.decode(Double.self, forKey: .basePrice)) ?? 0
    bufferMin   = (try? c.decode(Int.self, forKey: .bufferMin)) ?? 15
    active      = (try? c.decode(Bool.self, forKey: .active)) ?? true
    priceType   = (try? c.decode(String.self, forKey: .priceType)) ?? "fixed"
  }

  /// Текстове представлення ціни для UI
  var priceLabel: String {
    switch priceType {
    case "quote": return "By quote"
    case "from":  return "from $\(Int(basePrice))"
    default:      return "$\(Int(basePrice))"
    }
  }
}
