/* 画面制御。時間計算・監査ロジックは一切ここに置かず logic.js を呼ぶだけにする。 */
(function () {
  "use strict";

  var T = window.DentalTimetable;
  var patientBody = document.getElementById("patientBody");
  var visitItemBody = document.getElementById("visitItemBody");
  var rowSeq = 0;
  var visitItemSeq = 0;

  var WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
  var CIRCLED_DIGITS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
  var ICON_BY_TYPE = { main: "🔴", sub: "🟡", note: "⚠️" };

  // 施設ごとの介護保険の傾向（ユーザーからの申告に基づく参考メモ。自動判定には使わない）
  var FACILITY_CARE_HINT = {
    "養護老人ホーム潮来": { text: "この施設は「介護あり」「介護なし」が混在します。患者ごとに介護保険の有無を確認してください。", defaultCare: "" },
    "ハートワン潮来": { text: "この施設は基本的に全員「介護保険併用」です。", defaultCare: "あり" }
  };
  var currentCareDefault = "";

  function circledNumber(n) {
    return CIRCLED_DIGITS[n - 1] || String(n);
  }

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

  function addPatientRow(options) {
    options = options || {};
    rowSeq++;
    var id = "row-" + rowSeq;
    var tr = document.createElement("tr");
    tr.className = "patient-row";
    tr.dataset.id = id;
    tr.innerHTML =
      '<td><input type="text" class="p-patient-id" placeholder="ID(任意)" /></td>' +
      '<td><input type="text" class="p-name" placeholder="患者名" /></td>' +
      '<td><select class="p-care"><option value="">未設定</option><option value="あり">あり</option><option value="なし">なし</option></select></td>' +
      '<td><input type="text" class="p-note" placeholder="例）新患" /></td>' +
      '<td><select class="p-role"><option value="dr">Drのみ</option><option value="dh">DHのみ</option><option value="both">両方</option></select></td>' +
      '<td><select class="p-order"><option value="dr-then-dh">Dr→DH</option><option value="dh-then-dr">DH→Dr</option></select></td>' +
      '<td><select class="p-dr">' + optionsHtml(drNamesList()) + "</select></td>" +
      '<td><select class="p-dh">' + optionsHtml(dhNamesList()) + "</select></td>" +
      '<td><input type="number" class="p-dr-override" min="1" placeholder="任意" /></td>' +
      '<td><input type="number" class="p-dh-override" min="1" placeholder="任意" /></td>' +
      '<td><button type="button" class="danger remove-row">削除</button></td>';
    if (currentCareDefault) {
      tr.querySelector(".p-care").value = currentCareDefault;
    }
    if (options.consultation) {
      tr.dataset.consultation = "1";
      tr.querySelector(".p-name").value = "施設相談";
      tr.querySelector(".p-note").value = "施設相談";
      tr.querySelector(".p-role").value = "dr";
      tr.querySelector(".p-dr-override").value = "5";
      if (drNamesList().length === 1) {
        tr.querySelector(".p-dr").value = drNamesList()[0];
      }
    }
    patientBody.appendChild(tr);
    tr.querySelector(".remove-row").addEventListener("click", function () {
      tr.remove();
    });
  }

  function addConsultRow() {
    addPatientRow({ consultation: true });
  }

  function addVisitItemRow() {
    visitItemSeq++;
    var tr = document.createElement("tr");
    tr.className = "visit-item-row";
    tr.dataset.id = "visit-item-" + visitItemSeq;
    tr.innerHTML =
      '<td><select class="vi-type"><option value="main">●主項目(赤)</option><option value="sub">●管理料等(黄)</option><option value="note">⚠️注意事項</option></select></td>' +
      '<td><input type="text" class="vi-name" placeholder="例）(歯)居宅療養II" /></td>' +
      '<td><input type="text" class="vi-caption" placeholder="例）人数の見方：月の対象人数" /></td>' +
      '<td><input type="text" class="vi-value" placeholder="例）月10人以上" /></td>' +
      '<td><button type="button" class="danger remove-row">削除</button></td>';
    visitItemBody.appendChild(tr);
    tr.querySelector(".remove-row").addEventListener("click", function () {
      tr.remove();
    });
  }

  document.getElementById("addVisitItemBtn").addEventListener("click", addVisitItemRow);
  addVisitItemRow();

  function collectVisitItems() {
    var rows = visitItemBody.querySelectorAll(".visit-item-row");
    var items = [];
    rows.forEach(function (tr) {
      var name = tr.querySelector(".vi-name").value.trim();
      if (!name) return;
      items.push({
        type: tr.querySelector(".vi-type").value,
        name: name,
        caption: tr.querySelector(".vi-caption").value.trim(),
        value: tr.querySelector(".vi-value").value.trim()
      });
    });
    return items;
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

  document.getElementById("addPatientBtn").addEventListener("click", function () { addPatientRow(); });
  document.getElementById("addConsultBtn").addEventListener("click", addConsultRow);
  document.getElementById("drNames").addEventListener("input", refreshStaffSelects);
  document.getElementById("dhNames").addEventListener("input", refreshStaffSelects);
  document.getElementById("printBtn").addEventListener("click", function () {
    window.print();
  });

  document.getElementById("facilityPreset").addEventListener("change", function () {
    var val = this.value;
    var hint = document.getElementById("facilityHint");
    if (!val) {
      hint.classList.add("hidden");
      currentCareDefault = "";
      return;
    }
    if (val === "custom") {
      document.getElementById("facilityName").value = "";
      document.getElementById("facilityName").focus();
      hint.classList.add("hidden");
      currentCareDefault = "";
      return;
    }
    document.getElementById("facilityName").value = val;
    currentCareDefault = (FACILITY_CARE_HINT[val] || {}).defaultCare || "";
    if (currentCareDefault) {
      document.querySelectorAll(".p-care").forEach(function (sel) {
        if (!sel.value) sel.value = currentCareDefault;
      });
    }
    var hintText = (FACILITY_CARE_HINT[val] || {}).text;
    if (hintText) {
      hint.textContent = "💡 " + hintText;
      hint.classList.remove("hidden");
    } else {
      hint.classList.add("hidden");
    }
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
      var patientId = tr.querySelector(".p-patient-id").value.trim();
      var name = tr.querySelector(".p-name").value.trim();
      var isConsultation = tr.dataset.consultation === "1";
      // 二重登録チェックの識別キー：患者IDがあればID、無ければ氏名で同一人物を判定する
      // （行ごとに自動採番されるtr.dataset.idは常に一意なため、識別キーには使えない）
      // 施設相談は同じ名前で複数回登録されうる（別人物ではない）ので、氏名ではなく行IDで区別する
      var identity = patientId || (isConsultation ? null : name) || tr.dataset.id;
      patients.push({
        id: identity,
        patientId: patientId,
        name: name,
        care: tr.querySelector(".p-care").value,
        note: tr.querySelector(".p-note").value.trim(),
        role: role,
        isConsultation: isConsultation,
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

  function renderPatientTimetable(patients, blocks, drNames, dhNames, dhRoleLabel) {
    var byPatientStaff = {};
    blocks.forEach(function (b) {
      byPatientStaff[b.patientId + "|" + b.staffType + "|" + b.staffName] = b;
    });

    var columns = drNames.map(function (n) { return { type: "dr", name: n }; }).concat(
      dhNames.map(function (n) { return { type: "dh", name: n }; })
    );

    var html = "<thead><tr><th>患者</th><th>ID</th><th>氏名</th><th>介護保険</th><th>区分</th>";
    columns.forEach(function (c) {
      var label = (c.type === "dr" ? "Dr " : "DH ") + escapeHtml(c.name);
      if (c.type === "dh" && dhRoleLabel) label += "（" + escapeHtml(dhRoleLabel) + "）";
      html += "<th>" + label + "</th>";
    });
    html += "</tr></thead><tbody>";

    patients.forEach(function (p, idx) {
      var careDisplay = p.isConsultation ? "—" : (p.care ? p.care : '<span style="color:#b3261e;">未設定</span>');
      html +=
        "<tr><td>" + circledNumber(idx + 1) + "</td><td>" + escapeHtml(p.patientId || "-") + "</td><td>" +
        escapeHtml(p.name) + "</td><td>" + careDisplay + "</td><td>" + escapeHtml(p.note || "") + "</td>";
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
          '<div class="gap-line">●' + fromNo + "終了" + T.toHHMM(g.from.end) +
          " → " + toNo + "開始" + T.toHHMM(g.to.start) +
          "：" + g.gap + "分</div>";
      });
      html += "</div>";
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function renderAutoFee(fee) {
    if (!fee || fee.count === 0) return "";
    var total = fee.perPatient.reduce(function (sum, pf) {
      return sum + (pf.points || 0) + (pf.assistPoints || 0);
    }, 0);
    var html =
      '<div class="visit-item auto-fee">' +
      '<div class="visit-item-header">' +
      '<span>🔴 歯科訪問診療料(' + fee.category + ') <span class="auto-tag">自動計算</span></span>' +
      '<span class="visit-item-value">合計 ' + total + "点</span>" +
      "</div>" +
      '<div class="visit-item-caption">人数の見方：同一建物内・同日に歯科訪問診療を行った人数 → ' + fee.count + "名</div>";
    fee.perPatient.forEach(function (pf, idx) {
      var durText = pf.duration === null ? "時間不明" : pf.duration + "分" + (pf.over20 ? "" : "（20分未満）");
      html += '<div class="gap-line">' + (idx + 1) + "：" + escapeHtml(pf.patientName || "") + "　" + durText + " → " + (pf.points === null ? "要確認" : pf.points + "点");
      if (pf.assistPoints) {
        html += "　＋歯科訪問診療補助加算 " + pf.assistPoints + "点";
      }
      html += "</div>";
    });
    html += "</div>";
    return html;
  }

  function renderVisitInput(fee) {
    var items = collectVisitItems();
    var noteText = document.getElementById("visitInputNote").value.trim();
    var html = renderAutoFee(fee);
    if (items.length === 0 && !noteText) {
      html += html ? "" : '<div class="memo-view">（未入力）</div>';
    } else {
      items.forEach(function (item) {
        html +=
          '<div class="visit-item">' +
          '<div class="visit-item-header">' +
          '<span>' + ICON_BY_TYPE[item.type] + " " + escapeHtml(item.name) + "</span>" +
          '<span class="visit-item-value">' + escapeHtml(item.value || "要確認") + "</span>" +
          "</div>" +
          (item.caption ? '<div class="visit-item-caption">' + escapeHtml(item.caption) + "</div>" : "") +
          "</div>";
      });
      if (noteText) {
        noteText.split("\n").forEach(function (line) {
          if (line.trim()) {
            html += '<div class="visit-item-note">⚠️ ' + escapeHtml(line.trim()) + "</div>";
          }
        });
      }
    }
    document.getElementById("visitInputView").innerHTML = html;
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
    var visitFee = T.calcVisitFees(patients, genResult.blocks);

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

    var dhRoleLabel = document.getElementById("dhRoleLabel").value.trim();
    renderPatientTimetable(patients, genResult.blocks, drNames, dhNames, dhRoleLabel);

    var maxEnd = null;
    genResult.blocks.forEach(function (b) {
      if (maxEnd === null || b.end > maxEnd) maxEnd = b.end;
    });
    document.getElementById("scheduleEndNote").textContent =
      "診療終了予定　" + (maxEnd !== null ? T.toHHMM(maxEnd) : "-");

    renderVisitInput(visitFee);
    renderStrictCheck(genResult.blocks, patientNumberMap);

    document.getElementById("facilityRuleTitle").textContent = "施設：" + facilityName + " の入力ルール";
    document.getElementById("facilityRuleView").innerHTML =
      '<div class="memo-view">' + (escapeHtml(document.getElementById("facilityRuleMemo").value) || "（未入力）") + "</div>";

    var creationFindings = genResult.creationErrors.slice();
    patients.forEach(function (p, idx) {
      if (p.isConsultation) {
        if (!p.drMinutesOverride) {
          creationFindings.push({
            severity: "warn",
            code: "CONSULT_DURATION_UNSET",
            message: "施設相談「" + (idx + 1) + "件目」：相談時間(分)が未入力のため、通常のDr処置時間で計算されています。3〜10分程度を入力してください。"
          });
        } else if (p.drMinutesOverride > 10) {
          creationFindings.push({
            severity: "warn",
            code: "CONSULT_DURATION_LONG",
            message: "施設相談「" + (p.name || (idx + 1) + "件目") + "」：相談時間が" + p.drMinutesOverride + "分です（目安は長くて10分）。時間を確認してください。"
          });
        }
        return;
      }
      if (!p.care) {
        creationFindings.push({
          severity: "warn",
          code: "CARE_STATUS_UNSET",
          message: "患者「" + (p.name || (idx + 1) + "件目") + "」：介護保険の有無が未設定です。区分を確認してください。"
        });
      }
    });
    renderFindings(document.getElementById("creationFindings"), creationFindings);
    renderFindings(document.getElementById("auditFindings"), auditResult.findings);

    var creationHasError = creationFindings.some(function (e) { return e.severity === "error"; });
    var creationHasWarn = creationFindings.some(function (e) { return e.severity === "warn"; });
    var overall = creationHasError ? "error" : (creationHasWarn || auditResult.overall === "warn") ? "warn" : auditResult.overall;
    var finalEl = document.getElementById("sheetFinal");
    finalEl.className = "sheet-final " + overall;
    if (overall === "ok") {
      finalEl.textContent = "🟢 時間チェック：OK　同一患者でのDr・DH重複なし／Dr・DHそれぞれの重複なし";
    } else if (overall === "warn") {
      finalEl.textContent = "🟡 要確認：上記「作成時チェック」または下記「独立監査 詳細」を確認してください";
    } else {
      finalEl.textContent = "🔴 エラー：時間重複または二重登録があります。このタイムテーブルは使用できません。「独立監査 詳細」を確認してください";
    }

    document.getElementById("resultSection").classList.remove("hidden");
  });
})();
