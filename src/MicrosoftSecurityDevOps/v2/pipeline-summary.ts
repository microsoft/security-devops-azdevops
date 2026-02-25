import tl = require('azure-pipelines-task-lib/task');
import * as fs from 'fs';
import * as path from 'path';

/**
 * SARIF result level (severity) mappings
 */
export enum SarifLevel {
    Error = 'error',
    Warning = 'warning',
    Note = 'note',
    None = 'none'
}

/**
 * Vulnerability severity levels
 */
export enum Severity {
    Critical = 'critical',
    High = 'high',
    Medium = 'medium',
    Low = 'low',
    Unknown = 'unknown'
}

/**
 * Represents a parsed vulnerability from SARIF
 */
export interface Vulnerability {
    ruleId: string;
    message: string;
    severity: Severity;
    location?: string;
    cveId?: string;
}

/**
 * Summary statistics for vulnerabilities
 */
export interface VulnerabilitySummary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    vulnerabilities: Vulnerability[];
}

/**
 * SARIF result location interface
 */
interface SarifLocation {
    physicalLocation?: {
        artifactLocation?: {
            uri?: string;
        };
        region?: {
            startLine?: number;
        };
    };
}

/**
 * SARIF result interface
 */
interface SarifResult {
    ruleId?: string;
    message?: {
        text?: string;
    };
    level?: string;
    locations?: SarifLocation[];
    properties?: {
        severity?: string;
        cveId?: string;
        [key: string]: unknown;
    };
}

/**
 * SARIF rule interface
 */
interface SarifRule {
    id: string;
    shortDescription?: {
        text?: string;
    };
    defaultConfiguration?: {
        level?: string;
    };
    properties?: {
        severity?: string;
        [key: string]: unknown;
    };
}

/**
 * SARIF run interface
 */
interface SarifRun {
    tool?: {
        driver?: {
            name?: string;
            rules?: SarifRule[];
        };
    };
    results?: SarifResult[];
}

/**
 * SARIF document interface
 */
interface SarifDocument {
    $schema?: string;
    version?: string;
    runs?: SarifRun[];
}

/**
 * Maps SARIF level to severity
 * @param level - The SARIF level string
 * @param properties - Optional properties that may contain severity information
 * @returns The mapped Severity enum value
 */
export function mapLevelToSeverity(level: string | undefined, properties?: { severity?: string }): Severity {
    // First check properties.severity if available
    if (properties?.severity) {
        const propSeverity = properties.severity.toLowerCase();
        if (propSeverity === 'critical') return Severity.Critical;
        if (propSeverity === 'high') return Severity.High;
        if (propSeverity === 'medium') return Severity.Medium;
        if (propSeverity === 'low') return Severity.Low;
    }
    
    // Fall back to SARIF level
    switch (level?.toLowerCase()) {
        case SarifLevel.Error:
            return Severity.High; // Error typically maps to High
        case SarifLevel.Warning:
            return Severity.Medium;
        case SarifLevel.Note:
            return Severity.Low;
        case SarifLevel.None:
            return Severity.Low;
        default:
            return Severity.Unknown;
    }
}

/**
 * Extracts CVE ID from rule ID or properties
 * @param ruleId - The rule ID
 * @param properties - Optional result properties
 * @returns The CVE ID if found, undefined otherwise
 */
export function extractCveId(ruleId: string | undefined, properties?: { cveId?: string }): string | undefined {
    if (properties?.cveId) {
        return properties.cveId;
    }
    
    // Try to extract CVE from rule ID (common patterns: CVE-YYYY-NNNNN)
    if (ruleId) {
        const cveMatch = ruleId.match(/CVE-\d{4}-\d+/i);
        if (cveMatch) {
            return cveMatch[0].toUpperCase();
        }
    }
    
    return undefined;
}

/**
 * Formats a location from SARIF into a readable string
 * @param locations - Array of SARIF locations
 * @returns Formatted location string or undefined
 */
export function formatLocation(locations?: SarifLocation[]): string | undefined {
    if (!locations || locations.length === 0) {
        return undefined;
    }
    
    const loc = locations[0];
    const uri = loc.physicalLocation?.artifactLocation?.uri;
    const line = loc.physicalLocation?.region?.startLine;
    
    if (uri) {
        return line ? `${uri}:${line}` : uri;
    }
    
    return undefined;
}

