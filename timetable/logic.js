/*
 * 訪問歯科タイムテーブル 生成ロジック（決定的・非AI）
 *
 * 用語:
 *   block  : ある担当者(Dr/DH)が、ある患者に対して行う1つの処置枠 {staffType, staffName, patientId, patientName, start, end}
 *   start/end は「その日の0:00からの分」の整数で表現する。
 *
 * このファイルは生成(generateSchedule)と、生成結果を独立に再検証する監査(auditSchedule)の
 * 2つを提供する。監査は生成時に使ったポインタ等の内部状態を一切参照せず、
 * 出力された blocks 配列だけから再計算する。
 */

(function (root) {
  "use strict";

  function toMinutes(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
    if (!m) return null;
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (h < 0 || h > 29 || min < 0 || min > 59) return null;
    return h * 60 + min;
  }

  function toHHMM(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return "--:--";
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  /**
   * blocks を担当者(staffType+staffName)ごとにグルーピングし、開始時刻順に並べる。
   * 監査(auditSchedule)と画面表示(厳重チェック欄)の両方から使う共通処理。
   * @returns {Object} key "dr|山田Dr" 等 -> 開始時刻順の blocks 配列
   */
  function groupByStaffSorted(blocks) {
    var byStaff = {};
    blocks.forEach(function (b) {
      var key = b.staffType + "|" + b.staffName;
      byStaff[key] = byStaff[key] || [];
      byStaff[key].push(b);
    });
    Object.keys(byStaff).forEach(function (key) {
      byStaff[key].sort(function (a, b) {
        return a.start - b.start;
      });
    });
    return byStaff;
  }

  /**
   * 並べ替え済みの1担当者分のblocksから、前患者終了→次患者開始の差分を計算する。
   * @returns {Array} [{from: block, to: block, gap: number}]
   */
  function computeGaps(sortedBlocks) {
    var gaps = [];
    for (var i = 1; i < sortedBlocks.length; i++) {
      gaps.push({
        from: sortedBlocks[i - 1],
        to: sortedBlocks[i],
        gap: sortedBlocks[i].start - sortedBlocks[i - 1].end
      });
    }
    return gaps;
  }

  var DEFAULT_CONFIG = {
    drDuration: 22, // Dr 通常時間(分) 21-23が目安
    drGap: 2, // Dr 患者間(分) 通常2-3、最大4まで許容
    dhDuration: 21, // DH 通常時間(分) 最低20
    dhGap: 2 // DH 患者間(分) 通常2-3、最大4まで許容
  };

  /**
   * @param {Object} input
   * @param {string} input.facilityStart "HH:MM"
   * @param {string} [input.facilityEnd] "HH:MM" 予定終了時刻（任意、監査で使用）
   * @param {string[]} input.drNames
   * @param {string[]} input.dhNames
   * @param {Array}  input.patients 各要素:
   *   {
   *     id: string,               // 一意なID（未入力時は自動採番）
   *     name: string,
   *     role: 'dr' | 'dh' | 'both',
   *     order: 'dr-then-dh' | 'dh-then-dr' (roleが'both'の時のみ必須),
   *     drStaff: string (roleが'dr'または'both'の時必須),
   *     dhStaff: string (roleが'dh'または'both'の時必須),
   *     drMinutesOverride: number|null,  // 短時間処置等でDr時間を指定時に使用（通常ルール除外）
   *     dhMinutesOverride: number|null
   *   }
   * @param {Object} [input.config] DEFAULT_CONFIG を上書き
   * @returns {{blocks: Array, creationErrors: Array}}
   */
  function generateSchedule(input) {
    var config = Object.assign({}, DEFAULT_CONFIG, input.config || {});
    var facilityStartMin = toMinutes(input.facilityStart);
    var blocks = [];
    var creationErrors = [];
    var seenPatientIds = {};

    if (facilityStartMin === null) {
      creationErrors.push({
        severity: "error",
        code: "INVALID_START_TIME",
        message: "施設の開始時刻が不正です（HH:MM形式で入力してください）"
      });
      return { blocks: blocks, creationErrors: creationErrors };
    }

    var drPointer = {};
    (input.drNames || []).forEach(function (n) {
      drPointer[n] = facilityStartMin;
    });
    var dhPointer = {};
    (input.dhNames || []).forEach(function (n) {
      dhPointer[n] = facilityStartMin;
    });

    (input.patients || []).forEach(function (p, idx) {
      var label = "患者「" + (p.name || "(未入力)") + "」(" + (idx + 1) + "件目)";
      var pid = p.id || "row-" + idx;

      if (seenPatientIds[pid]) {
        creationErrors.push({
          severity: "error",
          code: "DUPLICATE_PATIENT",
          message: label + "：同一日同一訪問への同一患者の二重登録です"
        });
        return;
      }
      seenPatientIds[pid] = true;

      if (!p.name) {
        creationErrors.push({ severity: "error", code: "MISSING_NAME", message: (idx + 1) + "件目：患者名が未入力です" });
      }

      var needsDr = p.role === "dr" || p.role === "both";
      var needsDh = p.role === "dh" || p.role === "both";

      if (!needsDr && !needsDh) {
        creationErrors.push({ severity: "error", code: "MISSING_ROLE", message: label + "：処置区分（Dr/DH/両方）が未設定です" });
        return;
      }
      if (needsDr && !p.drStaff) {
        creationErrors.push({ severity: "error", code: "MISSING_DR_STAFF", message: label + "：担当Drが未選択です" });
        return;
      }
      if (needsDh && !p.dhStaff) {
        creationErrors.push({ severity: "error", code: "MISSING_DH_STAFF", message: label + "：担当DHが未選択です" });
        return;
      }
      if (needsDr && needsDh && p.order !== "dr-then-dh" && p.order !== "dh-then-dr") {
        creationErrors.push({ severity: "error", code: "MISSING_ORDER", message: label + "：Dr/DHどちらが先か（順序）が未設定です" });
        return;
      }

      function pushBlock(staffType, staffName, start, end) {
        blocks.push({
          staffType: staffType,
          staffName: staffName,
          patientId: pid,
          patientName: p.name,
          start: start,
          end: end
        });
      }

      if (p.role === "dr") {
        var dur = p.drMinutesOverride || config.drDuration;
        var start = drPointer[p.drStaff];
        var end = start + dur;
        pushBlock("dr", p.drStaff, start, end);
        drPointer[p.drStaff] = end + config.drGap;
      } else if (p.role === "dh") {
        var dDur = p.dhMinutesOverride || config.dhDuration;
        var dStart = dhPointer[p.dhStaff];
        var dEnd = dStart + dDur;
        pushBlock("dh", p.dhStaff, dStart, dEnd);
        dhPointer[p.dhStaff] = dEnd + config.dhGap;
      } else if (p.role === "both") {
        if (p.order === "dr-then-dh") {
          var drDur = p.drMinutesOverride || config.drDuration;
          var drStart = drPointer[p.drStaff];
          var drEnd = drStart + drDur;
          var dhDur = p.dhMinutesOverride || config.dhDuration;
          var dhStart = Math.max(dhPointer[p.dhStaff], drEnd);
          var dhEnd = dhStart + dhDur;
          pushBlock("dr", p.drStaff, drStart, drEnd);
          pushBlock("dh", p.dhStaff, dhStart, dhEnd);
          drPointer[p.drStaff] = drEnd + config.drGap;
          dhPointer[p.dhStaff] = dhEnd + config.dhGap;
        } else {
          var dhDur2 = p.dhMinutesOverride || config.dhDuration;
          var dhStart2 = dhPointer[p.dhStaff];
          var dhEnd2 = dhStart2 + dhDur2;
          var drDur2 = p.drMinutesOverride || config.drDuration;
          var drStart2 = Math.max(drPointer[p.drStaff], dhEnd2);
          var drEnd2 = drStart2 + drDur2;
          pushBlock("dh", p.dhStaff, dhStart2, dhEnd2);
          pushBlock("dr", p.drStaff, drStart2, drEnd2);
          dhPointer[p.dhStaff] = dhEnd2 + config.dhGap;
          drPointer[p.drStaff] = drEnd2 + config.drGap;
        }
      }
    });

    return { blocks: blocks, creationErrors: creationErrors };
  }

  /**
   * 独立監査。generateSchedule の内部状態（ポインタ等）は一切使わず、
   * 出力済みの blocks 配列を再ソート・再計算して検証する。
   *
   * 監査A: 患者単位のDr/DH時間重複
   * 監査B: Dr単位の前患者終了→次患者開始の差分再計算
   * 監査C: DH単位の同上
   * 監査D: 患者ID基準の二重登録チェック
   * （監査E〜H：算定・根拠資料照合は、保険/根拠資料データ未実装のため対象外。将来追加）
   */
  function auditSchedule(blocks, options) {
    options = options || {};
    var config = Object.assign({}, DEFAULT_CONFIG, options.config || {});
    var facilityEndMin = options.facilityEnd ? toMinutes(options.facilityEnd) : null;
    var findings = [];

    function add(severity, code, message) {
      findings.push({ severity: severity, code: code, message: message });
    }

    // 監査D: 同一患者IDが2件以上の独立ブロック群として登場していないか
    // （同一患者のDr1件+DH1件は正常。ここでは "同一staffType内で同一患者が複数回" を異常とする）
    var byPatientStaffType = {};
    blocks.forEach(function (b) {
      var key = b.patientId + "|" + b.staffType;
      byPatientStaffType[key] = (byPatientStaffType[key] || 0) + 1;
    });
    Object.keys(byPatientStaffType).forEach(function (key) {
      if (byPatientStaffType[key] > 1) {
        var parts = key.split("|");
        add("error", "AUDIT_D_DUPLICATE", "監査D: 患者「" + parts[0] + "」が同一区分(" + parts[1] + ")で複数回登録されています");
      }
    });

    // 監査B/C: 担当者(Dr/DH)ごとにブロックを再ソートし、重複・間隔を再計算
    var byStaff = groupByStaffSorted(blocks);
    Object.keys(byStaff).forEach(function (key) {
      var parts = key.split("|");
      var staffType = parts[0];
      var staffName = parts[1];
      var auditCode = staffType === "dr" ? "AUDIT_B" : "AUDIT_C";
      var list = byStaff[key];
      var minDur = staffType === "dr" ? 21 : 20;
      var maxDur = staffType === "dr" ? 23 : 22;
      var minGap = 2;
      var maxGap = 4;

      list.forEach(function (b) {
        var dur = b.end - b.start;
        if (dur < minDur || dur > maxDur) {
          add(
            "warn",
            auditCode + "_DURATION",
            auditCode + ": " + staffName + " / 患者「" + b.patientName + "」の処置時間が" + dur + "分です（通常" + minDur + "〜" + maxDur + "分の範囲外・短時間処置指定でなければ要確認）"
          );
        }
      });

      computeGaps(list).forEach(function (g) {
        if (g.gap < 0) {
          add(
            "error",
            auditCode + "_OVERLAP",
            auditCode + ": " + staffName + " の時間重複を検出（患者「" + g.from.patientName + "」" + toHHMM(g.from.end) + "終了 / 患者「" + g.to.patientName + "」" + toHHMM(g.to.start) + "開始）"
          );
        } else if (g.gap < minGap) {
          add(
            "warn",
            auditCode + "_GAP_SHORT",
            auditCode + ": " + staffName + " の患者間隔が" + g.gap + "分です（患者「" + g.from.patientName + "」→「" + g.to.patientName + "」、通常" + minGap + "分以上）"
          );
        } else if (g.gap > maxGap) {
          add(
            "warn",
            auditCode + "_GAP_LONG",
            auditCode + ": " + staffName + " の患者間隔が" + g.gap + "分空いています（患者「" + g.from.patientName + "」→「" + g.to.patientName + "」、目安" + maxGap + "分以内）"
          );
        }
      });

      if (facilityEndMin !== null && list.length > 0) {
        var last = list[list.length - 1];
        if (last.end > facilityEndMin) {
          add(
            "warn",
            "SCHEDULE_OVER_END",
            staffName + " の最終処置終了(" + toHHMM(last.end) + ")が施設予定終了時刻(" + toHHMM(facilityEndMin) + ")を超えています"
          );
        }
      }
    });

    // 監査A: 患者単位でDr/DHブロックが重複していないか
    var byPatient = {};
    blocks.forEach(function (b) {
      byPatient[b.patientId] = byPatient[b.patientId] || [];
      byPatient[b.patientId].push(b);
    });
    Object.keys(byPatient).forEach(function (pid) {
      var list = byPatient[pid];
      var drBlocks = list.filter(function (b) { return b.staffType === "dr"; });
      var dhBlocks = list.filter(function (b) { return b.staffType === "dh"; });
      drBlocks.forEach(function (drB) {
        dhBlocks.forEach(function (dhB) {
          var overlap = drB.start < dhB.end && dhB.start < drB.end;
          if (overlap) {
            add(
              "error",
              "AUDIT_A_OVERLAP",
              "監査A: 患者「" + drB.patientName + "」のDr処置(" + toHHMM(drB.start) + "-" + toHHMM(drB.end) + ")とDH処置(" + toHHMM(dhB.start) + "-" + toHHMM(dhB.end) + ")が重複しています"
            );
          }
        });
      });
    });

    var hasError = findings.some(function (f) { return f.severity === "error"; });
    var hasWarn = findings.some(function (f) { return f.severity === "warn"; });
    var overall = hasError ? "error" : hasWarn ? "warn" : "ok";

    return { findings: findings, overall: overall };
  }

  var api = {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    toMinutes: toMinutes,
    toHHMM: toHHMM,
    groupByStaffSorted: groupByStaffSorted,
    computeGaps: computeGaps,
    generateSchedule: generateSchedule,
    auditSchedule: auditSchedule
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.DentalTimetable = api;
  }
})(typeof window !== "undefined" ? window : this);
