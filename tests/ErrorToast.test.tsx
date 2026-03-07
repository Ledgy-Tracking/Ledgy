import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import '@testing-library/jest-dom';
import { ErrorToast } from "../src/components/ErrorToast";
import { useErrorStore } from "../src/stores/useErrorStore";

vi.mock("../src/stores/useErrorStore", () => ({
    useErrorStore: vi.fn(),
}));

describe("ErrorToast Component", () => {
    const mockUseErrorStore = vi.mocked(useErrorStore);
    const mockClearError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    it("renders nothing when there is no error", () => {
        mockUseErrorStore.mockReturnValue({
            error: null,
            clearError: mockClearError,
        });

        const { container } = render(<ErrorToast />);
        expect(container.firstChild).toBeNull();
    });

    it("renders error message when error exists", () => {
        const mockError = {
            message: "Test error message",
            type: "error" as const,
            timestamp: 123456789,
        };
        mockUseErrorStore.mockReturnValue({
            error: mockError,
            clearError: mockClearError,
        });

        render(<ErrorToast />);
        expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("applies correct styles for 'error' type", () => {
        const mockError = {
            message: "Error message",
            type: "error" as const,
            timestamp: 123456789,
        };
        mockUseErrorStore.mockReturnValue({
            error: mockError,
            clearError: mockClearError,
        });

        render(<ErrorToast />);
        const toastContainer = screen.getByText("Error message").parentElement;
        expect(toastContainer).toHaveClass("bg-red-950/90");
        expect(toastContainer).toHaveClass("border-red-500");
    });

    it("applies correct styles for 'warning' type", () => {
        const mockError = {
            message: "Warning message",
            type: "warning" as const,
            timestamp: 123456789,
        };
        mockUseErrorStore.mockReturnValue({
            error: mockError,
            clearError: mockClearError,
        });

        render(<ErrorToast />);
        const toastContainer = screen.getByText("Warning message").parentElement;
        expect(toastContainer).toHaveClass("bg-amber-900/90");
        expect(toastContainer).toHaveClass("border-amber-500");
    });

    it("applies correct styles for 'info' type", () => {
        const mockError = {
            message: "Info message",
            type: "info" as const,
            timestamp: 123456789,
        };
        mockUseErrorStore.mockReturnValue({
            error: mockError,
            clearError: mockClearError,
        });

        render(<ErrorToast />);
        const toastContainer = screen.getByText("Info message").parentElement;
        expect(toastContainer).toHaveClass("bg-blue-900/90");
        expect(toastContainer).toHaveClass("border-blue-500");
    });

    it("closes when close button is clicked", () => {
        const mockError = {
            message: "Test error",
            type: "error" as const,
            timestamp: 123456789,
        };
        mockUseErrorStore.mockReturnValue({
            error: mockError,
            clearError: mockClearError,
        });

        render(<ErrorToast />);
        const closeButton = screen.getByLabelText("Close");
        fireEvent.click(closeButton);

        // After click, it should be in transition to hide (isVisible false)
        // Then after 300ms it calls clearError
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(mockClearError).toHaveBeenCalledWith(123456789);
    });

    it("auto-closes after 5 seconds", () => {
        const mockError = {
            message: "Auto-close error",
            type: "error" as const,
            timestamp: 123456789,
        };
        mockUseErrorStore.mockReturnValue({
            error: mockError,
            clearError: mockClearError,
        });

        render(<ErrorToast />);

        // Advance 5 seconds for visibility timer
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        // Advance 300ms for animation/clearError timer
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(mockClearError).toHaveBeenCalledWith(123456789);
    });
});
