import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useSourcesSummary } = vi.hoisted(() => ({
  useSourcesSummary: vi.fn(),
}));

vi.mock("../../../hooks/sources/useSourcesSummary", () => ({
  useSourcesSummary,
}));

vi.mock("../../../components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { IntegrationsPage } from "../../../components/integrations/IntegrationsPage";

describe("IntegrationsPage", () => {
  beforeEach(() => {
    useSourcesSummary.mockReset();
  });

  it("renders the empty state when there are no sources", () => {
    useSourcesSummary.mockReturnValue({
      sources: [],
      loading: false,
      error: null,
    });

    render(<IntegrationsPage refreshToken={0} />);

    expect(screen.getByText("Source Inventory")).toBeInTheDocument();
    expect(screen.getByText("No source summaries are available yet.")).toBeInTheDocument();
  });

  it("renders source cards in descending finding-count order", () => {
    useSourcesSummary.mockReturnValue({
      sources: [
        {
          source: "B Source",
          total_findings: 5,
          risk_bands: { Critical: 0, High: 1, Medium: 2, Low: 2 },
        },
        {
          source: "A Source",
          total_findings: 10,
          risk_bands: { Critical: 1, High: 2, Medium: 3, Low: 4 },
        },
      ],
      loading: false,
      error: null,
    });

    render(<IntegrationsPage refreshToken={0} />);

    expect(screen.getByText("A Source")).toBeInTheDocument();
    expect(screen.getByText("B Source")).toBeInTheDocument();
    expect(screen.getAllByText(/findings$/)[0]?.textContent).toContain("10 findings");
  });

  it("renders the read-only runtime note", () => {
    useSourcesSummary.mockReturnValue({
      sources: [],
      loading: false,
      error: null,
    });

    render(<IntegrationsPage refreshToken={0} />);

    expect(
      screen.getByText(/Source imports, renames, and deletes are not part of the active runtime\./)
    ).toBeInTheDocument();
  });
});
