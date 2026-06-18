import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Account, ChatbotFilter, MockData, Period, Tenant } from '../types';
import { buildAnalytics } from './mockData';
import { getDatasetForTenant, EMPTY_DATASET, type TenantDataset } from './dataset';
import { useAppState } from './appState';
import {
  connectChatbot as storeConnect,
  disconnectChatbot as storeDisconnect,
  getCurrentAccount,
  getCurrentTenant,
  getSessionAccountId,
  init as storeInit,
  login as storeLogin,
  logout as storeLogout,
  updateChatbot as storeUpdateChatbot,
  updateTenant as storeUpdateTenant,
  type AuthResult,
  type ConnectChatbotInput,
  type RegisterInput,
  type UpdateChatbotInput,
  type UpdateTenantInput,
} from './store';
import * as supa from './supabaseBackend';

// SessionProvider owns "who is logged in" + the active tenant dataset.
//
// HYBRID routing:
//   - the seeded demo (login "yankeestest") runs entirely on the local store,
//     so it stays available with zero backend and its numbers are verbatim;
//   - every other account is a real Supabase Auth user — tenant, chatbots, and
//     analytics come from the serverless API.
//
// The public surface is identical for both, so pages never branch on backend.

const DEMO_LOGIN = 'yankeestest';
type Mode = 'local' | 'supabase' | null;

interface SessionValue {
  ready: boolean;
  account: Account | null;
  tenant: Tenant | null;
  dataset: TenantDataset | null;
  /** true when the signed-in Supabase user has app_metadata.role = 'admin'. */
  isAdmin: boolean;
  login: (loginName: string, password: string) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => void;
  connectChatbot: (input: ConnectChatbotInput) => void;
  updateChatbot: (botId: string, patch: UpdateChatbotInput) => void;
  disconnectChatbot: (botId: string) => void;
  updateTenant: (patch: UpdateTenantInput) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const { setChatbot } = useAppState();
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [dataset, setDataset] = useState<TenantDataset | null>(null);
  const modeRef = useRef<Mode>(null);

  // Re-pull tenant + dataset for the active backend after a mutation.
  const refresh = useCallback(async () => {
    if (modeRef.current === 'local') {
      const t = getCurrentTenant();
      setAccount(getCurrentAccount());
      setTenant(t);
      setDataset(t ? getDatasetForTenant(t) : null);
    } else if (modeRef.current === 'supabase') {
      try {
        const t = await supa.loadTenant();
        if (t) setTenant(t);
        setDataset(await supa.loadDataset('30d'));
      } catch {
        setDataset((d) => d ?? EMPTY_DATASET);
      }
    }
  }, []);

  const enterLocal = useCallback(() => {
    modeRef.current = 'local';
    const t = getCurrentTenant();
    setAccount(getCurrentAccount());
    setTenant(t);
    setDataset(t ? getDatasetForTenant(t) : null);
  }, []);

  const enterSupabase = useCallback(async (acc: Account, t: Tenant | null) => {
    modeRef.current = 'supabase';
    setAccount(acc);
    setTenant(t);
    try {
      setDataset(await supa.loadDataset('30d'));
    } catch {
      setDataset(EMPTY_DATASET);
    }
  }, []);

