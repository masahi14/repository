/* 画面制御。時間計算・監査ロジックは一切ここに置かず logic.js を呼ぶだけにする。 */
(function () {
  "use strict";

  var T = window.DentalTimetable;
  var patientBody = document.getElementById("patientBody");
  var rowSeq = 0;

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
    var drOpts = optionsHtml(drNamesList());
    var dhOpts = optionsHtml(dhNamesList());
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

  function renderStaffTimetables(blocks) {
    var container = document.getElementById("staffTimetables");
    container.innerHTML = "";
    var byStaff = {};
    blocks.forEach(function (b) {
      var key = (b.staffType === "dr" ? "Dr " : "DH ") + b.staffName;
      byStaff[key] = byStaff[key] || [];
      byStaff[key].push(b);
    });
    Object.keys(byStaff)
      .sort()
      .forEach(function (key) {
        var list = byStaff[key].slice().sort(function (a, b) { return a.start - b.start; });
        var div = document.createElement("div");
        div.className = "staff-timetable";
        var rowsHtml = list
          .map(function (b) {
            return "<tr><td>" + T.toHHMM(b.start) + "〜" + T.toHHMM(b.end) + "</td><td>" + escapeHtml(b.patientName) + "</td></tr>";
          })
          .join("");
        div.innerHTML =
          "<h3>" + escapeHtml(key) + "</h3>" +
          "<table><thead><tr><th>時間</th><th>患者</th></tr></thead><tbody>" + rowsHtml + "</tbody></table>";
        container.appendChild(div);
      });
  }

  document.getElementById("generateBtn").addEventListener("click", function () {
    var config = {
      drDuration: parseInt(document.getElementById("drDuration").value, 10) || T.DEFAULT_CONFIG.drDuration,
      drGap: parseInt(document.getElementById("drGap").value, 10) || T.DEFAULT_CONFIG.drGap,
      dhDuration: parseInt(document.getElementById("dhDuration").value, 10) || T.DEFAULT_CONFIG.dhDuration,
      dhGap: parseInt(document.getElementById("dhGap").value, 10) || T.DEFAULT_CONFIG.dhGap
    };

    var input = {
      facilityStart: document.getElementById("facilityStart").value,
      facilityEnd: document.getElementById("facilityEnd").value || null,
      drNames: drNamesList(),
      dhNames: dhNamesList(),
      patients: collectPatients(),
      config: config
    };

    var genResult = T.generateSchedule(input);
    var auditResult = T.auditSchedule(genResult.blocks, { config: config, facilityEnd: input.facilityEnd });

    var header = document.getElementById("headerSummary");
    header.innerHTML =
      "<p><strong>" + escapeHtml(document.getElementById("facilityName").value || "(施設名未入力)") + "</strong>　" +
      escapeHtml(document.getElementById("visitDate").value || "(日付未入力)") + "　" +
      escapeHtml(document.getElementById("session").value) + "　開始 " + escapeHtml(input.facilityStart || "-") +
      (input.facilityEnd ? "　予定終了 " + escapeHtml(input.facilityEnd) : "") +
      "　患者数: " + input.patients.length + "名</p>";

    renderStaffTimetables(genResult.blocks);
    renderFindings(document.getElementById("creationFindings"), genResult.creationErrors);
    renderFindings(document.getElementById("auditFindings"), auditResult.findings);

    var badge = document.getElementById("overallBadge");
    var creationHasError = genResult.creationErrors.some(function (e) { return e.severity === "error"; });
    var overall = creationHasError ? "error" : auditResult.overall;
    badge.className = "overall-badge " + overall;
    badge.textContent = overall === "ok" ? "🟢 OK" : overall === "warn" ? "🟡 要確認" : "🔴 エラー（使用不可）";

    document.getElementById("resultSection").classList.remove("hidden");
  });
})();
