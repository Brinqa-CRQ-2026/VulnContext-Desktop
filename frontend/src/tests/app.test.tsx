import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../components/layout/Header", () => ({
  Header: ({
    page,
    onNavigate,
  }: {
    page: string;
    onNavigate: (page: "findings" | "integrations" | "business-services") => void;
  }) => (
    <div>
      <div>{`header:${page}`}</div>
      <a href="#/business-services">header-home</a>
      <button onClick={() => onNavigate("findings")}>header-findings</button>
      <button onClick={() => onNavigate("integrations")}>header-integrations</button>
      <button onClick={() => onNavigate("business-services")}>
        header-business-services
      </button>
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

vi.mock("../components/business-services/BusinessServicesOverview", () => ({
  BusinessServicesOverview: ({
    onOpenCompanyBusinessUnit,
  }: {
    onOpenCompanyBusinessUnit: (service: { slug: string }) => void;
  }) => (
    <div>
      <div>business-services-overview</div>
      <button onClick={() => onOpenCompanyBusinessUnit({ slug: "virtuon" })}>
        open-company-view
      </button>
    </div>
  ),
}));

vi.mock("../components/business-services/BusinessServiceDetailPage", () => ({
  BusinessServiceDetailPage: ({
    service,
    onBack,
  }: {
    service: { slug: string } | null;
    onBack: () => void;
  }) => (
    <div>
      <div>{`business-service-detail:${service?.slug ?? "missing"}`}</div>
      <button onClick={onBack}>business-service-back</button>
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

  it("renders the business services overview by default", () => {
    render(<App />);

    expect(screen.getByText("business-services-overview")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company Overview" })).toBeInTheDocument();
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

  it("navigates to business services and opens a company detail route", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-business-services"));
    await screen.findByText("business-services-overview");
    expect(screen.getByRole("heading", { name: "Company Overview" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("open-company-view"));
    await screen.findByText("business-service-detail:virtuon");
    expect(screen.getByRole("heading", { name: "Virtuon" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("business-service-back"));
    await screen.findByText("business-services-overview");
  });

  it("opens a finding detail route and can navigate back", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-findings"));
    await screen.findByText("table:0");

    fireEvent.click(screen.getByText("open-finding"));
    await screen.findByText("detail:42:0");
    expect(screen.getByRole("heading", { name: "Finding Details" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("detail-back"));
    await screen.findByText("dashboard:0");
  });

  it("increments refreshToken when child callbacks report data changes", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-findings"));
    await screen.findByText("dashboard:0");

    fireEvent.click(screen.getByText("weights-updated"));
    await screen.findByText("dashboard:1");

    fireEvent.click(screen.getByText("open-finding"));
    await screen.findByText("detail:42:1");
    fireEvent.click(screen.getByText("detail-data-changed"));
    await waitFor(() => expect(screen.getByText("detail:42:2")).toBeInTheDocument());
  });
});
