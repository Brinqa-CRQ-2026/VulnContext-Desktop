import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FairFrequencyPanel } from "../../../components/fair/FairFrequencyPanel";
import { FairScopeLossPanel } from "../../../components/fair/FairScopeLossPanel";
import { SECURITY_SCORE_STORAGE_KEY } from "../../../lib/securityScore";

const prediction = {
  tef_mean: 1.2345,
  lef_mean: 0.4567,
  vulnerability: 0.1234,
  control_score: 0.78,
  loss_mean: 140000,
  loss_p90: 250000,
  loss_p95: 310000,
  worst_loss: 900000,
};

describe("FAIR panels", () => {
  beforeEach(() => {
    window.localStorage.setItem(
      SECURITY_SCORE_STORAGE_KEY,
      JSON.stringify({ prevent_patch_maturity: 2 })
    );
  });

  it("renders frequency guide open/closed, loading, success, and request payload wiring", async () => {
    const onPredict = vi.fn().mockResolvedValue(prediction);
    const user = userEvent.setup();

    render(
      <FairFrequencyPanel
        title="Finding FAIR"
        description="Frequency description"
        scopeLabel="finding"
        onPredict={onPredict}
      />
    );

    expect(screen.queryByText("FAIR frequency guide")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Explain FAIR frequency indicators" }));
    expect(screen.getByText("FAIR frequency guide")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close FAIR guide" }));
    expect(screen.queryByText("FAIR frequency guide")).not.toBeInTheDocument();

    await screen.findByText("Threat event frequency");
    expect(screen.getByText("1.234")).toBeInTheDocument();
    expect(screen.getByText("12.34%")).toBeInTheDocument();
    expect(onPredict).toHaveBeenCalledWith(
      expect.objectContaining({
        primary_loss_mean: 0,
        secondary_loss_mean: 0,
        iterations: 10000,
        control_context: expect.objectContaining({
          prevent: expect.objectContaining({ patch_maturity: 2 }),
        }),
      })
    );
  });

  it("renders frequency prediction errors", async () => {
    const onPredict = vi.fn().mockRejectedValue(new Error("Prediction failed"));

    render(
      <FairFrequencyPanel
        title="Asset FAIR"
        description="Frequency description"
        scopeLabel="asset"
        onPredict={onPredict}
      />
    );

    await screen.findByText("Prediction failed");
  });

  it("renders scope loss success, input-driven payload changes, and guide behavior", async () => {
    const onPredict = vi.fn().mockResolvedValue(prediction);
    const user = userEvent.setup();

    render(
      <FairScopeLossPanel
        title="Service FAIR"
        description="Loss description"
        onPredict={onPredict}
      />
    );

    await user.click(screen.getByRole("button", { name: "Explain FAIR loss exposure" }));
    expect(screen.getByText("FAIR scope guide")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close FAIR guide" }));

    await screen.findByText("Expected annual loss");
    expect(screen.getByText("$140,000")).toBeInTheDocument();

    const [primarySlider] = screen.getAllByRole("slider");
    fireEvent.change(primarySlider, { target: { value: "200000" } });

    await waitFor(() =>
      expect(onPredict).toHaveBeenCalledWith(
        expect.objectContaining({ primary_loss_mean: 200000 })
      )
    );
  });

  it("renders scope loss prediction errors", async () => {
    const onPredict = vi.fn().mockRejectedValue(new Error("Loss failed"));

    render(
      <FairScopeLossPanel
        title="Service FAIR"
        description="Loss description"
        onPredict={onPredict}
      />
    );

    await screen.findByText("Loss failed");
  });
});
