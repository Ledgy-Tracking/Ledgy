import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App Components', () => {
    it('renders without crashing and sets up routing', () => {
        // A simple sanity test for the App scaffold
        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        // We expect the app to render routing elements without throwing unhandled exceptions
        expect(container).toBeTruthy();
    });
});
