import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

const ThrowError = () => {
    throw new Error('Test error');
};

describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Test Content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders error UI when there is an error', () => {
        // Suppress console.error for this test
        const consoleError = console.error;
        console.error = () => {};

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/Try Again/i)).toBeInTheDocument();

        // Restore console.error
        console.error = consoleError;
    });

    it('renders custom fallback when provided', () => {
        const consoleError = console.error;
        console.error = () => {};

        render(
            <ErrorBoundary fallback={<div>Custom Error UI</div>}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();

        console.error = consoleError;
    });
});
