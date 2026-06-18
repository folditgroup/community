// Shared domain types. The app is multi-tenant: each account owns a tenant
// (workspace) with its own connected chatbots; analytics are computed per tenant
// (src/lib/dataset.ts -> src/lib/mockData.ts). The seeded "NY Yankees" tenant
// reproduces the original design dataset exactly.

export type Period = '7d' | '30d' | '90d' | 'custom';

/** A chatbot filter value: the literal 'all', or a chatbot's `key`. */
export type ChatbotFilter = string;
/** A chatbot's stable key (used as a filter value and metric seed source). */
export type ChatbotKey = string;

/** Supported AI providers a chatbot can be connected through. */
export type Provider = 'OpenAI' | 'Anthropic' | 'Google' | 'Azure OpenAI' | 'Custom';

/** Raw per-(chatbot, period) totals. */
export interface PeriodMetrics {
  /** active users */
  users: number;
  /** total messages / interactions */
  int: number;
  /** token cost in USD */
  token: number;
  /** Community platform usage cost in USD */
  plat: number;
}

/** Percentage trend vs the previous period (e.g. 19 => +19%). */
export interface Trend {
  cost: number;
  token: number;
  plat: number;
  avgcost: number;
}

/** The three period windows of raw metrics for one chatbot. */
export interface BotMetrics {
  '7d': PeriodMetrics;
  '30d': PeriodMetrics;
  '90d': PeriodMetrics;
}

// Persisted account / tenant model (local store, demo only).

export interface WorkspaceInfo {
  name: string;
  timezone: string;
  currency: string;
}

export interface BillingInfo {
  plan: string;
  planPrice: string;
  nextInvoice: string;
  paymentMethod: string;
}

/** A connected chatbot. The raw API key is never stored — only a masked view. */
export interface ChatbotConnection {
  id: string;
  /** stable key used as the analytics filter value (== id for new bots). */
  key: string;
  name: string;
  provider: Provider;
  /** model id, e.g. 'GPT-4o' or 'Claude Sonnet 4.5'. */
  model: string;
  /** last 4 visible characters of the API key. */
  keyLast4: string;
  /** display-only masked key, e.g. 'sk-••••••••••3f9a'. */
  keyMasked: string;
  status: 'connected' | 'error';
  createdAt: string;
  /** deterministic seed driving this bot's synthesized metrics. */
  seed: number;
  /** opt-in: capture normalized question text for the top-questions panel. */
  captureMessages: boolean;
  /** optional per-bot monthly budget ceiling in USD (undefined = none). */
  budget?: number;
}

export interface Tenant {
  id: string;
  workspace: WorkspaceInfo;
  billing: BillingInfo;
  /** monthly budget ceiling in USD. */
  budgetTotal: number;
  /** percentage of budget at which to alert (e.g. 80). */
  alertThreshold: number;
  team: TeamMember[];
  chatbots: ChatbotConnection[];
  defaultModel: string;
  fallbackModel: string;
  /** true for the pre-seeded NY Yankees tenant (verbatim design dataset). */
  seeded?: boolean;
}

export interface Account {
  id: string;
  login: string;
  /** per-account random salt (hex). */
  salt: string;
  /** SHA-256(salt + password) as hex. The raw password is never stored. */
  hash: string;
  tenantId: string;
  createdAt: string;
  /** app_metadata.role for Supabase accounts ('admin' unlocks cross-client views). */
  role?: string;
}

// Chart / series types.

/** One day of the time-series, shaped for direct consumption by Recharts. */
export interface SeriesPoint {
  date: string;
  token: number;
  platform: number;
  promptTok: number;
  complTok: number;
  conversations: number;
}

export interface Series {
  n: number;
  dates: string[];
  token: number[];
  platform: number[];
  promptTok: number[];
  complTok: number[];
  conversations: number[];
  points: SeriesPoint[];
}

// View-model types consumed by the pages.

export interface StatCardData {
  label: string;
  value: string;
  /** percentage change vs previous period; >= 0 is positive (green up) */
  trendPct: number;
}

export interface BreakdownRow {
  name: string;
  users: string;
  avgMsgs: string;
  token: string;
  plat: string;
  total: string;
  trend: string;
}

export interface TopMessage {
  rank: number;
  label: string;
  count: string;
  share: string;
  barPct: number;
}

export interface ChatbotCardData {
  key: ChatbotKey;
  id: string;
  name: string;
  provider: Provider;
  model: string;
  modelLabel: string;
  keyMasked: string;
  last: string;
  users: string;
  cost: string;
  avgMsgs: string;
  active: boolean;
  /** optional per-bot monthly budget in USD. */
  budget?: number;
  /** whether question capture is enabled for this bot. */
  captureMessages: boolean;
}

export interface ModelRow {
  model: string;
  dot: 'green' | 'black';
  msgs: string;
  tokens: string;
  cost: string;
}

export interface ReportRow {
  name: string;
  period: string;
  date: string;
  cost: string;
}

export interface TeamMember {
  ini: string;
  name: string;
  email: string;
  role: string;
}

export interface DonutData {
  token: number;
  plat: number;
  total: number;
}

export interface ProviderStatus {
  provider: string;
  connected: boolean;
  /** number of chatbots connected through this provider. */
  count: number;
}

export interface SettingsData {
  workspace: WorkspaceInfo;
  billing: BillingInfo;
  budget: { spend: string; total: string; barPct: number; pctText: string };
  /** percentage of budget at which alerts fire (drives the alert row label). */
  alertThreshold: number;
  provider: {
    connected: boolean;
    providers: ProviderStatus[];
    defaultModel: string;
    fallbackModel: string;
  };
  team: TeamMember[];
}

/** Everything the pages need for a given (chatbot, period) combination. */
export interface MockData {
  rangeLabel: string;
  botLabel: string;
  // Dashboard
  cards: StatCardData[];
  series: Series;
  usersValue: string;
  msgPerChat: string;
  donut: DonutData;
  topMessages: TopMessage[];
  rows: BreakdownRow[];
  // Chatbots
  botCount: number;
  chatbotCards: ChatbotCardData[];
  // Usage
  usageCards: StatCardData[];
  modelRows: ModelRow[];
  hourly: number[];
  hourlyPeak: number;
  // Reports
  reports: ReportRow[];
  // Settings
  settings: SettingsData;
}
