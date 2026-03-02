// src/hooks/useScoresData.ts
import { useEffect, useState } from "react";
import {
  ScoredFinding,
  ScoresSummary,
  getTopScores,
  getScoresSummary,
  getAllFindings,
  PaginatedFindings,
  getRiskOverTime,
  RiskOverTimeSeries,
  RemediationTimeBucket,
  getRemediationTimeHistogram
} from "../api";

export function useScoresData() {
  const [findings, setFindings] = useState<ScoredFinding[]>([]);
  const [summary, setSummary] = useState<ScoresSummary | null>(null);
  const [riskOverTime, setRiskOverTime] = useState<RiskOverTimeSeries | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log("🔄 useScoresData: Starting to load data...");
        setLoading(true);
        setError(null);

        // Fetch Top 10 + summary in parallel
        const [scores, summaryData, riskOverTimeData] = await Promise.all([
          getTopScores(),
          getScoresSummary(),
          getRiskOverTime(30),
        ]);

        console.log("✅ useScoresData: Data loaded successfully");
        console.log("📊 Summary data:", summaryData);
        console.log("🔝 Top scores:", scores);

        setFindings(scores);
        setSummary(summaryData);
        setRiskOverTime(riskOverTimeData);
      } catch (err) {
        console.error("❌ useScoresData: Error loading data:", err);
        setError("Failed to load data from backend.");
      } finally {
        setLoading(false);
        console.log("✅ useScoresData: Loading complete");
      }
    }

    loadData();
  }, []);

  return { findings, summary, loading, error };
}

export function useRiskOverTime(days: number = 30) {
  const [data, setData] = useState<RiskOverTimeSeries | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getRiskOverTime(days);
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load risk over time.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days, refreshKey]);

  const refetch = () => setRefreshKey((prev) => prev + 1);

  return { data, loading, error, refetch };
}

export function usePaginatedFindings(initialPageSize: number = 50) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [data, setData] = useState<PaginatedFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [page, pageSize, refreshKey]);

  const refetch = () => setRefreshKey(prev => prev + 1);

  return {
    page,
    pageSize,
    setPage,
    data,
    loading,
    error,
    refetch,
  };
}

export function useRemediationTimeHistogram() {
  const [data, setData] = useState<RemediationTimeBucket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getRemediationTimeHistogram();
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load remediation time histogram.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, loading, error };
}