import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingSpinnerState } from "../../../components/shared/LoadingSpinnerState";

describe("LoadingSpinnerState", () => {
  it("renders the default and custom loading messages", () => {
    const { rerender } = render(<LoadingSpinnerState />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();

    rerender(<LoadingSpinnerState message="Loading assets" />);

    expect(screen.getByText("Loading assets")).toBeInTheDocument();
  });
});
