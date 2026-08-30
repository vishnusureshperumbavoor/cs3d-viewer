import { useEffect, useMemo, useState } from "react";
import { getRenderingEngine } from "@cornerstonejs/core";
import {
  ViewerHeader,
  LeftPanel,
  ViewerMainViewport,
  RightPanel,
} from "../components";
import { resetMPRCameras } from "../components/viewport/MPRViewer";
import { RENDERING_ENGINE_ID, MPR_VIEWPORT_IDS } from "../utils/mpr-utils";
import { useStudyImages } from "../hooks";
import { totalsegmentatorService } from "../services/totalsegmentator-service";
import { dicomSegService, DicomSegData } from "../services/dicom-seg-service";
import { TOTALSEGMENTATOR_TASKS, TotalSegTask } from "../constants/totalsegmentator-tasks";

export default function ViewerPage() {
  const { instances, error, refetch } = useStudyImages();

  // Group instances into series
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
    return Array.from(seriesMap.entries())
      .map(([seriesUid, seriesInstances]) => {
        const sortedInstances = [...seriesInstances].sort(
          (a, b) => a.instanceNumber - b.instanceNumber
        );
        const middleIndex = Math.floor(sortedInstances.length / 2);
        const thumbnailInstance = sortedInstances[middleIndex] || sortedInstances[0];

        return {
          seriesUid,
          instances: sortedInstances,
          thumbnailImageId: thumbnailInstance.imageId,
          seriesDescription:
            thumbnailInstance.seriesDescription ||
            (thumbnailInstance.modality === "SEG"
              ? "Segmentation"
              : `Series ${thumbnailInstance.seriesNumber || ""}`),
          modality: thumbnailInstance.modality || "OT",
          instanceCount: sortedInstances.length,
        };
      })
      .sort((a, b) => {
        if (a.modality === "SEG" && b.modality !== "SEG") return 1;
        if (a.modality !== "SEG" && b.modality === "SEG") return -1;
        return 0;
      });
  }, [seriesMap]);

  const [selectedSeriesUid, setSelectedSeriesUid] = useState<string | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // DICOM SEG datasets state
  const segInstances = useMemo(() => dicomSegService.findSegInstances(instances), [instances]);
  const [segDataMap, setSegDataMap] = useState<Record<string, DicomSegData>>({});
  const [activeSegSeriesUid, setActiveSegSeriesUid] = useState<string | null>(null);
  const [isLoadingSeg, setIsLoadingSeg] = useState(false);
  const [isSegPanelOpen, setIsSegPanelOpen] = useState(true);
  const [segmentOpacity, setSegmentOpacity] = useState(0.5);
  const [segVisibility, setSegVisibility] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (segInstances.length === 0) return;

    let isCancelled = false;
    setIsLoadingSeg(true);

    const loadAllSegs = async () => {
      await Promise.all(
        segInstances.map(async (inst) => {
          try {
            const data = await dicomSegService.loadStudySegmentation(inst);
            if (!isCancelled) {
              setSegDataMap((prev) => ({
                ...prev,
                [inst.seriesInstanceUid]: data,
              }));
              setActiveSegSeriesUid((prev) => prev || inst.seriesInstanceUid);
            }
          } catch (err) {
            console.warn("Failed to load segmentation series:", inst.seriesInstanceUid, err);
          }
        })
      );
      if (!isCancelled) {
        setIsLoadingSeg(false);
      }
    };

    void loadAllSegs();

    return () => {
      isCancelled = true;
    };
  }, [segInstances]);

  const segData = activeSegSeriesUid ? segDataMap[activeSegSeriesUid] : (Object.values(segDataMap)[0] || null);

  useEffect(() => {
    if (segData) {
      const initialVis: Record<number, boolean> = {};
      segData.segments.forEach((s) => {
        initialVis[s.segmentNumber] = true;
      });
      setSegVisibility(initialVis);
      setIsSegPanelOpen(true);
    }
  }, [segData]);

  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [pendingLicenseTask, setPendingLicenseTask] = useState<TotalSegTask | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<{ hasLicense: boolean; licenseMasked?: string | null }>({
    hasLicense: false,
    licenseMasked: null,
  });

  const refreshLicenseStatus = async () => {
    try {
      const status = await totalsegmentatorService.getLicenseStatus();
      setLicenseInfo({
        hasLicense: status.hasLicense,
        licenseMasked: status.licenseMasked,
      });
    } catch (e) {
      console.warn("Failed to fetch license status:", e);
    }
  };

  useEffect(() => {
    void refreshLicenseStatus();
  }, []);

  const handleOpenLicenseModal = (task?: TotalSegTask) => {
    setPendingLicenseTask(task || null);
    setIsLicenseModalOpen(true);
  };

  const handleCloseLicenseModal = () => {
    setPendingLicenseTask(null);
    setIsLicenseModalOpen(false);
  };

  const handleLicenseSuccess = () => {
    void refreshLicenseStatus();
    if (pendingLicenseTask && selectedSeriesUid) {
      const taskToRun = pendingLicenseTask;
      setPendingLicenseTask(null);
      setIsLicenseModalOpen(false);
      void handleRunTotalSegmentator(selectedSeriesUid, taskToRun.id, taskToRun.id === "total");
    }
  };
  const [active3DPreset, setActive3DPreset] = useState<string>("CT-AAA");
  const [activeRightSidebarTab, setActiveRightSidebarTab] = useState<"segmentation" | "presets" | "totalsegmentator">("segmentation");

  useEffect(() => {
    if (viewMode === "3d") {
      setActiveRightSidebarTab("presets");
    } else {
      setActiveRightSidebarTab((prev) => (prev === "presets" ? "segmentation" : prev));
    }

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      try {
        const mprEngine = getRenderingEngine(RENDERING_ENGINE_ID);
        mprEngine?.resize(true, true);
        mprEngine?.renderViewports([...MPR_VIEWPORT_IDS, "mpr-3d"]);
      } catch (_) { }

      try {
        const stackEngine = getRenderingEngine("mainViewerRenderingEngine");
        stackEngine?.resize(true, true);
        stackEngine?.render();
      } catch (_) { }
    });
  }, [viewMode]);

  const [segmentingSeriesUid, setSegmentingSeriesUid] = useState<string | null>(null);
  const [segmentingTaskName, setSegmentingTaskName] = useState<string | null>(null);
  const [segmentingStatus, setSegmentingStatus] = useState<"running" | "completed">("running");
  const [totalSegError, setTotalSegError] = useState<string | null>(null);

  // Set default selected series once seriesList is loaded (pick first non-SEG image series)
  useEffect(() => {
    if (seriesList.length > 0 && !selectedSeriesUid) {
      const defaultSeries = seriesList.find((s) => s.modality !== "SEG") || seriesList[0];
      setSelectedSeriesUid(defaultSeries.seriesUid);
    }
  }, [seriesList, selectedSeriesUid]);

  const activeImageIds = useMemo(() => {
    if (!selectedSeriesUid) return [];
    const activeSeries =
      seriesList.find((s) => s.seriesUid === selectedSeriesUid) || seriesList[0];
    return activeSeries ? activeSeries.instances.map((i) => i.imageId) : [];
  }, [seriesList, selectedSeriesUid]);

  const selectedSeriesMetadata = useMemo(() => {
    if (!selectedSeriesUid) return undefined;
    const series = seriesList.find((s) => s.seriesUid === selectedSeriesUid);
    if (!series || !series.instances[0]) return undefined;
    const first = series.instances[0];
    return {
      modality: series.modality,
      bodyPartExamined: first.bodyPartExamined,
      seriesDescription: series.seriesDescription,
      contrastBolusAgent: first.contrastBolusAgent,
      instanceCount: series.instanceCount,
    };
  }, [seriesList, selectedSeriesUid]);

  const patientDetails = useMemo(() => {
    if (instances.length === 0) return undefined;
    const first = instances[0];
    return {
      patientName: first.patientName,
      patientId: first.patientId,
      patientBirthDate: first.patientBirthDate,
      patientSex: first.patientSex,
      studyInstanceUid: first.studyInstanceUid,
    };
  }, [instances]);

  const handleRunTotalSegmentator = async (
    seriesUid: string,
    task: string = "total",
    fast: boolean = true
  ) => {
    if (!seriesUid || segmentingSeriesUid) return;

    const taskDef = TOTALSEGMENTATOR_TASKS.find((t) => t.id === task);
    if (taskDef?.requiresLicense && !licenseInfo.hasLicense) {
      setPendingLicenseTask(taskDef);
      setIsLicenseModalOpen(true);
      return;
    }

    setSegmentingSeriesUid(seriesUid);
    setSegmentingTaskName(task);
    setSegmentingStatus("running");
    setTotalSegError(null);
    try {
      await totalsegmentatorService.run(
        patientDetails?.studyInstanceUid || "",
        seriesUid,
        task,
        fast
      );
      await refetch();
      setSegmentingStatus("completed");
    } catch (err: any) {
      console.error("TotalSegmentator run failed:", err);
      setTotalSegError(err.message || "An unexpected error occurred during TotalSegmentator execution.");
      setSegmentingSeriesUid(null);
      setSegmentingTaskName(null);
    }
  };

  const handleDismissSegmentingOverlay = () => {
    setSegmentingSeriesUid(null);
    setSegmentingTaskName(null);
    setSegmentingStatus("running");
    setActiveRightSidebarTab("segmentation");
  };

  const handleDeleteSegSeries = async (segSeriesUid: string) => {
    if (!segSeriesUid) return;
    try {
      await totalsegmentatorService.deleteSegSeries(segSeriesUid);
      if (activeSegSeriesUid === segSeriesUid) {
        setActiveSegSeriesUid(null);
      }
      await refetch();
    } catch (err) {
      console.error("Failed to delete segmentation series:", err);
    }
  };

  return (
    <div className="app-shell">
      <ViewerHeader
        patientDetails={patientDetails}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
      />

      <main
        className={`viewer-layout ${isLeftSidebarOpen ? "left-open" : "left-collapsed"} ${
          isSegPanelOpen ? "with-seg-panel" : "with-seg-collapsed"
        }`}
      >
        {seriesList.length > 0 && (
          <LeftPanel
            isOpen={isLeftSidebarOpen}
            onToggleOpen={() => setIsLeftSidebarOpen((prev) => !prev)}
            seriesList={seriesList}
            selectedSeriesUid={selectedSeriesUid}
            activeSegSeriesUid={activeSegSeriesUid}
            segDataMap={segDataMap}
            onSelectSeries={setSelectedSeriesUid}
            onSelectSegSeries={(imageSeriesUid: string, segSeriesUid: string) => {
              setSelectedSeriesUid(imageSeriesUid);
              setActiveSegSeriesUid(segSeriesUid);
            }}
            onDeleteSegSeries={handleDeleteSegSeries}
          />
        )}

        <ViewerMainViewport
          error={error}
          activeImageIds={activeImageIds}
          viewMode={viewMode}
          selectedSeriesUid={selectedSeriesUid}
          active3DPreset={active3DPreset}
          segData={segData}
          segVisibility={segVisibility}
          segmentOpacity={segmentOpacity}
          segmentingSeriesUid={segmentingSeriesUid}
          segmentingTaskName={segmentingTaskName}
          segmentingStatus={segmentingStatus}
          onDismissSegmentingOverlay={handleDismissSegmentingOverlay}
          totalSegError={totalSegError}
          onDismissTotalSegError={() => setTotalSegError(null)}
          isLicenseModalOpen={isLicenseModalOpen}
          onCloseLicenseModal={handleCloseLicenseModal}
          hasLicense={licenseInfo.hasLicense}
          licenseMasked={licenseInfo.licenseMasked}
          pendingLicenseTaskName={pendingLicenseTask?.name}
          onLicenseUpdated={handleLicenseSuccess}
        />

        <RightPanel
          isOpen={isSegPanelOpen}
          onToggle={() => setIsSegPanelOpen((prev) => !prev)}
          segData={segData}
          isLoading={isLoadingSeg}
          segmentVisibility={segVisibility}
          onToggleSegmentVisibility={(segNum: number) =>
            setSegVisibility((prev) => ({
              ...prev,
              [segNum]: !(prev[segNum] ?? true),
            }))
          }
          opacity={segmentOpacity}
          onChangeOpacity={setSegmentOpacity}
          activeTab={activeRightSidebarTab}
          onChangeTab={setActiveRightSidebarTab}
          active3DPreset={active3DPreset}
          onSelect3DPreset={setActive3DPreset}
          onResetCameras={resetMPRCameras}
          selectedSeriesUid={selectedSeriesUid}
          selectedSeriesMetadata={selectedSeriesMetadata}
          segmentingSeriesUid={segmentingSeriesUid}
          onRunTotalSegmentator={handleRunTotalSegmentator}
          loadedSegs={seriesList.filter((s) => s.modality === "SEG")}
          segDataMap={segDataMap}
          onSelectSegSeries={(imageSeriesUid, segSeriesUid) => {
            setSelectedSeriesUid(imageSeriesUid);
            setActiveSegSeriesUid(segSeriesUid);
          }}
          onDeleteSegSeries={handleDeleteSegSeries}
          licenseInfo={licenseInfo}
          onOpenLicenseModal={handleOpenLicenseModal}
        />
      </main>
    </div>
  );
}

