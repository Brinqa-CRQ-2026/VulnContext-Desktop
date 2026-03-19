import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../components/layout/Header", () => ({
  Header: ({ page, onNavigate }: { page: string; onNavigate: (page: "findings" | "integrations") => void }) => (
    <div>
      <div>{`header:${page}`}</div>
      <button onClick={() => onNavigate("findings")}>header-findings</button>
      <button onClick={() => onNavigate("integrations")}>header-integrations</button>
    </div>
  ),
}));

vi.mock("../components/dashboard/DashboardOverview", () => ({
  DashboardOverview: ({ refreshToken }: { refreshToken: number }) => (
    <div>dashboard:{refreshToken}</div>
  ),
}));

vi.mock("../components/dashboard/RiskWeightsEditor", () => ({
  RiskWeightsEditor: ({
    refreshToken,
    onWeightsUpdated,
  }: {
    refreshToken: number;
    onWeightsUpdated: () => void;
  }) => (
    <div>
      <div>{`weights:${refreshToken}`}</div>
      <button onClick={onWeightsUpdated}>weights-updated</button>
    </div>
  ),
}));

vi.mock("../components/dashboard/RiskTable", () => ({
  RiskTable: ({
    refreshToken,
    onOpenFinding,
    onOpenIntegrations,
    onDataChanged,
  }: {
    refreshToken: number;
    onOpenFinding?: (finding: { id: number; source: string }) => void;
    onOpenIntegrations: () => void;
    onDataChanged?: () => void;
  }) => (
    <div>
      <div>{`table:${refreshToken}`}</div>
      <button onClick={() => onOpenFinding?.({ id: 42, source: "Qualys" })}>open-finding</button>
      <button onClick={onOpenIntegrations}>open-integrations</button>
      <button onClick={onDataChanged}>table-data-changed</button>
    </div>
  ),
}));

vi.mock("../components/dashboard/FindingDetailPage", () => ({
  FindingDetailPage: ({
    findingId,
    refreshToken,
    onBack,
    onDataChanged,
  }: {
    findingId: number;
    refreshToken: number;
    onBack: () => void;
    onDataChanged?: () => void;
  }) => (
    <div>
      <div>{`detail:${findingId}:${refreshToken}`}</div>
      <button onClick={onBack}>detail-back</button>
      <button onClick={onDataChanged}>detail-data-changed</button>
    </div>
  ),
}));

vi.mock("../components/integrations/IntegrationsPage", () => ({
  IntegrationsPage: ({
    refreshToken,
    onDataChanged,
  }: {
    refreshToken: number;
    onDataChanged: () => void;
  }) => (
    <div>
      <div>{`integrations:${refreshToken}`}</div>
      <button onClick={onDataChanged}>integrations-data-changed</button>
    </div>
  ),
}));

vi.mock("../components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import App from "../app";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renders the findings dashboard by default", () => {
    render(<App />);

    expect(screen.getByText("dashboard:0")).toBeInTheDocument();
    expect(screen.getByText("weights:0")).toBeInTheDocument();
    expect(screen.getByText("table:0")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Findings" })).toBeInTheDocument();
  });

  it("navigates to integrations from header or table actions", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-integrations"));
    await screen.findByText("integrations:0");

    fireEvent.click(screen.getByText("header-findings"));
    await screen.findByText("table:0");
    fireEvent.click(screen.getByText("open-integrations"));
    await screen.findByText("integrations:0");
  });

  it("opens a finding detail route and can navigate back", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("open-finding"));
    await screen.findByText("detail:42:0");
    expect(screen.getByRole("heading", { name: "Finding Details" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("detail-back"));
    await screen.findByText("dashboard:0");
  });

  it("increments refreshToken when child callbacks report data changes", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("weights-updated"));
    await screen.findByText("dashboard:1");

    fireEvent.click(screen.getByText("open-finding"));
    await screen.findByText("detail:42:1");
    fireEvent.click(screen.getByText("detail-data-changed"));
    await waitFor(() => expect(screen.getByText("detail:42:2")).toBeInTheDocument());
  });
});
