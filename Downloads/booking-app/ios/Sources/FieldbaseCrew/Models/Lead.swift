import Foundation

enum LeadStatus: String, Codable, CaseIterable {
  case new
  case contacted
  case converted
  case dismissed

  var label: String {
    switch self {
    case .new:       return "New"
    case .contacted: return "Contacted"
    case .converted: return "Converted"
    case .dismissed: return "Dismissed"
    }
  }
}

/// Запит від клієнта через AI чат або форму на публічній сторінці.
struct Lead: Identifiable, Codable, Hashable {
  let id: UUID
  let businessId: UUID
  let customerName: String
  let customerPhone: String?
  let customerEmail: String?
  let address: String?
  let serviceId: UUID?
  let message: String?
  let source: String          // "chat" | "form" | "phone"
  let status: LeadStatus
  let preferredTime: Date?
  let bookingId: UUID?
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case businessId    = "business_id"
    case customerName  = "customer_name"
    case customerPhone = "customer_phone"
    case customerEmail = "customer_email"
    case address
    case serviceId     = "service_id"
    case message
    case source
    case status
    case preferredTime = "preferred_time"
    case bookingId     = "booking_id"
    case createdAt     = "created_at"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id             = try c.decode(UUID.self, forKey: .id)
    businessId     = try c.decode(UUID.self, forKey: .businessId)
    customerName   = try c.decode(String.self, forKey: .customerName)
    customerPhone  = try c.decodeIfPresent(String.self, forKey: .customerPhone)
    customerEmail  = try c.decodeIfPresent(String.self, forKey: .customerEmail)
    address        = try c.decodeIfPresent(String.self, forKey: .address)
    serviceId      = try c.decodeIfPresent(UUID.self, forKey: .serviceId)
    message        = try c.decodeIfPresent(String.self, forKey: .message)
    source         = (try? c.decode(String.self, forKey: .source)) ?? "chat"
    status         = (try? c.decode(LeadStatus.self, forKey: .status)) ?? .new
    preferredTime  = try c.decodeIfPresent(Date.self, forKey: .preferredTime)
    bookingId      = try c.decodeIfPresent(UUID.self, forKey: .bookingId)
    createdAt      = (try? c.decode(Date.self, forKey: .createdAt)) ?? Date()
  }
}

/// Worker invitation that manager created — for the Workers screen
struct WorkerInvitation: Identifiable, Codable, Hashable {
  let id: UUID
  let businessId: UUID
  let email: String
  let name: String?
  let role: String?
  let isManager: Bool
  let token: String
  let status: String          // "pending" | "accepted" | "expired" | "cancelled"
  let expiresAt: Date
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case businessId = "business_id"
    case email
    case name
    case role
    case isManager  = "is_manager"
    case token
    case status
    case expiresAt  = "expires_at"
    case createdAt  = "created_at"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id         = try c.decode(UUID.self, forKey: .id)
    businessId = try c.decode(UUID.self, forKey: .businessId)
    email      = try c.decode(String.self, forKey: .email)
    name       = try c.decodeIfPresent(String.self, forKey: .name)
    role       = try c.decodeIfPresent(String.self, forKey: .role)
    isManager  = (try? c.decode(Bool.self, forKey: .isManager)) ?? false
    token      = try c.decode(String.self, forKey: .token)
    status     = (try? c.decode(String.self, forKey: .status)) ?? "pending"
    expiresAt  = (try? c.decode(Date.self, forKey: .expiresAt)) ?? Date()
    createdAt  = (try? c.decode(Date.self, forKey: .createdAt)) ?? Date()
  }
}
