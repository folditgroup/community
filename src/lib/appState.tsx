import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ChatbotFilter, Period } from '../types';

// Top-level UI state shared across the shell, top-bar controls, and pages:
//   period       — date range (drives Dashboard + Usage)
//   chatbot      — selected chatbot filter
//   alertBudget  — Settings toggle (default ON)
//   alertWeekly  — Settings toggle (default OFF)

interface AppState {
  period: Period;
  setPeriod: (p: Period) => void;
  chatbot: ChatbotFilter;
  setChatbot: (c: ChatbotFilter) => void;
  alertBudget: boolean;
  setAlertBudget: (b: boolean) => void;
  alertWeekly: boolean;
  setAlertWeekly: (b: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [period, setPeriod] = useState<Period>('30d');
  const [chatbot, setChatbot] = useState<ChatbotFilter>('all');
  const [alertBudget, setAlertBudget] = useState<boolean>(true);
  const [alertWeekly, setAlertWeekly] = useState<boolean>(false);

  const value = useMemo<AppState>(
    () => ({
      period,
      setPeriod,
      chatbot,
      setChatbot,
      alertBudget,
      setAlertBudget,
      alertWeekly,
      setAlertWeekly,
    }),
    [period, chatbot, alertBudget, alertWeekly],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return ctx;
}
