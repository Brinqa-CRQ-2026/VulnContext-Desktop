// src/hooks/useScoresData.ts
import { useEffect, useState } from "react";
import {
  ScoredFinding,
  ScoresSummary,
  getTopScores,
  getScoresSummary,
  getAllFindings,
  PaginatedFindings
} from "../api";

export function useScoresData() {
  const [findings, setFindings] = useState<ScoredFinding[]>([]);
  const [summary, setSummary] = useState<ScoresSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch Top 10 + summary in parallel
        const [scores, summaryData] = await Promise.all([
          getTopScores(),
          getScoresSummary(),
        ]);

        setFindings(scores);
        setSummary(summaryData);
      } catch (err) {
        console.error(err);
        setError("Failed to load data from backend.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { findings, summary, loading, error };
}

export function usePaginatedFindings(initialPageSize: number = 50) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [data, setData] = useState<PaginatedFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getAllFindings(page, pageSize);
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load findings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, pageSize]);

  return {
    page,
    pageSize,
    setPage,
    data,
    loading,
    error,
  };
}