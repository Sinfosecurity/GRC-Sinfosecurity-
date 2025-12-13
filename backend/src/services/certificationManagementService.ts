/**
 * Compliance Certification Management Service
 * Track certification timelines, readiness scoring, renewal alerts
 */

export interface Certification {
    id: string;
    framework: string;
    certificationBody: string;
    status: 'not_started' | 'in_progress' | 'certified' | 'expired';
    currentVersion?: string;

    // Timeline
    targetDate?: Date;
    certifiedDate?: Date;
    expiryDate?: Date;
    renewalDate?: Date;

    // Readiness
    readinessScore: number; // 0-100
    gaps: string[];
    completedControls: number;
    totalControls: number;

    // Auditor info
    auditor?: {
        name: string;
        company: string;
        contactEmail: string;
    };

    // Documents
    certificateUrl?: string;
    reportUrl?: string;

    createdAt: Date;
    updatedAt: Date;
}

export interface CertificationMilestone {
    certificationId: string;
    milestone: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
    completedDate?: Date;
    notes?: string;
}

export interface ReadinessCheck {
    id: string;
    certificationId: string;
    checkedAt: Date;
    score: number;
    findings: {
        category: string;
        issue: string;
        severity: 'high' | 'medium' | 'low';
    }[];
}

// In-memory storage
const certifications = new Map<string, Certification>();
const milestones = new Map<string, CertificationMilestone>();
const readinessChecks: ReadinessCheck[] = [];

// Initialize with demo data
certifications.set('cert_iso27001', {
    id: 'cert_iso27001',
    framework: 'ISO 27001:2022',
    certificationBody: 'BSI Group',
    status: 'in_progress',
    currentVersion: '2022',
    targetDate: new Date('2025-06-01'),
    readinessScore: 78,
    gaps: [
        'Incomplete access control documentation',
        'Missing incident response procedures',
        'Business continuity plan needs update',
    ],
    completedControls: 72,
    totalControls: 93,
    auditor: {
        name: 'John Anderson',
        company: 'BSI Group',
        contactEmail: 'j.anderson@bsigroup.com',
    },
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date(),
});

certifications.set('cert_soc2', {
    id: 'cert_soc2',
    framework: 'SOC 2 Type II',
    certificationBody: 'Deloitte',
    status: 'certified',
    certifiedDate: new Date('2024-03-15'),
    expiryDate: new Date('2025-03-15'),
    renewalDate: new Date('2025-01-15'),
    readinessScore: 95,
    gaps: [],
    completedControls: 100,
    totalControls: 100,
    certificateUrl: '/certificates/soc2-2024.pdf',
    reportUrl: '/reports/soc2-audit-2024.pdf',
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date(),
});

// Milestones for ISO 27001
milestones.set('milestone_1', {
    certificationId: 'cert_iso27001',
    milestone: 'Complete Gap Analysis',
    dueDate: new Date('2024-12-31'),
    status: 'completed',
    completedDate: new Date('2024-12-15'),
});

milestones.set('milestone_2', {
    certificationId: 'cert_iso27001',
    milestone: 'Implement Missing Controls',
    dueDate: new Date('2025-03-31'),
    status: 'in_progress',
});

milestones.set('milestone_3', {
    certificationId: 'cert_iso27001',
    milestone: 'Internal Audit',
    dueDate: new Date('2025-04-30'),
    status: 'pending',
});

milestones.set('milestone_4', {
    certificationId: 'cert_iso27001',
    milestone: 'Certification Audit',
    dueDate: new Date('2025-06-01'),
    status: 'pending',
});

