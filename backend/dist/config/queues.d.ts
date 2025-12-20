import Bull, { Queue, Job } from 'bull';
export declare enum JobType {
    VENDOR_ASSESSMENT_REMINDER = "vendor_assessment_reminder",
    ASSESSMENT_OVERDUE_NOTIFICATION = "assessment_overdue_notification",
    RISK_SCORE_CALCULATION = "risk_score_calculation",
    REPORT_GENERATION = "report_generation",
    EMAIL_NOTIFICATION = "email_notification",
    CONTRACT_EXPIRY_REMINDER = "contract_expiry_reminder",
    COMPLIANCE_STATUS_UPDATE = "compliance_status_update",
    VENDOR_MONITORING_CHECK = "vendor_monitoring_check",
    DATA_CLEANUP = "data_cleanup"
}
export declare const notificationQueue: Queue;
export declare const assessmentQueue: Queue;
export declare const reportQueue: Queue;
export declare const monitoringQueue: Queue;
export declare const maintenanceQueue: Queue;
export declare function addJob(queueType: 'notifications' | 'assessments' | 'reports' | 'monitoring' | 'maintenance', jobType: JobType, data: any, options?: Bull.JobOptions): Promise<Job>;
export declare function scheduleRecurringJobs(): Promise<void>;
export declare function shutdownQueues(): Promise<void>;
//# sourceMappingURL=queues.d.ts.map