import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import {
  formatSlugLabel,
  TopologyBreadcrumbs,
} from "../../../components/topology/TopologyChrome";

describe("TopologyChrome", () => {
  it("renders breadcrumb buttons only for clickable non-current entries", async () => {
    const onBusinessUnits = vi.fn();
    const user = userEvent.setup();

    render(
      <TopologyBreadcrumbs
        items={[
          { label: "Business Units", onClick: onBusinessUnits },
          { label: "Online Store" },
          { label: "Digital Storefront" },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Business Units" }));

    expect(onBusinessUnits).toHaveBeenCalledOnce();
    expect(screen.getByText("Online Store")).toBeInTheDocument();
    expect(screen.getByText("Digital Storefront")).toBeInTheDocument();
  });

  it("formats slug labels with fallbacks", () => {
    expect(formatSlugLabel(null, "Business Unit")).toBe("Business Unit");
    expect(formatSlugLabel("digital-storefront", "Business Service")).toBe(
      "Digital Storefront"
    );
    expect(formatSlugLabel("identity--verify", "Application")).toBe("Identity Verify");
  });
});
