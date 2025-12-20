"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceQueue = exports.monitoringQueue = exports.reportQueue = exports.assessmentQueue = exports.notificationQueue = exports.JobType = void 0;
exports.addJob = addJob;
exports.scheduleRecurringJobs = scheduleRecurringJobs;
exports.shutdownQueues = shutdownQueues;
const bull_1 = __importDefault(require("bull"));
const logger_1 = __importDefault(require("../config/logger"));
// Job types
var JobType;
(function (JobType) {
    JobType["VENDOR_ASSESSMENT_REMINDER"] = "vendor_assessment_reminder";
    JobType["ASSESSMENT_OVERDUE_NOTIFICATION"] = "assessment_overdue_notification";
    JobType["RISK_SCORE_CALCULATION"] = "risk_score_calculation";
    JobType["REPORT_GENERATION"] = "report_generation";
    JobType["EMAIL_NOTIFICATION"] = "email_notification";
    JobType["CONTRACT_EXPIRY_REMINDER"] = "contract_expiry_reminder";
    JobType["COMPLIANCE_STATUS_UPDATE"] = "compliance_status_update";
    JobType["VENDOR_MONITORING_CHECK"] = "vendor_monitoring_check";
    JobType["DATA_CLEANUP"] = "data_cleanup";
})(JobType || (exports.JobType = JobType = {}));
// Queue names
const QUEUE_NAMES = {
    NOTIFICATIONS: 'notifications',
    ASSESSMENTS: 'assessments',
    REPORTS: 'reports',
    MONITORING: 'monitoring',
    MAINTENANCE: 'maintenance',
};
// Create queues
exports.notificationQueue = new bull_1.default(QUEUE_NAMES.NOTIFICATIONS, {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
    },
});
exports.assessmentQueue = new bull_1.default(QUEUE_NAMES.ASSESSMENTS, {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: false,
    },
});
exports.reportQueue = new bull_1.default(QUEUE_NAMES.REPORTS, {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
        attempts: 2,
        timeout: 120000, // 2 minutes
        removeOnComplete: 20,
        removeOnFail: false,
    },
});
exports.monitoringQueue = new bull_1.default(QUEUE_NAMES.MONITORING, {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: false,
    },
});
exports.maintenanceQueue = new bull_1.default(QUEUE_NAMES.MAINTENANCE, {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 10,
        removeOnFail: false,
    },
});
// Job processors
exports.notificationQueue.process(async (job) => {
    logger_1.default.info(`Processing notification job: ${job.id}`, { data: job.data });
    const { type, data } = job.data;
    try {
        switch (type) {
            case JobType.EMAIL_NOTIFICATION:
                await processEmailNotification(data);
                break;
            case JobType.VENDOR_ASSESSMENT_REMINDER:
                await processAssessmentReminder(data);
                break;
            case JobType.CONTRACT_EXPIRY_REMINDER:
                await processContractExpiryReminder(data);
                break;
            default:
                logger_1.default.warn(`Unknown notification type: ${type}`);
        }
        logger_1.default.info(`Completed notification job: ${job.id}`);
        return { success: true, jobId: job.id };
    }
    catch (error) {
        logger_1.default.error(`Failed notification job: ${job.id}`, error);
        throw error;
    }
});
exports.assessmentQueue.process(async (job) => {
    logger_1.default.info(`Processing assessment job: ${job.id}`, { data: job.data });
    const { type, data } = job.data;
    try {
        switch (type) {
            case JobType.RISK_SCORE_CALCULATION:
                await processRiskScoreCalculation(data);
                break;
            case JobType.ASSESSMENT_OVERDUE_NOTIFICATION:
                await processOverdueNotification(data);
                break;
            default:
                logger_1.default.warn(`Unknown assessment job type: ${type}`);
        }
        logger_1.default.info(`Completed assessment job: ${job.id}`);
        return { success: true, jobId: job.id };
    }
    catch (error) {
        logger_1.default.error(`Failed assessment job: ${job.id}`, error);
        throw error;
    }
});
exports.reportQueue.process(async (job) => {
    logger_1.default.info(`Processing report job: ${job.id}`, { data: job.data });
    const { type, data } = job.data;
    try {
        switch (type) {
            case JobType.REPORT_GENERATION:
                await processReportGeneration(data);
                break;
            default:
                logger_1.default.warn(`Unknown report job type: ${type}`);
        }
        logger_1.default.info(`Completed report job: ${job.id}`);
        return { success: true, jobId: job.id };
    }
    catch (error) {
        logger_1.default.error(`Failed report job: ${job.id}`, error);
        throw error;
    }
});
exports.monitoringQueue.process(async (job) => {
    logger_1.default.info(`Processing monitoring job: ${job.id}`, { data: job.data });
    const { type, data } = job.data;
    try {
        switch (type) {
            case JobType.VENDOR_MONITORING_CHECK:
                await processVendorMonitoringCheck(data);
                break;
            case JobType.COMPLIANCE_STATUS_UPDATE:
                await processComplianceStatusUpdate(data);
                break;
            default:
                logger_1.default.warn(`Unknown monitoring job type: ${type}`);
        }
        logger_1.default.info(`Completed monitoring job: ${job.id}`);
        return { success: true, jobId: job.id };
    }
    catch (error) {
        logger_1.default.error(`Failed monitoring job: ${job.id}`, error);
        throw error;
    }
});
exports.maintenanceQueue.process(async (job) => {
    logger_1.default.info(`Processing maintenance job: ${job.id}`, { data: job.data });
    const { type, data } = job.data;
    try {
        switch (type) {
            case JobType.DATA_CLEANUP:
                await processDataCleanup(data);
                break;
            default:
                logger_1.default.warn(`Unknown maintenance job type: ${type}`);
        }
        logger_1.default.info(`Completed maintenance job: ${job.id}`);
        return { success: true, jobId: job.id };
    }
    catch (error) {
        logger_1.default.error(`Failed maintenance job: ${job.id}`, error);
        throw error;
    }
});
// Job processing functions (placeholders - implement actual logic)
async function processEmailNotification(data) {
    logger_1.default.info('Sending email notification', data);
    // TODO: Implement email sending logic
}
async function processAssessmentReminder(data) {
    logger_1.default.info('Sending assessment reminder', data);
    // TODO: Implement assessment reminder logic
}
async function processContractExpiryReminder(data) {
    logger_1.default.info('Sending contract expiry reminder', data);
    // TODO: Implement contract reminder logic
}
async function processRiskScoreCalculation(data) {
    logger_1.default.info('Calculating risk score', data);
    // TODO: Implement risk score calculation logic
}
async function processOverdueNotification(data) {
    logger_1.default.info('Sending overdue notification', data);
    // TODO: Implement overdue notification logic
}
async function processReportGeneration(data) {
    logger_1.default.info('Generating report', data);
    // TODO: Implement report generation logic
}
async function processVendorMonitoringCheck(data) {
    logger_1.default.info('Checking vendor monitoring', data);
    // TODO: Implement vendor monitoring check logic
}
async function processComplianceStatusUpdate(data) {
    logger_1.default.info('Updating compliance status', data);
    // TODO: Implement compliance status update logic
}
async function processDataCleanup(data) {
    logger_1.default.info('Performing data cleanup', data);
    // TODO: Implement data cleanup logic
}
// Event handlers
[exports.notificationQueue, exports.assessmentQueue, exports.reportQueue, exports.monitoringQueue, exports.maintenanceQueue].forEach(queue => {
    queue.on('completed', (job, result) => {
        logger_1.default.info(`Job ${job.id} in queue ${queue.name} completed`, { result });
    });
    queue.on('failed', (job, error) => {
        logger_1.default.error(`Job ${job.id} in queue ${queue.name} failed`, { error: error.message });
    });
    queue.on('stalled', (job) => {
        logger_1.default.warn(`Job ${job.id} in queue ${queue.name} stalled`);
    });
});
// Helper function to add jobs
async function addJob(queueType, jobType, data, options) {
    let queue;
    switch (queueType) {
        case 'notifications':
            queue = exports.notificationQueue;
            break;
        case 'assessments':
            queue = exports.assessmentQueue;
            break;
        case 'reports':
            queue = exports.reportQueue;
            break;
        case 'monitoring':
            queue = exports.monitoringQueue;
            break;
        case 'maintenance':
            queue = exports.maintenanceQueue;
            break;
    }
    const job = await queue.add({ type: jobType, data }, options);
    logger_1.default.info(`Added job ${job.id} to ${queueType} queue`, { jobType, data });
    return job;
}
// Schedule recurring jobs
async function scheduleRecurringJobs() {
    // Check for overdue assessments every hour
    await exports.assessmentQueue.add({ type: JobType.ASSESSMENT_OVERDUE_NOTIFICATION, data: {} }, { repeat: { cron: '0 * * * *' } } // Every hour
    );
    // Check for contract expiry every day at 9 AM
    await exports.notificationQueue.add({ type: JobType.CONTRACT_EXPIRY_REMINDER, data: {} }, { repeat: { cron: '0 9 * * *' } } // Daily at 9 AM
    );
    // Vendor monitoring checks every 6 hours
    await exports.monitoringQueue.add({ type: JobType.VENDOR_MONITORING_CHECK, data: {} }, { repeat: { cron: '0 */6 * * *' } } // Every 6 hours
    );
    // Data cleanup every Sunday at 2 AM
    await exports.maintenanceQueue.add({ type: JobType.DATA_CLEANUP, data: {} }, { repeat: { cron: '0 2 * * 0' } } // Weekly on Sunday at 2 AM
    );
    logger_1.default.info('✅ Recurring jobs scheduled');
}
// Graceful shutdown
async function shutdownQueues() {
    logger_1.default.info('Shutting down job queues...');
    await Promise.all([
        exports.notificationQueue.close(),
        exports.assessmentQueue.close(),
        exports.reportQueue.close(),
        exports.monitoringQueue.close(),
        exports.maintenanceQueue.close(),
    ]);
    logger_1.default.info('✅ Job queues closed');
}
//# sourceMappingURL=queues.js.map