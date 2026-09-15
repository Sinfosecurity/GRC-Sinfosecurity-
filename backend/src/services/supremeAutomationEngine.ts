import {
    ActionDef,
    ConditionDef,
    HumanBoundary,
    TriggerDef,
    isKnownAction,
    isKnownTrigger,
    isProhibitedAction,
} from './supremeAutomationCatalog';

export type AutomationFacts = {
    'vendor.tier'?: string | null;
    'finding.severity'?: string | null;
    'risk.outside_appetite'?: boolean;
    'evidence.expires_within_days'?: number | null;
    'control.test.result'?: string | null;
    'owner.exists'?: boolean;
    'due.exceeded'?: boolean;
    'intelligence.priority'?: string | null;
    ownerUserId?: string | null;
    ownerLabel?: string | null;
    sourceHref?: string | null;
    sourcePublicId?: string | null;
    title?: string | null;
};

export function calendarDay(now: Date, timeZone: string) {
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    } catch {
        return now.toISOString().slice(0, 10);
    }
}

export function idempotencyKey(input: {
    automationId: string;
    versionId: string;
    event: string;
    sourceModel: string;
    sourceId: string;
    bucket: string;
}) {
    return [input.automationId, input.versionId, input.event, input.sourceModel, input.sourceId, input.bucket].join(':');
}

export function evaluateCondition(condition: ConditionDef, facts: AutomationFacts): { field: string; matched: boolean; observed: unknown; reason: string } {
    const observed = (facts as Record<string, unknown>)[condition.field];
    if (condition.op === 'true') {
        const matched = observed === true;
        return { field: condition.field, matched, observed, reason: matched ? 'Condition is true.' : 'Condition is not true.' };
    }
    if (condition.op === 'false') {
        const matched = observed === false;
        return { field: condition.field, matched, observed, reason: matched ? 'Condition is false.' : 'Condition is not false.' };
    }
    if (condition.op === 'exists') {
        const matched = observed !== undefined && observed !== null && observed !== '' && observed !== false;
        return { field: condition.field, matched, observed, reason: matched ? 'Value exists.' : 'Value is missing.' };
    }
    if (condition.op === 'eq') {
        const matched = String(observed || '').toUpperCase() === String(condition.value || '').toUpperCase();
        return { field: condition.field, matched, observed, reason: matched ? `Equals ${condition.value}.` : `Does not equal ${condition.value}.` };
    }
    if (condition.op === 'in') {
        const allowed = Array.isArray(condition.value) ? condition.value.map((row) => String(row).toUpperCase()) : [String(condition.value || '').toUpperCase()];
        const matched = allowed.includes(String(observed || '').toUpperCase());
        return { field: condition.field, matched, observed, reason: matched ? `In ${allowed.join(', ')}.` : `Not in ${allowed.join(', ')}.` };
    }
    if (condition.op === 'lte') {
        const left = typeof observed === 'number' ? observed : Number(observed);
        const right = Number(condition.value);
        const matched = Number.isFinite(left) && left <= right;
        return { field: condition.field, matched, observed, reason: matched ? `${left} is within ${right}.` : `${observed} is not within ${right}.` };
    }
    return { field: condition.field, matched: false, observed, reason: 'Unknown operator.' };
}

export function evaluateConditions(conditions: ConditionDef[], facts: AutomationFacts) {
    const results = (conditions || []).map((condition) => evaluateCondition(condition, facts));
    return {
        matched: results.every((row) => row.matched),
        results,
    };
}

export function validateDefinition(input: {
    trigger?: TriggerDef;
    conditions?: ConditionDef[];
    actions?: ActionDef[];
    humanBoundary?: HumanBoundary;
}) {
    const errors: string[] = [];
    if (!input.trigger?.event || !isKnownTrigger(input.trigger.event)) {
        errors.push('Choose a supported trigger. Custom events are not allowed.');
    }
    for (const action of input.actions || []) {
        if (isProhibitedAction(action.type)) {
            errors.push(`${action.type} is not allowed. Material decisions stay human.`);
        } else if (!isKnownAction(action.type)) {
            errors.push(`${action.type} is not a supported administrative action.`);
        }
    }
    if (!input.actions?.length) {
        errors.push('Add at least one administrative action.');
    }
    if (!input.humanBoundary?.required || !input.humanBoundary.label) {
        errors.push('A human decision boundary is required before publish.');
    }
    return errors;
}

export function describeWouldRun(actions: ActionDef[]) {
    return (actions || []).map((action) => ({
        type: action.type,
        wouldRun: !isProhibitedAction(action.type) && isKnownAction(action.type),
        writes: action.type !== 'NOTIFY_OWNER',
    }));
}

export function daysUntil(date: Date | string | null | undefined, now = new Date()) {
    if (!date) return null;
    const target = new Date(date).getTime();
    if (!Number.isFinite(target)) return null;
    return Math.ceil((target - now.getTime()) / 86400000);
}
