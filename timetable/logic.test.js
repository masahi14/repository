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

check("Drのみ複数患者：通常間隔で連続割付（固定値指定）", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: [],
    config: { drDuration: { min: 22, max: 22 }, drGap: { min: 2, max: 2 } },
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

check("parseRange：範囲・単一値・全角チルダ・不正値のフォールバックに対応", function () {
  assert.deepStrictEqual(T.parseRange("21-23", 0, 0), { min: 21, max: 23 });
  assert.deepStrictEqual(T.parseRange("23-21", 0, 0), { min: 21, max: 23 }); // 逆順は自動で入れ替え
  assert.deepStrictEqual(T.parseRange("22", 0, 0), { min: 22, max: 22 });
  assert.deepStrictEqual(T.parseRange("21〜23", 0, 0), { min: 21, max: 23 });
  assert.deepStrictEqual(T.parseRange("", 5, 9), { min: 5, max: 9 });
  assert.deepStrictEqual(T.parseRange("abc", 5, 9), { min: 5, max: 9 });
});

check("Dr処置時間・間隔に範囲を指定すると、患者ごとに順番に一巡して幅を持たせる", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: [],
    config: { drDuration: { min: 21, max: 23 }, drGap: { min: 2, max: 2 } },
    patients: [
      { id: "p1", name: "患者A", role: "dr", drStaff: "山田Dr" },
      { id: "p2", name: "患者B", role: "dr", drStaff: "山田Dr" },
      { id: "p3", name: "患者C", role: "dr", drStaff: "山田Dr" },
      { id: "p4", name: "患者D", role: "dr", drStaff: "山田Dr" }
    ]
  });
  var durations = result.blocks.map(function (b) { return b.end - b.start; });
  assert.deepStrictEqual(durations, [21, 22, 23, 21], "範囲21-23を順番に一巡するはず");

  // 同じ入力なら常に同じ結果になる（決定的であること）ことも確認
  var result2 = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: [],
    config: { drDuration: { min: 21, max: 23 }, drGap: { min: 2, max: 2 } },
    patients: [
      { id: "p1", name: "患者A", role: "dr", drStaff: "山田Dr" },
      { id: "p2", name: "患者B", role: "dr", drStaff: "山田Dr" },
      { id: "p3", name: "患者C", role: "dr", drStaff: "山田Dr" },
      { id: "p4", name: "患者D", role: "dr", drStaff: "山田Dr" }
    ]
  });
  assert.deepStrictEqual(result2.blocks, result.blocks);
});

check("患者が1人だけの場合：DHはDr終了後まで開始しない（他に担当できる患者がいないため）", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: ["鈴木DH"],
    patients: [
      { id: "p1", name: "患者A", role: "both", drStaff: "山田Dr", dhStaff: "鈴木DH" }
    ]
  });
  var dr = result.blocks.find(function (b) { return b.staffType === "dr"; });
  var dh = result.blocks.find(function (b) { return b.staffType === "dh"; });
  assert.ok(dh.start >= dr.end, "DH開始はDr終了以降であるべき");
});

