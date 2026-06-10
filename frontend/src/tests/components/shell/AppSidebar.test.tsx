import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppSidebar } from "../../../pages/shell/AppSidebar";

describe("AppSidebar", () => {
  it("renders navigation items, active state, and route callbacks", async () => {
    const onNavigate = vi.fn();

    render(<AppSidebar page="business-services" onNavigate={onNavigate} />);

    expect(screen.getByRole("button", { name: /Companies/i })).toHaveClass("bg-black");
    expect(screen.getByRole("button", { name: /Findings/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Security Score/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sources/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Security Score/i }));
    expect(onNavigate).toHaveBeenCalledWith("controls");
  });
});