/**
 * Parses a SARIF document and extracts vulnerability information
 * @param sarifContent - The SARIF JSON content as a string
 * @returns VulnerabilitySummary with parsed vulnerability data
 */
export function parseSarifContent(sarifContent: string): VulnerabilitySummary {
    const summary: VulnerabilitySummary = {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unknown: 0,
        vulnerabilities: []
    };
    
    let sarif: SarifDocument;
    try {
        sarif = JSON.parse(sarifContent) as SarifDocument;
    } catch (error) {
        tl.warning(`Failed to parse SARIF content: ${error}`);
        return summary;
    }
    
    if (!sarif.runs || sarif.runs.length === 0) {
        tl.debug('No runs found in SARIF document');
        return summary;
    }
    
    // Build a map of rules for severity lookup
    const rulesMap = new Map<string, SarifRule>();
    
    for (const run of sarif.runs) {
        // Populate rules map
        if (run.tool?.driver?.rules) {
            for (const rule of run.tool.driver.rules) {
                rulesMap.set(rule.id, rule);
            }
        }
        
        // Process results
        if (run.results) {
            for (const result of run.results) {
                const ruleId = result.ruleId || 'unknown';
                const rule = rulesMap.get(ruleId);
                
                // Get severity from result properties, rule properties, or level
                const severity = mapLevelToSeverity(
                    result.level || rule?.defaultConfiguration?.level,
                    result.properties || rule?.properties
                );
                
                const vulnerability: Vulnerability = {
                    ruleId,
                    message: result.message?.text || rule?.shortDescription?.text || 'No description available',
                    severity,
                    location: formatLocation(result.locations),
                    cveId: extractCveId(ruleId, result.properties)
                };
                
                summary.vulnerabilities.push(vulnerability);
                summary.total++;
                
                // Increment severity counters
                switch (severity) {
                    case Severity.Critical:
                        summary.critical++;
                        break;
                    case Severity.High:
                        summary.high++;
                        break;
                    case Severity.Medium:
                        summary.medium++;
                        break;
                    case Severity.Low:
                        summary.low++;
                        break;
                    default:
                        summary.unknown++;
                }
            }
        }
    }
    
    return summary;
}

/**
 * Generates a markdown summary from vulnerability data
 * @param summary - The vulnerability summary
 * @param scanType - The type of scan performed
 * @param target - The scan target
 * @param hasCriticalOrHigh - Whether the scan found critical/high vulnerabilities
 * @returns Markdown formatted string
 */
export function generateMarkdownSummary(
    summary: VulnerabilitySummary,
    scanType: string,
    target: string,
    hasCriticalOrHigh: boolean
): string {
    const lines: string[] = [];
    
    // Header
    lines.push('# Microsoft Defender for DevOps Scan Results');
    lines.push('');
    
    // Summary table
    lines.push('## Summary');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    lines.push(`| 🔴 Critical | ${summary.critical} |`);
    lines.push(`| 🟠 High | ${summary.high} |`);
    lines.push(`| 🟡 Medium | ${summary.medium} |`);
    lines.push(`| 🟢 Low | ${summary.low} |`);
    if (summary.unknown > 0) {
        lines.push(`| ⚪ Unknown | ${summary.unknown} |`);
    }
    lines.push('');
    lines.push(`**Total Vulnerabilities**: ${summary.total}`);
    lines.push('');
    
    // Critical findings section
    if (summary.critical > 0 || summary.high > 0) {
        lines.push('## Critical and High Findings');
        
        const criticalAndHigh = summary.vulnerabilities.filter(
            v => v.severity === Severity.Critical || v.severity === Severity.High
        );
        
        let index = 1;
        for (const vuln of criticalAndHigh.slice(0, 20)) { // Limit to 20 entries
            const severityIcon = vuln.severity === Severity.Critical ? '🔴' : '🟠';
            const identifier = vuln.cveId || vuln.ruleId;
            const location = vuln.location ? ` in \`${vuln.location}\`` : '';
            lines.push(`${index}. ${severityIcon} **${identifier}** - ${vuln.message}${location}`);
            index++;
        }
        
        if (criticalAndHigh.length > 20) {
            lines.push(`... and ${criticalAndHigh.length - 20} more`);
        }
        
        lines.push('');
    }
    
    // Scan details
    lines.push('## Scan Details');
    lines.push(`- **Scan Type**: ${formatScanType(scanType)}`);
    lines.push(`- **Target**: \`${target}\``);
    
    // Status
    const statusIcon = hasCriticalOrHigh ? '❌' : '✅';
    const statusText = hasCriticalOrHigh 
        ? 'Failed (Critical/High vulnerabilities found)' 
        : 'Passed';
    lines.push(`- **Status**: ${statusIcon} ${statusText}`);
    lines.push('');
    
    // Footer
    lines.push('---');
    lines.push('*Generated by Microsoft Defender for DevOps*');
    
    return lines.join('\n');
}

