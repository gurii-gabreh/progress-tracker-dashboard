// このファイルはGitHubとは自動連携していない。「実装進捗管理シート」に紐付いたApps Scriptプロジェクトの
// エディタへ手動で貼り付け、既存のウェブアプリデプロイを「新しいバージョン」で更新する必要がある。
var SHEET_ID = "1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw";

function doGet(e) {
  var action = e.parameter && e.parameter.action;
  if (action === "list") {
    return ContentService.createTextOutput(JSON.stringify(listTasks()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: "Task tracker GAS endpoint is running" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var SECRET = "8a2fad1907b8d935f758ede8f66d05d7";
  var body = JSON.parse(e.postData.contents);
  if (body.token !== SECRET) {
    return ContentService.createTextOutput(JSON.stringify({ error: "unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行"]);
  var doneSheet = getOrCreateSheet(ss, "完了", ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "成果物"]);

  var addedCount = 0;
  (body.newTasks || []).forEach(function (r) {
    if (findRow(pendingSheet, r.repo, r.task) === -1) {
      pendingSheet.appendRow([r.repo, r.task, r.priority || "-", r.status || "対応中", r.requestedAt || "", r.note || "", r.urgent ? "TRUE" : "FALSE"]);
      addedCount++;
    }
  });

  var urgentCount = 0;
  (body.markUrgent || []).forEach(function (r) {
    var rowIndex = findRow(pendingSheet, r.repo, r.task);
    if (rowIndex > 0) {
      pendingSheet.getRange(rowIndex, 7).setValue("TRUE");
      urgentCount++;
    }
  });

  var commentSheet = getOrCreateSheet(ss, "コメント", ["Repo", "Task", "発言者", "本文", "日時"]);
  var commentCount = 0;
  (body.addComment || []).forEach(function (c) {
    commentSheet.appendRow([c.repo, c.task, c.author || "user", c.text || "", c.at || ""]);
    commentCount++;
  });

  var completedCount = 0;
  (body.completeTasks || []).forEach(function (r) {
    var priority = "-";
    var pendingRow = findRow(pendingSheet, r.repo, r.task);
    if (pendingRow > 0) {
      priority = pendingSheet.getRange(pendingRow, 3).getValue() || "-";
      pendingSheet.deleteRow(pendingRow);
    }
    var rowValues = [r.repo, r.task, priority, r.completedDate || "", r.note || "", r.detail || "", r.output || ""];
    var doneRow = findRow(doneSheet, r.repo, r.task);
    if (doneRow > 0) {
      doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      doneSheet.appendRow(rowValues);
    }
    completedCount++;
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true, added: addedCount, markedUrgent: urgentCount, commented: commentCount, completed: completedCount }))
    .setMimeType(ContentService.MimeType.JSON);
}

function listTasks() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行"]);
  var doneSheet = getOrCreateSheet(ss, "完了", ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "成果物"]);
  var commentSheet = getOrCreateSheet(ss, "コメント", ["Repo", "Task", "発言者", "本文", "日時"]);

  function rowsOf(sheet, keys) {
    var data = sheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      keys.forEach(function (k, idx) { row[k] = data[i][idx]; });
      out.push(row);
    }
    return out;
  }

  return {
    ok: true,
    pending: rowsOf(pendingSheet, ["repo", "task", "priority", "status", "requestedAt", "note", "urgent"]),
    done: rowsOf(doneSheet, ["repo", "task", "priority", "completedAt", "note", "detail", "output"]),
    comments: rowsOf(commentSheet, ["repo", "task", "author", "text", "at"]),
  };
}

function syncFromGithub() {
  var url = "https://raw.githubusercontent.com/gurii-gabreh/progress-tracker-dashboard/main/data/tasks.json";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return;
  var data = JSON.parse(res.getContentText());

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行"]);
  var doneSheet = getOrCreateSheet(ss, "完了", ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "成果物"]);

  function flatten(tasks, repo) {
    var out = [];
    tasks.forEach(function (t) {
      var r = repo || t.repo;
      out.push({ repo: r, task: t.task, priority: t.priority, status: t.status, updated: t.updated, note: t.note, detail: t.detail, output: t.output });
      if (t.subtasks) out = out.concat(flatten(t.subtasks, r));
    });
    return out;
  }

  var allTasks = flatten(data.tasks, null);

  allTasks.forEach(function (t) {
    if (t.status === "完了") {
      removeRow(pendingSheet, t.repo, t.task);
      var doneRow = findRow(doneSheet, t.repo, t.task);
      var rowValues = [t.repo, t.task, t.priority || "-", t.updated || "", t.note || "", t.detail || "", t.output || ""];
      if (doneRow > 0) {
        doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        doneSheet.appendRow(rowValues);
      }
    }
  });
}

function setupValidation() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, "依頼タスク", ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行"]);

  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["高", "中", "低"], true)
    .setAllowInvalid(false)
    .build();
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["未着手", "対応中", "新規", "進行中", "スキップ"], true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange("C2:C1000").setDataValidation(priorityRule);
  sheet.getRange("D2:D1000").setDataValidation(statusRule);
  sheet.getRange("G2:G1000").insertCheckboxes(); // 即実行列を本物のチェックボックスにする
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function findRow(sheet, repo, task) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === repo && data[i][1] === task) return i + 1;
  }
  return -1;
}

function removeRow(sheet, repo, task) {
  var rowIndex = findRow(sheet, repo, task);
  if (rowIndex > 0) sheet.deleteRow(rowIndex);
}
