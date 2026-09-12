const NODES = [
    'Vendor',
    'Application',
    'Data',
    'Control',
    'Regulation',
    'Risk',
    'Finding',
    'Decision',
];

export default function GovernanceGraph() {
    const start = 70;
    const step = 136;
    const y = 70;

    return (
        <div className="mkt-graph" role="img" aria-label="Vendor connected to application, data, control, regulation, risk, finding, and decision">
            <svg viewBox="0 0 1180 150" xmlns="http://www.w3.org/2000/svg">
                <line x1={start} y1={y} x2={start + step * (NODES.length - 1)} y2={y} stroke="#c6a46b" strokeOpacity="0.55" strokeWidth="1.2" />
                {NODES.map((label, index) => {
                    const x = start + step * index;
                    const last = index === NODES.length - 1;
                    return (
                        <g key={label}>
                            {!last && (
                                <polygon
                                    points={`${x + 58},${y - 4} ${x + 68},${y} ${x + 58},${y + 4}`}
                                    fill="#c6a46b"
                                    opacity="0.7"
                                />
                            )}
                            <circle cx={x} cy={y} r={last ? 11 : 8} fill="#101924" stroke="#c6a46b" strokeWidth="1.4" />
                            <text
                                x={x}
                                y={y + 36}
                                textAnchor="middle"
                                fill="#f4efe6"
                                fontSize="13"
                                fontFamily="Source Sans 3, sans-serif"
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <ol className="mkt-graph-list">
                {NODES.map((label) => (
                    <li key={label}>{label}</li>
                ))}
            </ol>
        </div>
    );
}
