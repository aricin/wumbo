import { render, screen } from "@testing-library/react";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Sign in</Button>);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
