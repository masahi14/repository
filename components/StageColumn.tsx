import PatientCard from "./PatientCard";

type Staff = { id: string; name: string; color: string };

type Assignment = {
  id: string;
  stage: number;
  assignedAt: Date;
  staffAssignments: { staffId: string; staff: Staff }[];
};

type CaseItem = {
  id: string;
  note: string | null;
  deadline: Date | null;
  yellowDays: number;
  redDays: number;
  caseType: string;
  patient: { patientName: string; patientId: string | null };
  assignments: Assignment[];
};

const STAGE_STANDARD_DAYS = [1, 2, 2, 3];
const STAGE_NUMS = ["①", "②", "③", "④"];

type Props = {
  stageName: string;
  stageNumber: number;
  cases: CaseItem[];
  allStaff: Staff[];
  activeFilterStaffId: string | null;
  onAddPatient: () => void;
};

export default function StageColumn({
  stageName,
  stageNumber,
  cases,
  allStaff,
  activeFilterStaffId,
  onAddPatient,
}: Props) {
  const standardDays = STAGE_STANDARD_DAYS[stageNumber - 1];
  const num = STAGE_NUMS[stageNumber - 1];

  return (
    <div className="flex-1 min-w-[240px] max-w-xs flex flex-col gap-2">
      {/* カラムヘッダー */}
      <div className="bg-slate-600 rounded-lg px-3 py-2.5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {stageNumber}
            </span>
            <span className="font-bold text-sm">{num} {stageName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
              {cases.length}件
            </span>
            <button
              onClick={onAddPatient}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold transition-colors"
              title="患者追加"
            >
              +
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-300 mt-1 ml-8">標準作業時間：{standardDays}日</div>
      </div>

      {/* カード一覧 */}
      <div className="flex flex-col gap-2 flex-1">
        {cases.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-200 rounded-lg bg-white/50">
            患者なし
          </div>
        ) : (
          cases.map((c) => {
            const assignment = c.assignments.find((a) => a.stage === stageNumber);
            const isAssignedToFilter =
              assignment?.staffAssignments.some((sa) => sa.staffId === activeFilterStaffId) ?? false;
            const isHighlighted = activeFilterStaffId !== null && isAssignedToFilter;
            const isHidden = activeFilterStaffId !== null && !isAssignedToFilter;

            return (
              <div
                key={c.id}
                className={`transition-opacity ${isHidden ? "opacity-20" : "opacity-100"}`}
              >
                <PatientCard
                  caseItem={c}
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
