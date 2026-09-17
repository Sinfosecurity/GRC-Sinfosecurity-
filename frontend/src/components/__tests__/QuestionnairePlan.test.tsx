import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuestionnairePlan from '../tprm/QuestionnairePlan';

describe('QuestionnairePlan', () => {
    it('shows recommended packs, live totals, and confirm-scope gating without a template browser', () => {
        render(
            <QuestionnairePlan
                recommendedTier="Medium"
                explanation="Supreme recommends medium from the recorded inherent-risk average of 2 of 3."
                plan={{
                    includedQuestionCount: 58,
                    confirmScopeCount: 1,
                    sendBlocked: true,
                    sendBlockMessage: '1 pack requires scope confirmation before this questionnaire can be sent.',
                    packs: [
                        { key: 'baseline', name: 'Baseline', questionCount: 45, state: 'INCLUDED_REQUIRED', reason: 'Required for every third party' },
                        { key: 'personal-sensitive-data', name: 'Personal and Sensitive Data', questionCount: 13, state: 'INCLUDED', reason: 'Internal scope answer: Yes' },
                        { key: 'cloud-hosting', name: 'Cloud Hosting', questionCount: 13, state: 'CONFIRM_SCOPE', reason: 'Internal scope answer: Unknown', overridable: true },
                        { key: 'software-api', name: 'Software and API', questionCount: 7, state: 'EXCLUDED', reason: 'Internal scope answer: No' },
                    ],
                }}
            />
        );
        expect(screen.getByText('Questionnaire plan')).toBeInTheDocument();
        expect(screen.getByText('58 questions')).toBeInTheDocument();
        expect(screen.getByText('Included — required')).toBeInTheDocument();
        expect(screen.getByText('Confirm scope')).toBeInTheDocument();
        expect(screen.getByText('1 pack requires scope confirmation before this questionnaire can be sent.')).toBeInTheDocument();
        expect(screen.queryByText(/Search templates/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/CMMC/i)).not.toBeInTheDocument();
    });
});
