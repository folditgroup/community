import { useState } from 'react';
import { KeyRound, MessageSquare, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../lib/appState';
import { useAnalytics, useSession } from '../lib/session';
import type { ChatbotCardData } from '../types';
import ConnectChatbotModal from '../components/ConnectChatbotModal';
import ChatbotSetupModal from '../components/ChatbotSetupModal';

/**
 * "/chatbots" — the connect surface. Each connected bot shows its provider,
 * model, masked key, and live stats. Connecting a bot (adding an API key) is
 * what unlocks metrics across the app, so the empty state guides users here.
 */
export default function Chatbots(): JSX.Element {
  const { chatbot, setChatbot } = useAppState();
  const { disconnectChatbot } = useSession();
  const navigate = useNavigate();
  const d = useAnalytics();

  // separate from the connect/edit modal: shows the data-ingestion setup
  const [setupBot, setSetupBot] = useState<ChatbotCardData | null>(null);

  // null = closed; 'new' = connect form; otherwise the bot being edited
  const [modal, setModal] = useState<'new' | ChatbotCardData | null>(null);

  const bots = d.chatbotCards;
  const hasBots = bots.length > 0;

  function viewAnalytics(key: string): void {
    setChatbot(key);
    navigate('/');
  }

  function onDisconnect(bot: ChatbotCardData): void {
    const ok = window.confirm(`Disconnect "${bot.name}"? Its metrics will be removed.`);
    if (!ok) return;
    if (chatbot === bot.key) setChatbot('all');
    disconnectChatbot(bot.id);
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-13 text-text-label">
          {hasBots
            ? `${d.botCount} ${d.botCount === 1 ? 'chatbot' : 'chatbots'} connected`
            : 'No chatbots connected yet'}
        </span>
        <button
          type="button"
          onClick={() => setModal('new')}
          className="inline-flex items-center gap-[7px] rounded-md bg-ink px-[15px] py-[9px] text-13 font-semibold text-white"
        >
          <Plus size={14} strokeWidth={2.2} />
          New Chatbot
        </button>
      </div>

      {!hasBots ? (
        <button
          type="button"
          onClick={() => setModal('new')}
          className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-border-dashed p-8 text-center transition-colors hover:border-brand-green"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
            <KeyRound size={24} strokeWidth={1.7} className="text-ink" />
          </span>
          <span className="mt-1 text-15 font-semibold text-ink">Connect your first chatbot</span>
          <span className="max-w-[340px] text-12.5 text-text-muted">
            Add a provider API key to start pulling active users, message volume, token cost, and
            more into your dashboard.
          </span>
          <span className="mt-2 inline-flex items-center gap-[7px] rounded-md bg-ink px-[15px] py-[9px] text-13 font-semibold text-white">
            <Plus size={14} strokeWidth={2.2} />
            Connect a chatbot
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {bots.map((b) => (
            <div
              key={b.key}
              className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[9px] bg-surface-hover">
                    <MessageSquare size={20} strokeWidth={1.7} className="text-ink" />
                  </div>
                  <div>
                    <div className="text-15 font-semibold text-ink">{b.name}</div>
                    <div className="mt-0.5 text-12 text-text-muted">{b.modelLabel}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bg px-2.5 py-1 text-12 font-semibold text-brand-green-text">
                  <span className="h-[7px] w-[7px] rounded-full bg-brand-green" />
                  Active
                </span>
              </div>

              {b.keyMasked && (
                <div className="flex items-center gap-1.5 rounded-md bg-surface-alt px-2.5 py-1.5">
                  <KeyRound size={13} strokeWidth={1.8} className="shrink-0 text-text-muted" />
                  <span className="font-mono text-11.5 text-text-label">{b.keyMasked}</span>
                </div>
              )}

              {(b.budget != null || b.captureMessages) && (
                <div className="-mt-1 flex flex-wrap items-center gap-2">
                  {b.budget != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1 text-11 font-medium text-text-secondary">
                      Budget ${b.budget}/mo
                    </span>
                  )}
                  {b.captureMessages && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-11 font-medium text-text-secondary">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                      Capturing questions
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5 border-y border-border-hairline py-[14px]">
                <div>
                  <div className="mb-1 text-11 text-text-muted">Active Users</div>
                  <div className="text-17 font-bold text-ink">{b.users}</div>
                </div>
                <div>
                  <div className="mb-1 text-11 text-text-muted">Total Cost</div>
                  <div className="text-17 font-bold text-ink">{b.cost}</div>
                </div>
                <div>
                  <div className="mb-1 text-11 text-text-muted">Avg Msgs</div>
                  <div className="text-17 font-bold text-ink">{b.avgMsgs}</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-12 text-text-muted">Last active {b.last}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupBot(b)}
                    className="text-13 font-semibold text-text-secondary transition-colors hover:text-ink"
                  >
                    Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(b)}
                    className="text-13 font-semibold text-text-secondary transition-colors hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDisconnect(b)}
                    className="text-13 font-semibold text-text-secondary transition-colors hover:text-red"
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => viewAnalytics(b.key)}
                    className="text-13 font-semibold text-ink transition-colors hover:text-brand-green-text"
                  >
                    View analytics →
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setModal('new')}
            className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-border-dashed p-5 text-text-muted transition-colors hover:border-brand-green hover:text-brand-green-text"
          >
            <Plus size={26} strokeWidth={1.8} />
            <span className="text-13 font-semibold">Add a chatbot</span>
          </button>
        </div>
      )}

      {modal !== null && (
        <ConnectChatbotModal
          bot={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      {setupBot && <ChatbotSetupModal bot={setupBot} onClose={() => setSetupBot(null)} />}
    </div>
  );
}
