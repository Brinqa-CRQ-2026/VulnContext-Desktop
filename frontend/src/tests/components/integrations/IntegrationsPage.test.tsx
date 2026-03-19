import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { renameSource, deleteSource, useSourcesSummary } = vi.hoisted(() => ({
  renameSource: vi.fn(),
  deleteSource: vi.fn(),
  useSourcesSummary: vi.fn(),
}));

vi.mock("../../../api", () => ({
  renameSource,
  deleteSource,
}));

vi.mock("../../../hooks/sources/useSourcesSummary", () => ({
  useSourcesSummary,
}));

vi.mock("../../../components/dashboard/SeedEmptyState", () => ({
  SeedEmptyState: ({ onSeeded }: { onSeeded: () => void }) => (
    <button onClick={onSeeded}>seed state</button>
  ),
}));

vi.mock("../../../components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("../../../components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { IntegrationsPage } from "../../../components/integrations/IntegrationsPage";

describe("IntegrationsPage", () => {
  beforeEach(() => {
    renameSource.mockReset();
    deleteSource.mockReset();
    useSourcesSummary.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders the empty state when there are no sources", () => {
    useSourcesSummary.mockReturnValue({
      sources: [],
      loading: false,
      error: null,
    });

    render(<IntegrationsPage refreshToken={0} onDataChanged={vi.fn()} />);

    expect(screen.getByText("seed state")).toBeInTheDocument();
    expect(
      screen.getByText("No sources yet. Upload a CSV above to initialize your first source.")
    ).toBeInTheDocument();
  });

  it("renames a source through the mocked API boundary", async () => {
    const onDataChanged = vi.fn();
    useSourcesSummary.mockReturnValue({
      sources: [
        {
          source: "B Source",
          total_findings: 5,
          risk_bands: { Critical: 0, High: 1, Medium: 2, Low: 2 },
        },
      ],
      loading: false,
      error: null,
    });
    renameSource.mockResolvedValue({});

    render(<IntegrationsPage refreshToken={0} onDataChanged={onDataChanged} />);

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByDisplayValue("B Source"), {
      target: { value: "Renamed Source" },
    });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(renameSource).toHaveBeenCalledWith("B Source", "Renamed Source"));
    expect(onDataChanged).toHaveBeenCalled();
  });

  it("deletes a source after confirmation", async () => {
    const onDataChanged = vi.fn();
    useSourcesSummary.mockReturnValue({
      sources: [
        {
          source: "A Source",
          total_findings: 10,
          risk_bands: { Critical: 1, High: 2, Medium: 3, Low: 4 },
        },
      ],
      loading: false,
      error: null,
    });
    deleteSource.mockResolvedValue({});

    render(<IntegrationsPage refreshToken={0} onDataChanged={onDataChanged} />);

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => expect(deleteSource).toHaveBeenCalledWith("A Source"));
    expect(onDataChanged).toHaveBeenCalled();
  });
});
