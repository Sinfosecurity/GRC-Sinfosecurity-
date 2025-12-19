import Bull, { Queue, Job } from 'bull';
import { redisClient } from '../config/database';
import logger from '../config/logger';

// Job types
export enum JobType {
  VENDOR_ASSESSMENT_REMINDER = 'vendor_assessment_reminder',
  ASSESSMENT_OVERDUE_NOTIFICATION = 'assessment_overdue_notification',
  RISK_SCORE_CALCULATION = 'risk_score_calculation',
  REPORT_GENERATION = 'report_generation',
  EMAIL_NOTIFICATION = 'email_notification',
  CONTRACT_EXPIRY_REMINDER = 'contract_expiry_reminder',
  COMPLIANCE_STATUS_UPDATE = 'compliance_status_update',
  VENDOR_MONITORING_CHECK = 'vendor_monitoring_check',
  DATA_CLEANUP = 'data_cleanup',
}

// Queue names
const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  ASSESSMENTS: 'assessments',
  REPORTS: 'reports',
  MONITORING: 'monitoring',
  MAINTENANCE: 'maintenance',
};

// Create queues
export const notificationQueue: Queue = new Bull(QUEUE_NAMES.NOTIFICATIONS, {
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

export const assessmentQueue: Queue = new Bull(QUEUE_NAMES.ASSESSMENTS, {
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

export const reportQueue: Queue = new Bull(QUEUE_NAMES.REPORTS, {
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

export const monitoringQueue: Queue = new Bull(QUEUE_NAMES.MONITORING, {
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

export const maintenanceQueue: Queue = new Bull(QUEUE_NAMES.MAINTENANCE, {
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
notificationQueue.process(async (job: Job) => {
  logger.info(`Processing notification job: ${job.id}`, { data: job.data });
  
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
        logger.warn(`Unknown notification type: ${type}`);
    }

    logger.info(`Completed notification job: ${job.id}`);
    return { success: true, jobId: job.id };
  } catch (error: any) {
    logger.error(`Failed notification job: ${job.id}`, error);
    throw error;
  }
});

assessmentQueue.process(async (job: Job) => {
  logger.info(`Processing assessment job: ${job.id}`, { data: job.data });
  
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
        logger.warn(`Unknown assessment job type: ${type}`);
    }

    logger.info(`Completed assessment job: ${job.id}`);
    return { success: true, jobId: job.id };
  } catch (error: any) {
    logger.error(`Failed assessment job: ${job.id}`, error);
    throw error;
  }
});

reportQueue.process(async (job: Job) => {
  logger.info(`Processing report job: ${job.id}`, { data: job.data });
  
  const { type, data } = job.data;

  try {
    switch (type) {
      case JobType.REPORT_GENERATION:
        await processReportGeneration(data);
        break;
      default:
        logger.warn(`Unknown report job type: ${type}`);
    }

    logger.info(`Completed report job: ${job.id}`);
    return { success: true, jobId: job.id };
  } catch (error: any) {
    logger.error(`Failed report job: ${job.id}`, error);
    throw error;
  }
});

monitoringQueue.process(async (job: Job) => {
  logger.info(`Processing monitoring job: ${job.id}`, { data: job.data });
  
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
        logger.warn(`Unknown monitoring job type: ${type}`);
    }

    logger.info(`Completed monitoring job: ${job.id}`);
    return { success: true, jobId: job.id };
  } catch (error: any) {
    logger.error(`Failed monitoring job: ${job.id}`, error);
    throw error;
  }
});

maintenanceQueue.process(async (job: Job) => {
  logger.info(`Processing maintenance job: ${job.id}`, { data: job.data });
  
  const { type, data } = job.data;

  try {
    switch (type) {
      case JobType.DATA_CLEANUP:
        await processDataCleanup(data);
        break;
      default:
        logger.warn(`Unknown maintenance job type: ${type}`);
    }

    logger.info(`Completed maintenance job: ${job.id}`);
    return { success: true, jobId: job.id };
  } catch (error: any) {
    logger.error(`Failed maintenance job: ${job.id}`, error);
    throw error;
  }
});

// Job processing functions (placeholders - implement actual logic)
async function processEmailNotification(data: any) {
  logger.info('Sending email notification', data);
  // TODO: Implement email sending logic
}

async function processAssessmentReminder(data: any) {
  logger.info('Sending assessment reminder', data);
  // TODO: Implement assessment reminder logic
}

async function processContractExpiryReminder(data: any) {
  logger.info('Sending contract expiry reminder', data);
  // TODO: Implement contract reminder logic
}

async function processRiskScoreCalculation(data: any) {
  logger.info('Calculating risk score', data);
  // TODO: Implement risk score calculation logic
}

async function processOverdueNotification(data: any) {
  logger.info('Sending overdue notification', data);
  // TODO: Implement overdue notification logic
}

async function processReportGeneration(data: any) {
  logger.info('Generating report', data);
  // TODO: Implement report generation logic
}

async function processVendorMonitoringCheck(data: any) {
  logger.info('Checking vendor monitoring', data);
  // TODO: Implement vendor monitoring check logic
}

async function processComplianceStatusUpdate(data: any) {
  logger.info('Updating compliance status', data);
  // TODO: Implement compliance status update logic
}

async function processDataCleanup(data: any) {
  logger.info('Performing data cleanup', data);
  // TODO: Implement data cleanup logic
}

// Event handlers
[notificationQueue, assessmentQueue, reportQueue, monitoringQueue, maintenanceQueue].forEach(queue => {
  queue.on('completed', (job: Job, result: any) => {
    logger.info(`Job ${job.id} in queue ${queue.name} completed`, { result });
  });

  queue.on('failed', (job: Job, error: Error) => {
    logger.error(`Job ${job.id} in queue ${queue.name} failed`, { error: error.message });
  });

  queue.on('stalled', (job: Job) => {
    logger.warn(`Job ${job.id} in queue ${queue.name} stalled`);
  });
});

// Helper function to add jobs
export async function addJob(
  queueType: 'notifications' | 'assessments' | 'reports' | 'monitoring' | 'maintenance',
  jobType: JobType,
  data: any,
  options?: Bull.JobOptions
): Promise<Job> {
  let queue: Queue;

  switch (queueType) {
    case 'notifications':
      queue = notificationQueue;
      break;
    case 'assessments':
      queue = assessmentQueue;
      break;
    case 'reports':
      queue = reportQueue;
      break;
    case 'monitoring':
      queue = monitoringQueue;
      break;
    case 'maintenance':
      queue = maintenanceQueue;
      break;
  }

  const job = await queue.add({ type: jobType, data }, options);
  logger.info(`Added job ${job.id} to ${queueType} queue`, { jobType, data });
  
  return job;
}

// Schedule recurring jobs
export async function scheduleRecurringJobs() {
  // Check for overdue assessments every hour
  await assessmentQueue.add(
    { type: JobType.ASSESSMENT_OVERDUE_NOTIFICATION, data: {} },
    { repeat: { cron: '0 * * * *' } } // Every hour
  );

  // Check for contract expiry every day at 9 AM
  await notificationQueue.add(
    { type: JobType.CONTRACT_EXPIRY_REMINDER, data: {} },
    { repeat: { cron: '0 9 * * *' } } // Daily at 9 AM
  );

  // Vendor monitoring checks every 6 hours
  await monitoringQueue.add(
    { type: JobType.VENDOR_MONITORING_CHECK, data: {} },
    { repeat: { cron: '0 */6 * * *' } } // Every 6 hours
  );

  // Data cleanup every Sunday at 2 AM
  await maintenanceQueue.add(
    { type: JobType.DATA_CLEANUP, data: {} },
    { repeat: { cron: '0 2 * * 0' } } // Weekly on Sunday at 2 AM
  );

  logger.info('✅ Recurring jobs scheduled');
}

// Graceful shutdown
export async function shutdownQueues() {
  logger.info('Shutting down job queues...');
  
  await Promise.all([
    notificationQueue.close(),
    assessmentQueue.close(),
    reportQueue.close(),
    monitoringQueue.close(),
    maintenanceQueue.close(),
  ]);

  logger.info('✅ Job queues closed');
}
