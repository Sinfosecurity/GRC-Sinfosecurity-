import { EventEmitter } from 'events';

export const GOVERNANCE_EVENTS = {
    NODE_CREATED: 'governance.node.created',
    EDGE_CREATED: 'governance.edge.created',
    EDGE_ARCHIVED: 'governance.edge.archived',
    RELATIONSHIP_CHANGED: 'governance.relationship.changed',
} as const;

export type GovernanceEventName = (typeof GOVERNANCE_EVENTS)[keyof typeof GOVERNANCE_EVENTS];

export const governanceGraphEvents = new EventEmitter();
governanceGraphEvents.setMaxListeners(50);

export function emitGovernanceEvent(name: GovernanceEventName, payload: Record<string, unknown>) {
    governanceGraphEvents.emit(name, { ...payload, emittedAt: new Date().toISOString() });
}
