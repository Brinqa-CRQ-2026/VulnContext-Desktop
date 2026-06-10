import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { EntityHero } from "../../../components/topology/shared/EntityHero";

describe("EntityHero", () => {
  it("renders identity, breadcrumbs, optional context, metadata, tags, actions, and back", async () => {
    const onBack = vi.fn();
    const onCrumb = vi.fn();
    const user = userEvent.setup();

    render(
      <EntityHero
        breadcrumbs={[{ label: "Business Units", onClick: onCrumb }, { label: "App" }]}
        title="Identity Verify"
        label="Application"
        context="Digital Storefront"
        metadata={<span>Owner: Security</span>}
        secondaryContext={<span>Production</span>}
        description="Handles verification."
        tags={<span>Active</span>}
        actions={<button>Export</button>}
        backLabel="Back to service"
        onBack={onBack}
      />
    );

    expect(screen.getByRole("heading", { name: "Identity Verify" })).toBeInTheDocument();
    expect(screen.getByText("Handles verification.")).toBeInTheDocument();
    expect(screen.getByText("Owner: Security")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Business Units" }));
    await user.click(screen.getByRole("button", { name: /Back to service/i }));

    expect(onCrumb).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("uses fallback descriptions and can hide the badge and back button", () => {
    render(
      <EntityHero
        breadcrumbs={[{ label: "Business Units" }]}
        title="Identity Verify"
        label="Application"
        description=" "
        fallbackDescription="No description yet."
        showBackButton={false}
        showIdentityBadge={false}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("No description yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back/i })).not.toBeInTheDocument();
    expect(screen.queryByText("IV")).not.toBeInTheDocument();
  });
});
