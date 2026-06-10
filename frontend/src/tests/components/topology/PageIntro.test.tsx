import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { PageIntro } from "../../../components/topology/shared/PageIntro";

describe("PageIntro", () => {
  it("renders optional description and actions", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <PageIntro
        title="Company"
        description="Topology overview"
        actions={<button onClick={onClick}>Refresh</button>}
      />
    );

    expect(screen.getByRole("heading", { name: "Company" })).toBeInTheDocument();
    expect(screen.getByText("Topology overview")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("omits optional description when none is provided", () => {
    render(<PageIntro title="Sources" />);

    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.queryByText("Topology overview")).not.toBeInTheDocument();
  });
});
