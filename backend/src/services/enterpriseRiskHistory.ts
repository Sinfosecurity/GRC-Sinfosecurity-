const RATING_LABEL: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
};

export type HistoryPayload = {
    explanation?: string;
    change?: string;
    fromRating?: string;
    toRating?: string;
    fromScore?: number;
    toScore?: number;
    fromLikelihood?: number;
    toLikelihood?: number;
    fromOwner?: string;
    toOwner?: string;
    fromAppetite?: string;
    toAppetite?: string;
};

export type PresentedHistory = {
    title: string;
    change: string | null;
    detail: string | null;
    actorUserId: string | null;
    createdAt: Date | string;
};

function ratingLabel(value?: string | null) {
    if (!value) return '';
    return RATING_LABEL[value] || value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function presentHistoryEntry(row: {
    eventType: string;
    summary: string;
    actorUserId?: string | null;
    createdAt: Date | string;
    payload?: HistoryPayload | null;
}): PresentedHistory {
    const payload = row.payload || {};
    const longExplanation = row.summary.includes('Methodology') || row.summary.includes('Inherent ') || row.summary.length > 160;
    const detail = payload.explanation || (longExplanation && row.eventType === 'Risk reassessed' ? row.summary : null);
    const changes: string[] = [];
    if (payload.fromRating && payload.toRating && payload.fromRating !== payload.toRating) {
        changes.push(`Residual risk changed ${ratingLabel(payload.fromRating)} → ${ratingLabel(payload.toRating)}`);
    }
    if (payload.fromLikelihood != null && payload.toLikelihood != null && payload.fromLikelihood !== payload.toLikelihood) {
        changes.push(`Likelihood changed ${payload.fromLikelihood} → ${payload.toLikelihood}`);
    }
    if (payload.fromOwner !== undefined && payload.fromOwner !== payload.toOwner) {
        changes.push(`Owner changed ${payload.fromOwner || 'Unassigned'} → ${payload.toOwner || 'Unassigned'}`);
    }
    if (payload.fromAppetite && payload.toAppetite && payload.fromAppetite !== payload.toAppetite) {
        changes.push(`Appetite changed ${ratingLabel(payload.fromAppetite)} → ${ratingLabel(payload.toAppetite)}`);
    }
    const change = payload.change || changes[0] || (longExplanation ? null : row.summary);
    return {
        title: row.eventType,
        change: change && change !== row.eventType ? change : null,
        detail,
        actorUserId: row.actorUserId || null,
        createdAt: row.createdAt,
    };
}

export function scoreChangeSummary(input: {
    fromRating: string;
    toRating: string;
    fromScore: number;
    toScore: number;
    fromLikelihood: number;
    toLikelihood: number;
    fromAppetite?: string;
    toAppetite?: string;
}) {
    const parts: string[] = [];
    if (input.fromRating !== input.toRating) parts.push(`Residual risk changed ${ratingLabel(input.fromRating)} → ${ratingLabel(input.toRating)}`);
    else if (input.fromScore !== input.toScore) parts.push(`Residual score changed ${input.fromScore} → ${input.toScore}`);
    if (input.fromLikelihood !== input.toLikelihood) parts.push(`Likelihood changed ${input.fromLikelihood} → ${input.toLikelihood}`);
    if (input.fromAppetite && input.toAppetite && input.fromAppetite !== input.toAppetite) {
        parts.push(`Appetite changed ${ratingLabel(input.fromAppetite)} → ${ratingLabel(input.toAppetite)}`);
    }
    return parts[0] || 'Risk reassessed';
}
