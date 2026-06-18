import { useEffect, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../lib/appState';
import { useAnalyticsFor, useSession } from '../lib/session';
import { PROVIDER_MODELS } from '../lib/dataset';
import type { Provider } from '../types';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';

interface RowProps {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  last?: boolean;
}

function Row({ label, value, children, last }: RowProps): JSX.Element {
  return (
    <div
      className={
        last
          ? 'flex items-center justify-between py-[11px]'
          : 'flex items-center justify-between border-b border-border-inner py-[11px]'
      }
    >
      <span className="text-13 text-text-label">{label}</span>
      {children ?? <span className="text-13 font-semibold text-ink">{value}</span>}
    </div>
  );
}

const SELECT =
  'rounded-md border border-border-input bg-surface px-2.5 py-1.5 text-13 font-semibold text-ink outline-none transition-colors focus:border-brand-green';
const NUM_INPUT =
  'w-[88px] rounded-md border border-border-input bg-surface px-2 py-1 text-right text-13 font-semibold text-ink outline-none transition-colors focus:border-brand-green';

export default function Settings(): JSX.Element {
  const { alertBudget, setAlertBudget, alertWeekly, setAlertWeekly } = useAppState();
  const { updateTenant, tenant } = useSession();
  const navigate = useNavigate();
  const { settings } = useAnalyticsFor('all', '30d');
  const prov = settings.provider;

  // Editable drafts for workspace name, monthly budget, and alert threshold.
  const [nameDraft, setNameDraft] = useState(settings.workspace.name);
  const [budgetDraft, setBudgetDraft] = useState(String(tenant?.budgetTotal ?? ''));
  const [thresholdDraft, setThresholdDraft] = useState(String(tenant?.alertThreshold ?? 80));

  // Re-sync drafts if the active tenant changes underneath us.
  useEffect(() => {
    setNameDraft(tenant?.workspace.name ?? '');
    setBudgetDraft(String(tenant?.budgetTotal ?? ''));
    setThresholdDraft(String(tenant?.alertThreshold ?? 80));
  }, [tenant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function commitName(): void {
    const v = nameDraft.trim();
    if (v && v !== settings.workspace.name) updateTenant({ workspaceName: v });
    else setNameDraft(settings.workspace.name);
  }
  function commitBudget(): void {
    const n = Number(budgetDraft);
    if (Number.isFinite(n) && n > 0) updateTenant({ budgetTotal: n });
    else setBudgetDraft(String(tenant?.budgetTotal ?? ''));
  }
  function commitThreshold(): void {
    const n = Number(thresholdDraft);
    if (Number.isFinite(n) && n >= 1 && n <= 100) updateTenant({ alertThreshold: n });
    else setThresholdDraft(String(tenant?.alertThreshold ?? 80));
  }
  function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  // Model options = every model offered by the connected providers, plus the
  // current selections (so a previously-chosen model is always shown).
  const modelOptions = Array.from(
    new Set<string>([
      prov.defaultModel,
      prov.fallbackModel,
      ...prov.providers.flatMap((p) => PROVIDER_MODELS[p.provider as Provider] ?? []),
    ]),
  ).filter(Boolean);

  return (
    <div className="flex max-w-[760px] flex-col gap-[18px]">
      {/* (1) Workspace */}
      <Card className="px-[22px] py-5">
        <div className="mb-[14px] text-14 font-semibold text-ink">Workspace</div>
        <Row label="Workspace name">
          <input
            className="w-[220px] rounded-md border border-border-input bg-surface px-2.5 py-1 text-right text-13 font-semibold text-ink outline-none transition-colors focus:border-brand-green"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={blurOnEnter}
            aria-label="Workspace name"
          />
        </Row>
        <Row label="Time zone" value={settings.workspace.timezone} />
        <Row label="Currency" value={settings.workspace.currency} last />
      </Card>

      {/* (2) Plan & Billing */}
      <Card className="px-[22px] py-5">
        <div className="mb-[14px] text-14 font-semibold text-ink">Plan &amp; Billing</div>
        <Row label="Current plan">
          <span className="inline-flex items-center gap-2 text-13 font-semibold text-ink">
            {settings.billing.plan}
            <span className="rounded-full bg-brand-green-bg px-[9px] py-0.5 text-11 font-semibold text-brand-green-text">
              {settings.billing.planPrice}
            </span>
          </span>
        </Row>
        <Row label="Next invoice" value={settings.billing.nextInvoice} />
        <Row label="Payment method" value={settings.billing.paymentMethod} last />
      </Card>

      {/* (3) Budget & Alerts */}
      <Card className="px-[22px] py-5">
        <div className="mb-[14px] text-14 font-semibold text-ink">Budget &amp; Alerts</div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-13 text-text-label">Monthly budget</span>
          <div className="flex items-center gap-2">
            <span className="text-13 font-semibold text-ink">{settings.budget.spend}</span>
            <span className="text-13 text-text-muted">/</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-6 items-center justify-center text-13 text-text-muted">
                $
              </span>
              <input
                type="number"
                min={1}
                step={50}
                className={NUM_INPUT + ' pl-6'}
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(e.target.value)}
                onBlur={commitBudget}
                onKeyDown={blurOnEnter}
                aria-label="Monthly budget"
              />
            </div>
          </div>
        </div>
        <div className="mb-1.5 h-2 overflow-hidden rounded-[5px] bg-surface-hover">
          <div
            className="h-full rounded-[5px] bg-brand-green"
            style={{ width: settings.budget.barPct + '%' }}
          />
        </div>
        <div className="mb-4 text-11.5 text-text-muted">{settings.budget.pctText}</div>
        <div className="flex items-center justify-between border-t border-border-inner py-[11px]">
          <span className="flex flex-wrap items-center gap-1.5 text-13 text-text-primary">
            Email me when I reach
            <input
              type="number"
              min={1}
              max={100}
              step={5}
              className="w-[52px] rounded-md border border-border-input bg-surface px-1.5 py-0.5 text-center text-13 font-semibold text-ink outline-none transition-colors focus:border-brand-green"
              value={thresholdDraft}
              onChange={(e) => setThresholdDraft(e.target.value)}
              onBlur={commitThreshold}
              onKeyDown={blurOnEnter}
              aria-label="Alert threshold percentage"
            />
            % of budget
          </span>
          <Toggle
            on={alertBudget}
            onChange={() => setAlertBudget(!alertBudget)}
            label="Email me when I reach budget threshold"
          />
        </div>
        <div className="flex items-center justify-between py-[11px]">
          <span className="text-13 text-text-primary">Send me a weekly cost summary</span>
          <Toggle
            on={alertWeekly}
            onChange={() => setAlertWeekly(!alertWeekly)}
            label="Send me a weekly cost summary"
          />
        </div>
      </Card>

      {/* (4) AI Provider */}
      <Card className="px-[22px] py-5">
        <div className="mb-[14px] flex items-center justify-between">
          <span className="text-14 font-semibold text-ink">AI Provider</span>
          <a
            onClick={() => navigate('/chatbots')}
            className="cursor-pointer text-12.5 font-semibold text-ink transition-colors hover:text-brand-green-text"
          >
            Manage connections →
          </a>
        </div>

        {!prov.connected ? (
          <div className="flex flex-col items-start gap-2 rounded-md bg-surface-alt px-4 py-4">
            <span className="text-13 font-semibold text-ink">No provider connected</span>
            <span className="text-12.5 text-text-muted">
              Connect a chatbot with a provider API key to start collecting metrics.
            </span>
            <button
              type="button"
              onClick={() => navigate('/chatbots')}
              className="mt-1 inline-flex items-center gap-[7px] rounded-md bg-ink px-[14px] py-2 text-12.5 font-semibold text-white"
            >
              <Plus size={13} strokeWidth={2.2} />
              Connect a chatbot
            </button>
          </div>
        ) : (
          <>
            {prov.providers.map((p, i) => (
              <Row
                key={p.provider}
                label={i === 0 ? 'Provider' : ''}
                last={false}
              >
                <span className="inline-flex items-center gap-2 text-13 font-semibold text-ink">
                  {p.provider}
                  <span className="text-12 font-normal text-text-muted">
                    {p.count} {p.count === 1 ? 'chatbot' : 'chatbots'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bg px-[9px] py-0.5 text-11 font-semibold text-brand-green-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                    Connected
                  </span>
                </span>
              </Row>
            ))}
            <Row label="Default model">
              <select
                className={SELECT}
                value={prov.defaultModel}
                onChange={(e) => updateTenant({ defaultModel: e.target.value })}
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Fallback model" last>
              <select
                className={SELECT}
                value={prov.fallbackModel}
                onChange={(e) => updateTenant({ fallbackModel: e.target.value })}
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Row>
          </>
        )}
      </Card>

      {/* (5) Team */}
      <Card className="px-[22px] py-5">
        <div className="mb-1.5 text-14 font-semibold text-ink">Team</div>
        {settings.team.map((t) => (
          <div
            key={t.email}
            className="flex items-center gap-3 border-b border-border-inner py-3"
          >
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-11.5 font-semibold text-white">
              {t.ini}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-13 font-semibold text-ink">{t.name}</div>
              <div className="text-12 text-text-muted">{t.email}</div>
            </div>
            <span className="rounded-full bg-surface-hover px-[11px] py-1 text-12 font-semibold text-text-label">
              {t.role}
            </span>
          </div>
        ))}
        <a className="mt-[14px] inline-flex cursor-pointer items-center gap-[7px] text-13 font-semibold text-ink transition-colors hover:text-brand-green-text">
          <Plus size={14} strokeWidth={2.2} />
          Invite member
        </a>
      </Card>
    </div>
  );
}
