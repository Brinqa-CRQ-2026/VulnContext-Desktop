import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestBrinqaSessionReset } = vi.hoisted(() => ({
  requestBrinqaSessionReset: vi.fn(),
}));

const { readUiOnlyModeFromRenderer } = vi.hoisted(() => ({
  readUiOnlyModeFromRenderer: vi.fn(),
}));

const { setUiOnlyMode } = vi.hoisted(() => ({
  setUiOnlyMode: vi.fn(),
}));

vi.mock("../auth/electronBrinqa", () => ({
  requestBrinqaSessionReset,
  readUiOnlyModeFromRenderer,
  setUiOnlyMode,
}));

vi.mock("../components/layout/Header", () => ({
  Header: ({
    page,
    onNavigate,
    onLogout,
    onShutdown,
    onToggleUiOnlyMode,
    uiOnlyMode,
    logoutPending,
    shutdownPending,
    uiOnlyModePending,
  }: {
    page: string;
    onNavigate: (page: "findings" | "integrations" | "business-services") => void;
    onLogout: () => void;
    onShutdown: () => void;
    onToggleUiOnlyMode: () => void;
    uiOnlyMode: boolean;
    logoutPending?: boolean;
    shutdownPending?: boolean;
    uiOnlyModePending?: boolean;
  }) => (
    <div>
      <div>{`header:${page}`}</div>
      <div>{`header-ui-only:${uiOnlyMode ? "on" : "off"}`}</div>
      <a href="#/business-services">header-home</a>
      <button onClick={() => onNavigate("findings")}>header-findings</button>
      <button onClick={() => onNavigate("integrations")}>header-integrations</button>
      <button onClick={() => onNavigate("business-services")}>
        header-business-services
      </button>
      <button disabled={uiOnlyModePending} onClick={onToggleUiOnlyMode}>
        header-ui-only-toggle
      </button>
      <button disabled={logoutPending} onClick={onLogout}>
        header-logout
      </button>
      <button disabled={shutdownPending} onClick={onShutdown}>
        header-shutdown
      </button>
    </div>
  ),
}));

vi.mock("../components/dashboard/DashboardOverview", () => ({
  DashboardOverview: ({ refreshToken }: { refreshToken: number }) => (
    <div>dashboard:{refreshToken}</div>
  ),
}));

vi.mock("../components/dashboard/RiskTable", () => ({
  RiskTable: ({
    refreshToken,
    onOpenFinding,
    onOpenIntegrations,
  }: {
    refreshToken: number;
    onOpenFinding?: (finding: { id: number; source: string }) => void;
    onOpenIntegrations: () => void;
  }) => (
    <div>
      <div>{`table:${refreshToken}`}</div>
      <button onClick={() => onOpenFinding?.({ id: "finding-42", source: "Qualys" })}>
        open-finding
      </button>
      <button onClick={onOpenIntegrations}>open-integrations</button>
    </div>
  ),
}));

vi.mock("../components/dashboard/FindingDetailPage", () => ({
  FindingDetailPage: ({
    findingId,
    refreshToken,
    breadcrumbs,
    backLabel,
    onBack,
    onDataChanged,
  }: {
    findingId: string;
    refreshToken: number;
    breadcrumbs: Array<{ label: string; onClick?: () => void }>;
    backLabel: string;
    onBack: () => void;
    onDataChanged?: () => void;
  }) => (
    <div>
      <div>{`detail:${findingId}:${refreshToken}`}</div>
      <div>{`detail-breadcrumbs:${breadcrumbs.map((crumb) => crumb.label).join(" > ")}`}</div>
      <div>{`detail-back-label:${backLabel}`}</div>
      {breadcrumbs.map((crumb) =>
        crumb.onClick ? (
          <button key={crumb.label} onClick={crumb.onClick}>
            {`crumb:${crumb.label}`}
          </button>
        ) : null
      )}
      <button onClick={onBack}>detail-back</button>
      <button onClick={onDataChanged}>detail-data-changed</button>
    </div>
  ),
}));

vi.mock("../components/integrations/IntegrationsPage", () => ({
  IntegrationsPage: ({ refreshToken }: { refreshToken: number }) => (
    <div>
      <div>{`integrations:${refreshToken}`}</div>
    </div>
  ),
}));

