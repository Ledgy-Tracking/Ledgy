import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { useAuthStore, useIsRegistered } from "../src/features/auth/useAuthStore";
import { useErrorStore } from "../src/stores/useErrorStore";

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
vi.mock("../src/features/projects/ProjectDashboard", () => ({
    ProjectDashboard: () => <div data-testid="project-dashboard">Project Dashboard</div>,
}));
vi.mock("../src/features/profiles/ProfileSelector", () => ({
    ProfileSelector: () => <div data-testid="profile-selector">Profile Selector Placeholder</div>,
}));

// Mock useProfileStore to avoid real DB calls and auth checks in routing tests
vi.mock("../src/stores/useProfileStore", () => {
    const mockState = {
        profiles: [{ id: 'test-profile', name: 'Test Profile' }],
        fetchProfiles: vi.fn().mockResolvedValue(undefined),
        isLoading: false,
    };
    return {
        useProfileStore: Object.assign(vi.fn((selector?: any) => {
            return selector ? selector(mockState) : mockState;
        }), {
            getState: vi.fn(() => mockState)
        })
    };
});

// Create a state object that we can update
const authState = {
    totpSecret: null as string | null,
    encryptedTotpSecret: null as string | null,
    isUnlocked: false,
};

// Mock useAuthStore and useIsRegistered
vi.mock("../src/features/auth/useAuthStore", () => {
    return {
        useAuthStore: Object.assign(vi.fn((selector?: any) => {
            return selector ? selector(authState) : authState;
        }), {
            getState: vi.fn(() => authState)
        }),
        useIsRegistered: vi.fn(() => !!(authState.totpSecret || authState.encryptedTotpSecret)),
    };
});

// Mock useUIStore to avoid hydration/persistence issues in tests
vi.mock("../src/stores/useUIStore", () => {
    const mockState = {
        leftSidebarOpen: true,
        rightInspectorOpen: true,
        theme: 'dark',
        toggleLeftSidebar: vi.fn(),
        toggleRightInspector: vi.fn(),
        toggleTheme: vi.fn(),
        setRightInspector: vi.fn(),
        setLeftSidebar: vi.fn(),
    };
    return {
        useUIStore: Object.assign(vi.fn((selector?: any) => {
            return selector ? selector(mockState) : mockState;
        }), {
            getState: vi.fn(() => mockState)
        })
    };
});

describe("App Routing Integration", () => {
    const mockUseIsRegistered = useIsRegistered as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        authState.totpSecret = null;
        authState.encryptedTotpSecret = null;
        authState.isUnlocked = false;
    });

    const setupAuthState = (
        totpSecret: string | null,
        encryptedTotpSecret: string | null,
        isUnlocked: boolean
    ) => {
        authState.totpSecret = totpSecret;
        authState.encryptedTotpSecret = encryptedTotpSecret;
        authState.isUnlocked = isUnlocked;
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
    });

    describe("Registered User, Locked (Secret Exists, Not Unlocked)", () => {
        beforeEach(() => {
            setupAuthState("some-secret", null, false);
        });

        it("redirects to /unlock when accessing root /", () => {
            render(
                <MemoryRouter initialEntries={["/"]}>
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
            setupAuthState("some-secret", null, true);
        });

        it("redirects to /profiles when accessing root /", () => {
            render(
                <MemoryRouter initialEntries={["/"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByText(/Profile Selector Placeholder/i)).toBeInTheDocument();
        });

        it("renders Profile Selector when accessing /profiles", () => {
            render(
                <MemoryRouter initialEntries={["/profiles"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByText(/Profile Selector Placeholder/i)).toBeInTheDocument();
        });

        it("renders AppShell and Dashboard when accessing /app/:id/project/:pid", () => {
            render(
                <MemoryRouter initialEntries={["/app/test-profile/project/test-project"]}>
                    <App />
                </MemoryRouter>
            );
            // Check for AppShell elements (like sidebar title) and Dashboard content
            expect(screen.getByText(/LEDGY/i)).toBeInTheDocument();
            expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
        });

        it("renders Settings placeholder when accessing /app/:id/settings", () => {
            render(
                <MemoryRouter initialEntries={["/app/test-profile/settings"]}>
                    <App />
                </MemoryRouter>
            );
            expect(screen.getByText(/Settings Placeholder/i)).toBeInTheDocument();
        });
    });

    describe("Global Components", () => {
        beforeEach(() => {
            setupAuthState(null, null, false);
            useErrorStore.getState().clearError();
        });

        it("renders ErrorToast when an error is dispatched", () => {
            render(
                <MemoryRouter initialEntries={["/"]}>
                    <App />
                </MemoryRouter>
            );

            act(() => {
                useErrorStore.getState().dispatchError("Global test error");
            });

            expect(screen.getByText("Global test error")).toBeInTheDocument();
        });
    });
});