/**
 * Formats the scan type for display
 * @param scanType - The scan type string
 * @returns Human-readable scan type
 */
function formatScanType(scanType: string): string {
    switch (scanType.toLowerCase()) {
        case 'fs':
            return 'Filesystem';
        case 'image':
            return 'Container Image';
        case 'model':
            return 'AI Model';
        default:
            return scanType;
    }
}

/**
 * Posts the vulnerability summary to the Azure DevOps Pipeline Extensions tab
 * @param sarifPath - Path to the SARIF file
 * @param scanType - The type of scan performed
 * @param target - The scan target
 * @returns True if summary was posted successfully, false otherwise
 */
export async function postPipelineSummary(
    sarifPath: string,
    scanType: string,
    target: string
): Promise<boolean> {
    try {
        tl.debug(`Attempting to post pipeline summary from SARIF: ${sarifPath}`);
        
        // Check if SARIF file exists
        if (!fs.existsSync(sarifPath)) {
            tl.warning(`SARIF file not found at ${sarifPath}. Skipping pipeline summary.`);
            return false;
        }
        
        // Read and parse SARIF
        const sarifContent = fs.readFileSync(sarifPath, 'utf8');
        const summary = parseSarifContent(sarifContent);
        
        tl.debug(`Parsed ${summary.total} vulnerabilities from SARIF`);
        
        // Determine if there are critical/high vulnerabilities
        const hasCriticalOrHigh = summary.critical > 0 || summary.high > 0;
        
        // Generate markdown
        const markdown = generateMarkdownSummary(summary, scanType, target, hasCriticalOrHigh);
        
        // Write markdown to staging directory
        const stagingDir = process.env.BUILD_STAGINGDIRECTORY || process.cwd();
        const summaryPath = path.join(stagingDir, 'defender-summary.md');
        
        fs.writeFileSync(summaryPath, markdown, 'utf8');
        tl.debug(`Written summary markdown to: ${summaryPath}`);
        
        // Upload summary to Azure DevOps Pipeline Extensions tab
        console.log(`##vso[task.uploadsummary]${summaryPath}`);
        tl.debug('Posted summary to Pipeline Extensions tab');
        
        return true;
    } catch (error) {
        // Summary posting failure should not fail the task
        tl.warning(`Failed to post pipeline summary: ${error}`);
        return false;
    }
}

/**
 * Creates an empty/no-results summary when no vulnerabilities are found
 * @param scanType - The type of scan performed
 * @param target - The scan target
 * @returns Markdown formatted string for no findings
 */
export function generateNoFindingsSummary(scanType: string, target: string): string {
    const lines: string[] = [];
    
    lines.push('# Microsoft Defender for DevOps Scan Results');
    lines.push('');
    lines.push('## Summary');
    lines.push('✅ **No vulnerabilities found!**');
    lines.push('');
    lines.push('## Scan Details');
    lines.push(`- **Scan Type**: ${formatScanType(scanType)}`);
    lines.push(`- **Target**: \`${target}\``);
    lines.push('- **Status**: ✅ Passed');
    lines.push('');
    lines.push('---');
    lines.push('*Generated by Microsoft Defender for DevOps*');
    
    return lines.join('\n');
}
