import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    Severity,
    SarifLevel,
    mapLevelToSeverity,
    extractCveId,
    formatLocation,
    parseSarifContent,
    generateMarkdownSummary,
    generateNoFindingsSummary,
    VulnerabilitySummary
} from '../../../src/MicrosoftSecurityDevOps/v2/pipeline-summary';

describe('Pipeline Summary Tests', () => {
    
    describe('mapLevelToSeverity', () => {
        it('should map error level to High severity', () => {
            const result = mapLevelToSeverity('error');
            assert.equal(result, Severity.High);
        });

        it('should map warning level to Medium severity', () => {
            const result = mapLevelToSeverity('warning');
            assert.equal(result, Severity.Medium);
        });

        it('should map note level to Low severity', () => {
            const result = mapLevelToSeverity('note');
            assert.equal(result, Severity.Low);
        });

        it('should map none level to Low severity', () => {
            const result = mapLevelToSeverity('none');
            assert.equal(result, Severity.Low);
        });

        it('should return Unknown for undefined level', () => {
            const result = mapLevelToSeverity(undefined);
            assert.equal(result, Severity.Unknown);
        });

        it('should return Unknown for invalid level', () => {
            const result = mapLevelToSeverity('invalid');
            assert.equal(result, Severity.Unknown);
        });

        it('should use properties.severity if available (critical)', () => {
            const result = mapLevelToSeverity('warning', { severity: 'critical' });
            assert.equal(result, Severity.Critical);
        });

        it('should use properties.severity if available (high)', () => {
            const result = mapLevelToSeverity('note', { severity: 'high' });
            assert.equal(result, Severity.High);
        });

        it('should use properties.severity if available (medium)', () => {
            const result = mapLevelToSeverity('error', { severity: 'medium' });
            assert.equal(result, Severity.Medium);
        });

        it('should use properties.severity if available (low)', () => {
            const result = mapLevelToSeverity('error', { severity: 'low' });
            assert.equal(result, Severity.Low);
        });

        it('should be case-insensitive for level', () => {
            const result = mapLevelToSeverity('ERROR');
            assert.equal(result, Severity.High);
        });

        it('should be case-insensitive for properties.severity', () => {
            const result = mapLevelToSeverity('note', { severity: 'CRITICAL' });
            assert.equal(result, Severity.Critical);
        });
    });

    describe('extractCveId', () => {
        it('should extract CVE from properties.cveId', () => {
            const result = extractCveId('rule-123', { cveId: 'CVE-2023-12345' });
            assert.equal(result, 'CVE-2023-12345');
        });

        it('should extract CVE from rule ID', () => {
            const result = extractCveId('CVE-2023-67890');
            assert.equal(result, 'CVE-2023-67890');
        });

        it('should extract CVE from rule ID with prefix', () => {
            const result = extractCveId('npm-CVE-2023-11111-high');
            assert.equal(result, 'CVE-2023-11111');
        });

        it('should return undefined when no CVE found', () => {
            const result = extractCveId('some-rule-id');
            assert.equal(result, undefined);
        });

        it('should return undefined for undefined ruleId', () => {
            const result = extractCveId(undefined);
            assert.equal(result, undefined);
        });

        it('should normalize CVE to uppercase', () => {
            const result = extractCveId('cve-2023-12345');
            assert.equal(result, 'CVE-2023-12345');
        });

        it('should prefer properties.cveId over rule ID', () => {
            const result = extractCveId('CVE-2023-11111', { cveId: 'CVE-2023-22222' });
            assert.equal(result, 'CVE-2023-22222');
        });
    });

    describe('formatLocation', () => {
        it('should format location with file and line', () => {
            const locations = [{
                physicalLocation: {
                    artifactLocation: { uri: 'src/app.ts' },
                    region: { startLine: 42 }
                }
            }];
            const result = formatLocation(locations);
            assert.equal(result, 'src/app.ts:42');
        });

        it('should format location with file only', () => {
            const locations = [{
                physicalLocation: {
                    artifactLocation: { uri: 'package.json' }
                }
            }];
            const result = formatLocation(locations);
            assert.equal(result, 'package.json');
        });

        it('should return undefined for empty locations array', () => {
            const result = formatLocation([]);
            assert.equal(result, undefined);
        });

        it('should return undefined for undefined locations', () => {
            const result = formatLocation(undefined);
            assert.equal(result, undefined);
        });

        it('should return undefined when physicalLocation is missing', () => {
            const locations = [{}];
            const result = formatLocation(locations as any);
            assert.equal(result, undefined);
        });

        it('should return undefined when artifactLocation is missing', () => {
            const locations = [{
                physicalLocation: {}
            }];
            const result = formatLocation(locations as any);
            assert.equal(result, undefined);
        });
    });

    describe('parseSarifContent', () => {
        it('should parse valid SARIF with vulnerabilities', () => {
            const sarif = {
                $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
                version: '2.1.0',
                runs: [{
                    tool: {
                        driver: {
                            name: 'test-tool',
                            rules: [{
                                id: 'rule-1',
                                shortDescription: { text: 'Test rule' },
                                defaultConfiguration: { level: 'error' }
                            }]
                        }
                    },
                    results: [
                        {
                            ruleId: 'rule-1',
                            message: { text: 'Vulnerability found' },
                            level: 'error',
                            locations: [{
                                physicalLocation: {
                                    artifactLocation: { uri: 'src/app.ts' },
                                    region: { startLine: 10 }
                                }
                            }]
                        }
                    ]
                }]
            };

            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.total, 1);
            assert.equal(result.high, 1);
            assert.equal(result.vulnerabilities.length, 1);
            assert.equal(result.vulnerabilities[0].ruleId, 'rule-1');
            assert.equal(result.vulnerabilities[0].location, 'src/app.ts:10');
        });

        it('should parse SARIF with multiple severity levels', () => {
            const sarif = {
                version: '2.1.0',
                runs: [{
                    results: [
                        { ruleId: 'crit-1', message: { text: 'Critical' }, properties: { severity: 'critical' } },
                        { ruleId: 'high-1', message: { text: 'High' }, level: 'error' },
                        { ruleId: 'med-1', message: { text: 'Medium' }, level: 'warning' },
                        { ruleId: 'low-1', message: { text: 'Low' }, level: 'note' }
                    ]
                }]
            };

            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.total, 4);
            assert.equal(result.critical, 1);
            assert.equal(result.high, 1);
            assert.equal(result.medium, 1);
            assert.equal(result.low, 1);
        });

        it('should return empty summary for invalid JSON', () => {
            const result = parseSarifContent('not valid json');
            
            assert.equal(result.total, 0);
            assert.equal(result.vulnerabilities.length, 0);
        });

        it('should return empty summary for SARIF without runs', () => {
            const sarif = { version: '2.1.0' };
            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.total, 0);
        });

        it('should return empty summary for SARIF with empty runs', () => {
            const sarif = { version: '2.1.0', runs: [] };
            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.total, 0);
        });

        it('should handle SARIF with no results', () => {
            const sarif = {
                version: '2.1.0',
                runs: [{ tool: { driver: { name: 'test' } } }]
            };
            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.total, 0);
        });

        it('should extract CVE from rule ID', () => {
            const sarif = {
                version: '2.1.0',
                runs: [{
                    results: [{
                        ruleId: 'CVE-2023-12345',
                        message: { text: 'CVE vulnerability' },
                        level: 'error'
                    }]
                }]
            };

            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.vulnerabilities[0].cveId, 'CVE-2023-12345');
        });

        it('should use rule shortDescription when message is missing', () => {
            const sarif = {
                version: '2.1.0',
                runs: [{
                    tool: {
                        driver: {
                            rules: [{
                                id: 'rule-1',
                                shortDescription: { text: 'Rule description from tool' }
                            }]
                        }
                    },
                    results: [{
                        ruleId: 'rule-1',
                        level: 'warning'
                    }]
                }]
            };

            const result = parseSarifContent(JSON.stringify(sarif));
            
            assert.equal(result.vulnerabilities[0].message, 'Rule description from tool');
        });
    });

    describe('generateMarkdownSummary', () => {
        it('should generate markdown with vulnerability counts', () => {
            const summary: VulnerabilitySummary = {
                total: 22,
                critical: 2,
                high: 5,
                medium: 12,
                low: 3,
                unknown: 0,
                vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'fs', '/build/sources', true);
            
            assert.ok(result.includes('# Microsoft Defender for DevOps Scan Results'));
            assert.ok(result.includes('| 🔴 Critical | 2 |'));
            assert.ok(result.includes('| 🟠 High | 5 |'));
            assert.ok(result.includes('| 🟡 Medium | 12 |'));
            assert.ok(result.includes('| 🟢 Low | 3 |'));
            assert.ok(result.includes('**Total Vulnerabilities**: 22'));
        });

        it('should include critical/high findings section when present', () => {
            const summary: VulnerabilitySummary = {
                total: 2,
                critical: 1,
                high: 1,
                medium: 0,
                low: 0,
                unknown: 0,
                vulnerabilities: [
                    { ruleId: 'rule-1', message: 'Critical issue', severity: Severity.Critical, cveId: 'CVE-2023-12345', location: 'src/app.ts:10' },
                    { ruleId: 'rule-2', message: 'High issue', severity: Severity.High, location: 'package.json' }
                ]
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', true);
            
            assert.ok(result.includes('## Critical and High Findings'));
            assert.ok(result.includes('CVE-2023-12345'));
            assert.ok(result.includes('`src/app.ts:10`'));
        });

        it('should not include critical/high findings section when none present', () => {
            const summary: VulnerabilitySummary = {
                total: 2,
                critical: 0,
                high: 0,
                medium: 1,
                low: 1,
                unknown: 0,
                vulnerabilities: [
                    { ruleId: 'rule-1', message: 'Medium issue', severity: Severity.Medium },
                    { ruleId: 'rule-2', message: 'Low issue', severity: Severity.Low }
                ]
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', false);
            
            assert.ok(!result.includes('## Critical and High Findings'));
        });

        it('should format scan type correctly for filesystem', () => {
            const summary: VulnerabilitySummary = {
                total: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', false);
            
            assert.ok(result.includes('**Scan Type**: Filesystem'));
        });

        it('should format scan type correctly for image', () => {
            const summary: VulnerabilitySummary = {
                total: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'image', 'nginx:latest', false);
            
            assert.ok(result.includes('**Scan Type**: Container Image'));
        });

        it('should format scan type correctly for model', () => {
            const summary: VulnerabilitySummary = {
                total: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'model', '/models/mymodel', false);
            
            assert.ok(result.includes('**Scan Type**: AI Model'));
        });

        it('should show passed status when no critical/high vulnerabilities', () => {
            const summary: VulnerabilitySummary = {
                total: 5, critical: 0, high: 0, medium: 3, low: 2, unknown: 0, vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', false);
            
            assert.ok(result.includes('✅ Passed'));
        });

        it('should show failed status when critical/high vulnerabilities exist', () => {
            const summary: VulnerabilitySummary = {
                total: 5, critical: 1, high: 0, medium: 2, low: 2, unknown: 0, vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', true);
            
            assert.ok(result.includes('❌ Failed'));
        });

        it('should include unknown severity count when present', () => {
            const summary: VulnerabilitySummary = {
                total: 3, critical: 0, high: 0, medium: 1, low: 1, unknown: 1, vulnerabilities: []
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', false);
            
            assert.ok(result.includes('| ⚪ Unknown | 1 |'));
        });

        it('should limit critical/high findings to 20 entries', () => {
            const vulnerabilities = [];
            for (let i = 0; i < 25; i++) {
                vulnerabilities.push({
                    ruleId: `rule-${i}`,
                    message: `Critical issue ${i}`,
                    severity: Severity.Critical
                });
            }

            const summary: VulnerabilitySummary = {
                total: 25, critical: 25, high: 0, medium: 0, low: 0, unknown: 0, vulnerabilities
            };

            const result = generateMarkdownSummary(summary, 'fs', '/src', true);
            
            assert.ok(result.includes('... and 5 more'));
        });
    });

    describe('generateNoFindingsSummary', () => {
        it('should generate summary for no findings', () => {
            const result = generateNoFindingsSummary('fs', '/src');
            
            assert.ok(result.includes('# Microsoft Defender for DevOps Scan Results'));
            assert.ok(result.includes('✅ **No vulnerabilities found!**'));
            assert.ok(result.includes('**Scan Type**: Filesystem'));
            assert.ok(result.includes('✅ Passed'));
        });

        it('should include target in summary', () => {
            const result = generateNoFindingsSummary('image', 'nginx:latest');
            
            assert.ok(result.includes('`nginx:latest`'));
        });
    });
});
