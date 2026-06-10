import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetInventoryPanel } from "../../../components/topology/AssetInventoryPanel";
import type { AssetSummary } from "../../../types";
import { buildAsset } from "../../fixtures/topology/topology";

const useAssetInventoryStateMock = vi.fn();

vi.mock("../../../hooks/topology/assets/useAssetInventoryState", () => ({
  useAssetInventoryState: (args: unknown) => useAssetInventoryStateMock(args),
}));

function buildInventoryState(overrides: Record<string, unknown> = {}) {
  const assets = (overrides.assets as AssetSummary[] | undefined) ?? [
    buildAsset({
      asset_id: "asset-1",
      hostname: "web-1.example.com",
      environment: "prod",
      category: "server",
      device_type: "VM",
      asset_context_score: 7.3,
      aggregated_finding_risk: 8.1,
      pci: true,
      pii: true,
      finding_count: 12,
    }),
  ];

  return {
    searchDraft: "",
    setSearchDraft: vi.fn(),
    applySearch: vi.fn(),
    status: "All",
    setStatus: vi.fn(),
    environment: "All",
    setEnvironment: vi.fn(),
    compliance: "All",
    setCompliance: vi.fn(),
    sortBy: "finding_count",
    setSortBy: vi.fn(),
    sortOrder: "desc",
    toggleSortOrder: vi.fn(),
    data: { items: assets, total: assets.length },
    assets,
    loading: false,
    error: null,
    analytics: null,
    analyticsLoading: false,
    analyticsError: null,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    pageNumbers: [1],
    goToPage: vi.fn(),
    statusOptions: ["All", "Active", "Inactive"],
    environmentOptions: ["All", "Production", "Development"],
    complianceOptions: ["All", "Regulated", "PCI", "PII"],
    ...overrides,
  };
}

describe("AssetInventoryPanel", () => {
  beforeEach(() => {
    useAssetInventoryStateMock.mockReset();
    useAssetInventoryStateMock.mockReturnValue(buildInventoryState());
  });

  it("passes scope filters to the asset inventory hook", () => {
    render(
      <AssetInventoryPanel
        businessUnit="Online Store"
        businessService="Digital Storefront"
        application="Identity"
        directOnly
        refreshToken={4}
        onOpenAsset={vi.fn()}
      />
    );

    expect(useAssetInventoryStateMock).toHaveBeenCalledWith({
      businessUnit: "Online Store",
      businessService: "Digital Storefront",
      application: "Identity",
      directOnly: true,
      refreshToken: 4,
    });
  });

  it("renders populated assets and opens a selected asset", async () => {
    const onOpenAsset = vi.fn();
    const user = userEvent.setup();

    render(<AssetInventoryPanel refreshToken={0} onOpenAsset={onOpenAsset} />);

    expect(screen.getByText("web-1.example.com")).toBeInTheDocument();
    expect(screen.getByText("server")).toBeInTheDocument();
    expect(screen.getByText("VM")).toBeInTheDocument();
    expect(screen.getByText("Prod")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open web-1.example.com" }));

    expect(onOpenAsset).toHaveBeenCalledWith(
      expect.objectContaining({ asset_id: "asset-1" })
    );
  });

  it("wires search, filters, sorting, and pagination callbacks", async () => {
    const state = buildInventoryState({
      data: { items: [buildAsset()], total: 12 },
      totalPages: 2,
      pageNumbers: [1, 2],
    });
    useAssetInventoryStateMock.mockReturnValue(state);
    const user = userEvent.setup();

    render(<AssetInventoryPanel refreshToken={0} onOpenAsset={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Search asset or ID"), {
      target: { value: "web" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Search asset or ID").closest("form")!);
    await user.click(screen.getByRole("button", { name: /Status: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Inactive" }));
    await user.click(screen.getByRole("button", { name: /Environment: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Production" }));
    await user.click(screen.getByRole("button", { name: /Compliance: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "PCI" }));
    await user.click(screen.getByRole("button", { name: /Sort by: Findings/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Asset / hostname" }));
    await user.click(screen.getByRole("button", { name: "Desc" }));
    await user.click(screen.getByRole("link", { name: "2" }));

    expect(state.setSearchDraft).toHaveBeenCalledWith("web");
    expect(state.applySearch).toHaveBeenCalled();
    expect(state.setStatus).toHaveBeenCalledWith("Inactive");
    expect(state.setEnvironment).toHaveBeenCalledWith("Production");
    expect(state.setCompliance).toHaveBeenCalledWith("PCI");
    expect(state.setSortBy).toHaveBeenCalledWith("name");
    expect(state.toggleSortOrder).toHaveBeenCalled();
    expect(state.goToPage).toHaveBeenCalledWith(2);
  });

  it("renders loading, error, empty, and analytics-warning states", () => {
    const { rerender } = render(
      <AssetInventoryPanel refreshToken={0} onOpenAsset={vi.fn()} />
    );

    useAssetInventoryStateMock.mockReturnValue(
      buildInventoryState({ loading: true, assets: [], data: { items: [], total: 0 } })
    );
    rerender(<AssetInventoryPanel refreshToken={0} onOpenAsset={vi.fn()} />);
    expect(screen.getByText("Loading assets")).toBeInTheDocument();

    useAssetInventoryStateMock.mockReturnValue(
      buildInventoryState({ error: "Unable to load assets", assets: [], data: { items: [], total: 0 } })
    );
    rerender(<AssetInventoryPanel refreshToken={0} onOpenAsset={vi.fn()} />);
    expect(screen.getByText("Unable to load assets")).toBeInTheDocument();

    useAssetInventoryStateMock.mockReturnValue(
      buildInventoryState({ assets: [], data: { items: [], total: 0 } })
    );
    rerender(<AssetInventoryPanel refreshToken={0} onOpenAsset={vi.fn()} />);
    expect(screen.getByText("No assets")).toBeInTheDocument();

    useAssetInventoryStateMock.mockReturnValue(
      buildInventoryState({ analyticsError: "Unable to load analytics" })
    );
    rerender(<AssetInventoryPanel refreshToken={0} onOpenAsset={vi.fn()} />);
    expect(screen.getAllByText("Unable to load analytics")).toHaveLength(2);
  });
});
