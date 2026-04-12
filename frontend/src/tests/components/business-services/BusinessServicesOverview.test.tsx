import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServicesOverview } from "../../../components/business-services/BusinessServicesOverview";

describe("BusinessServicesOverview", () => {
  it("renders summary totals from the mocked dataset", () => {
    render(<BusinessServicesOverview onOpenCompanyBusinessUnit={vi.fn()} />);

    expect(readSummaryValue("Total companies")).toBe("2");
    expect(readSummaryValue("Affected assets")).toBe("759");
    expect(readSummaryValue("Open findings")).toBe("15,305");
  });

  it("renders one square card per company", () => {
    render(<BusinessServicesOverview onOpenCompanyBusinessUnit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Virtuon/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cyberdyne Systems/i })
    ).toBeInTheDocument();
  });

  it("opens the company detail route from a company card", () => {
    const onOpenCompanyBusinessUnit = vi.fn();
    render(
      <BusinessServicesOverview onOpenCompanyBusinessUnit={onOpenCompanyBusinessUnit} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Virtuon/i }));

    expect(onOpenCompanyBusinessUnit).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "virtuon" })
    );
  });
});

function readSummaryValue(label: string) {
  const title = screen.getAllByText(label)[0];
  const card = title.closest(".rounded-xl");

  if (!card) {
    throw new Error(`Unable to find summary card for ${label}`);
  }

  const values = within(card).getAllByText(/\d[\d,]*/);
  return values[0]?.textContent ?? "";
}
