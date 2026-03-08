import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileCreationForm } from './ProfileCreationForm';
import { useProfileStore } from '../../stores/useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { BrowserRouter } from 'react-router-dom';

// Mock the stores
vi.mock('../../stores/useProfileStore');
vi.mock('../../stores/useErrorStore');

const mockCreateProfile = vi.fn();
const mockSetActiveProfile = vi.fn();
const mockDispatchError = vi.fn();
const mockNavigate = vi.fn();

// Mock react-router useNavigate
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('ProfileCreationForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup store mocks
        (useProfileStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            createProfile: mockCreateProfile,
            setActiveProfile: mockSetActiveProfile,
            profiles: [],
        });

        (useErrorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            dispatchError: mockDispatchError,
        });
    });

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders the form elements correctly', () => {
        renderWithRouter(<ProfileCreationForm />);

        expect(screen.getByLabelText(/Profile Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Theme Color/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Avatar Initials/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Profile/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Profile/i })).toBeDisabled(); // Disabled initially
    });

    it('enables submit button when valid name is entered', async () => {
        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

        const submitButton = screen.getByRole('button', { name: /Create Profile/i });
        await waitFor(() => {
            expect(submitButton).not.toBeDisabled();
        });
    });

    it('disables submit button and shows error when name is too long', async () => {
        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        const nameButton = screen.getByRole('button', { name: /Create Profile/i });

        // 51 characters
        fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });

        await waitFor(() => {
            expect(nameButton).toBeDisabled();
            expect(screen.getByText(/Name cannot exceed 50 characters/i)).toBeInTheDocument();
        });
    });

    it('disables submit button and shows error when name has invalid format', async () => {
        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        const nameButton = screen.getByRole('button', { name: /Create Profile/i });

        // Invalid characters: @, !
        fireEvent.change(nameInput, { target: { value: 'Invalid@Name!' } });

        await waitFor(() => {
            expect(nameButton).toBeDisabled();
            expect(screen.getByText(/Only letters, numbers, spaces, hyphens, and underscores allowed/i)).toBeInTheDocument();
        });
    });

    it('calls createProfile and navigation on successful submission', async () => {
        mockCreateProfile.mockResolvedValue('new-profile-123');

        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        fireEvent.change(nameInput, { target: { value: 'Test Profile' } });

        const colorPicker = screen.getByLabelText(/Select color blue/i);
        fireEvent.click(colorPicker);

        const sumbitButton = screen.getByRole('button', { name: /Create Profile/i });
        fireEvent.click(sumbitButton);

        await waitFor(() => {
            // Check form args: (name, desc, color, avatarInitials)
            expect(mockCreateProfile).toHaveBeenCalledWith('Test Profile', undefined, 'bg-blue-500', 'TP');
            expect(mockSetActiveProfile).toHaveBeenCalledWith('new-profile-123');
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('handles custom avatar initials', async () => {
        mockCreateProfile.mockResolvedValue('new-profile-123');

        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        fireEvent.change(nameInput, { target: { value: 'Long Test Name' } });

        const avatarInput = screen.getByLabelText(/Avatar Initials/i);
        fireEvent.change(avatarInput, { target: { value: 'XY' } });

        const sumbitButton = screen.getByRole('button', { name: /Create Profile/i });
        fireEvent.click(sumbitButton);

        await waitFor(() => {
            // Initials should be XY instead of LN
            expect(mockCreateProfile).toHaveBeenCalledWith('Long Test Name', undefined, 'bg-emerald-500', 'XY');
        });
    });

    it('dispatches error when creation fails', async () => {
        // Setup mock to fail
        mockCreateProfile.mockRejectedValue(new Error('Database error'));

        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        fireEvent.change(nameInput, { target: { value: 'Failed Profile' } });

        const sumbitButton = screen.getByRole('button', { name: /Create Profile/i });
        fireEvent.click(sumbitButton);

        await waitFor(() => {
            expect(mockDispatchError).toHaveBeenCalledWith('Database error', 'error');
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    it('validates against duplicate names across existing profiles', async () => {
        // Mock existing profiles
        (useProfileStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            createProfile: mockCreateProfile,
            profiles: [
                { id: '1', name: 'Existing Profile' }
            ],
        });

        renderWithRouter(<ProfileCreationForm />);

        const nameInput = screen.getByLabelText(/Profile Name/i);
        fireEvent.change(nameInput, { target: { value: 'existing profile' } }); // Testing case insensitivity

        const sumbitButton = screen.getByRole('button', { name: /Create Profile/i });
        fireEvent.click(sumbitButton);

        await waitFor(() => {
            expect(mockCreateProfile).not.toHaveBeenCalled();
            expect(mockDispatchError).toHaveBeenCalledWith('Profile name already exists', 'error');
        });
    });
});
