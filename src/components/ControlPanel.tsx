interface ControlPanelProps {
  onSegUpload: (file: File | null) => void;
  isLoading: boolean;
  segStructures?: any[] | null;
  segmentVisibility?: Record<number, boolean>;
  onToggleSegmentVisibility?: (segmentNumber: number) => void;
  onExportSTL?: (segmentNumber: number) => void;
}

export function ControlPanel({
  onSegUpload,
  isLoading,
  segStructures,
  segmentVisibility,
  onToggleSegmentVisibility,
  onExportSTL,
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      <section className="panel-card">
        <h2>Input & Controls</h2>
        <p>Upload a DICOM SEG file and manage visible structures.</p>

        <button
          className="upload-zone"
          onClick={() => {
            const input = document.getElementById("dicom-seg-upload");
            if (input) input.click();
          }}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M12 4v10m0 0-4-4m4 4 4-4M4 19h16"
            />
          </svg>
          <span>Click to upload DICOM SEG</span>
        </button>

        <input
          id="dicom-seg-upload"
          type="file"
          accept=".dcm"
          onChange={(e) => onSegUpload(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
          disabled={isLoading}
        />

        <p className="input-hint">Accepted format: `.dcm` (DICOM Segmentation)</p>

        {isLoading && (
          <div className="loading-inline" role="status">
            <span className="loading-spinner" />
            <span>Processing data...</span>
          </div>
        )}
      </section>

      {segStructures && segStructures.length > 0 && (
        <section className="panel-card">
          <h2>Segmentation Info</h2>
          <p>Toggle visibility or export each segment as STL.</p>

          <div className="table-shell">
            <table className="segment-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Dims (mm)</th>
                  <th>Volume (cc)</th>
                  <th>Voxels</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {segStructures.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.name}</td>
                    <td>{s.category}</td>
                    <td>{s.dimension_mm.map((d: number) => d.toFixed(2)).join(" x ")}</td>
                    <td>{s.volume_cc.toFixed(3)}</td>
                    <td>{s.voxel_count}</td>
                    <td>
                      <div className="segment-actions">
                        <button
                          className="icon-btn"
                          title={
                            segmentVisibility?.[s.segment_number] !== false
                              ? "Hide segment"
                              : "Show segment"
                          }
                          onClick={() =>
                            onToggleSegmentVisibility &&
                            onToggleSegmentVisibility(s.segment_number)
                          }
                        >
                          {segmentVisibility?.[s.segment_number] !== false ? (
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M1.458 10.001C2.733 5.943 6.13 3.333 10 3.333c3.87 0 7.267 2.61 8.542 6.668a.833.833 0 010 .666C17.267 14.057 13.87 16.667 10 16.667c-3.87 0-7.267-2.61-8.542-6.667a.833.833 0 010-.666z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M3 3l14 14M1.458 10.001C2.733 5.943 6.13 3.333 10 3.333c1.13 0 2.21.2 3.2.57M18.542 10.667A8.97 8.97 0 0110 16.667c-3.87 0-7.267-2.61-8.542-6.667a.833.833 0 010-.666A8.97 8.97 0 016.8 3.903"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          )}
                        </button>

                        <button
                          className="text-btn"
                          title="Export as STL"
                          onClick={() => onExportSTL && onExportSTL(s.segment_number)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 20 20">
                            <path
                              d="M10 3v10m0 0-4-4m4 4 4-4M4 17h12"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          STL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </aside>
  );
}
