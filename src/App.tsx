import { ViewerPage, WorklistPage } from "./pages";

const ROOT_PATH = "/";
const LEGACY_VIEWER_PATHS = ["/patientid", "/studyid", "/seriesid", "/instanceid"];

const getCurrentPath = () => window.location.pathname.toLowerCase();
const hasStudyQueryParam = () => {
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("StudyInstanceUIDs"));
};

export default function App() {
  const path = getCurrentPath();

  if (path === ROOT_PATH) {
    return hasStudyQueryParam() ? <ViewerPage /> : <WorklistPage />;
  }

  if (LEGACY_VIEWER_PATHS.includes(path)) {
    return <ViewerPage />;
  }

  return <WorklistPage />;
}
