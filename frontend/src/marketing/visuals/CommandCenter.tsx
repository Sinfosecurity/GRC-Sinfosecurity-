export default function CommandCenter() {
    return (
        <aside className="mkt-command" aria-label="Supreme Governance Command Center preview">
            <div className="mkt-command-head">
                <div>
                    <p className="mkt-kicker">Governance Command Center</p>
                    <strong>Illustrative workspace composition</strong>
                </div>
                <span className="mkt-pill">Sample pattern</span>
            </div>
            <div className="mkt-command-grid">
                <div className="mkt-tile">
                    <h3>Enterprise posture</h3>
                    <div className="mkt-score">48</div>
                    <p>Residual band MEDIUM</p>
                    <div className="mkt-meter" aria-hidden="true"><span style={{ width: '48%' }} /></div>
                </div>
                <div className="mkt-tile">
                    <h3>Critical vendors</h3>
                    <div className="mkt-row"><strong>Northwind Cloud</strong><span>49</span></div>
                    <div className="mkt-row"><strong>Helios Payroll</strong><span>72</span></div>
                    <div className="mkt-row"><strong>Harbor Analytics</strong><span>38</span></div>
                </div>
                <div className="mkt-tile">
                    <h3>Needs attention</h3>
                    <div className="mkt-row"><strong>SOC 2 expired</strong><span>Evidence</span></div>
                    <div className="mkt-row"><strong>Finding overdue</strong><span>Escalate</span></div>
                    <div className="mkt-row"><strong>Approval pending</strong><span>Decision</span></div>
                </div>
                <div className="mkt-tile">
                    <h3>Compliance</h3>
                    <div className="mkt-row"><span>Mapped controls</span><strong>Preview</strong></div>
                    <div className="mkt-meter" aria-hidden="true"><span style={{ width: '62%' }} /></div>
                </div>
                <div className="mkt-tile">
                    <h3>AI / Privacy risk</h3>
                    <div className="mkt-row"><span>AI inventory</span><strong>Roadmap</strong></div>
                    <div className="mkt-row"><span>Privacy linkage</span><strong>Roadmap</strong></div>
                </div>
                <div className="mkt-tile">
                    <h3>Control effectiveness</h3>
                    <div className="mkt-row"><span>Evidence reused</span><strong>Yes</strong></div>
                    <div className="mkt-row"><span>Fail-closed download</span><strong>On</strong></div>
                </div>
            </div>
        </aside>
    );
}
