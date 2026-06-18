import type {
  Account,
  ChatbotConnection,
  Provider,
  Tenant,
} from '../types';
import { hashSeed } from './utils';
import { YANKEES_TEAM } from './dataset';

// Local persistence layer — backs the NY Yankees demo account only.
//
// Accounts, tenants and chatbot connections are persisted in localStorage;
// passwords are stored only as a salted SHA-256 hash (never plain text), and raw
// API keys are never persisted — only a masked view. Real accounts run on
// Supabase instead (src/lib/supabaseBackend.ts); session.tsx routes between the
// two. The pages talk only to the exported API below, so neither backend leaks
// into them.

const STORAGE_KEY = 'community-analytics:store:v1';
const SESSION_KEY = 'community-analytics:session:v1';
const VERSION = 1;

interface StoreShape {
  version: number;
  accounts: Account[];
  tenants: Tenant[];
}

const EMPTY_STORE: StoreShape = { version: VERSION, accounts: [], tenants: [] };

// Low-level read/write.

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function loadStore(): StoreShape {
  if (!hasStorage()) return { ...EMPTY_STORE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STORE };
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || parsed.version !== VERSION) return { ...EMPTY_STORE };
    return parsed;
  } catch {
    return { ...EMPTY_STORE };
  }
}

function saveStore(store: StoreShape): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Crypto helpers (Web Crypto). Available on localhost and any https origin.

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function maskKey(raw: string): { last4: string; masked: string } {
  const trimmed = raw.trim();
  const last4 = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  return { last4, masked: '••••••••••' + last4 };
}

// Seeding — create the NY Yankees account on first run.

function yankeesChatbots(): ChatbotConnection[] {
  const created = new Date('2026-06-16T12:00:00Z').toISOString();
  return [
    {
      id: genId(),
      key: 'stadium',
      name: 'Stadium Info Bot',
      provider: 'OpenAI',
      model: 'GPT-4o',
      keyLast4: 'a4f2',
      keyMasked: '••••••••••a4f2',
      status: 'connected',
      createdAt: created,
      seed: 7,
      captureMessages: false,
    },
    {
      id: genId(),
      key: 'ticket',
      name: 'Ticket Help Bot',
      provider: 'OpenAI',
      model: 'GPT-4o mini',
      keyLast4: '9b13',
      keyMasked: '••••••••••9b13',
      status: 'connected',
      createdAt: created,
      seed: 11,
      captureMessages: false,
    },
  ];
}

function yankeesTenant(): Tenant {
  return {
    id: genId(),
    seeded: true,
    workspace: { name: 'NY Yankees', timezone: 'America/New_York (ET)', currency: 'USD ($)' },
    billing: {
      plan: 'Growth',
      planPrice: '$499/mo',
      nextInvoice: 'Jul 1, 2026',
      paymentMethod: 'Visa •••• 4242',
    },
    budgetTotal: 500,
    alertThreshold: 80,
    team: YANKEES_TEAM.map((t) => ({ ...t })),
    chatbots: yankeesChatbots(),
    defaultModel: 'GPT-4o',
    fallbackModel: 'GPT-4o mini',
  };
}

let seedPromise: Promise<void> | null = null;

/** Ensure the seeded account exists. Idempotent and safe to call repeatedly. */
export function init(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const store = loadStore();
    const hasYankees = store.accounts.some((a) => a.login.toLowerCase() === 'yankeestest');
    if (hasYankees) return;

    const tenant = yankeesTenant();
    const salt = randomSalt();
    const hash = await hashPassword('32458795', salt);
    const account: Account = {
      id: genId(),
      login: 'yankeestest',
      salt,
      hash,
      tenantId: tenant.id,
      createdAt: new Date().toISOString(),
    };
    store.tenants.push(tenant);
    store.accounts.push(account);
    saveStore(store);
  })();
  return seedPromise;
}

// Session.

export function getSessionAccountId(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(SESSION_KEY);
}

function setSession(accountId: string | null): void {
  if (!hasStorage()) return;
  if (accountId) window.localStorage.setItem(SESSION_KEY, accountId);
  else window.localStorage.removeItem(SESSION_KEY);
}

export function getCurrentAccount(): Account | null {
  const id = getSessionAccountId();
  if (!id) return null;
  return loadStore().accounts.find((a) => a.id === id) ?? null;
}

export function getTenant(tenantId: string): Tenant | null {
  return loadStore().tenants.find((t) => t.id === tenantId) ?? null;
}

