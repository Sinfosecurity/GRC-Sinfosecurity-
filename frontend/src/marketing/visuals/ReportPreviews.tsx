const REPORTS = [
    {
        name: 'Board Report',
        lines: ['Residual posture: MEDIUM', 'Vendors requiring notice: 2', 'Open decisions: 1', 'Evidence gaps: 3'],
    },
    {
        name: 'Executive Report',
        lines: ['Explainable scores by owner', 'Findings aging past SLA', 'Evidence last refreshed', 'Next brief due'],
    },
    {
        name: 'Vendor Scorecard',
        lines: ['Northwind Cloud', 'Residual 49 · MEDIUM', 'Assessment complete', 'SOC 2 evidence aging'],
    },
    {
        name: 'Risk Decision Brief',
        lines: ['Approve with conditions', 'Updated SOC 2 required', 'MFA evidence required', 'Snapshot immutable'],
    },
];

export default function ReportPreviews() {
    return (
        <div className="mkt-report-grid">
            {REPORTS.map((report) => (
                <article key={report.name} className="mkt-report">
                    <small>Supreme report</small>
                    <h3>{report.name}</h3>
                    {report.lines.map((line) => (
                        <div className="mkt-factor" key={line}><span>{line}</span></div>
                    ))}
                </article>
            ))}
        </div>
    );
}
