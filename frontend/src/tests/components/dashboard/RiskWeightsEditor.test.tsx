import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRiskWeightsConfig, updateRiskWeights } = vi.hoisted(() => ({
  useRiskWeightsConfig: vi.fn(),
  updateRiskWeights: vi.fn(),
}));

vi.mock("../../../hooks/risk-weights/useRiskWeightsConfig", () => ({
  useRiskWeightsConfig,
}));

vi.mock("../../../api", () => ({
  updateRiskWeights,
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

import { RiskWeightsEditor } from "../../../components/dashboard/RiskWeightsEditor";

const baseWeights = {
  cvss_weight: 0.2,
  epss_weight: 0.2,
  kev_weight: 0.2,
  asset_criticality_weight: 0.2,
  context_weight: 0.2,
};

describe("RiskWeightsEditor", () => {
  beforeEach(() => {
    useRiskWeightsConfig.mockReset();
    updateRiskWeights.mockReset();
  });

  it("blocks invalid weight sums before calling the API", async () => {
    useRiskWeightsConfig.mockReturnValue({
      weights: baseWeights,
      setWeights: vi.fn(),
      loading: false,
      error: null,
    });

    render(<RiskWeightsEditor refreshToken={0} onWeightsUpdated={vi.fn()} />);

    fireEvent.click(screen.getByText("Edit Weights"));
    fireEvent.change(screen.getByLabelText("CVSS weight"), { target: { value: "0.9" } });
    fireEvent.click(screen.getByText("Save + Recalculate"));

    expect(await screen.findByText("Weights must sum to 1.0.")).toBeInTheDocument();
    expect(updateRiskWeights).not.toHaveBeenCalled();
  });

  it("saves valid weights and reports the recalculation result", async () => {
    const setWeights = vi.fn();
    const onWeightsUpdated = vi.fn();

    useRiskWeightsConfig.mockReturnValue({
      weights: baseWeights,
      setWeights,
      loading: false,
      error: null,
    });
    updateRiskWeights.mockResolvedValue({
      updated_rows: 12,
      weights: {
        cvss_weight: 0.3,
        epss_weight: 0.2,
        kev_weight: 0.2,
        asset_criticality_weight: 0.2,
        context_weight: 0.1,
      },
    });

    render(<RiskWeightsEditor refreshToken={0} onWeightsUpdated={onWeightsUpdated} />);

    fireEvent.click(screen.getByText("Edit Weights"));
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "0.3" } });
    fireEvent.change(inputs[4], { target: { value: "0.1" } });
    fireEvent.click(screen.getByText("Save + Recalculate"));

    await waitFor(() =>
      expect(updateRiskWeights).toHaveBeenCalledWith({
        cvss_weight: 0.3,
        epss_weight: 0.2,
        kev_weight: 0.2,
        asset_criticality_weight: 0.2,
        context_weight: 0.1,
      })
    );
    expect(setWeights).toHaveBeenCalled();
    expect(onWeightsUpdated).toHaveBeenCalled();
    expect(
      screen.getByText("Updated weights and recalculated 12 findings.")
    ).toBeInTheDocument();
  });
});
