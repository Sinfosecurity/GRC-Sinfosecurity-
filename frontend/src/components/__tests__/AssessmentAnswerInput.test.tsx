import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssessmentAnswerInput from '../AssessmentAnswerInput';

describe('AssessmentAnswerInput', () => {
    it('keeps typed text when the parent re-renders the same question with an empty saved value', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onDraftChange = vi.fn();
        const { rerender } = render(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue=""
                options={[]}
                disabled={false}
                onSave={onSave}
                onDraftChange={onDraftChange}
            />,
        );

        const input = screen.getByLabelText('Answer');
        await user.type(input, '0231');
        expect(input).toHaveValue('0231');

        rerender(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue=""
                options={[]}
                disabled={false}
                onSave={onSave}
                onDraftChange={onDraftChange}
            />,
        );

        expect(screen.getByLabelText('Answer')).toHaveValue('0231');
        expect(onSave).not.toHaveBeenCalled();
    });

    it('saves the live field value on blur', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue=""
                options={[]}
                disabled={false}
                onSave={onSave}
                onDraftChange={vi.fn()}
            />,
        );

        await user.type(screen.getByLabelText('Answer'), 'Jane Doe');
        await user.tab();
        expect(onSave).toHaveBeenCalledWith('Jane Doe');
    });

    it('does not replace in-progress typing when a later save result arrives for the same question', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue=""
                options={[]}
                disabled={false}
                onSave={vi.fn()}
                onDraftChange={vi.fn()}
            />,
        );

        await user.type(screen.getByLabelText('Answer'), 'Jane');
        rerender(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue="old server"
                options={[]}
                disabled={false}
                onSave={vi.fn()}
                onDraftChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Answer')).toHaveValue('Jane');
    });

    it('loads the saved answer only when the operator moves to another question', async () => {
        const { rerender } = render(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue="First contact"
                options={[]}
                disabled={false}
                onSave={vi.fn()}
                onDraftChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Answer')).toHaveValue('First contact');

        rerender(
            <AssessmentAnswerInput
                questionKey="ir_eng_contact"
                savedValue="Next contact"
                options={[]}
                disabled={false}
                onSave={vi.fn()}
                onDraftChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Answer')).toHaveValue('Next contact');
    });

    it('keeps free-text questions as a text box even if leftover options are present', () => {
        render(
            <AssessmentAnswerInput
                questionKey="ir_eng_security"
                savedValue=""
                options={['Yes', 'No']}
                questionType="TEXT"
                disabled={false}
                onSave={vi.fn()}
                onDraftChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('textbox', { name: 'Answer' })).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});
