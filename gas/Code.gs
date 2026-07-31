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
  var doneSheet = getOrCreateSheet(ss, "完了", ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "問題点", "成果物"]);

  var addedCount = 0;
  (body.newTasks || []).forEach(function (r) {
    if (findRow(pendingSheet, r.repo, r.task) === -1) {
      appendTaskRow(pendingSheet, [r.repo, r.task, r.priority || "-", r.status || "対応中", r.requestedAt || "", r.note || "", r.urgent ? "TRUE" : "FALSE"]);
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
    var rowValues = [r.repo, r.task, priority, r.completedDate || "", r.note || "", r.detail || "", r.issues || "", r.output || ""];
    var doneRow = findRow(doneSheet, r.repo, r.task);
    if (doneRow > 0) {
      doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      appendTaskRow(doneSheet, rowValues);
    }
    completedCount++;
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true, added: addedCount, markedUrgent: urgentCount, commented: commentCount, completed: completedCount }))
    .setMimeType(ContentService.MimeType.JSON);
}

function listTasks() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行"]);
  var doneSheet = getOrCreateSheet(ss, "完了", ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "問題点", "成果物"]);
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
    done: rowsOf(doneSheet, ["repo", "task", "priority", "completedAt", "note", "detail", "issues", "output"]),
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
  var doneSheet = getOrCreateSheet(ss, "完了", ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "問題点", "成果物"]);

  function flatten(tasks, repo) {
    var out = [];
    tasks.forEach(function (t) {
      var r = repo || t.repo;
      out.push({ repo: r, task: t.task, priority: t.priority, status: t.status, updated: t.updated, note: t.note, detail: t.detail, issues: t.issues, output: t.output });
      if (t.subtasks) out = out.concat(flatten(t.subtasks, r));
    });
    return out;
  }

  var allTasks = flatten(data.tasks, null);

  allTasks.forEach(function (t) {
    if (t.status === "完了") {
      removeRow(pendingSheet, t.repo, t.task);
      var doneRow = findRow(doneSheet, t.repo, t.task);
      var rowValues = [t.repo, t.task, t.priority || "-", t.updated || "", t.note || "", t.detail || "", t.issues || "", t.output || ""];
      if (doneRow > 0) {
        doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        appendTaskRow(doneSheet, rowValues);
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

// 修復用: appendTaskRow導入前に1000行目以降へ紛れ込んでしまった実データを、
// 空白行を詰めてヘッダーの直下に戻す。Apps Scriptエディタからこの関数を選んで
// 一度だけ手動実行してください(自動では呼ばれません)。
function compactPendingSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, "依頼タスク", ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行"]);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var realRows = data.filter(function (row) { return row[0] !== ""; });
  sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  if (realRows.length > 0) {
    sheet.getRange(2, 1, realRows.length, 7).setValues(realRows);
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 1) {
    // ヘッダー行しかまだ無い(=実データが1件も無い)場合に限り、列構成が古ければ安全に上書きする。
    // 実データがある場合は列がズレる恐れがあるため、ここでは一切触らない。
    var currentHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var matches = headers.every(function (h, i) { return currentHeader[i] === h; });
    if (!matches) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// setupValidation()がG2:G1000にチェックボックス(既定値FALSE)を敷いているため、
// 素朴なappendRow()はgetLastRow()がその1000行分を「データあり」とみなしてしまい、
// 新規タスクが実際のデータの直下ではなく1000行以降に追記されてしまう(=シート上では
// 見えているのに、下までスクロールしないと気づけない/読み取りツールでも拾えない原因になっていた)。
// この関数はA列(Repo)に実際に値が入っている最後の行だけを見て、その直下に書き込む。
function appendTaskRow(sheet, values) {
  var colA = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getValues();
  var lastDataRow = 1;
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "") lastDataRow = i + 1;
  }
  sheet.getRange(lastDataRow + 1, 1, 1, values.length).setValues([values]);
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
