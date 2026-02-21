import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { useAuthStore, useIsRegistered } from "../src/features/auth/useAuthStore";

// Mock the page components to avoid testing their implementation details here
vi.mock("../src/features/auth/SetupPage", () => ({
    SetupPage: () => <div data-testid="setup-page">Setup Page</div>,
}));
vi.mock("../src/features/auth/UnlockPage", () => ({
    UnlockPage: () => <div data-testid="unlock-page">Unlock Page</div>,
}));
vi.mock("../src/features/dashboard/Dashboard", () => ({
    Dashboard: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

// Mock useAuthStore and useIsRegistered
vi.mock("../src/features/auth/useAuthStore", () => ({
    useAuthStore: vi.fn(),
    useIsRegistered: vi.fn(),
}));

describe("App Routing Integration", () => {
    const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
    const mockUseIsRegistered = useIsRegistered as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupAuthState = (
        totpSecret: string | null,
        encryptedTotpSecret: string | null,
        isUnlocked: boolean
    ) => {
        mockUseAuthStore.mockImplementation((selector: any) => {
            const state = {
                totpSecret,
                encryptedTotpSecret,
                isUnlocked,
            };
            return selector ? selector(state) : state;
        });

        // Mock useIsRegistered to return true if either secret is present
        mockUseIsRegistered.mockReturnValue(!!(totpSecret || encryptedTotpSecret));
    };

    describe("Unregistered User (No Secret)", () => {
        beforeEach(() => {
            setupAuthState(null, null, false);
        });

        it("redirects to /setup when accessing root /", () => {
            render(
                <MemoryRouter initialEntries={["/"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("setup-page")).toBeInTheDocument();
        });

        it("renders /setup correctly", () => {
            render(
                <MemoryRouter initialEntries={["/setup"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("setup-page")).toBeInTheDocument();
        });

        it("redirects to /setup when accessing /unlock", () => {
            render(
                <MemoryRouter initialEntries={["/unlock"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("setup-page")).toBeInTheDocument();
        });
    });

    describe("Registered User, Locked (Secret Exists, Not Unlocked)", () => {
        beforeEach(() => {
            setupAuthState("some-secret", null, false); // Simulate registered but locked
        });

        it("redirects to /unlock when accessing root /", () => {
            render(
                <MemoryRouter initialEntries={["/"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("unlock-page")).toBeInTheDocument();
        });

        it("redirects to /unlock when accessing /setup", () => {
            render(
                <MemoryRouter initialEntries={["/setup"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("unlock-page")).toBeInTheDocument();
        });

        it("renders /unlock correctly", () => {
            render(
                <MemoryRouter initialEntries={["/unlock"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("unlock-page")).toBeInTheDocument();
        });
    });

    describe("Registered User, Unlocked (Secret Exists, Unlocked)", () => {
        beforeEach(() => {
            setupAuthState("some-secret", null, true); // Simulate registered and unlocked
        });

        it("renders Dashboard when accessing root /", () => {
            render(
                <MemoryRouter initialEntries={["/"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
        });

        it("redirects to /profiles when accessing /setup", () => {
            render(
                <MemoryRouter initialEntries={["/setup"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.queryByTestId("setup-page")).not.toBeInTheDocument();
            expect(screen.getByText(/Profile Selector Placeholder/i)).toBeInTheDocument();
        });

        it("redirects to /profiles when accessing /unlock", () => {
            render(
                <MemoryRouter initialEntries={["/unlock"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.queryByTestId("unlock-page")).not.toBeInTheDocument();
            expect(screen.getByText(/Profile Selector Placeholder/i)).toBeInTheDocument();
        });
    });
});
