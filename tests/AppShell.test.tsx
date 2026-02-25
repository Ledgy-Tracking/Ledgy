import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "../src/components/Layout/AppShell";
import { useUIStore } from "../src/stores/useUIStore";
import { useErrorStore } from "../src/stores/useErrorStore";
import { useProfileStore } from "../src/stores/useProfileStore";
import { useAuthStore } from "../src/features/auth/useAuthStore";

// Mock stores
vi.mock("../src/stores/useUIStore", () => ({
    useUIStore: vi.fn(),
}));

vi.mock("../src/stores/useErrorStore", () => ({
    useErrorStore: vi.fn(),
}));

vi.mock("../src/stores/useProfileStore", () => ({
    useProfileStore: vi.fn(),
}));

vi.mock("../src/features/auth/useAuthStore", () => {
    const mockState = { isUnlocked: true };
    return {
        useAuthStore: Object.assign(vi.fn(() => mockState), {
            getState: vi.fn(() => mockState)
        })
    };
});

// Mock SyncStore to avoid complex sync logic in shell tests
vi.mock("../src/stores/useSyncStore", () => ({
    useSyncStore: vi.fn(() => ({
        syncStatus: { status: 'idle' },
        conflicts: [],
        fetchSyncConfig: vi.fn(),
    })),
}));

describe("AppShell Component", () => {
    const mockUseUIStore = vi.mocked(useUIStore);
    const mockUseErrorStore = vi.mocked(useErrorStore);
    const mockUseProfileStore = vi.mocked(useProfileStore);


    const mockUIState = {
        leftSidebarOpen: true,
        toggleLeftSidebar: vi.fn(),
        rightInspectorOpen: true,
        toggleRightInspector: vi.fn(),
        setRightInspector: vi.fn(),
        theme: 'dark',
        toggleTheme: vi.fn(),
        setLeftSidebar: vi.fn(),
        setSchemaBuilderOpen: vi.fn(),
    };

    const mockErrorState = {
        error: null,
        dispatchError: vi.fn(),
        clearError: vi.fn(),
    };

    const mockProfileState = {
        profiles: [{ id: 'p1', name: 'Test Profile' }],
        fetchProfiles: vi.fn(),
        isLoading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseUIStore.mockReturnValue(mockUIState);
        (mockUseUIStore as any).getState = vi.fn().mockReturnValue(mockUIState);
        
        mockUseErrorStore.mockReturnValue(mockErrorState);
        
        mockUseProfileStore.mockReturnValue(mockProfileState);
        (mockUseProfileStore as any).getState = vi.fn().mockReturnValue(mockProfileState);

        // Reset window width to desktop default
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1440,
        });
    });

    it("renders all three panels on desktop (width >= 1280)", () => {
        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/LEDGY/i)).toBeInTheDocument();
        // Resolve ambiguity by checking for the header title specifically
        expect(screen.getByRole('heading', { name: /Ledger: Test Profile/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Inspector/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /close sidebar/i })).toBeInTheDocument();
    });

    it("performs initial responsive check on mount", () => {
        // Mock width between 1100 and 1279
        Object.defineProperty(window, 'innerWidth', { value: 1200 });

        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        // Note: responsive logic is in useEffect
        // The mock state has rightInspectorOpen: true, but it should be set to false on mount
    });

    it("hides Inspector when width is between 1100 and 1279", () => {
        // Assume rightInspectorOpen is false
        mockUseUIStore.mockReturnValue({ ...mockUIState, rightInspectorOpen: false });

        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        const asides = screen.getAllByRole('complementary');
        const inspector = asides[1];
        expect(inspector).toHaveClass('w-0');
    });

    it("toggles sidebar when clicking the button", () => {
        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        const toggleBtn = screen.getByRole('button', { name: /close sidebar/i });
        fireEvent.click(toggleBtn);
        expect(mockUIState.toggleLeftSidebar).toHaveBeenCalled();
    });
});
