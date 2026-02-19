// src/hooks/useScoresData.ts
import { useEffect, useState } from "react";
import {
  ScoredFinding,
  ScoresSummary,
  getTopScores,
  getScoresSummary,
  getAllFindings,
  getFindingsByRiskBand,
  FindingsSortBy,
  PaginatedFindings,
  RiskBandFilter,
  SortOrder,
} from "../api";

export function useScoresData(refreshToken: number = 0) {
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
  }, [refreshToken]);

  return { findings, summary, loading, error };
}

export function usePaginatedFindings(
  initialPageSize: number = 50,
  bandFilter: RiskBandFilter = "All",
  sortBy: FindingsSortBy = "risk_score",
  sortOrder: SortOrder = "desc",
  refreshToken: number = 0
) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [data, setData] = useState<PaginatedFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [bandFilter, sortBy, sortOrder]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (bandFilter === "All") {
          const allResult = await getAllFindings(page, pageSize, sortBy, sortOrder);
          setData(allResult);
          return;
        }
        const filteredResult = await getFindingsByRiskBand(
          bandFilter,
          page,
          pageSize,
          sortBy,
          sortOrder
        );
        setData(filteredResult);
      } catch (err) {
        console.error(err);
        setError("Failed to load findings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, pageSize, bandFilter, sortBy, sortOrder, refreshToken]);

  return {
    page,
    pageSize,
    setPage,
    data,
    loading,
    error,
  };
}
