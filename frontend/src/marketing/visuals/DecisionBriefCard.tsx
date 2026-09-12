export default function DecisionBriefCard() {
    return (
        <div className="mkt-paper" aria-label="Decision brief preview">
            <p className="mkt-kicker" style={{ color: '#8a6d38' }}>Risk Decision Brief</p>
            <h3>Northwind Cloud</h3>
            <div className="mkt-factor"><span>Residual risk</span><strong>49 — MEDIUM</strong></div>
            <div className="mkt-factor"><span>Evidence confidence</span><strong>Partial</strong></div>
            <div className="mkt-factor"><span>Open findings</span><strong>1</strong></div>
            <div className="mkt-factor"><span>AI analysis</span><strong>Advisory only</strong></div>
            <div className="mkt-factor"><span>Human recommendation</span><strong>Approve with conditions</strong></div>
            <p><strong>Decision:</strong> APPROVE WITH CONDITIONS</p>
            <ol>
                <li>Updated SOC 2</li>
                <li>MFA evidence</li>
            </ol>
            <p>Approver recorded. Snapshot immutable. Residual score does not change because a brief was filed.</p>
        </div>
    );
}
