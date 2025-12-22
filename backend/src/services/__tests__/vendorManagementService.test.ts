/**
 * Unit Tests for Vendor Management Service
 * Testing TPRM core functionality
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import vendorManagementService from '../vendorManagementService';

describe('VendorManagementService', () => {
    const mockOrganizationId = 'org_test_123';
    let testVendorId: string;

    beforeEach(() => {
        // Reset state before each test
        // In production, use proper test database setup/teardown
    });

    describe('Vendor Creation', () => {
        test('should create a new vendor with valid data', () => {
            const vendorData = {
                name: 'Test Vendor Inc',
                category: 'Cloud Services',
                tier: 'Critical' as const,
                organizationId: mockOrganizationId,
                website: 'https://testvendor.com',
                primaryContact: 'contact@testvendor.com',
                businessOwner: 'John Doe',
                dataCategories: ['Customer PII', 'Financial Data'],
                services: ['Cloud Storage', 'Data Processing']
            };

            const vendor = vendorManagementService.createVendor(vendorData);
            testVendorId = vendor.id;

            expect(vendor).toBeDefined();
            expect(vendor.id).toMatch(/^vendor_/);
            expect(vendor.name).toBe('Test Vendor Inc');
            expect(vendor.tier).toBe('Critical');
            expect(vendor.status).toBe('Active');
            expect(vendor.inherentRiskScore).toBeGreaterThan(0);
        });

        test('should reject vendor with missing required fields', () => {
            const invalidData = {
                name: 'Test Vendor',
                // Missing required fields
            } as any;

            expect(() => {
                vendorManagementService.createVendor(invalidData);
            }).toThrow();
        });

        test('should calculate risk score based on tier', () => {
            const criticalVendor = vendorManagementService.createVendor({
                name: 'Critical Vendor',
                category: 'Payment Processing',
                tier: 'Critical',
                organizationId: mockOrganizationId,
                website: 'https://critical.com',
                primaryContact: 'contact@critical.com',
                dataCategories: [],
                services: []
            });

            const lowVendor = vendorManagementService.createVendor({
                name: 'Low Risk Vendor',
                category: 'Marketing',
                tier: 'Low',
                organizationId: mockOrganizationId,
                website: 'https://lowrisk.com',
                primaryContact: 'contact@lowrisk.com',
                dataCategories: [],
                services: []
            });

            expect(criticalVendor.inherentRiskScore).toBeGreaterThan(lowVendor.inherentRiskScore);
        });
    });

    describe('Vendor Retrieval', () => {
        test('should retrieve all vendors for organization', () => {
            const vendors = vendorManagementService.getVendors(mockOrganizationId);
            expect(Array.isArray(vendors)).toBe(true);
        });

        test('should filter vendors by tier', () => {
            const criticalVendors = vendorManagementService.getVendors(
                mockOrganizationId,
                { tier: 'Critical' }
            );
            
            criticalVendors.forEach((vendor: any) => {
                expect(vendor.tier).toBe('Critical');
            });
        });

        test('should filter vendors by status', () => {
            const activeVendors = vendorManagementService.getVendors(
                mockOrganizationId,
                { status: 'Active' }
            );
            
            activeVendors.forEach((vendor: any) => {
                expect(vendor.status).toBe('Active');
            });
        });

        test('should retrieve vendor by ID', () => {
            // First create a vendor
            const newVendor = vendorManagementService.createVendor({
                name: 'Retrievable Vendor',
                category: 'IT Services',
                tier: 'Medium',
                organizationId: mockOrganizationId,
                website: 'https://retrievable.com',
                primaryContact: 'contact@retrievable.com',
                dataCategories: [],
                services: []
            });

            const retrieved = vendorManagementService.getVendorById(newVendor.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(newVendor.id);
            expect(retrieved?.name).toBe('Retrievable Vendor');
        });

        test('should return undefined for non-existent vendor', () => {
            const nonExistent = vendorManagementService.getVendorById('vendor_nonexistent');
            expect(nonExistent).toBeUndefined();
        });
    });

    describe('Vendor Updates', () => {
        test('should update vendor information', () => {
            // Create vendor
            const vendor = vendorManagementService.createVendor({
                name: 'Updatable Vendor',
                category: 'Analytics',
                tier: 'Medium',
                organizationId: mockOrganizationId,
                website: 'https://updatable.com',
                primaryContact: 'old@updatable.com',
                dataCategories: [],
                services: []
            });

            // Update vendor
            const updated = vendorManagementService.updateVendor(vendor.id, {
                primaryContact: 'new@updatable.com',
                tier: 'High'
            });

            expect(updated).toBeDefined();
            expect(updated?.primaryContact).toBe('new@updatable.com');
            expect(updated?.tier).toBe('High');
        });

        test('should recalculate risk score when tier changes', () => {
            const vendor = vendorManagementService.createVendor({
                name: 'Risk Recalc Vendor',
                category: 'Security',
                tier: 'Low',
                organizationId: mockOrganizationId,
                website: 'https://riskrecalc.com',
                primaryContact: 'contact@riskrecalc.com',
                dataCategories: [],
                services: []
            });

            const originalRiskScore = vendor.inherentRiskScore;

            const updated = vendorManagementService.updateVendor(vendor.id, {
                tier: 'Critical'
            });

            expect(updated?.inherentRiskScore).toBeGreaterThan(originalRiskScore);
        });
    });

    describe('Vendor Statistics', () => {
        test('should calculate vendor statistics', () => {
            const stats = vendorManagementService.getStatistics(mockOrganizationId);

            expect(stats).toHaveProperty('totalVendors');
            expect(stats).toHaveProperty('activeVendors');
            expect(stats).toHaveProperty('tierDistribution');
            expect(stats).toHaveProperty('statusDistribution');
            expect(stats).toHaveProperty('averageRiskScore');
        });

        test('should identify vendors requiring attention', () => {
            const needsAttention = vendorManagementService.getVendorsRequiringAttention(
                mockOrganizationId
            );

            expect(Array.isArray(needsAttention)).toBe(true);
        });
    });

    describe('Vendor Offboarding', () => {
        test('should offboard vendor successfully', () => {
            const vendor = vendorManagementService.createVendor({
                name: 'Offboard Vendor',
                category: 'Temporary Services',
                tier: 'Low',
                organizationId: mockOrganizationId,
                website: 'https://offboard.com',
                primaryContact: 'contact@offboard.com',
                dataCategories: [],
                services: []
            });

            const offboarded = vendorManagementService.offboardVendor(
                vendor.id,
                'Contract ended',
                'admin_123'
            );

            expect(offboarded).toBeDefined();
            expect(offboarded?.status).toBe('Offboarded');
            expect(offboarded?.offboardedAt).toBeDefined();
            expect(offboarded?.offboardingReason).toBe('Contract ended');
        });

        test('should not allow offboarding critical vendors without proper authorization', () => {
            const criticalVendor = vendorManagementService.createVendor({
                name: 'Critical Vendor',
                category: 'Core Services',
                tier: 'Critical',
                organizationId: mockOrganizationId,
                website: 'https://critical.com',
                primaryContact: 'contact@critical.com',
                dataCategories: ['Customer Data'],
                services: ['Core Processing']
            });

            // In production, this should check authorization level
            expect(() => {
                vendorManagementService.offboardVendor(
                    criticalVendor.id,
                    'Test offboarding',
                    'unauthorized_user'
                );
            }).toThrow(/Critical vendors require executive approval/);
        });
    });

    describe('Risk Score Calculation', () => {
        test('should calculate higher risk for vendors with sensitive data', () => {
            const sensitiveVendor = vendorManagementService.createVendor({
                name: 'Sensitive Data Vendor',
                category: 'Data Processing',
                tier: 'High',
                organizationId: mockOrganizationId,
                website: 'https://sensitive.com',
                primaryContact: 'contact@sensitive.com',
                dataCategories: ['Customer PII', 'Financial Data', 'Health Records'],
                services: ['Data Processing']
            });

            const lowDataVendor = vendorManagementService.createVendor({
                name: 'Low Data Vendor',
                category: 'Marketing',
                tier: 'High',
                organizationId: mockOrganizationId,
                website: 'https://lowdata.com',
                primaryContact: 'contact@lowdata.com',
                dataCategories: [],
                services: ['Marketing']
            });

            expect(sensitiveVendor.inherentRiskScore).toBeGreaterThan(lowDataVendor.inherentRiskScore);
        });
    });

    describe('Review Date Calculation', () => {
        test('should schedule more frequent reviews for critical vendors', () => {
            const criticalVendor = vendorManagementService.createVendor({
                name: 'Critical Review Vendor',
                category: 'Payment Processing',
                tier: 'Critical',
                organizationId: mockOrganizationId,
                website: 'https://criticalreview.com',
                primaryContact: 'contact@criticalreview.com',
                dataCategories: [],
                services: []
            });

            const lowVendor = vendorManagementService.createVendor({
                name: 'Low Review Vendor',
                category: 'Marketing',
                tier: 'Low',
                organizationId: mockOrganizationId,
                website: 'https://lowreview.com',
                primaryContact: 'contact@lowreview.com',
                dataCategories: [],
                services: []
            });

            const criticalReviewDate = new Date(criticalVendor.nextReviewDate);
            const lowReviewDate = new Date(lowVendor.nextReviewDate);
            const now = new Date();

            const criticalDaysDiff = Math.ceil((criticalReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const lowDaysDiff = Math.ceil((lowReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            expect(criticalDaysDiff).toBeLessThan(lowDaysDiff);
        });
    });
});

// Export for test runner
export default describe;