vi.mock("../components/business-services/BusinessServicesOverview", () => ({
  BusinessServicesOverview: ({
    onOpenBusinessUnit,
  }: {
    refreshToken: number;
    onOpenBusinessUnit: (service: { slug: string }) => void;
  }) => (
    <div>
      <div>business-services-overview</div>
      <button onClick={() => onOpenBusinessUnit({ slug: "online-store" })}>
        open-business-unit
      </button>
    </div>
  ),
}));

vi.mock("../components/business-services/BusinessUnitDetailPage", () => ({
  BusinessUnitDetailPage: ({
    businessUnitSlug,
    onBack,
    onOpenBusinessService,
  }: {
    businessUnitSlug: string | null;
    refreshToken: number;
    onBack: () => void;
    onOpenBusinessService: (service: { slug: string }) => void;
  }) => (
    <div>
      <div>{`business-unit-detail:${businessUnitSlug ?? "missing"}`}</div>
      <button onClick={() => onOpenBusinessService({ slug: "digital-storefront" })}>
        open-business-service
      </button>
      <button onClick={onBack}>business-unit-back</button>
    </div>
  ),
}));

vi.mock("../components/business-services/BusinessServiceDetailPage", () => ({
  BusinessServiceDetailPage: ({
    businessServiceSlug,
    onBack,
    onOpenApplication,
    onOpenAssetFindings,
  }: {
    businessUnitSlug: string | null;
    businessServiceSlug: string | null;
    refreshToken: number;
    onBack: () => void;
    onOpenApplication: (application: { slug: string }) => void;
    onOpenAssetFindings: (asset: { asset_id: string }) => void;
  }) => (
    <div>
      <div>{`business-service-detail:${businessServiceSlug ?? "missing"}`}</div>
      <button onClick={() => onOpenApplication({ slug: "identity-verify" })}>
        open-application
      </button>
      <button onClick={() => onOpenAssetFindings({ asset_id: "asset-10" })}>
        open-asset-findings
      </button>
      <button onClick={onBack}>business-service-back</button>
    </div>
  ),
}));

vi.mock("../components/business-services/ApplicationDetailPage", () => ({
  ApplicationDetailPage: ({
    applicationSlug,
    onBack,
    onOpenAssetFindings,
  }: {
    businessUnitSlug: string | null;
    businessServiceSlug: string | null;
    applicationSlug: string | null;
    refreshToken: number;
    onBack: () => void;
    onOpenAssetFindings: (asset: { asset_id: string }) => void;
  }) => (
    <div>
      <div>{`application-detail:${applicationSlug ?? "missing"}`}</div>
      <button onClick={() => onOpenAssetFindings({ asset_id: "asset-10" })}>
        application-open-asset-findings
      </button>
      <button onClick={onBack}>application-back</button>
    </div>
  ),
}));

