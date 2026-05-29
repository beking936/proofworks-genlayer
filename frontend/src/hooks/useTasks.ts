import { useCallback, useEffect, useState } from "react";
import { readAllTasks, readSummary } from "../lib/contract";
import type { EscrowSummary, ProofTask } from "../types/task";

export function useTasks() {
  const [tasks, setTasks] = useState<ProofTask[]>([]);
  const [summary, setSummary] = useState<EscrowSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [nextTasks, nextSummary] = await Promise.all([readAllTasks(), readSummary()]);
      setTasks(nextTasks.reverse());
      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, summary, isLoading, error, refresh };
}
