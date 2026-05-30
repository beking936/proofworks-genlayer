import { useMemo, useState } from "react";
import { ActionPanel } from "./components/ActionPanel";
import { BountyArchitect } from "./components/BountyArchitect";
import { StatCard } from "./components/StatCard";
import { TaskCard } from "./components/TaskCard";
import { TaskDetail } from "./components/TaskDetail";
import { TransactionConsole } from "./components/TransactionConsole";
import { MilestoneRoom } from "./components/MilestoneRoom";
import { CONTRACT_ADDRESS } from "./lib/contract";
import { asNumber, formatTinyGen, shortAddress } from "./lib/format";
import { useTasks } from "./hooks/useTasks";
import { useWallet } from "./hooks/useWallet";
import type { ActivityItem } from "./types/task";
import type { BountyDraft } from "./types/github";
import "./styles.css";

export default function App() {
  const { tasks, summary, isLoading, error, refresh } = useTasks();
  const wallet = useWallet();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [draft, setDraft] = useState<BountyDraft | null>(null);

  const selectedTask = useMemo(() => {
    if (selectedId == null) return tasks[0] ?? null;
    return tasks.find((task) => asNumber(task.task_id) === selectedId) ?? tasks[0] ?? null;
  }, [selectedId, tasks]);

  function pushActivity(item: ActivityItem) {
    setActivity((items) => [item, ...items].slice(0, 12));
  }

  return (
    <main className="app-shell">
      <div className="grain" />
      <header className="hero">
        <nav className="topbar">
          <div className="brand-mark"><span>PW</span><i /></div>
          <div className="network-ribbon">Studionet court // contract {shortAddress(CONTRACT_ADDRESS)}</div>
          <div className="wallet-cluster">
            <button className="wallet-button" onClick={wallet.useBurners}>
              {wallet.mode === "burner" ? `Burner ${wallet.burnerRole}: ${shortAddress(wallet.address ?? undefined)}` : "Use free burners"}
            </button>
            <button className="wallet-button secondary" onClick={wallet.connect} disabled={wallet.isConnecting}>
              {wallet.mode === "injected" && wallet.address ? shortAddress(wallet.address) : wallet.isConnecting ? "Summoning wallet…" : "Connect wallet"}
            </button>
          </div>
        </nav>

        <section className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">GenLayer proof-of-fulfillment escrow</span>
            <h1>Work enters escrow. Evidence faces the jury.</h1>
            <p>
              ProofWorks turns messy deliverables into settlement-grade outcomes: post a bounty,
              submit proof, let GenLayer validators adjudicate, then finalize payout after the decision is final.
            </p>
            <div className="hero-actions">
              <button onClick={refresh}>Refresh docket</button>
              <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer">Open GenLayer Studio</a>
            </div>
            <div className="burner-court">
              <div>
                <strong>Free Studionet burner mode</strong>
                <span>No faucet required. Use Creator to create, Worker to submit proof.</span>
              </div>
              <div className="role-switcher">
                <button className={wallet.burnerRole === "creator" && wallet.mode === "burner" ? "is-active" : ""} onClick={() => wallet.setBurnerRole("creator")}>
                  Creator {wallet.creatorAddress ? shortAddress(wallet.creatorAddress) : ""}
                </button>
                <button className={wallet.burnerRole === "worker" && wallet.mode === "burner" ? "is-active" : ""} onClick={() => wallet.setBurnerRole("worker")}>
                  Worker {wallet.workerAddress ? shortAddress(wallet.workerAddress) : ""}
                </button>
                <button onClick={wallet.resetBurners}>new pair</button>
              </div>
            </div>
            {wallet.error ? <p className="wallet-error">{wallet.error}</p> : null}
          </div>
          <div className="seal-card" aria-hidden="true">
            <span>§</span>
            <strong>AI Jury</strong>
            <small>accepted → finalized → paid</small>
          </div>
        </section>
      </header>

      <section className="stats-row">
        <StatCard label="Cases" value={tasks.length} note={isLoading ? "loading docket" : "on Studionet"} />
        <StatCard label="Escrowed" value={formatTinyGen(summary?.total_escrowed)} note="test units" />
        <StatCard label="Active" value={formatTinyGen(summary?.active_escrow)} note="not finalized" />
        <StatCard label="Balance" value={formatTinyGen(summary?.contract_balance)} note="drops after FINALIZED" />
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <BountyArchitect onApply={(nextDraft) => {
        setDraft(nextDraft);
        pushActivity({ id: `${Date.now()}-architect`, label: "architect", detail: "GitHub context loaded into case form", tone: "good" });
      }} />

      <section className="workbench">
        <div className="docket-panel">
          <div className="section-heading">
            <span>docket</span>
            <button onClick={refresh}>reload</button>
          </div>
          <div className="task-list">
            {tasks.length === 0 && !isLoading ? <p className="empty-list">No cases yet. Be the first filing.</p> : null}
            {tasks.map((task) => (
              <TaskCard
                key={String(task.task_id)}
                task={task}
                selected={selectedTask?.task_id === task.task_id}
                onSelect={() => setSelectedId(asNumber(task.task_id))}
              />
            ))}
          </div>
        </div>

        <div className="center-stack"><TaskDetail task={selectedTask} /><MilestoneRoom task={selectedTask} writeClient={wallet.writeClient} onRefresh={refresh} pushActivity={pushActivity} /></div>

        <div className="right-rail">
          <ActionPanel selectedTask={selectedTask} writeClient={wallet.writeClient} onRefresh={refresh} pushActivity={pushActivity} draft={draft} onDraftConsumed={() => setDraft(null)} />
          <TransactionConsole items={activity} />
        </div>
      </section>
    </main>
  );
}