check("Dr・DH同時スタート：患者が複数いればDHはDrを待たず別患者から始める", function () {
  var result = T.generateSchedule({
    facilityStart: "09:00",
    drNames: ["山田Dr"],
    dhNames: ["鈴木DH"],
    patients: [
      { id: "p1", name: "患者A", role: "both", drStaff: "山田Dr", dhStaff: "鈴木DH" },
      { id: "p2", name: "患者B", role: "both", drStaff: "山田Dr", dhStaff: "鈴木DH" }
    ]
  });
  var dhBlocks = result.blocks.filter(function (b) { return b.staffType === "dh"; });
  var dhFirstStart = Math.min.apply(null, dhBlocks.map(function (b) { return b.start; }));
  assert.strictEqual(dhFirstStart, 540, "DHはDrと同じ9:00から稼働を始めるべき（別患者を担当）");

  // 監査A（同一患者のDr/DH重複なし）が独立監査でも通ることを確認
  var audit = T.auditSchedule(result.blocks);
  assert.ok(!audit.findings.some(function (f) { return f.code === "AUDIT_A_OVERLAP"; }));
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

check("歯科訪問診療料：1人のみ→区分1、20分以上は1100点", function () {
  var patients = [{ id: "p1", name: "患者A", role: "dr" }];
  var blocks = [{ staffType: "dr", staffName: "美恵子先生", patientId: "p1", patientName: "患者A", start: 540, end: 562 }];
  var fee = T.calcVisitFees(patients, blocks);
  assert.strictEqual(fee.count, 1);
  assert.strictEqual(fee.category, 1);
  assert.strictEqual(fee.perPatient[0].points, 1100);
  assert.strictEqual(fee.perPatient[0].assistPoints, null);
});

check("歯科訪問診療補助加算：補助DHがいない場合（hasAssistantDh未指定）は両方担当でも加算しない", function () {
  var patients = [{ id: "p1", name: "患者A", role: "both" }];
  var blocks = [{ staffType: "dr", staffName: "美恵子先生", patientId: "p1", patientName: "患者A", start: 540, end: 562 }];
  var fee = T.calcVisitFees(patients, blocks);
  assert.strictEqual(fee.perPatient[0].assistPoints, null, "補助DHがいないのに加算が付いてはいけない");
});

check("歯科訪問診療料：5人→区分3、20分未満は217点（レセプトサポートセンター・レセコン確認済み）", function () {
  var patients = [
    { id: "p1", name: "患者A", role: "dr" },
    { id: "p2", name: "患者B", role: "dr" },
    { id: "p3", name: "患者C", role: "dr" },
    { id: "p4", name: "患者D", role: "dr" },
    { id: "p5", name: "患者E", role: "dr" }
  ];
  var blocks = patients.map(function (p, i) {
    return { staffType: "dr", staffName: "美恵子先生", patientId: p.id, patientName: p.name, start: 540 + i * 30, end: 540 + i * 30 + 15 };
  });
  var fee = T.calcVisitFees(patients, blocks);
  assert.strictEqual(fee.category, 3);
  fee.perPatient.forEach(function (pf) {
    assert.strictEqual(pf.points, 217);
  });
});

check("歯科訪問診療補助加算：補助DHがいる場合のみ、1人のみは115点、2人以上は50点", function () {
  var onePatient = [{ id: "p1", name: "患者A", role: "both" }];
  var oneBlocks = [{ staffType: "dr", staffName: "美恵子先生", patientId: "p1", patientName: "患者A", start: 540, end: 562 }];
  var feeOne = T.calcVisitFees(onePatient, oneBlocks, { hasAssistantDh: true });
  assert.strictEqual(feeOne.perPatient[0].assistPoints, 115);

  var twoPatients = [
    { id: "p1", name: "患者A", role: "both" },
    { id: "p2", name: "患者B", role: "both" }
  ];
  var twoBlocks = [
    { staffType: "dr", staffName: "美恵子先生", patientId: "p1", patientName: "患者A", start: 540, end: 562 },
    { staffType: "dr", staffName: "美恵子先生", patientId: "p2", patientName: "患者B", start: 564, end: 586 }
  ];
  var feeTwo = T.calcVisitFees(twoPatients, twoBlocks, { hasAssistantDh: true });
  assert.strictEqual(feeTwo.perPatient[0].assistPoints, 50);

  // 補助DHがいなければ、同じ患者データでも加算は付かない
  var feeTwoNoAssist = T.calcVisitFees(twoPatients, twoBlocks);
  assert.strictEqual(feeTwoNoAssist.perPatient[0].assistPoints, null);
});

check("歯科訪問診療料：施設相談(isConsultation)は人数に含めない", function () {
  var patients = [
    { id: "p1", name: "患者A", role: "dr" },
    { id: "p2", name: "施設相談", role: "dr", isConsultation: true }
  ];
  var blocks = [
    { staffType: "dr", staffName: "美恵子先生", patientId: "p1", patientName: "患者A", start: 540, end: 562 },
    { staffType: "dr", staffName: "美恵子先生", patientId: "p2", patientName: "施設相談", start: 564, end: 569 }
  ];
  var fee = T.calcVisitFees(patients, blocks);
  assert.strictEqual(fee.count, 1);
  assert.strictEqual(fee.perPatient.length, 1);
});

check("optimizePatientOrder：処置時間はそのまま、並び順だけで終了時刻を早くする", function () {
  // 実際に確認済みのケース：義歯調整(5分・Drのみ)を最後に置くと終了11:58、
  // 先頭に置くと11:42になる（他の患者の時間は固定のまま、並び順だけの違い）
  var patients = [
    { id: "p1", name: "患者1", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 21 },
    { id: "p2", name: "患者2", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 15 },
    { id: "p3", name: "患者3", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 21 },
    { id: "p4", name: "患者4", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 21 },
    { id: "p5", name: "患者5", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 15 },
    { id: "p6", name: "患者6", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 21 },
    { id: "p7", name: "患者7", role: "both", drStaff: "美恵子先生", dhStaff: "諸谷さん", drMinutesOverride: 21 },
    { id: "p8", name: "義歯調整", role: "dr", drStaff: "美恵子先生", dhStaff: null, drMinutesOverride: 5 }
  ];
  var config = {
    drGap: { min: 1, max: 2 },
    dhDuration: { min: 20, max: 21 },
    dhGap: { min: 1, max: 2 }
  };
  var input = { facilityStart: "09:10", drNames: ["美恵子先生"], dhNames: ["諸谷さん"], patients: patients, config: config };

  var naive = T.generateSchedule(input);
  var naiveEnd = Math.max.apply(null, naive.blocks.map(function (b) { return b.end; }));

  var optimized = T.optimizePatientOrder(input);
  assert.strictEqual(optimized.approximate, false, "8人以下は総当たりのはず");
  assert.ok(optimized.end <= naiveEnd, "最適化後は元の並び順以上に早いはず");
  assert.ok(optimized.end < naiveEnd, "このケースでは並び順を変えれば改善するはず");

  // 最適化した並び順で実際にgenerateScheduleしても、報告されたendと一致することを確認
  var reorderedInput = Object.assign({}, input, { patients: optimized.patients });
  var reorderedResult = T.generateSchedule(reorderedInput);
  var reorderedEnd = Math.max.apply(null, reorderedResult.blocks.map(function (b) { return b.end; }));
  assert.strictEqual(reorderedEnd, optimized.end);

  // 独立監査でも患者の重複等の問題がないことを確認（時間帯の警告は出てよい）
  var audit = T.auditSchedule(reorderedResult.blocks, { config: config });
  assert.ok(!audit.findings.some(function (f) { return f.severity === "error"; }));
});

check("optimizePatientOrder：患者が0人なら何もしない", function () {
  var result = T.optimizePatientOrder({ facilityStart: "09:00", drNames: [], dhNames: [], patients: [] });
  assert.deepStrictEqual(result.patients, []);
  assert.strictEqual(result.end, null);
});

console.log(passed + " passed");
if (process.exitCode) {
  console.log("=== 一部テストが失敗しました ===");
} else {
  console.log("=== 全テスト成功 ===");
}
