import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders main app without crashing", () => {
    render(<App />);
    const heading = screen.getByRole("heading", { name: /Welcome to Tauri \+ React/i });
    expect(heading).toBeInTheDocument();
});
