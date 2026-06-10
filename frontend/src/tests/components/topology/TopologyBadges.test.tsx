import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  InitialsBadge,
  RiskBadge,
  StatusBadge,
} from "../../../components/topology/shared/TopologyBadges";

describe("TopologyBadges", () => {
  it("renders initials from empty, single-word, and multi-word labels", () => {
    const { rerender } = render(<InitialsBadge value="Digital Storefront" />);
    expect(screen.getByText("DS")).toBeInTheDocument();

    rerender(<InitialsBadge value="server" />);
    expect(screen.getByText("SE")).toBeInTheDocument();

    rerender(<InitialsBadge value="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("hides missing risk badges and renders configured suffixes", () => {
    const { container, rerender } = render(<RiskBadge band={null} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<RiskBadge band="High" suffix="Priority" />);
    expect(screen.getByText("High Priority")).toBeInTheDocument();
  });

  it("renders status badge content for known and unknown tones", () => {
    const { rerender } = render(<StatusBadge tone="active">Active</StatusBadge>);
    expect(screen.getByText("Active")).toBeInTheDocument();

    rerender(<StatusBadge tone="custom">Custom</StatusBadge>);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