vi.mock("../components/business-services/AssetFindingsPage", () => ({
  AssetFindingsPage: ({
    assetId,
    onBack,
    onOpenFinding,
  }: {
    assetId: string | null;
    refreshToken: number;
    onBack: () => void;
    onOpenFinding: (
      finding: { id: number; source: string },
      origin?: {
        mode: "asset";
        businessUnitSlug?: string | null;
        businessUnitLabel?: string | null;
        businessServiceSlug?: string | null;
        businessServiceLabel?: string | null;
        applicationSlug?: string | null;
        applicationLabel?: string | null;
        assetId?: string | null;
        assetLabel?: string | null;
      }
    ) => void;
  }) => (
    <div>
      <div>{`asset-findings:${assetId ?? "missing"}`}</div>
      <button
        onClick={() =>
          onOpenFinding(
            { id: 77, source: "Qualys" },
            {
              mode: "asset",
              businessUnitSlug: "online-store",
              businessUnitLabel: "Online Store",
              businessServiceSlug: "digital-storefront",
              businessServiceLabel: "Digital Storefront",
              applicationSlug: "identity-verify",
              applicationLabel: "Identity Verify",
              assetId: "asset-10",
              assetLabel: "identity-verify-01",
            }
          )
        }
      >
        asset-open-finding
      </button>
      <button onClick={onBack}>asset-findings-back</button>
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
    requestBrinqaSessionReset.mockReset();
    readUiOnlyModeFromRenderer.mockReset();
    setUiOnlyMode.mockReset();
    readUiOnlyModeFromRenderer.mockReturnValue(false);
    setUiOnlyMode.mockResolvedValue(false);
    requestBrinqaSessionReset.mockResolvedValue(undefined);
  });

  it("renders the business services overview by default", () => {
    render(<App />);

    expect(screen.getByText("business-services-overview")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Business Unit Overview" })
    ).toBeInTheDocument();
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

  it("navigates through the topology drill-down route", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-business-services"));
    await screen.findByText("business-services-overview");
    expect(
      screen.getByRole("heading", { name: "Business Unit Overview" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("open-business-unit"));
    await screen.findByText("business-unit-detail:online-store");
    expect(screen.getByRole("heading", { name: "Business Unit Detail" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("open-business-service"));
    await screen.findByText("business-service-detail:digital-storefront");
    expect(
      screen.getByRole("heading", { name: "Business Service Detail" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("open-application"));
    await screen.findByText("application-detail:identity-verify");
    expect(screen.getByRole("heading", { name: "Application Detail" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("application-open-asset-findings"));
    await screen.findByText("asset-findings:asset-10");
    expect(screen.getByRole("heading", { name: "Asset Findings" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("asset-findings-back"));
    await screen.findByText("application-detail:identity-verify");
    fireEvent.click(screen.getByText("application-back"));
    await screen.findByText("business-service-detail:digital-storefront");
    fireEvent.click(screen.getByText("business-service-back"));
    await screen.findByText("business-unit-detail:online-store");
    fireEvent.click(screen.getByText("business-unit-back"));
    await screen.findByText("business-services-overview");
  });

  it("opens a finding detail route and can navigate back", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-findings"));
    await screen.findByText("table:0");

    fireEvent.click(screen.getByText("open-finding"));
    await screen.findByText("detail:finding-42:0");
    expect(screen.getByRole("heading", { name: "Finding Details" })).toBeInTheDocument();
    expect(screen.getByText("detail-breadcrumbs:Findings > Finding")).toBeInTheDocument();
    expect(screen.getByText("detail-back-label:Back to Findings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("detail-back"));
    await screen.findByText("dashboard:0");
  });

  it("preserves asset breadcrumb context when opening a finding from asset findings", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-business-services"));
    await screen.findByText("business-services-overview");
    fireEvent.click(screen.getByText("open-business-unit"));
    await screen.findByText("business-unit-detail:online-store");
    fireEvent.click(screen.getByText("open-business-service"));
    await screen.findByText("business-service-detail:digital-storefront");
    fireEvent.click(screen.getByText("open-application"));
    await screen.findByText("application-detail:identity-verify");
    fireEvent.click(screen.getByText("application-open-asset-findings"));
    await screen.findByText("asset-findings:asset-10");

    fireEvent.click(screen.getByText("asset-open-finding"));
    await screen.findByText("detail:77:0");
    expect(
      screen.getByText(
        "detail-breadcrumbs:Business Units > Online Store > Digital Storefront > Identity Verify > identity-verify-01 > Finding"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("detail-back-label:Back to Asset Findings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("crumb:identity-verify-01"));
    await screen.findByText("asset-findings:asset-10");

    fireEvent.click(screen.getByText("asset-open-finding"));
    await screen.findByText("detail:77:0");
    fireEvent.click(screen.getByText("detail-back"));
    await screen.findByText("asset-findings:asset-10");
  });

  it("increments refreshToken when child callbacks report data changes", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-findings"));
    await screen.findByText("dashboard:0");

    fireEvent.click(screen.getByText("open-finding"));
    await screen.findByText("detail:finding-42:0");
    fireEvent.click(screen.getByText("detail-data-changed"));
    await waitFor(() => expect(screen.getByText("detail:finding-42:1")).toBeInTheDocument());
  });

  it("triggers Brinqa session reset from the logout control", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-logout"));

    await waitFor(() =>
      expect(requestBrinqaSessionReset).toHaveBeenCalledWith({
        reason: "logout",
        reopenLogin: true,
        includeRemoteLogout: true,
      })
    );
  });

  it("triggers app shutdown through the Brinqa session reset bridge", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("header-shutdown"));

    await waitFor(() =>
      expect(requestBrinqaSessionReset).toHaveBeenCalledWith({
        reason: "shutdown",
        reopenLogin: false,
        includeRemoteLogout: true,
        quitApp: true,
      })
    );
  });

  it("can toggle ui-only mode from the header", async () => {
    setUiOnlyMode.mockResolvedValue(true);

    render(<App />);

    fireEvent.click(screen.getByText("header-ui-only-toggle"));

    await waitFor(() => expect(setUiOnlyMode).toHaveBeenCalledWith(true));
  });
});
