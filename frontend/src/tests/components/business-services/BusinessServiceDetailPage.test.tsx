import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServiceDetailPage } from "../../../components/business-services/BusinessServiceDetailPage";
import { getCompanyBusinessUnitBySlug } from "../../../mocks/businessServices";

describe("BusinessServiceDetailPage", () => {
  it("renders a card for each business service in the selected company view", () => {
    render(
      <BusinessServiceDetailPage
        service={getCompanyBusinessUnitBySlug("virtuon")}
        onBack={vi.fn()}
      />
    );

    const digitalMediaCard = screen.getByText("Digital Media").closest("article");
    const digitalStorefrontCard = screen.getByText("Digital Storefront").closest("article");
    const shippingCard = screen.getByText("Shipping and Tracking").closest("article");

    expect(digitalMediaCard).toBeInTheDocument();
    expect(digitalStorefrontCard).toBeInTheDocument();
    expect(shippingCard).toBeInTheDocument();

    expect(within(digitalMediaCard as HTMLElement).getByText("Online Store")).toBeInTheDocument();
    expect(within(digitalMediaCard as HTMLElement).getByText("248")).toBeInTheDocument();
    expect(within(digitalMediaCard as HTMLElement).getByText("5,310")).toBeInTheDocument();
  });

  it("renders an empty-state card when the company view is missing", () => {
    render(<BusinessServiceDetailPage service={null} onBack={vi.fn()} />);

    expect(screen.getByText("Company view not found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to Business Services Overview" })
    ).toBeInTheDocument();
  });
});
