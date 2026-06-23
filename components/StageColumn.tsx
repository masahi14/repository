import PatientCard from "./PatientCard";

type Staff = { id: string; name: string; color: string };

type Assignment = {
  id: string;
  stage: number;
  staffId: string | null;
  assignedAt: Date;
  staff: Staff | null;
};

type Patient = {
  id: string;
  patientName: string;
  patientId: string | null;
  note: string | null;
  deadline: Date | null;
  assignments: Assignment[];
};

const STAGE_STANDARD_DAYS = [1, 2, 2, 3];
const STAGE_COLORS = [
  "from-cyan-400 to-sky-500",
  "from-sky-400 to-blue-500",
  "from-blue-400 to-indigo-500",
  "from-indigo-400 to-violet-500",
];

type Props = {
  stageName: string;
  stageNumber: number;
  patients: Patient[];
  allStaff: Staff[];
  activeFilterStaffId: string | null;
};

export default function StageColumn({
  stageName,
  stageNumber,
  patients,
  allStaff,
  activeFilterStaffId,
}: Props) {
  const standardDays = STAGE_STANDARD_DAYS[stageNumber - 1];
  const gradient = STAGE_COLORS[stageNumber - 1];

  return (
    <div className="flex-1 min-w-[220px] max-w-xs flex flex-col gap-2">
      {/* カラムヘッダー */}
      <div className={`bg-gradient-to-r ${gradient} rounded-xl px-4 py-3 text-white shadow`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{stageName}</span>
          <span className="bg-white/30 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
            {patients.length}件
          </span>
        </div>
        <div className="text-xs text-white/80 mt-0.5">標準 {standardDays}日</div>
      </div>

      {/* カード一覧 */}
      <div className="flex flex-col gap-2 flex-1">
        {patients.length === 0 ? (
          <div className="text-center text-gray-300 text-sm py-8 border-2 border-dashed border-gray-200 rounded-xl">
            患者なし
          </div>
        ) : (
          patients.map((p) => {
            const assignment = p.assignments.find((a) => a.stage === stageNumber);
            const isHighlighted =
              activeFilterStaffId !== null &&
              assignment?.staffId === activeFilterStaffId;
            const isHidden =
              activeFilterStaffId !== null && assignment?.staffId !== activeFilterStaffId;

            return (
              <div
                key={p.id}
                className={`transition-opacity ${isHidden ? "opacity-20" : "opacity-100"}`}
              >
                <PatientCard
                  patient={p}
                  stage={stageNumber}
                  allStaff={allStaff}
                  highlighted={isHighlighted}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
