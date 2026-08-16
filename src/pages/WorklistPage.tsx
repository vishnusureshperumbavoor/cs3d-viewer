import { WorklistSearchForm, WorklistTable } from "../components/worklist";
import { useWorklist } from "../hooks";
import { Logo } from "../components";

export default function WorklistPage() {
  const {
    qidoBaseUrl,
    setQidoBaseUrl,
    patientName,
    setPatientName,
    patientId,
    setPatientId,
    limit,
    setLimit,
    loading,
    error,
    studies,
    handleSearchSubmit,
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
        <section className="panel-card">
          <h2>Search</h2>
          <p>Query studies with QIDO-RS. Viewer routes are reserved for later.</p>
          <WorklistSearchForm
            qidoBaseUrl={qidoBaseUrl}
            patientName={patientName}
            patientId={patientId}
            limit={limit}
            loading={loading}
            onQidoBaseUrlChange={setQidoBaseUrl}
            onPatientNameChange={setPatientName}
            onPatientIdChange={setPatientId}
            onLimitChange={setLimit}
            onSubmit={handleSearchSubmit}
          />
          {error ? <p className="worklist-error">{error}</p> : null}
        </section>

        <section className="panel-card worklist-results">
          <h2>Studies ({studies.length})</h2>
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
