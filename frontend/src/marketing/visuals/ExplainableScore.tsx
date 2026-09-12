const FACTORS = [
    { label: 'Business criticality', value: '+20', kind: 'plus' as const },
    { label: 'Sensitive data', value: '+18', kind: 'plus' as const },
    { label: 'Privileged access', value: '+15', kind: 'plus' as const },
    { label: 'Expired evidence', value: '+10', kind: 'plus' as const },
    { label: 'Strong MFA', value: '−7', kind: 'minus' as const },
];

export default function ExplainableScore() {
    return (
        <div className="mkt-paper" aria-label="Explainable residual risk example">
            <p className="mkt-kicker">Why is this vendor high risk?</p>
            <h3>Illustrative residual calculation</h3>
            {FACTORS.map((factor) => (
                <div className="mkt-factor" key={factor.label}>
                    <span>{factor.label}</span>
                    <span className={factor.kind === 'plus' ? 'mkt-plus' : 'mkt-minus'}>{factor.value}</span>
                </div>
            ))}
            <div className="mkt-factor">
                <strong>Residual risk</strong>
                <strong>56 — HIGH</strong>
            </div>
            <p>What changed? Expired SOC 2 evidence entered the score.</p>
            <p>What can lower this score? Current attestation and MFA evidence.</p>
            <p>Who owns remediation? Vendor owner, with a recorded CAP.</p>
            <p>What decision is required? Approve with conditions, reject, or accept residual risk.</p>
        </div>
    );
}