class CertificationManagementService {
    /**
     * Create certification tracking
     */
    createCertification(data: Omit<Certification, 'id' | 'createdAt' | 'updatedAt'>): Certification {
        const cert: Certification = {
            id: `cert_${data.framework.toLowerCase().replace(/\s/g, '_')}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        certifications.set(cert.id, cert);
        console.log(`📜 Certification tracking created: ${cert.framework}`);

        return cert;
    }

    /**
     * Get all certifications
     */
    getCertifications(status?: Certification['status']): Certification[] {
        let certs = Array.from(certifications.values());

        if (status) {
            certs = certs.filter(c => c.status === status);
        }

        return certs.sort((a, b) => {
            if (a.status === 'certified' && b.status !== 'certified') return -1;
            if (a.status !== 'certified' && b.status === 'certified') return 1;
            return a.framework.localeCompare(b.framework);
        });
    }

    /**
     * Get certification by ID
     */
    getCertification(certId: string): Certification | undefined {
        return certifications.get(certId);
    }

    /**
     * Update certification status
     */
    updateStatus(certId: string, status: Certification['status'], data?: {
        certifiedDate?: Date;
        expiryDate?: Date;
        certificateUrl?: string;
    }): boolean {
        const cert = certifications.get(certId);
        if (!cert) return false;

        cert.status = status;
        cert.updatedAt = new Date();

        if (data) {
            if (data.certifiedDate) cert.certifiedDate = data.certifiedDate;
            if (data.expiryDate) cert.expiryDate = data.expiryDate;
            if (data.certificateUrl) cert.certificateUrl = data.certificateUrl;

            // Calculate renewal date (typically 2 months before expiry)
            if (data.expiryDate) {
                cert.renewalDate = new Date(data.expiryDate);
                cert.renewalDate.setMonth(cert.renewalDate.getMonth() - 2);
            }
        }

        return true;
    }

    /**
     * Update readiness score
     */
    updateReadiness(certId: string, score: number, gaps: string[]): boolean {
        const cert = certifications.get(certId);
        if (!cert) return false;

        cert.readinessScore = score;
        cert.gaps = gaps;
        cert.updatedAt = new Date();

        // Create readiness check record
        readinessChecks.push({
            id: `check_${Date.now()}`,
            certificationId: certId,
            checkedAt: new Date(),
            score,
            findings: gaps.map(gap => ({
                category: 'compliance',
                issue: gap,
                severity: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
            })),
        });

        return true;
    }

    /**
     * Add milestone
     */
    addMilestone(milestone: Omit<CertificationMilestone, 'status'>): CertificationMilestone {
        const newMilestone: CertificationMilestone = {
            ...milestone,
            status: 'pending',
        };

        const id = `milestone_${Date.now()}`;
        milestones.set(id, newMilestone);

        return newMilestone;
    }

    /**
     * Get milestones for certification
     */
    getMilestones(certId: string): CertificationMilestone[] {
        return Array.from(milestones.values())
            .filter(m => m.certificationId === certId)
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }

    /**
     * Update milestone status
     */
    updateMilestone(milestoneKey: string, status: CertificationMilestone['status']): boolean {
        const milestone = milestones.get(milestoneKey);
        if (!milestone) return false;

        milestone.status = status;
        if (status === 'completed') {
            milestone.completedDate = new Date();
        }

        return true;
    }

    /**
     * Get certifications needing renewal
     */
    getRenewalAlerts(daysAhead: number = 60): Certification[] {
        const now = new Date();
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        return Array.from(certifications.values())
            .filter(c => c.renewalDate && c.renewalDate >= now && c.renewalDate <= futureDate)
            .sort((a, b) => a.renewalDate!.getTime() - b.renewalDate!.getTime());
    }

    /**
     * Get expired certifications
     */
    getExpiredCertifications(): Certification[] {
        const now = new Date();

        return Array.from(certifications.values())
            .filter(c => c.expiryDate && c.expiryDate < now && c.status !== 'expired')
            .map(c => {
                c.status = 'expired';
                return c;
            });
    }

    /**
     * Calculate overall readiness
     */
    getOverallReadiness(): {
        averageScore: number;
        certifications: {
            framework: string;
            score: number;
            status: string;
        }[];
        upcomingRenewals: number;
        activeCertifications: number;
    } {
        const allCerts = Array.from(certifications.values());
        const activeCerts = allCerts.filter(c => c.status === 'in_progress' || c.status === 'certified');

        const averageScore = activeCerts.length > 0
            ? Math.round(activeCerts.reduce((sum, c) => sum + c.readinessScore, 0) / activeCerts.length)
            : 0;

        return {
            averageScore,
            certifications: allCerts.map(c => ({
                framework: c.framework,
                score: c.readinessScore,
                status: c.status,
            })),
            upcomingRenewals: this.getRenewalAlerts().length,
            activeCertifications: allCerts.filter(c => c.status === 'certified').length,
        };
    }

    /**
     * Get readiness history
     */
    getReadinessHistory(certId: string): ReadinessCheck[] {
        return readinessChecks
            .filter(c => c.certificationId === certId)
            .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime());
    }

    /**
     * Get certification dashboard data
     */
    getDashboard() {
        const allCerts = Array.from(certifications.values());

        return {
            totalCertifications: allCerts.length,
            certified: allCerts.filter(c => c.status === 'certified').length,
            inProgress: allCerts.filter(c => c.status === 'in_progress').length,
            expired: allCerts.filter(c => c.status === 'expired').length,
            averageReadiness: this.getOverallReadiness().averageScore,
            upcomingRenewals: this.getRenewalAlerts(60),
            upcomingMilestones: Array.from(milestones.values())
                .filter(m => m.status === 'pending' || m.status === 'in_progress')
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                .slice(0, 5),
        };
    }
}

export default new CertificationManagementService();
