import { useEffect, useState } from "react";

import type {
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../types";
import { getPaginationWindow } from "../../lib/pagination/getPaginationWindow";
import { useSourcesSummary } from "../sources/useSourcesSummary";
import { usePaginatedFindings } from "./usePaginatedFindings";

const FINDINGS_PAGE_SIZE = 20;

export const findingsSortLabelMap: Record<FindingsSortBy, string> = {
  risk_score: "Sort by Risk Score",
  internal_risk_score: "Sort by internal risk",
  source_risk_score: "Sort by vendor risk",
  cvss_score: "Sort by CVSS",
  epss_score: "Sort by EPSS",
  age_in_days: "Sort by age",
  due_date: "Sort by due date",
  source: "Sort by source",
};

export function useFindingsExplorerState(refreshToken: number) {
  const [bandFilter, setBandFilter] = useState<RiskBandFilter>("All");
  const [sortBy, setSortBy] = useState<FindingsSortBy>("risk_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [showKevOnly, setShowKevOnly] = useState(false);
  const { sources } = useSourcesSummary(refreshToken);

  useEffect(() => {
    if (
      sourceFilter !== "All" &&
      !sources.some((item) => item.source === sourceFilter)
    ) {
      setSourceFilter("All");
    }
  }, [sourceFilter, sources]);

  const { page, pageSize, setPage, data, loading, error } = usePaginatedFindings(
    FINDINGS_PAGE_SIZE,
    bandFilter,
    sortBy,
    sortOrder,
    sourceFilter === "All" ? null : sourceFilter,
    refreshToken
  );

  const findings = data?.items ?? [];
  const visibleFindings = showKevOnly
    ? findings.filter((finding: ScoredFinding) => Boolean(finding.isKev))
    : findings;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPaginationWindow({ page, totalPages, windowSize: 3 });

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return {
    bandFilter,
    setBandFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleSortOrder,
    sourceFilter,
    setSourceFilter,
    showKevOnly,
    setShowKevOnly,
    sources,
    page,
    pageSize,
    data,
    loading,
    error,
    visibleFindings,
    total,
    totalPages,
    pageNumbers,
    goToPage,
    sortLabel: findingsSortLabelMap[sortBy],
  };
}
