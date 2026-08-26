import { WorklistTable } from "../components/worklist";
import { useWorklist } from "../hooks";
import { Logo } from "../components";

export default function WorklistPage() {
  const {
    loading,
    error,
    studies,
  } = useWorklist();

  const handleStudyClick = (studyInstanceUid: string) => {
    const query = new URLSearchParams({
      StudyInstanceUIDs: studyInstanceUid,
    });
    window.location.href = `/?${query.toString()}`;
  };

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="top-nav-inner">
          <a href="/" className="top-nav-brand">
            <div className="brand-icon" aria-hidden="true">
              <Logo />
            </div>
            <h1>VSP Worklist</h1>
          </a>
          <div className={`status-pill ${loading ? "loading" : "ready"}`}>
            <span className="status-dot" />
            {loading ? "Loading Studies" : "Ready"}
          </div>
        </div>
      </nav>

      <main className="worklist-layout">
        <section className="panel-card worklist-results">
          <h2>Studies ({studies.length})</h2>
          {error ? <p className="worklist-error">{error}</p> : null}
          <WorklistTable
            studies={studies}
            loading={loading}
            onStudyClick={handleStudyClick}
          />
        </section>
      </main>
    </div>
  );
}
