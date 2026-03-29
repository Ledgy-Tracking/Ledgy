import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProfileSelector } from './ProfileSelector';
import { useProfileStore } from '../../stores/useProfileStore';
import { BrowserRouter } from 'react-router-dom';

// Wrapper for router context
const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};

const mockProfiles = [
    {
        id: '1',
        name: 'Profile 1',
        description: 'Desc 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '2',
        name: 'Profile 2',
        description: 'Desc 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const mockProfileWithRemote = {
    id: '3',
    name: 'Remote Profile',
    description: 'Has remote sync',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remoteSyncEndpoint: 'https://sync.example.com',
};

describe('ProfileSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useProfileStore.setState({
            profiles: mockProfiles,
            isLoading: false,
            error: null,
        });
    });

    // ─── Existing tests (must remain green) ────────────────────────────────────

    it('renders the list of profiles', () => {
        renderWithRouter(<ProfileSelector />);

        expect(screen.getByText('Profile 1')).toBeDefined();
        expect(screen.getByText('Profile 2')).toBeDefined();
        expect(screen.getByText('Select Profile')).toBeDefined();
    });

    it('navigates to the app on profile selection', async () => {
        const setActiveProfileSpy = vi.spyOn(useProfileStore.getState(), 'setActiveProfile');

        renderWithRouter(<ProfileSelector />);

        const profileCard = screen.getByText('Profile 1');
        fireEvent.click(profileCard);

        expect(setActiveProfileSpy).toHaveBeenCalledWith('1');
    });

    it('opens create dialog and calls createProfile on submit', async () => {
        const createProfileSpy = vi.spyOn(useProfileStore.getState(), 'createProfile').mockResolvedValue('profile:123' as any);

        renderWithRouter(<ProfileSelector />);

        const newProfileBtn = screen.getByText('New Profile');
        fireEvent.click(newProfileBtn);

        // Find the "Name" label in the create dialog
        const nameInput = screen.getByPlaceholderText('e.g. Personal Ledger');
        fireEvent.change(nameInput, { target: { value: 'My New Profile' } });

        const createSubmitBtn = screen.getByRole('button', { name: /^Create$/i });
        
        // Wait for form validation to enable the button
        await waitFor(() => {
            expect((createSubmitBtn as HTMLButtonElement).disabled).toBe(false);
        });

        fireEvent.click(createSubmitBtn);

        await waitFor(() => {
            expect(createProfileSpy).toHaveBeenCalled();
        }, { timeout: 10000 });
    });

    // ─── Task 3.1: Delete dialog opens and shows profile name ──────────────────

    it('3.1 – clicking trash icon opens delete dialog and shows the profile name', () => {
        renderWithRouter(<ProfileSelector />);

        const trashBtn = screen.getByLabelText('Delete profile Profile 1');
        fireEvent.click(trashBtn);

        // Dialog header contains the name
        expect(screen.getByText(/Delete Profile "Profile 1"\?/)).toBeDefined();
        // Name confirmation input renders
        expect(screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i })).toBeDefined();
    });

    // ─── Task 3.2: Button disabled when input is empty ─────────────────────────

    it('3.2 – "Permanently Delete" button is disabled when the confirmation input is empty', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const deleteBtn = screen.getByRole('button', { name: 'Permanently Delete' });
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
    });

    // ─── Task 3.2b: Disabled-state for remote label "Delete Local & Remote" ────

    it('3.2b – "Delete Local & Remote" button is also disabled when the confirmation input is empty (remote profile)', () => {
        useProfileStore.setState({
            profiles: [mockProfileWithRemote],
            isLoading: false,
            error: null,
        });

        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Remote Profile'));

        const deleteBtn = screen.getByRole('button', { name: 'Delete Local & Remote' });
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
    });

    // ─── Task 3.3: Button remains disabled on case mismatch ───────────────────

    it('3.3 – button remains disabled when typed text does not match exactly (case mismatch)', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'profile 1' } }); // lowercase

        const deleteBtn = screen.getByRole('button', { name: 'Permanently Delete' });
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
    });

    // ─── Task 3.4: Button becomes enabled on exact match ─────────────────────

    it('3.4 – button becomes enabled when typed text matches the profile name exactly', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'Profile 1' } });

        const deleteBtn = screen.getByRole('button', { name: 'Permanently Delete' });
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(false);
    });

    // ─── Task 3.5: Submitting with correct name calls deleteProfile ───────────

    it('3.5 – submitting with the correct name calls deleteProfile from the store', async () => {
        const deleteProfileSpy = vi.spyOn(useProfileStore.getState(), 'deleteProfile').mockResolvedValue({
            success: true,
            remoteDeleted: false,
        });

        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'Profile 1' } });

        const deleteBtn = screen.getByRole('button', { name: 'Permanently Delete' });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(deleteProfileSpy).toHaveBeenCalledWith('1', false);
            // AC #8: dialog must close on successful deletion
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

    // ─── Task 3.5b: Success-path state resets ────────────────────────────────

    it('3.5b – after successful deletion, reopening dialog for another profile shows clean state', async () => {
        vi.spyOn(useProfileStore.getState(), 'deleteProfile').mockResolvedValue({
            success: true,
            remoteDeleted: false,
        });

        renderWithRouter(<ProfileSelector />);

        // Open, type name, confirm Profile 1
        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));
        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'Profile 1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Permanently Delete' }));

        // Wait for dialog to close (success path)
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });

        // Open delete dialog for Profile 2 — state must be completely reset
        fireEvent.click(screen.getByLabelText('Delete profile Profile 2'));
        const newInput = screen.getByRole('textbox', { name: /Type the profile name Profile 2 to confirm deletion/i }) as HTMLInputElement;

        // deleteConfirmName reset to '' (not 'Profile 1')
        expect(newInput.value).toBe('');
        // Button disabled because name hasn't been typed yet
        expect((screen.getByRole('button', { name: 'Permanently Delete' }) as HTMLButtonElement).disabled).toBe(true);
    });

    // ─── Task 3.6: Escape / Cancel closes dialog and resets state ────────────

    it('3.6a – clicking Cancel closes the dialog and resets deleteConfirmName', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'Profile 1' } });

        const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelBtn);

        // Dialog should be gone
        expect(screen.queryByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i })).toBeNull();
    });

    it('3.6b – pressing Escape closes the dialog and resets state', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const dialogForm = screen.getByRole('dialog');
        expect(dialogForm).not.toBeNull();
        fireEvent.keyDown(dialogForm, { key: 'Escape' });

        expect(screen.queryByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i })).toBeNull();
    });

    it('3.6c – reopening the dialog after cancel resets the confirmation input to empty', () => {
        renderWithRouter(<ProfileSelector />);

        // Open dialog, type something, cancel
        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));
        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'some text' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        // Reopen
        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));
        const newInput = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i }) as HTMLInputElement;
        expect(newInput.value).toBe('');
    });

    // ─── Task 3.7: Auto-focus on dialog open ─────────────────────────────────

    it('3.7 – name confirmation input (id=delete-confirm-input) is the designated auto-focus element', async () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = document.getElementById('delete-confirm-input') as HTMLInputElement | null;
        expect(input).not.toBeNull();
        expect(input?.tagName).toBe('INPUT');
        
        // Wait for focus to be applied
        await waitFor(() => {
            expect(document.activeElement).toBe(input);
        });
    });

    // ─── Task 3.8: Remote sync checkbox visibility ────────────────────────────

    it('3.8a – remote purge checkbox is visible for profiles with remoteSyncEndpoint', () => {
        useProfileStore.setState({
            profiles: [mockProfileWithRemote],
            isLoading: false,
            error: null,
        });

        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Remote Profile'));

        expect(screen.getByText(/Also delete data from remote server/i)).toBeDefined();
        expect(screen.getByText(/This profile is synced to a remote server/i)).toBeDefined();
    });

    it('3.8b – remote purge checkbox is NOT visible for local-only profiles', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        expect(screen.queryByText(/Also delete data from remote server/i)).toBeNull();
        expect(screen.getByText(/This operation cannot be undone/i)).toBeDefined();
    });

    // ─── AC #4 sanity: partial name match still disables button ──────────────

    it('partial profile name match keeps the button disabled', () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'Profile' } });

        const deleteBtn = screen.getByRole('button', { name: 'Permanently Delete' });
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
    });

    // ─── AC #7 / Task 2.3: NETWORK_UNREACHABLE shows Force Delete button ──────

    it('NETWORK_UNREACHABLE: Force Delete button appears; disabled when name cleared, enabled when name matches', async () => {
        const deleteProfileSpy = vi.spyOn(useProfileStore.getState(), 'deleteProfile').mockResolvedValueOnce({
            success: false,
            remoteDeleted: false,
            error: 'NETWORK_UNREACHABLE',
        });

        useProfileStore.setState({
            profiles: [mockProfileWithRemote],
            isLoading: false,
            error: null,
        });

        renderWithRouter(<ProfileSelector />);

        // Open delete dialog for remote profile
        fireEvent.click(screen.getByLabelText('Delete profile Remote Profile'));

        // Type the name to enable the primary delete button
        const input = screen.getByRole('textbox', { name: /Type the profile name Remote Profile to confirm deletion/i });
        fireEvent.change(input, { target: { value: 'Remote Profile' } });

        // Click the primary delete button (which triggers the NETWORK_UNREACHABLE error)
        fireEvent.click(screen.getByRole('button', { name: 'Delete Local & Remote' }));

        // Wait for Force Delete Locally button to appear
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Force Delete Locally' })).toBeDefined();
        });

        // Verify deleteProfile was called
        expect(deleteProfileSpy).toHaveBeenCalledWith('3', false);

        // AC #7 + Task 2.3: Force Delete button is ENABLED while name matches
        const forceBtn = screen.getByRole('button', { name: 'Force Delete Locally' }) as HTMLButtonElement;
        expect(forceBtn.disabled).toBe(false);

        // AC #7 + Task 2.3: Clearing the name disables the Force Delete button
        fireEvent.change(input, { target: { value: '' } });
        expect(forceBtn.disabled).toBe(true);

        // Re-typing the exact name re-enables it
        fireEvent.change(input, { target: { value: 'Remote Profile' } });
        expect(forceBtn.disabled).toBe(false);
    });

    // ─── AC #9: Enter key submits form when enabled, blocked when disabled ────

    it('AC #9 – form submits on Enter when name matches; blocked when name does not match', async () => {
        const deleteProfileSpy = vi.spyOn(useProfileStore.getState(), 'deleteProfile').mockResolvedValue({
            success: true,
            remoteDeleted: false,
        });

        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));

        const input = screen.getByRole('textbox', { name: /Type the profile name Profile 1 to confirm deletion/i });
        const form = input.closest('form')!;

        // Wrong name: form submit should be swallowed by the onSubmit guard
        fireEvent.change(input, { target: { value: 'wrong name' } });
        fireEvent.submit(form);
        expect(deleteProfileSpy).not.toHaveBeenCalled();

        // Correct name: form submit should trigger deleteProfile
        fireEvent.change(input, { target: { value: 'Profile 1' } });
        fireEvent.submit(form);

        await waitFor(() => {
            expect(deleteProfileSpy).toHaveBeenCalledWith('1', false);
        });
    });

    // ─── L1: Clicking the backdrop closes the dialog ─────────────────────────

    it('clicking the backdrop overlay closes the delete dialog', async () => {
        renderWithRouter(<ProfileSelector />);

        fireEvent.click(screen.getByLabelText('Delete profile Profile 1'));
        expect(screen.getByRole('dialog')).toBeDefined();

        const closeBtn = screen.getByRole('button', { name: /Close/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });
});