  // Hydrate on mount: seed the demo store, then restore whichever session exists.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await storeInit();
      } catch {
        /* ignore */
      }
      if (getSessionAccountId()) {
        if (alive) enterLocal();
      } else {
        try {
          const restored = await supa.restore();
          if (restored && alive) await enterSupabase(restored.account, restored.tenant);
        } catch {
          /* supabase not configured or no session */
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [enterLocal, enterSupabase]);

  const login = useCallback(
    async (loginName: string, password: string): Promise<AuthResult> => {
      const isDemo = loginName.trim().toLowerCase() === DEMO_LOGIN;
      if (isDemo) {
        const res = await storeLogin(loginName, password);
        if (res.ok) {
          setChatbot('all');
          enterLocal();
        }
        return res;
      }
      const res = await supa.login(loginName, password);
      if (res.ok && res.account) {
        setChatbot('all');
        const t = await supa.loadTenant();
        await enterSupabase(res.account, t);
      }
      return res;
    },
    [setChatbot, enterLocal, enterSupabase],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResult> => {
      const res = await supa.register(input);
      if (res.ok && res.account) {
        setChatbot('all');
        const t = await supa.loadTenant();
        await enterSupabase(res.account, t);
      }
      return res;
    },
    [setChatbot, enterSupabase],
  );

  const logout = useCallback(() => {
    if (modeRef.current === 'supabase') void supa.logout();
    else storeLogout();
    modeRef.current = null;
    setChatbot('all');
    setAccount(null);
    setTenant(null);
    setDataset(null);
  }, [setChatbot]);

  const connectChatbot = useCallback(
    (input: ConnectChatbotInput) => {
      if (!tenant) return;
      if (modeRef.current === 'supabase') {
        void supa.connectChatbot(input).then(refresh).catch(() => undefined);
      } else {
        storeConnect(tenant.id, input);
        void refresh();
      }
    },
    [tenant, refresh],
  );

  const updateChatbot = useCallback(
    (botId: string, patch: UpdateChatbotInput) => {
      if (!tenant) return;
      if (modeRef.current === 'supabase') {
        void supa.updateChatbot(botId, patch).then(refresh).catch(() => undefined);
      } else {
        storeUpdateChatbot(tenant.id, botId, patch);
        void refresh();
      }
    },
    [tenant, refresh],
  );

  const disconnectChatbot = useCallback(
    (botId: string) => {
      if (!tenant) return;
      if (modeRef.current === 'supabase') {
        void supa.disconnectChatbot(botId).then(refresh).catch(() => undefined);
      } else {
        storeDisconnect(tenant.id, botId);
        void refresh();
      }
    },
    [tenant, refresh],
  );

  const updateTenant = useCallback(
    (patch: UpdateTenantInput) => {
      if (!tenant) return;
      if (modeRef.current === 'supabase') {
        // optimistic: reflect budget/threshold/name immediately, then persist
        setTenant((cur) =>
          cur
            ? {
                ...cur,
                workspace: {
                  ...cur.workspace,
                  name: patch.workspaceName ?? cur.workspace.name,
                },
                budgetTotal: patch.budgetTotal ?? cur.budgetTotal,
                alertThreshold: patch.alertThreshold ?? cur.alertThreshold,
              }
            : cur,
        );
        void supa.updateTenant(patch).then(refresh).catch(() => undefined);
      } else {
        storeUpdateTenant(tenant.id, patch);
        void refresh();
      }
    },
    [tenant, refresh],
  );

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      account,
      tenant,
      dataset,
      isAdmin: account?.role === 'admin',
      login,
      register,
      logout,
      connectChatbot,
      updateChatbot,
      disconnectChatbot,
      updateTenant,
    }),
    [
      ready,
      account,
      tenant,
      dataset,
      login,
      register,
      logout,
      connectChatbot,
      updateChatbot,
      disconnectChatbot,
      updateTenant,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}

const EMPTY: MockData = buildAnalytics(EMPTY_DATASET, 'all', '30d');

/** Analytics for the current tenant, scoped by the live TopBar selection. */
export function useAnalytics(): MockData {
  const { dataset } = useSession();
  const { chatbot, period } = useAppState();
  return useMemo(
    () => (dataset ? buildAnalytics(dataset, chatbot, period) : EMPTY),
    [dataset, chatbot, period],
  );
}

/** Analytics for a fixed scope (Settings + Reports always read 'all' / 30d). */
export function useAnalyticsFor(chatbot: ChatbotFilter, period: Period): MockData {
  const { dataset } = useSession();
  return useMemo(
    () => (dataset ? buildAnalytics(dataset, chatbot, period) : EMPTY),
    [dataset, chatbot, period],
  );
}
