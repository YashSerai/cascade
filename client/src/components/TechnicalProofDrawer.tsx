import type { MissionBrief, MissionRun } from "../../../shared/types";
import { formatTimeLabel, getModelLabel, getModelLane, getVerificationCommand } from "../presentation";

interface TechnicalProofDrawerProps {
  brief: MissionBrief;
  mission: MissionRun;
  open: boolean;
  onClose: () => void;
}

export function TechnicalProofDrawer({ brief, mission, open, onClose }: TechnicalProofDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="proof-drawer" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="drawer-header">
          <div>
            <p className="section-tag">Behind the Scenes</p>
            <h2>The full mission record.</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="drawer-grid">
          <article className="drawer-card">
            <h3>Repo profile</h3>
            <ul className="drawer-list">
              <li>
                <strong>Repo</strong>
                <span>{brief.repoTarget.repoUrl}</span>
              </li>
              <li>
                <strong>Framework</strong>
                <span>{brief.repoScan.framework}</span>
              </li>
              <li>
                <strong>Package manager</strong>
                <span>{brief.repoScan.packageManager}</span>
              </li>
              <li>
                <strong>Model lane</strong>
                <span>{getModelLane(brief)}</span>
              </li>
              <li>
                <strong>Model</strong>
                <span>{getModelLabel(brief)}</span>
              </li>
              <li>
                <strong>Verification command</strong>
                <span>{getVerificationCommand(brief)}</span>
              </li>
            </ul>
          </article>

          <article className="drawer-card">
            <h3>Execution plan</h3>
            {mission.artifacts.executionPlan ? (
              <div className="drawer-stack">
                <p>{mission.artifacts.executionPlan.approach}</p>
                <div>
                  <strong>Target files</strong>
                  <ul className="drawer-bullets">
                    {mission.artifacts.executionPlan.targetFiles.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Verification strategy</strong>
                  <ul className="drawer-bullets">
                    {mission.artifacts.executionPlan.verificationStrategy.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="empty-state">The execution plan will appear here once the route is formalized.</p>
            )}
          </article>

          <article className="drawer-card">
            <h3>Changed files</h3>
            <ul className="drawer-bullets">
              {mission.artifacts.changedFiles.length > 0 ? (
                mission.artifacts.changedFiles.map((file) => (
                  <li key={file.path}>
                    {file.path} - {file.summary}
                  </li>
                ))
              ) : (
                <li>No changed files yet.</li>
              )}
            </ul>
          </article>

          <article className="drawer-card">
            <h3>Checks</h3>
            <ul className="drawer-bullets">
              {mission.artifacts.checks.length > 0 ? (
                mission.artifacts.checks.map((check) => (
                  <li key={`${check.name}-${check.status}`}>
                    {check.name} - {check.status}
                    {check.command ? ` (${check.command})` : ""}
                  </li>
                ))
              ) : (
                <li>No checks recorded yet.</li>
              )}
            </ul>
          </article>

          <article className="drawer-card">
            <h3>Important files</h3>
            <ul className="drawer-bullets">
              {brief.repoScan.importantFiles.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </article>

          <article className="drawer-card">
            <h3>Risks and live logs</h3>
            <div className="drawer-stack">
              <ul className="drawer-bullets">
                {brief.repoScan.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
              <div className="log-stack">
                {mission.artifacts.logs.slice(-6).reverse().map((log) => (
                  <article key={`${log.timestamp}-${log.message}`} className={`drawer-log ${log.level}`}>
                    <span>{formatTimeLabel(log.timestamp)}</span>
                    <p>{log.message}</p>
                  </article>
                ))}
              </div>
            </div>
          </article>
        </div>
      </aside>
    </div>
  );
}
