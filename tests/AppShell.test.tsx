import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "../src/components/Layout/AppShell";
import { useUIStore } from "../src/stores/useUIStore";
import { useErrorStore } from "../src/stores/useErrorStore";
import { useProfileStore } from "../src/stores/useProfileStore";

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

        expect(screen.getByText(/Ledgy/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Profile/i)).toBeInTheDocument();
        expect(screen.getByText(/Entry Details/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /open sidebar|close sidebar/i })).toBeInTheDocument();
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

        expect(mockUIState.setRightInspector).toHaveBeenCalledWith(false);
    });

    it("dispatches warning and collapses sidebar on mount if width < 1100", () => {
        // Mock width < 900
        Object.defineProperty(window, 'innerWidth', { value: 850 });

        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        expect(mockErrorState.dispatchError).toHaveBeenCalledWith(
            expect.stringContaining("Mobile and Tablet layouts are not supported"),
            "warning"
        );
        expect(mockUIState.setLeftSidebar).toHaveBeenCalledWith(false);
    });

    it("shows mobile warning banner when width < 900", () => {
        // Change window width
        Object.defineProperty(window, 'innerWidth', { value: 800 });

        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Mobile and Tablet layouts are not supported/i)).toBeInTheDocument();
    });


    it("hides Inspector when width is between 1100 and 1279", () => {
        // Assume resize has happened and rightInspectorOpen is false
        mockUseUIStore.mockReturnValue({ ...mockUIState, rightInspectorOpen: false });

        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        const asides = screen.getAllByRole('complementary');
        // We need to be careful with getAllByRole as the mobile banner might not be there
        // The desktop layout has 2 asides (left sidebar, right inspector)
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

    it("auto-collapses panels on window resize", () => {
        vi.useFakeTimers();
        render(
            <MemoryRouter initialEntries={['/app/p1']}>
                 <Routes>
                    <Route path="/app/:profileId" element={<AppShell />} />
                </Routes>
            </MemoryRouter>
        );

        // Resize to 1200 (hide inspector)
        Object.defineProperty(window, 'innerWidth', { value: 1200 });
        window.dispatchEvent(new Event('resize'));

        act(() => {
            vi.advanceTimersByTime(110);
        });
        expect(mockUIState.setRightInspector).toHaveBeenCalledWith(false);

        // Resize to 800 (hide sidebar too)
        Object.defineProperty(window, 'innerWidth', { value: 800 });
        window.dispatchEvent(new Event('resize'));

        act(() => {
            vi.advanceTimersByTime(110);
        });
        expect(mockUIState.setLeftSidebar).toHaveBeenCalledWith(false);

        vi.useRealTimers();
    });
});
