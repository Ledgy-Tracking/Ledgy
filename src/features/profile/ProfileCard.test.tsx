import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { ProfileMetadata } from '../../types/profile';

const mockProfile: ProfileMetadata = {
    id: 'test-profile-1',
    name: 'Test Profile',
    description: 'A test profile',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpened: Date.now() - 3600000, // 1 hour ago
    color: 'bg-blue-500',
    avatar: 'TP',
};

describe('ProfileCard', () => {
    it('renders profile name correctly', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        expect(screen.getByText('Test Profile')).toBeInTheDocument();
    });

    it('renders profile description', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        expect(screen.getByText('A test profile')).toBeInTheDocument();
    });

    it('renders avatar when provided', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        expect(screen.getByText('TP')).toBeInTheDocument();
    });

    it('applies active state styling', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={true}
                onClick={vi.fn()}
            />
        );
        const card = screen.getByRole('button');
        expect(card).toHaveClass('border-primary-500');
        expect(card).toHaveAttribute('aria-pressed', 'true');
    });

    it('applies inactive state styling', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        const card = screen.getByRole('button');
        expect(card).toHaveClass('border-gray-200');
        expect(card).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onClick when clicked', () => {
        const onClick = vi.fn();
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={onClick}
            />
        );
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Enter key is pressed', () => {
        const onClick = vi.fn();
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={onClick}
            />
        );
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space key is pressed', () => {
        const onClick = vi.fn();
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={onClick}
            />
        );
        fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('has correct ARIA attributes for accessibility', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        const card = screen.getByRole('button');
        expect(card).toHaveAttribute('tabindex', '0');
        expect(card).toHaveAttribute('aria-label', 'Select profile Test Profile');
    });

    it('is focusable', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        const card = screen.getByRole('button');
        expect(card).toHaveAttribute('tabindex', '0');
    });

    it('applies custom className', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
                className="custom-class"
            />
        );
        expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('shows active indicator when isActive is true', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={true}
                onClick={vi.fn()}
            />
        );
        // Check for the ping animation element - there are multiple empty spans, so query by class
        const pingElement = screen.getAllByText('').find(el => el.classList.contains('animate-ping'));
        expect(pingElement).toBeDefined();
    });

    it('renders without description if not provided', () => {
        const profileWithoutDesc: ProfileMetadata = {
            ...mockProfile,
            description: undefined,
        };
        render(
            <ProfileCard
                profile={profileWithoutDesc}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        expect(screen.queryByText('A test profile')).not.toBeInTheDocument();
    });

    it('renders relative time for lastOpened', () => {
        render(
            <ProfileCard
                profile={mockProfile}
                isActive={false}
                onClick={vi.fn()}
            />
        );
        // Should show "Last opened 1 hour ago" or similar
        expect(screen.getByText(/Last opened/i)).toBeInTheDocument();
    });
});
