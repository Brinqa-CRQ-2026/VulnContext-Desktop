import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import {
  ApplicationEntityCard,
  BaseEntityCard,
  BusinessServiceEntityCard,
} from "../../../components/topology/shared/EntityCard";
import { InitialsBadge } from "../../../components/topology/shared/TopologyBadges";
import {
  buildBusinessService,
} from "../../fixtures/topology/topology";

describe("EntityCard", () => {
  it("renders a base entity card and calls the open handler", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    render(
      <BaseEntityCard
        ariaLabel="Open item"
        onClick={onOpen}
        leading={<InitialsBadge value="Digital Storefront" />}
        badge={<span>High</span>}
        entityType="Service"
        title="Digital Storefront"
        identifier="digital-storefront"
        description="Customer-facing service"
        footer={<span>Footer</span>}
        chart={<span>Chart</span>}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open item" }));

    expect(onOpen).toHaveBeenCalledOnce();
    expect(screen.getByText("Customer-facing service")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByText("Chart")).toBeInTheDocument();
  });

  it("renders domain wrappers with metrics, fallback risk text, and risk-colored badges", () => {
    const { rerender } = render(
      <BusinessServiceEntityCard
        businessService={buildBusinessService({ risk_band: null, risk_score: null })}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("No risk data")).toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();

    rerender(
      <BusinessServiceEntityCard
        businessService={buildBusinessService({ risk_band: "Critical", risk_score: 9.4 })}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("Critical 9.4")).toHaveClass("bg-rose-100", "text-rose-700");

    rerender(
      <ApplicationEntityCard
        application={{
          application: "Identity Verify",
          slug: "identity-verify",
          description: " ",
          metrics: {
            total_business_services: 0,
            total_applications: 0,
            total_assets: 2,
            total_findings: 9,
          },
        }}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Open Identity Verify" })).toBeInTheDocument();
    expect(screen.queryByText("Customer-facing service")).not.toBeInTheDocument();
  });
});
