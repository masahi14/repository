/*
 * logic.js の簡易テスト（フレームワーク不使用）。
 * 実行: node timetable/logic.test.js
 */
var assert = require("assert");
var T = require("./logic.js");

var passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log("OK   " + name);
  } catch (e) {
    console.log("FAIL " + name + " -> " + e.message);
    process.exitCode = 1;
  }
}

check("toMinutes/toHHMM の相互変換", function () {
  assert.strictEqual(T.toMinutes("09:05"), 545);
  assert.strictEqual(T.toHHMM(545), "09:05");
  assert.strictEqual(T.toMinutes("invalid"), null);
});

check("Drのみ複数患者：通常間隔で連続割付", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: [],
    patients: [
      { id: "p1", name: "患者A", role: "dr", drStaff: "山田Dr" },
      { id: "p2", name: "患者B", role: "dr", drStaff: "山田Dr" }
    ]
  });
  assert.strictEqual(result.creationErrors.length, 0);
  assert.strictEqual(result.blocks.length, 2);
  assert.strictEqual(result.blocks[0].start, 540); // 09:00
  assert.strictEqual(result.blocks[0].end, 562); // +22分
  assert.strictEqual(result.blocks[1].start, 564); // +2分ギャップ
});

check("Dr→DHの順序：DHはDr終了後まで開始しない", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: ["鈴木DH"],
    patients: [
      { id: "p1", name: "患者A", role: "both", order: "dr-then-dh", drStaff: "山田Dr", dhStaff: "鈴木DH" }
    ]
  });
  var dr = result.blocks.find(function (b) { return b.staffType === "dr"; });
  var dh = result.blocks.find(function (b) { return b.staffType === "dh"; });
  assert.ok(dh.start >= dr.end, "DH開始はDr終了以降であるべき");
});

check("短時間処置：指定時間を優先しルール除外", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: [],
    patients: [{ id: "p1", name: "患者A", role: "dr", drStaff: "山田Dr", drMinutesOverride: 5 }]
  });
  assert.strictEqual(result.blocks[0].end - result.blocks[0].start, 5);
});

check("同一患者の二重登録は作成時エラー", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: [],
    patients: [
      { id: "p1", name: "患者A", role: "dr", drStaff: "山田Dr" },
      { id: "p1", name: "患者A", role: "dr", drStaff: "山田Dr" }
    ]
  });
  assert.ok(result.creationErrors.some(function (e) { return e.code === "DUPLICATE_PATIENT"; }));
});

check("監査：担当者重複を検出（生成側とは独立に再計算）", function () {
  var blocks = [
    { staffType: "dr", staffName: "山田Dr", patientId: "p1", patientName: "患者A", start: 540, end: 570 },
    { staffType: "dr", staffName: "山田Dr", patientId: "p2", patientName: "患者B", start: 560, end: 580 }
  ];
  var audit = T.auditSchedule(blocks);
  assert.strictEqual(audit.overall, "error");
  assert.ok(audit.findings.some(function (f) { return f.code === "AUDIT_B_OVERLAP"; }));
});

check("監査A：同一患者のDr/DH重複を検出", function () {
  var blocks = [
    { staffType: "dr", staffName: "山田Dr", patientId: "p1", patientName: "患者A", start: 540, end: 562 },
    { staffType: "dh", staffName: "鈴木DH", patientId: "p1", patientName: "患者A", start: 550, end: 571 }
  ];
  var audit = T.auditSchedule(blocks);
  assert.ok(audit.findings.some(function (f) { return f.code === "AUDIT_A_OVERLAP"; }));
});

check("監査D：同一患者・同一区分の重複登録を検出", function () {
  var blocks = [
    { staffType: "dr", staffName: "山田Dr", patientId: "p1", patientName: "患者A", start: 540, end: 562 },
    { staffType: "dr", staffName: "鈴木Dr", patientId: "p1", patientName: "患者A", start: 600, end: 622 }
  ];
  var audit = T.auditSchedule(blocks);
  assert.ok(audit.findings.some(function (f) { return f.code === "AUDIT_D_DUPLICATE"; }));
});

check("正常ケースは overall=ok", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: ["鈴木DH"],
    patients: [
      { id: "p1", name: "患者A", role: "both", order: "dr-then-dh", drStaff: "山田Dr", dhStaff: "鈴木DH" },
      { id: "p2", name: "患者B", role: "dh", dhStaff: "鈴木DH" }
    ]
  });
  var audit = T.auditSchedule(result.blocks);
  assert.strictEqual(audit.overall, "ok");
});

console.log(passed + " passed");
if (process.exitCode) {
  console.log("=== 一部テストが失敗しました ===");
} else {
  console.log("=== 全テスト成功 ===");
}