export function getCurrentTenant(): Tenant | null {
  const account = getCurrentAccount();
  if (!account) return null;
  return getTenant(account.tenantId);
}

export function logout(): void {
  setSession(null);
}

// Auth: login.

export interface AuthResult {
  ok: boolean;
  error?: string;
  account?: Account;
}

export interface RegisterInput {
  login: string;
  password: string;
  workspaceName: string;
  ownerName?: string;
  ownerEmail?: string;
}

export async function login(loginName: string, password: string): Promise<AuthResult> {
  const name = loginName.trim();
  const store = loadStore();
  const account = store.accounts.find((a) => a.login.toLowerCase() === name.toLowerCase());
  if (!account) return { ok: false, error: 'Incorrect username or password.' };

  const hash = await hashPassword(password, account.salt);
  if (hash !== account.hash) return { ok: false, error: 'Incorrect username or password.' };

  setSession(account.id);
  return { ok: true, account };
}

// Tenant + chatbot mutations.

function withTenant(tenantId: string, fn: (t: Tenant) => void): Tenant | null {
  const store = loadStore();
  const tenant = store.tenants.find((t) => t.id === tenantId);
  if (!tenant) return null;
  fn(tenant);
  saveStore(store);
  return tenant;
}

export interface ConnectChatbotInput {
  name: string;
  provider: Provider;
  model: string;
  apiKey: string;
  captureMessages?: boolean;
  budget?: number;
}

export function connectChatbot(tenantId: string, input: ConnectChatbotInput): ChatbotConnection {
  const id = genId();
  const { last4, masked } = maskKey(input.apiKey);
  const bot: ChatbotConnection = {
    id,
    key: id,
    name: input.name.trim(),
    provider: input.provider,
    model: input.model,
    keyLast4: last4,
    keyMasked: masked,
    status: 'connected',
    createdAt: new Date().toISOString(),
    seed: hashSeed(id),
    captureMessages: input.captureMessages ?? false,
    budget: typeof input.budget === 'number' && input.budget > 0 ? input.budget : undefined,
  };
  withTenant(tenantId, (t) => {
    t.chatbots.push(bot);
  });
  return bot;
}

export interface UpdateChatbotInput {
  name?: string;
  provider?: Provider;
  model?: string;
  /** if present, re-key the connection with a new API key. */
  apiKey?: string;
  captureMessages?: boolean;
  /** number sets a per-bot budget; null clears it. */
  budget?: number | null;
}

export function updateChatbot(
  tenantId: string,
  botId: string,
  patch: UpdateChatbotInput,
): void {
  withTenant(tenantId, (t) => {
    const bot = t.chatbots.find((b) => b.id === botId);
    if (!bot) return;
    if (patch.name !== undefined) bot.name = patch.name.trim();
    if (patch.provider !== undefined) bot.provider = patch.provider;
    if (patch.model !== undefined) bot.model = patch.model;
    if (patch.captureMessages !== undefined) bot.captureMessages = patch.captureMessages;
    if (patch.budget !== undefined) {
      bot.budget = patch.budget && patch.budget > 0 ? patch.budget : undefined;
    }
    if (patch.apiKey) {
      const { last4, masked } = maskKey(patch.apiKey);
      bot.keyLast4 = last4;
      bot.keyMasked = masked;
      bot.status = 'connected';
    }
  });
}

export function disconnectChatbot(tenantId: string, botId: string): void {
  withTenant(tenantId, (t) => {
    t.chatbots = t.chatbots.filter((b) => b.id !== botId);
  });
}

export interface UpdateTenantInput {
  workspaceName?: string;
  defaultModel?: string;
  fallbackModel?: string;
  budgetTotal?: number;
  alertThreshold?: number;
}

export function updateTenant(tenantId: string, patch: UpdateTenantInput): void {
  withTenant(tenantId, (t) => {
    if (patch.workspaceName !== undefined) t.workspace.name = patch.workspaceName.trim();
    if (patch.defaultModel !== undefined) t.defaultModel = patch.defaultModel;
    if (patch.fallbackModel !== undefined) t.fallbackModel = patch.fallbackModel;
    if (patch.budgetTotal !== undefined && patch.budgetTotal > 0) {
      t.budgetTotal = Math.round(patch.budgetTotal);
    }
    if (patch.alertThreshold !== undefined) {
      t.alertThreshold = Math.min(100, Math.max(1, Math.round(patch.alertThreshold)));
    }
  });
}
