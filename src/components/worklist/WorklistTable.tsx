import { getDicomValue } from "../../services/qido-service";
import { QidoStudy } from "../../types/worklist";

type WorklistTableProps = {
  studies: QidoStudy[];
  loading: boolean;
  onStudyClick: (studyInstanceUid: string) => void;
};

export default function WorklistTable({
  studies,
  loading,
  onStudyClick,
}: WorklistTableProps) {
  return (
    <div className="table-shell">
      <table className="segment-table">
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Patient Name</th>
            <th>Study Date</th>
            <th>Study UID</th>
            <th>Modalities</th>
          </tr>
        </thead>
        <tbody>
          {studies.length === 0 ? (
            <tr>
              <td colSpan={5}>{loading ? "Loading..." : "No studies found."}</td>
            </tr>
          ) : (
            studies.map((study, index) => {
              const studyInstanceUid = getDicomValue(study, "0020000D");
              return (
                <tr
                  key={`${studyInstanceUid}-${index}`}
                  className="worklist-row"
                  onClick={() => {
                    if (studyInstanceUid !== "-") {
                      onStudyClick(studyInstanceUid);
                    }
                  }}
                >
                  <td>{getDicomValue(study, "00100020")}</td>
                  <td>{getDicomValue(study, "00100010")}</td>
                  <td>{getDicomValue(study, "00080020")}</td>
                  <td>{studyInstanceUid}</td>
                  <td>{getDicomValue(study, "00080061")}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
