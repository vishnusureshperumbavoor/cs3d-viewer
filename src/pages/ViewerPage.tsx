import { useEffect, useMemo, useState } from "react";
import { CornerstoneViewport, SeriesThumbnail, Logo, PatientHeaderInfo, AIToolbar } from "../components";
import { WLPresetToolbar } from "../components/viewport/WLPresetToolbar";
import { useStudyImages } from "../hooks";

export default function ViewerPage() {
  const { instances, error } = useStudyImages();

  const seriesMap = useMemo(() => {
    const map = new Map<string, typeof instances>();
    instances.forEach((instance) => {
      const seriesUid = instance.seriesInstanceUid;
      if (!map.has(seriesUid)) {
        map.set(seriesUid, []);
      }
      map.get(seriesUid)!.push(instance);
    });
    return map;
  }, [instances]);

  const seriesList = useMemo(() => {
    return Array.from(seriesMap.entries()).map(([seriesUid, seriesInstances]) => {
      const sortedInstances = [...seriesInstances].sort(
        (a, b) => a.instanceNumber - b.instanceNumber
      );
      const middleIndex = Math.floor(sortedInstances.length / 2);
      const thumbnailInstance = sortedInstances[middleIndex];

      return {
        seriesUid,
        instances: sortedInstances,
        thumbnailImageId: thumbnailInstance.imageId,
        seriesDescription:
          thumbnailInstance.seriesDescription ||
          `Series ${thumbnailInstance.seriesNumber || ""}`,
        modality: thumbnailInstance.modality || "OT",
        instanceCount: sortedInstances.length,
      };
    });
  }, [seriesMap]);

  const [selectedSeriesUid, setSelectedSeriesUid] = useState<string | null>(null);
  const [isAIActive, setIsAIActive] = useState(false);

  // Set default selected series once seriesList is loaded
  useEffect(() => {
    if (seriesList.length > 0 && !selectedSeriesUid) {
      setSelectedSeriesUid(seriesList[0].seriesUid);
    }
  }, [seriesList, selectedSeriesUid]);

  const activeImageIds = useMemo(() => {
    if (!selectedSeriesUid) return [];
    const activeSeries = seriesList.find((s) => s.seriesUid === selectedSeriesUid);
    return activeSeries ? activeSeries.instances.map((i) => i.imageId) : [];
  }, [selectedSeriesUid, seriesList]);

  const patientDetails = useMemo(() => {
    if (instances.length === 0) return undefined;
    const first = instances[0];
    return {
      patientName: first.patientName,
      patientId: first.patientId,
      patientBirthDate: first.patientBirthDate,
      patientSex: first.patientSex,
    };
  }, [instances]);

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="top-nav-inner">
          <a href="/" className="top-nav-brand">
            <div className="brand-icon" aria-hidden="true">
              <Logo />
            </div>
          </a>

          {patientDetails && (
            <PatientHeaderInfo
              patientName={patientDetails.patientName}
              patientId={patientDetails.patientId}
              patientBirthDate={patientDetails.patientBirthDate}
              patientSex={patientDetails.patientSex}
            />
          )}

          <WLPresetToolbar />
          <AIToolbar isAIActive={isAIActive} onToggleAI={setIsAIActive} />
        </div>
      </nav>

      <main className="viewer-layout">
        {seriesList.length > 0 && (
          <aside className="viewer-sidebar">
            <h2>Series ({seriesList.length})</h2>
            <div className="series-list">
              {seriesList.map((series) => (
                <button
                  key={series.seriesUid}
                  className={`series-card ${
                    selectedSeriesUid === series.seriesUid ? "active" : ""
                  }`}
                  onClick={() => setSelectedSeriesUid(series.seriesUid)}
                >
                  <SeriesThumbnail imageId={series.thumbnailImageId} />
                  <div className="series-info">
                    <span className="series-modality">{series.modality}</span>
                    <span className="series-desc" title={series.seriesDescription}>
                      {series.seriesDescription}
                    </span>
                    <span className="series-count">{series.instanceCount} images</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}

        <section className="viewer-panel">
          <div className="viewer-card">
            {error ? (
              <div className="viewer-empty-state">
                <div>
                  <h3>Unable to Load Study</h3>
                  <p>{error}</p>
                </div>
              </div>
            ) : activeImageIds.length === 0 ? (
              <div className="viewer-empty-state">
                <div>
                  <h3>Preparing Viewer</h3>
                  <p>Loading study metadata and image stack.</p>
                </div>
              </div>
            ) : (
              <CornerstoneViewport
                imageIds={activeImageIds}
                isAIActive={isAIActive}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

