import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Header } from "../../../components/layout/Header";

describe("Header", () => {
  it("renders the brand and shutdown action", async () => {
    const onShutdown = vi.fn();

    render(
      <Header
        page="findings"
        onNavigate={vi.fn()}
        onShutdown={onShutdown}
      />
    );

    expect(screen.getByAltText("Brinqa")).toBeInTheDocument();
    expect(screen.getByText("Cyber Risk Quantification")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Exit" }));
    expect(onShutdown).toHaveBeenCalled();
  });

  it("disables shutdown while exit is pending", async () => {
    const onShutdown = vi.fn();

    render(
      <Header
        page="findings"
        onNavigate={vi.fn()}
        onShutdown={onShutdown}
        shutdownPending
      />
    );

    expect(screen.getByRole("button", { name: "Exiting..." })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Exiting..." }));
    expect(onShutdown).not.toHaveBeenCalled();
  });
});
