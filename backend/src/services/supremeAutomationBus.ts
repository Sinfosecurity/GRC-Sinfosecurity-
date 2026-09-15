import logger from '../config/logger';

export type AutomationEventInput = {
    organizationId: string;
    event: string;
    sourceModel: string;
    sourceId: string;
    sourcePublicId?: string | null;
    actorUserId?: string | null;
};

export async function emitSupremeAutomationEvent(input: AutomationEventInput) {
    try {
        const { supremeAutomationService } = await import('./supremeAutomationService');
        await supremeAutomationService.handleEvent(input);
    } catch (error) {
        logger.warn('Automation event was not processed; source record is unchanged', {
            event: input.event,
            sourceModel: input.sourceModel,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
