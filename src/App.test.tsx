import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import App from "./App";
import { useAuthStore } from "./features/auth/useAuthStore";
import { MemoryRouter } from "react-router-dom";

vi.mock("./features/auth/useAuthStore", () => ({
    useAuthStore: vi.fn(),
}));

test("renders main app without crashing", () => {
    (useAuthStore as any).mockImplementation((selector: any) => {
        const state = {
            totpSecret: null,
            isUnlocked: false,
        };
        return selector ? selector(state) : state;
    });

    render(
        <MemoryRouter initialEntries={["/"]}>
            <App />
        </MemoryRouter>
    );

    // Since isRegistered defaults to false, it should show SetupPage
    const heading = screen.getByText(/Secure Your Ledgy/i);
    expect(heading).toBeInTheDocument();
});
