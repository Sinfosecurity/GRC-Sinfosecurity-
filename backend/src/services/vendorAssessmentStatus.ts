export type LatestAssessment = {
    status?: string | null;
    dueDate?: Date | string | null;
};

export function deriveAssessmentStatus(latest?: LatestAssessment | null): string {
    if (!latest?.status) {
        return 'NOT_STARTED';
    }
    if (latest.status === 'COMPLETED') {
        return 'COMPLETED';
    }
    if (latest.status === 'CANCELLED') {
        return 'NOT_STARTED';
    }
    const due = latest.dueDate ? new Date(latest.dueDate) : null;
    if (latest.status === 'OVERDUE' || (due && !Number.isNaN(due.getTime()) && due < new Date())) {
        return 'OVERDUE';
    }
    return latest.status;
}
