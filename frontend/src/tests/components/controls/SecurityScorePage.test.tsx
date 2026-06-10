import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SecurityScorePage } from "../../../components/controls/SecurityScorePage";
import {
  getCurrentControlAssessment,
  saveCurrentControlAssessment,
} from "../../../api/controls";
import { SECURITY_SCORE_STORAGE_KEY } from "../../../lib/securityScore";

vi.mock("../../../api/controls", () => ({
  getCurrentControlAssessment: vi.fn(),
  saveCurrentControlAssessment: vi.fn(),
}));

const mockedGetCurrentControlAssessment = vi.mocked(getCurrentControlAssessment);
const mockedSaveCurrentControlAssessment = vi.mocked(saveCurrentControlAssessment);

const loadedAnswers = {
  prevent: {
    patch_maturity: 1,
    mfa_maturity: 2,
    segmentation_maturity: 3,
    hardening_maturity: 4,
  },
  detect: {
    logging_maturity: 3,
    siem_maturity: 4,
    speed_maturity: 2,
  },
  respond: {
    plan_maturity: 2,
    speed_maturity: 3,
    automation_maturity: 1,
  },
  contain: {
    edr_maturity: 4,
    privilege_maturity: 3,
    data_maturity: 5,
  },
};

describe("SecurityScorePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedGetCurrentControlAssessment.mockReset();
    mockedSaveCurrentControlAssessment.mockReset();
    mockedSaveCurrentControlAssessment.mockResolvedValue({
      id: "assessment-1",
      answers: loadedAnswers,
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("loads a saved assessment, writes local context, and renders sync status", async () => {
    mockedGetCurrentControlAssessment.mockResolvedValue({
      id: "assessment-1",
      answers: loadedAnswers,
    });

    render(<SecurityScorePage />);

    expect(screen.getByText("Loading saved assessment...")).toBeInTheDocument();
    await screen.findByText("Saved to Supabase.");

    expect(JSON.parse(window.localStorage.getItem(SECURITY_SCORE_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({ prevent_patch_maturity: 1, contain_data_maturity: 5 })
    );
  });

  it("shows load and save failures without losing the page", async () => {
    mockedGetCurrentControlAssessment.mockRejectedValue(new Error("Load failed"));

    const { unmount } = render(<SecurityScorePage />);

    await screen.findByText("Load failed");
    expect(screen.getByText("FAIR-Aligned Security Score")).toBeInTheDocument();

    unmount();
    mockedGetCurrentControlAssessment.mockResolvedValue({ id: null, answers: loadedAnswers });
    mockedSaveCurrentControlAssessment.mockRejectedValue(new Error("Save failed"));
    render(<SecurityScorePage />);

    await userEvent.click((await screen.findAllByRole("button", { name: "None" }))[0]);
    await screen.findByText("Save failed");
  });

  it("auto-saves answer changes and supports manual save and reset", async () => {
    mockedGetCurrentControlAssessment.mockResolvedValue({
      id: "assessment-1",
      answers: loadedAnswers,
    });

    render(<SecurityScorePage />);

    await screen.findByText("Saved to Supabase.");
    await userEvent.click(screen.getAllByRole("button", { name: "None" })[0]);
    await waitFor(() =>
      expect(mockedSaveCurrentControlAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          prevent: expect.objectContaining({ mfa_maturity: 0 }),
        })
      )
    );

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    expect(mockedSaveCurrentControlAssessment).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole("button", { name: "Reset security score" }));
    expect(mockedSaveCurrentControlAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        prevent: expect.objectContaining({ patch_maturity: 4 }),
      })
    );
  });

  it("copies the context payload and tolerates clipboard failures", async () => {
    mockedGetCurrentControlAssessment.mockResolvedValue({
      id: "assessment-1",
      answers: loadedAnswers,
    });

    render(<SecurityScorePage />);
    await screen.findByText("Saved to Supabase.");

    await userEvent.click(screen.getByRole("button", { name: "Copy context payload" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"prevent"')
    );

    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("copy denied"));
    await userEvent.click(screen.getByRole("button", { name: "Copy context payload" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
  });
});
