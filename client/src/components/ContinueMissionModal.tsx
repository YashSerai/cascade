interface ContinueMissionModalProps {
  content: string;
  missionId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ContinueMissionModal({ content, missionId, open, onClose }: ContinueMissionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="continue-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <p className="section-tag">Continue Working</p>
            <h2>Pass the route forward.</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        <textarea readOnly value={content} rows={16} />

        <div className="action-row">
          <button type="button" className="primary-button" onClick={() => navigator.clipboard.writeText(content)}>
            Copy Prompt
          </button>
          {missionId ? (
            <a className="secondary-button" href={`/api/missions/${missionId}/continue.txt`}>
              Download .txt
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
