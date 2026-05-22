import Foundation

struct Worker: Identifiable, Codable, Hashable {
  let id: UUID
  let userId: UUID?
  let businessId: UUID
  let name: String
  let role: String?
  let email: String?
  let phone: String?
  let color: String?
  let isManager: Bool

  enum CodingKeys: String, CodingKey {
    case id
    case userId     = "user_id"
    case businessId = "business_id"
    case name
    case role
    case email
    case phone
    case color
    case isManager  = "is_manager"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id         = try c.decode(UUID.self, forKey: .id)
    userId     = try c.decodeIfPresent(UUID.self, forKey: .userId)
    businessId = try c.decode(UUID.self, forKey: .businessId)
    name       = try c.decode(String.self, forKey: .name)
    role       = try c.decodeIfPresent(String.self, forKey: .role)
    email      = try c.decodeIfPresent(String.self, forKey: .email)
    phone      = try c.decodeIfPresent(String.self, forKey: .phone)
    color      = try c.decodeIfPresent(String.self, forKey: .color)
    isManager  = (try? c.decode(Bool.self, forKey: .isManager)) ?? false
  }
}

struct BookingServiceJoin: Codable {
  let name: String?
}

/// Денний графік роботи бізнесу
struct DaySchedule: Codable, Hashable {
  let open: Int
  let close: Int
  let enabled: Bool
}

/// Тижневий schedule — key by weekday
typealias WeekSchedule = [String: DaySchedule]  // "mon", "tue" etc.

/// Business — extended з schedule, city, phone
struct Business: Identifiable, Codable, Hashable {
  let id: UUID
  let ownerId: UUID
  let name: String
  let slug: String
  let city: String?
  let phone: String?
  let email: String?
  let schedule: WeekSchedule?
  let slotMinutes: Int?

  enum CodingKeys: String, CodingKey {
    case id
    case ownerId     = "owner_id"
    case name
    case slug
    case city
    case phone
    case email
    case schedule
    case slotMinutes = "slot_minutes"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id          = try c.decode(UUID.self, forKey: .id)
    ownerId     = try c.decode(UUID.self, forKey: .ownerId)
    name        = try c.decode(String.self, forKey: .name)
    slug        = try c.decode(String.self, forKey: .slug)
    city        = try c.decodeIfPresent(String.self, forKey: .city)
    phone       = try c.decodeIfPresent(String.self, forKey: .phone)
    email       = try c.decodeIfPresent(String.self, forKey: .email)
    schedule    = try c.decodeIfPresent(WeekSchedule.self, forKey: .schedule)
    slotMinutes = try c.decodeIfPresent(Int.self, forKey: .slotMinutes)
  }
}

enum UserRole: Equatable {
  case manager(business: Business, worker: Worker?)
  case worker(business: Business, worker: Worker)
  case notLinked

  var isManager: Bool {
    if case .manager = self { return true }
    return false
  }

  var business: Business? {
    switch self {
    case .manager(let b, _): return b
    case .worker(let b, _):  return b
    case .notLinked:         return nil
    }
  }

  var worker: Worker? {
    switch self {
    case .manager(_, let w): return w
    case .worker(_, let w):  return w
    case .notLinked:         return nil
    }
  }
}
