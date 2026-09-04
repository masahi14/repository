/* 画面制御。時間計算・監査ロジックは一切ここに置かず logic.js を呼ぶだけにする。 */
(function () {
  "use strict";

  var T = window.DentalTimetable;
  var patientBody = document.getElementById("patientBody");
  var rowSeq = 0;

  var WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

  function drNamesList() {
    return document.getElementById("drNames").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function dhNamesList() {
    return document.getElementById("dhNames").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function optionsHtml(list, current) {
    var html = '<option value="">未選択</option>';
    list.forEach(function (n) {
      html += '<option value="' + escapeHtml(n) + '"' + (n === current ? " selected" : "") + ">" + escapeHtml(n) + "</option>";
    });
    return html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function addPatientRow() {
    rowSeq++;
    var id = "row-" + rowSeq;
    var tr = document.createElement("tr");
    tr.className = "patient-row";
    tr.dataset.id = id;
    tr.innerHTML =
      '<td><input type="text" class="p-name" placeholder="患者名" /></td>' +
      '<td><input type="text" class="p-note" placeholder="例）新患・介護併用" /></td>' +
      '<td><select class="p-role"><option value="dr">Drのみ</option><option value="dh">DHのみ</option><option value="both">両方</option></select></td>' +
      '<td><select class="p-order"><option value="dr-then-dh">Dr→DH</option><option value="dh-then-dr">DH→Dr</option></select></td>' +
      '<td><select class="p-dr">' + optionsHtml(drNamesList()) + "</select></td>" +
      '<td><select class="p-dh">' + optionsHtml(dhNamesList()) + "</select></td>" +
      '<td><input type="number" class="p-dr-override" min="1" placeholder="任意" /></td>' +
      '<td><input type="number" class="p-dh-override" min="1" placeholder="任意" /></td>' +
      '<td><button type="button" class="danger remove-row">削除</button></td>';
    patientBody.appendChild(tr);
    tr.querySelector(".remove-row").addEventListener("click", function () {
      tr.remove();
    });
  }

  function refreshStaffSelects() {
    document.querySelectorAll(".p-dr").forEach(function (sel) {
      var cur = sel.value;
      sel.innerHTML = optionsHtml(drNamesList(), cur);
    });
    document.querySelectorAll(".p-dh").forEach(function (sel) {
      var cur = sel.value;
      sel.innerHTML = optionsHtml(dhNamesList(), cur);
    });
  }

  document.getElementById("addPatientBtn").addEventListener("click", addPatientRow);
  document.getElementById("drNames").addEventListener("input", refreshStaffSelects);
  document.getElementById("dhNames").addEventListener("input", refreshStaffSelects);
  document.getElementById("printBtn").addEventListener("click", function () {
    window.print();
  });

  // 初期表示用に1行用意
  addPatientRow();

  function collectPatients() {
    var rows = patientBody.querySelectorAll(".patient-row");
    var patients = [];
    rows.forEach(function (tr) {
      var role = tr.querySelector(".p-role").value;
      var drOverride = tr.querySelector(".p-dr-override").value;
      var dhOverride = tr.querySelector(".p-dh-override").value;
      patients.push({
        id: tr.dataset.id,
        name: tr.querySelector(".p-name").value.trim(),
        note: tr.querySelector(".p-note").value.trim(),
        role: role,
        order: tr.querySelector(".p-order").value,
        drStaff: tr.querySelector(".p-dr").value || null,
        dhStaff: tr.querySelector(".p-dh").value || null,
        drMinutesOverride: drOverride ? parseInt(drOverride, 10) : null,
        dhMinutesOverride: dhOverride ? parseInt(dhOverride, 10) : null
      });
    });
    return patients;
  }

  function renderFindings(container, findings) {
    container.innerHTML = "";
    if (findings.length === 0) {
      container.innerHTML = '<div class="finding" style="background:#eaf7ec;color:#1a7f37;">🟢 問題は検出されませんでした</div>';
      return;
    }
    findings.forEach(function (f) {
      var div = document.createElement("div");
      div.className = "finding " + f.severity;
      var icon = f.severity === "error" ? "🔴" : "🟡";
      div.textContent = icon + " " + f.message;
      container.appendChild(div);
    });
  }

  function formatDateHeader(dateStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
    if (!m) return dateStr || "(日付未入力)";
    var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    var weekday = WEEKDAY_JA[d.getDay()];
    return parseInt(m[2], 10) + "月" + parseInt(m[3], 10) + "日（" + weekday + "）";
  }

  function buildPatientNumberMap(patients) {
    var map = {};
    patients.forEach(function (p, idx) {
      map[p.id] = idx + 1;
    });
    return map;
  }

  function renderPatientTimetable(patients, blocks, drNames, dhNames) {
    var byPatientStaff = {};
    blocks.forEach(function (b) {
      byPatientStaff[b.patientId + "|" + b.staffType + "|" + b.staffName] = b;
    });

    var columns = drNames.map(function (n) { return { type: "dr", name: n }; }).concat(
      dhNames.map(function (n) { return { type: "dh", name: n }; })
    );

    var html = "<thead><tr><th>患者</th><th>区分</th>";
    columns.forEach(function (c) {
      html += "<th>" + (c.type === "dr" ? "Dr " : "DH ") + escapeHtml(c.name) + "</th>";
    });
    html += "</tr></thead><tbody>";

    patients.forEach(function (p, idx) {
      html += "<tr><td>" + (idx + 1) + "</td><td>" + escapeHtml(p.note || "") + "</td>";
      columns.forEach(function (c) {
        var b = byPatientStaff[p.id + "|" + c.type + "|" + c.name];
        html += "<td>" + (b ? T.toHHMM(b.start) + "〜" + T.toHHMM(b.end) + "（" + (b.end - b.start) + "分）" : "") + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody>";
    document.getElementById("patientTimetable").innerHTML = html;
  }

  function renderStrictCheck(blocks, patientNumberMap) {
    var byStaff = T.groupByStaffSorted(blocks);
    var container = document.getElementById("strictCheckView");
    var html = '<div class="strict-check-cols">';
    var keys = Object.keys(byStaff).sort(function (a, b) {
      var aType = a.split("|")[0];
      var bType = b.split("|")[0];
      if (aType !== bType) return aType === "dr" ? -1 : 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    keys.forEach(function (key) {
      var parts = key.split("|");
      var label = (parts[0] === "dr" ? "Dr" : "DH") + "（" + parts[1] + "）";
      var list = byStaff[key];
      html += "<div><div class=\"staff-name\">" + escapeHtml(label) + "</div>";
      var gaps = T.computeGaps(list);
      if (gaps.length === 0) {
        html += '<div class="gap-line">（患者1名のみ）</div>';
      }
      gaps.forEach(function (g) {
        var fromNo = patientNumberMap[g.from.patientId];
        var toNo = patientNumberMap[g.to.patientId];
        html +=
          '<div class="gap-line">●' +
          "" + fromNo + "終了" + T.toHHMM(g.from.end) +
          " → " +
          "" + toNo + "開始" + T.toHHMM(g.to.start) +
          "：" + g.gap + "分</div>";
      });
      html += "</div>";
    });
    html += "</div>";
    container.innerHTML = html;
  }

  document.getElementById("generateBtn").addEventListener("click", function () {
    var config = {
      drDuration: parseInt(document.getElementById("drDuration").value, 10) || T.DEFAULT_CONFIG.drDuration,
      drGap: parseInt(document.getElementById("drGap").value, 10) || T.DEFAULT_CONFIG.drGap,
      dhDuration: parseInt(document.getElementById("dhDuration").value, 10) || T.DEFAULT_CONFIG.dhDuration,
      dhGap: parseInt(document.getElementById("dhGap").value, 10) || T.DEFAULT_CONFIG.dhGap
    };

    var drNames = drNamesList();
    var dhNames = dhNamesList();
    var patients = collectPatients();

    var input = {
      facilityStart: document.getElementById("facilityStart").value,
      facilityEnd: document.getElementById("facilityEnd").value || null,
      drNames: drNames,
      dhNames: dhNames,
      patients: patients,
      config: config
    };

    var genResult = T.generateSchedule(input);
    var auditResult = T.auditSchedule(genResult.blocks, { config: config, facilityEnd: input.facilityEnd });
    var patientNumberMap = buildPatientNumberMap(patients);

    var facilityName = document.getElementById("facilityName").value || "(施設名未入力)";
    var dateLabel = formatDateHeader(document.getElementById("visitDate").value);
    var sessionLabel = document.getElementById("session").value;

    document.getElementById("sheetTitle").textContent = dateLabel + " " + facilityName + " 訪問歯科タイムテーブル（" + sessionLabel + "）";
    document.getElementById("sheetTimerange").textContent =
      (input.facilityStart || "-") + "〜" + (input.facilityEnd || "?") + "予定";

    var newPatientCount = document.getElementById("newPatientCount").value;
    var insuranceNote = document.getElementById("insuranceNote").value;
    var assistantNote = document.getElementById("assistantNote").value;
    var subLine1 = [
      newPatientCount ? "新患：" + newPatientCount + "名" : null,
      insuranceNote || null
    ].filter(Boolean).join("／");
    var subLine2 =
      "Dr：" + (drNames.join("、") || "(未入力)") + "　DH：" + (dhNames.join("、") || "(未入力)") + "　補助DH：" + (assistantNote || "(未入力)");
    document.getElementById("sheetSubheader").innerHTML =
      (subLine1 ? escapeHtml(subLine1) + "<br>" : "") + escapeHtml(subLine2);

    renderPatientTimetable(patients, genResult.blocks, drNames, dhNames);

    var maxEnd = null;
    genResult.blocks.forEach(function (b) {
      if (maxEnd === null || b.end > maxEnd) maxEnd = b.end;
    });
    document.getElementById("scheduleEndNote").textContent =
      "診療終了予定　" + (maxEnd !== null ? T.toHHMM(maxEnd) : "-");

    document.getElementById("visitInputView").innerHTML =
      '<div class="memo-view">' + (escapeHtml(document.getElementById("visitInputMemo").value) || "（未入力）") + "</div>";

    document.getElementById("facilityRuleTitle").textContent = "施設：" + facilityName + " の入力ルール";
    document.getElementById("facilityRuleView").innerHTML =
      '<div class="memo-view">' + (escapeHtml(document.getElementById("facilityRuleMemo").value) || "（未入力）") + "</div>";

    renderStrictCheck(genResult.blocks, patientNumberMap);

    renderFindings(document.getElementById("creationFindings"), genResult.creationErrors);
    renderFindings(document.getElementById("auditFindings"), auditResult.findings);

    var creationHasError = genResult.creationErrors.some(function (e) { return e.severity === "error"; });
    var overall = creationHasError ? "error" : auditResult.overall;
    var finalEl = document.getElementById("sheetFinal");
    finalEl.className = "sheet-final " + overall;
    if (overall === "ok") {
      finalEl.textContent = "🟢 時間チェック：OK　同一患者でのDr・DH重複なし／Dr・DHそれぞれの重複なし";
    } else if (overall === "warn") {
      finalEl.textContent = "🟡 要確認：下記「独立監査 詳細」を確認してください（重複はありませんが確認が必要な項目があります）";
    } else {
      finalEl.textContent = "🔴 エラー：時間重複または二重登録があります。このタイムテーブルは使用できません。「独立監査 詳細」を確認してください";
    }

    document.getElementById("resultSection").classList.remove("hidden");
  });
})();
