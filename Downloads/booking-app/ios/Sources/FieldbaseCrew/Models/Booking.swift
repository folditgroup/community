import Foundation

enum BookingStatus: String, Codable, CaseIterable {
  case scheduled
  case inProgress = "in_progress"
  case completed
  case cancelled

  var label: String {
    switch self {
    case .scheduled:  return "Scheduled"
    case .inProgress: return "In progress"
    case .completed:  return "Done"
    case .cancelled:  return "Cancelled"
    }
  }
}

struct Booking: Identifiable, Codable, Hashable {
  let id: UUID
  let clientId: UUID?
  let serviceId: UUID?
  let workerIds: [UUID]
  let start: Date
  let end: Date
  let address: String
  let price: Double
  let tip: Double
  let notes: String?
  let status: BookingStatus

  enum CodingKeys: String, CodingKey {
    case id
    case clientId = "client_id"
    case serviceId = "service_id"
    case workerIds = "worker_ids"
    case start = "start_at"
    case end = "end_at"
    case address
    case price
    case tip
    case notes
    case status
  }

  // Service name is attached separately via BookingWithService — not on the row.
  // address may be nullable in DB, so we decode it as "" when absent.
  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id        = try c.decode(UUID.self,    forKey: .id)
    clientId  = try c.decodeIfPresent(UUID.self, forKey: .clientId)
    serviceId = try c.decodeIfPresent(UUID.self, forKey: .serviceId)
    workerIds = (try? c.decode([UUID].self, forKey: .workerIds)) ?? []
    start     = try c.decode(Date.self,   forKey: .start)
    end       = try c.decode(Date.self,   forKey: .end)
    address   = (try? c.decode(String.self, forKey: .address)) ?? ""
    price     = (try? c.decode(Double.self, forKey: .price)) ?? 0
    tip       = (try? c.decode(Double.self, forKey: .tip)) ?? 0
    notes     = try c.decodeIfPresent(String.self, forKey: .notes)
    status    = (try? c.decode(BookingStatus.self, forKey: .status)) ?? .scheduled
  }
}
