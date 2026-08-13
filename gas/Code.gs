// このファイルはGitHubとは自動連携していない。「実装進捗管理シート」に紐付いたApps Scriptプロジェクトの
// エディタへ手動で貼り付け、保存する必要がある。
// - doGet/doPost(ウェブアプリ本体。ダッシュボードやRoutineがHTTPで呼ぶ)を変更した場合は、
//   デプロイ→デプロイを管理→既存のウェブアプリデプロイを「新しいバージョン」で更新すること。
// - syncFromGithub()のようなトリガー実行専用の関数は、保存するだけで(=デプロイ不要で)
//   次回のトリガー実行から最新の内容が使われる。時間主導トリガー(例: 1時間おき)が未設定の場合は
//   Apps Scriptエディタ左側の「トリガー」アイコン→「トリガーを追加」から設定すること。
//   これによりRoutineの実行環境からこのウェブアプリへ直接アクセスできない場合でも、
//   このトリガーがGoogle側からGitHubのdata/tasks.jsonを定期的に取りに行くことで、
//   依頼タスク→完了タブの移動・コメント返信・完了予定タスクの確定がいずれ追いつく。
// - ダッシュボードの「⏩ 今すぐ同期」ボタンはdoPostに{token, syncNow:true}をPOSTし、
//   syncFromGithub()を即座に1回だけ手動実行する(上記の時間主導トリガーを待たずに済む)。
var SHEET_ID = "1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw";

// 依頼タスクタブの列構成。8〜11列目は「✓ 完了にする」ボタン(ダッシュボード)による
// 取消可能な完了予約(スケジュール完了)のための列。
//   完了予定: TRUE = 完了予約中(取消期限までは取り消せる)
//   取消期限: "yyyy-MM-dd HH:mm"(JST)。この時刻を過ぎるとsyncFromGithub実行時に自動確定する
//   元ステータス: 完了予約前のステータス(取り消し時にここへ戻す)
//   完了データ: {note, detail, issues, output}のJSON文字列(確定時に完了タブへ書き込む内容)
// 12列目のタスクIDは、dashboard.html/data/tasks.json側で各タスクに付与しているid
// ({repo略号}-{連番}、例: "KIZ-003")をそのまま転記したもの。列位置を変えると既存の
// 固定インデックス参照(getRange(row, 4)等)が全てズレるため、必ず末尾に追加すること。
var PENDING_ID_COL = 12;
var PENDING_HEADERS = ["Repo", "Task", "優先度", "ステータス", "依頼日", "備考", "即実行", "完了予定", "取消期限", "元ステータス", "完了データ", "タスクID"];
var DONE_ID_COL = 9;
var DONE_HEADERS = ["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "問題点", "成果物", "タスクID"];
// コメントタブの6〜7列目は、ユーザーの投稿(追加指示)に対してRoutineが後から返信したかどうかを
// シート単体からも判別できるようにするための列。
//   ステータス: author=userの行のみ使用。"未対応" → "対応済み"(Routineの返信を検知して自動更新)
//   対応内容: 対応済みになった際の、Routine側の返信本文をそのまま転記(問題点があればここに残る)
var COMMENT_HEADERS = ["Repo", "Task", "発言者", "本文", "日時", "ステータス", "対応内容"];
// 「対応中タスクのナレッジ」タブ: 完了していない(未着手・対応中・進行中等)タスクのみを対象に、
// 1行ずつ機械的に反映する専用タブ。「完了」タブの実装ナレッジ列は完了タスクのみが対象で、
// 完了していないタスクの実装ナレッジはどこにも転記されない欠落があったため新設した(2026-08-12)。
// 完了タブと内容が重複しないよう、あるタスクが「完了」になった時点でこのタブの行は削除し、
// 以後は完了タブ側にのみ実装ナレッジが残るようにする(完了タブ・このタブを合わせて見れば、
// 常にどちらか片方にだけそのタスクの実装ナレッジがある状態になる)。data/tasks.jsonの内容を
// そのままミラーするだけで、Routine側が「書いたかどうか」を要約・判断せずに済むようにする。
var KNOWLEDGE_HEADERS = ["Repo", "Task", "タスクID", "ステータス", "更新日", "実装ナレッジ", "備考", "問題点", "成果物"];
// 📚学習ログタブの「確認した」ボタンの記録先。localStorageだけだと端末をまたいで見えず、
// GitHub側(data/concept-log.json)からも状態が分からないため、押すたびにこのタブへ1行追記して
// 永続化する(2026-08-11追加)。
var CONCEPT_LOG_HEADERS = ["日時", "分野", "概念ID", "概念名", "文脈"];

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

  if (body.syncNow) {
    var syncResult = syncFromGithub();
    return ContentService.createTextOutput(JSON.stringify({ ok: true, synced: true, result: syncResult }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", PENDING_HEADERS);
  var doneSheet = getOrCreateSheet(ss, "完了", DONE_HEADERS);
  ensureHeaderColumns_(pendingSheet, PENDING_HEADERS);

  var addedCount = 0;
  (body.newTasks || []).forEach(function (r) {
    if (findRow(pendingSheet, r.repo, r.task) === -1) {
      // 8〜11列目(完了予定/取消期限/元ステータス/完了データ)は新規タスクでは未使用のため空欄、
      // 12列目にタスクID(dashboard.html側で採番済みのidをそのまま転記)を入れる。
      appendTaskRow(pendingSheet, [r.repo, r.task, r.priority || "-", r.status || "対応中", r.requestedAt || "", r.note || "", r.urgent ? "TRUE" : "FALSE", "", "", "", "", r.id || ""]);
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

  var commentSheet = getOrCreateSheet(ss, "コメント", COMMENT_HEADERS);
  ensureHeaderColumns_(commentSheet, COMMENT_HEADERS);
  var commentCount = 0;
  (body.addComment || []).forEach(function (c) {
    var status = (c.author || "user") === "user" ? "未対応" : "";
    commentSheet.appendRow([c.repo, c.task, c.author || "user", c.text || "", c.at || "", status, ""]);
    commentCount++;
  });

  var completedCount = 0;
  (body.completeTasks || []).forEach(function (r) {
    var priority = "-";
    var existingId = "";
    var pendingRow = findRow(pendingSheet, r.repo, r.task);
    if (pendingRow > 0) {
      priority = pendingSheet.getRange(pendingRow, 3).getValue() || "-";
      existingId = pendingSheet.getRange(pendingRow, PENDING_ID_COL).getValue() || "";
      pendingSheet.deleteRow(pendingRow);
    }
    var rowValues = [r.repo, r.task, priority, r.completedDate || "", r.note || "", r.detail || "", r.issues || "", r.output || "", r.id || existingId];
    var doneRow = findRow(doneSheet, r.repo, r.task);
    if (doneRow > 0) {
      doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      appendTaskRow(doneSheet, rowValues);
    }
    completedCount++;
  });

  // 「✓ 完了にする」ボタン(ダッシュボード)からの完了予約。即座には完了タブへ移動せず、
  // 依頼タスクタブ上で「完了予定」ステータス+取消期限を記録するだけにとどめ、期限
  // (翌日9:00 JST)を過ぎたらsyncFromGithub実行時に自動確定する(誤操作の取り消し猶予のため)。
  var scheduledCount = 0;
  (body.scheduleComplete || []).forEach(function (r) {
    var deadline = jstDeadlineNextDay9am_();
    var payload = JSON.stringify({ note: r.note || "", detail: r.detail || "", issues: r.issues || "", output: r.output || "" });
    var rowIndex = findRow(pendingSheet, r.repo, r.task);
    if (rowIndex > 0) {
      var priorStatus = pendingSheet.getRange(rowIndex, 4).getValue() || "未着手";
      pendingSheet.getRange(rowIndex, 4, 1, 1).setValue("完了予定");
      pendingSheet.getRange(rowIndex, 8, 1, 4).setValues([[true, deadline, priorStatus, payload]]);
      if (r.id) pendingSheet.getRange(rowIndex, PENDING_ID_COL).setValue(r.id);
    } else {
      // 依頼タスクタブに元々行が無かった(Web側でのみ管理していた)タスクの場合は、
      // 完了予定行として新規に追加した上で、同じ確定フローに乗せる。
      appendTaskRow(pendingSheet, [r.repo, r.task, r.priority || "-", "完了予定", r.requestedAt || "", "", "FALSE", true, deadline, "未着手", payload, r.id || ""]);
    }
    scheduledCount++;
  });

  // 完了予約の取り消し。取消期限内であれば、元のステータスへ戻し予約列をクリアする。
  var canceledCount = 0;
  (body.cancelComplete || []).forEach(function (r) {
    var rowIndex = findRow(pendingSheet, r.repo, r.task);
    if (rowIndex > 0) {
      var priorStatus = pendingSheet.getRange(rowIndex, 10).getValue() || "未着手";
      pendingSheet.getRange(rowIndex, 4, 1, 1).setValue(priorStatus);
      pendingSheet.getRange(rowIndex, 8, 1, 4).setValues([[false, "", "", ""]]);
      canceledCount++;
    }
  });

  // 📚学習ログタブの「確認した」ボタン。押すたびに1件ずつ、その場でこのタブへ記録する
  // (GASが1日1回のタイマーでまとめて記録するのではなく、押した瞬間に即時記録する方式)。
  var conceptLogSheet = getOrCreateSheet(ss, "学習ログ確認", CONCEPT_LOG_HEADERS);
  var confirmedCount = 0;
  (body.confirmConcept || []).forEach(function (c) {
    conceptLogSheet.appendRow([c.at || jstNow_(), c.category || "", c.id || "", c.concept || "", c.context || ""]);
    confirmedCount++;
  });

  return ContentService.createTextOutput(JSON.stringify({
    ok: true, added: addedCount, markedUrgent: urgentCount, commented: commentCount,
    completed: completedCount, scheduled: scheduledCount, canceled: canceledCount, confirmed: confirmedCount,
  })).setMimeType(ContentService.MimeType.JSON);
}

function listTasks() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", PENDING_HEADERS);
  var doneSheet = getOrCreateSheet(ss, "完了", DONE_HEADERS);
  var commentSheet = getOrCreateSheet(ss, "コメント", COMMENT_HEADERS);
  var conceptLogSheet = getOrCreateSheet(ss, "学習ログ確認", CONCEPT_LOG_HEADERS);
  ensureHeaderColumns_(pendingSheet, PENDING_HEADERS);
  ensureHeaderColumns_(commentSheet, COMMENT_HEADERS);

  // keysは列1から順番に対応させるための配列(途中を飛ばせない)。keysで数えきれない、
  // 離れた位置にある列(例: 依頼タスクタブの12列目=タスクID、10〜11列目は非公開のまま)は
  // extraCols({名前: 0始まりの列インデックス})で個別に指定する。
  function rowsOf(sheet, keys, extraCols) {
    var data = sheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      keys.forEach(function (k, idx) { row[k] = data[i][idx]; });
      if (extraCols) {
        Object.keys(extraCols).forEach(function (name) { row[name] = data[i][extraCols[name]]; });
      }
      out.push(row);
    }
    return out;
  }

  return {
    ok: true,
    pending: rowsOf(pendingSheet, ["repo", "task", "priority", "status", "requestedAt", "note", "urgent", "scheduledComplete", "cancelDeadline"], { id: PENDING_ID_COL - 1 }),
    done: rowsOf(doneSheet, ["repo", "task", "priority", "completedAt", "note", "detail", "issues", "output", "id"]),
    comments: rowsOf(commentSheet, ["repo", "task", "author", "text", "at", "status", "resolution"]),
    // 📚学習ログの確認記録。今のところ読み取り専用で公開するのみ(data/concept-log.jsonへの
    // 反映はRoutine/マネージャールームが必要に応じて手動で行う想定。自動反映は未実装)。
    conceptConfirmations: rowsOf(conceptLogSheet, ["at", "category", "id", "concept", "context"]),
  };
}

// Routineが動くRoutine実行環境からscript.google.comへの直接アクセスがネットワークポリシーで
// ブロックされる場合があり、その場合doPost(completeTasks/addComment)を直接呼べない。
// この関数はその代替経路: GAS側(Googleのインフラ上で動くため上記の制約を受けない)が
// data/tasks.json をGitHubから定期的に取得しに行く「プル型」の同期を行う。
// あわせて、完了予約(scheduleComplete)のうち取消期限を過ぎたものの自動確定と、
// コメントタブの対応状況(ステータス/対応内容)の更新もこの関数内で行う。
function syncFromGithub() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pendingSheet = getOrCreateSheet(ss, "依頼タスク", PENDING_HEADERS);
  var doneSheet = getOrCreateSheet(ss, "完了", DONE_HEADERS);
  var commentSheet = getOrCreateSheet(ss, "コメント", COMMENT_HEADERS);
  var knowledgeSheet = getOrCreateSheet(ss, "対応中タスクのナレッジ", KNOWLEDGE_HEADERS);
  ensureHeaderColumns_(pendingSheet, PENDING_HEADERS);
  ensureHeaderColumns_(commentSheet, COMMENT_HEADERS);

  // 1) 取消期限を過ぎた完了予約を確定する(依頼タスクタブ→完了タブへ実際に移動)。
  var finalizedCount = finalizeScheduledCompletions_(pendingSheet, doneSheet);

  var url = "https://raw.githubusercontent.com/gurii-gabreh/progress-tracker-dashboard/main/data/tasks.json";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return { ok: false, error: "fetch failed: " + res.getResponseCode(), finalized: finalizedCount };
  var data = JSON.parse(res.getContentText());

  function flatten(tasks, repo) {
    var out = [];
    tasks.forEach(function (t) {
      var r = repo || t.repo;
      out.push({ repo: r, task: t.task, id: t.id, priority: t.priority, status: t.status, updated: t.updated, note: t.note, detail: t.detail, issues: t.issues, output: t.output, comments: t.comments });
      if (t.subtasks) out = out.concat(flatten(t.subtasks, r));
    });
    return out;
  }

  var allTasks = flatten(data.tasks, null);

  // 「対応中タスクのナレッジ」タブへの反映: 完了していないタスクのみを1行ずつ機械的にupsertする。
  // data/tasks.json側のnote/detail/issues/outputをそのまま転記するだけで、要約や取捨選択は
  // 行わない(空欄なら空欄のまま書く。「何も書かれていない」こと自体がシート上で一目で
  // 分かるようにするのが目的のため)。あるタスクが「完了」になった時点でこのタブの行は削除し、
  // 完了タブと内容が重複しないようにする(完了タブ側は既存のmovedToDoneロジックが担当する)。
  var knowledgeIdx = buildSheetIndex(knowledgeSheet);
  var knowledgeRowsToDelete = [];
  var updatedKnowledge = 0;
  allTasks.forEach(function (t) {
    if (!t.repo || !t.task || t.task.indexOf("(") === 0) return; // repo未設定・プレースホルダー行は対象外
    var key = indexKey(t.repo, t.task);
    var existingRow = knowledgeIdx.index[key];
    if (t.status === "完了") {
      if (existingRow) {
        knowledgeRowsToDelete.push(existingRow);
        delete knowledgeIdx.index[key];
      }
      return;
    }
    var rowValues = [t.repo, t.task, t.id || "", t.status || "", t.updated || "", t.detail || "", t.note || "", t.issues || "", t.output || ""];
    if (existingRow) {
      knowledgeSheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      knowledgeSheet.getRange(knowledgeIdx.nextRow, 1, 1, rowValues.length).setValues([rowValues]);
      knowledgeIdx.index[key] = knowledgeIdx.nextRow;
      knowledgeIdx.nextRow++;
    }
    updatedKnowledge++;
  });
  // 行番号が大きいものから順に削除する(小さい方から消すと以降の行番号がずれるため)。
  knowledgeRowsToDelete.sort(function (a, b) { return b - a; });
  knowledgeRowsToDelete.forEach(function (row) { knowledgeSheet.deleteRow(row); });

  // 依頼タスク・完了タブは、タスク数分ループしながら毎回findRow(=シート全体を再読み込み)を
  // 呼んでいると、タスク数が増えるほど実行時間が線形以上に伸びる。特にdoPost経由({syncNow:true})の
  // 呼び出しは、実行に時間がかかりすぎるとGAS側は最後まで処理を終えて実際にはシートへの反映に
  // 成功しているのに、呼び出し元(ダッシュボードのfetch)がレスポンスを待ちきれずタイムアウトし、
  // 「同期失敗」と表示されてしまう不具合の原因になっていた。各シートを最初に1回だけ読み込んで
  // repo+task→行番号のインデックスを作り、それをループ内で使い回すことで読み込み回数を減らす。
  var pendingIdx = buildSheetIndex(pendingSheet);
  var doneIdx = buildSheetIndex(doneSheet);
  var rowsToDelete = [];

  var movedToDone = 0;
  var updatedPending = 0;
  var createdPending = 0;
  allTasks.forEach(function (t) {
    if (!t.repo || !t.task || t.task.indexOf("(") === 0) return; // repo未設定・プレースホルダー行は同期対象外
    var key = indexKey(t.repo, t.task);
    if (t.status === "完了") {
      var pendingRowForDelete = pendingIdx.index[key];
      if (pendingRowForDelete) {
        rowsToDelete.push(pendingRowForDelete);
        delete pendingIdx.index[key];
      }
      var rowValues = [t.repo, t.task, t.priority || "-", t.updated || "", t.note || "", t.detail || "", t.issues || "", t.output || "", t.id || ""];
      var doneRow = doneIdx.index[key];
      if (doneRow) {
        doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        doneSheet.getRange(doneIdx.nextRow, 1, 1, rowValues.length).setValues([rowValues]);
        doneIdx.index[key] = doneIdx.nextRow;
        doneIdx.nextRow++;
      }
      movedToDone++;
    } else {
      var pendingRow = pendingIdx.index[key];
      if (pendingRow) {
        // タスクIDは完了予約(完了予定)中でも常に埋める/補正する(既存の依頼タスクタブの行に
        // まだ無い場合の遡及反映も、この分岐で全件バックフィルされる)。
        if (t.id) {
          var idCell = pendingSheet.getRange(pendingRow, PENDING_ID_COL);
          if (idCell.getValue() !== t.id) idCell.setValue(t.id);
        }
        // 完了予約中(完了予定)の行は、tasks.json側のステータスで上書きしない
        // (取消期限まではユーザーの完了予約を優先し、Routine側の通常同期では触らない)。
        var currentStatus = pendingSheet.getRange(pendingRow, 4).getValue();
        if (currentStatus === "完了予定") return;
        // 既に依頼タスクタブに行がある場合、最新のステータスを反映し、備考欄には
        // 「いつ・何が起きたか」を履歴として追記していく(上書きせず改行で積み増す)。
        // これによりRoutineが実際にいつ処理を行ったかが依頼タスクタブ単体を見るだけで分かる。
        var statusCell = pendingSheet.getRange(pendingRow, 4);
        if (t.status && statusCell.getValue() !== t.status) statusCell.setValue(t.status);
        var historyLine = "[" + (t.updated || "?") + "] " + (t.note || "(備考なし)");
        var noteCell = pendingSheet.getRange(pendingRow, 6);
        var existingNote = String(noteCell.getValue() || "");
        if (existingNote.indexOf(historyLine) === -1) {
          noteCell.setValue(existingNote ? existingNote + "\n" + historyLine : historyLine);
          updatedPending++;
        }
      } else {
        // data/tasks.json側で新規に(Webやこのファイルへの直接編集で)追加され、まだ
        // 依頼タスクタブに存在しないタスクを新しい行として追記する。備考が「【作業タスク】」で
        // 始まる行はRoutineの実装対象から除外される(運用ルール9参照)。
        pendingSheet.getRange(pendingIdx.nextRow, 1, 1, 7)
          .setValues([[t.repo, t.task, t.priority || "-", t.status || "未着手", t.updated || "", t.note || "", "FALSE"]]);
        if (t.id) pendingSheet.getRange(pendingIdx.nextRow, PENDING_ID_COL).setValue(t.id);
        pendingIdx.index[key] = pendingIdx.nextRow;
        pendingIdx.nextRow++;
        createdPending++;
      }
    }
  });

  // 完了へ移動した分の依頼タスク行をまとめて削除する(削除すると以降の行番号が詰まってずれるため、
  // 行番号が大きいものから順に削除する)
  rowsToDelete.sort(function (a, b) { return b - a; });
  rowsToDelete.forEach(function (row) { pendingSheet.deleteRow(row); });

  // data/tasks.json側にRoutineが書き込んだ author:"routine" のコメントのうち、
  // まだコメントタブに反映されていないものだけを追記する(重複追記を避けるため既存行と突き合わせる)。
  var existingComments = commentSheet.getDataRange().getValues();
  function commentAlreadyOnSheet(repo, task, author, text, at) {
    for (var i = 1; i < existingComments.length; i++) {
      var row = existingComments[i];
      if (row[0] === repo && row[1] === task && row[2] === author && row[3] === text && row[4] === at) return true;
    }
    return false;
  }
  var addedComments = 0;
  allTasks.forEach(function (t) {
    (t.comments || []).forEach(function (c) {
      if (c.author === "routine" && !commentAlreadyOnSheet(t.repo, t.task, c.author, c.text, c.at)) {
        commentSheet.appendRow([t.repo, t.task, c.author, c.text || "", c.at || "", "", ""]);
        addedComments++;
      }
    });
  });

  // 2) コメントタブの「ステータス」「対応内容」列を更新する: ユーザーの投稿より後にRoutineからの
  //    返信があれば「対応済み」とし、その返信内容(問題点があればここに含まれる)を転記する。
  var updatedCommentStatuses = updateCommentStatuses_(commentSheet, allTasks);

  return {
    ok: true, movedToDone: movedToDone, updatedPending: updatedPending, createdPending: createdPending,
    addedComments: addedComments, finalizedScheduled: finalizedCount, updatedCommentStatuses: updatedCommentStatuses,
    updatedKnowledge: updatedKnowledge,
  };
}

// 取消期限(JST)を過ぎた完了予約(依頼タスクタブの「完了予定」行)を、完了タブへ実際に移動する。
function finalizeScheduledCompletions_(pendingSheet, doneSheet) {
  var data = pendingSheet.getDataRange().getValues();
  var now = jstNow_();
  var rowsToDelete = [];
  var finalizedCount = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] === "") continue;
    var isScheduled = row[7] === true || row[7] === "TRUE";
    if (!isScheduled) continue;
    var deadline = String(row[8] || "");
    if (!deadline || now < deadline) continue; // まだ取消期限前
    var repo = row[0], task = row[1], priority = row[2] || "-";
    var payload = {};
    try { payload = JSON.parse(row[10] || "{}"); } catch (err) { payload = {}; }
    var existingId = row[PENDING_ID_COL - 1] || ""; // 0始まりのため-1(依頼タスクタブに残っていたタスクID列の値)
    var rowValues = [repo, task, priority, now.slice(0, 10), payload.note || "", payload.detail || "", payload.issues || "", payload.output || "", existingId];
    var doneRow = findRow(doneSheet, repo, task);
    if (doneRow > 0) {
      doneSheet.getRange(doneRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      appendTaskRow(doneSheet, rowValues);
    }
    rowsToDelete.push(i + 1);
    finalizedCount++;
  }
  rowsToDelete.sort(function (a, b) { return b - a; });
  rowsToDelete.forEach(function (r) { pendingSheet.deleteRow(r); });
  return finalizedCount;
}

// コメントタブの「ステータス」「対応内容」列を更新する。data/tasks.json側の各タスクのcomments
// 配列を見て、ユーザー投稿(author:"user")より後にRoutineからの返信(author:"routine")があれば
// そのユーザー投稿の行を「対応済み」にし、返信本文を「対応内容」列へ転記する(問題点が見つかって
// いればその内容もここに含まれる想定。Routine側は返信文に具体的な結果を書くこと)。
function updateCommentStatuses_(commentSheet, allTasks) {
  var data = commentSheet.getDataRange().getValues();
  var updated = 0;
  allTasks.forEach(function (t) {
    var comments = t.comments || [];
    comments.forEach(function (c) {
      if (c.author !== "user") return;
      var reply = null;
      for (var j = 0; j < comments.length; j++) {
        if (comments[j].author === "routine" && comments[j].at > c.at) { reply = comments[j]; break; }
      }
      if (!reply) return;
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[0] === t.repo && row[1] === t.task && row[2] === "user" && row[3] === c.text && row[4] === c.at) {
          if (row[5] !== "対応済み" || row[6] !== reply.text) {
            commentSheet.getRange(i + 1, 6, 1, 2).setValues([["対応済み", reply.text || ""]]);
            updated++;
          }
          break;
        }
      }
    });
  });
  return updated;
}

function jstNow_() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm");
}

// 現在時刻(JST)を基準に「翌日9:00」の文字列("yyyy-MM-dd HH:mm")を返す。
function jstDeadlineNextDay9am_() {
  var todayStr = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
  var d = new Date(todayStr + "T09:00:00+09:00");
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, "Asia/Tokyo", "yyyy-MM-dd HH:mm");
}

function setupValidation() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, "依頼タスク", PENDING_HEADERS);

  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["高", "中", "低"], true)
    .setAllowInvalid(false)
    .build();
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["未着手", "対応中", "新規", "進行中", "スキップ", "完了予定"], true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange("C2:C1000").setDataValidation(priorityRule);
  sheet.getRange("D2:D1000").setDataValidation(statusRule);
  sheet.getRange("G2:G1000").insertCheckboxes(); // 即実行列を本物のチェックボックスにする
  sheet.getRange("H2:H1000").insertCheckboxes(); // 完了予定列も同様にチェックボックスにする
}

// 修復用: appendTaskRow導入前に1000行目以降へ紛れ込んでしまった実データを、
// 空白行を詰めてヘッダーの直下に戻す。Apps Scriptエディタからこの関数を選んで
// 一度だけ手動実行してください(自動では呼ばれません)。
function compactPendingSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, "依頼タスク", PENDING_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var width = Math.max(sheet.getLastColumn(), PENDING_HEADERS.length);
  var data = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  var realRows = data.filter(function (row) { return row[0] !== ""; });
  sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  if (realRows.length > 0) {
    sheet.getRange(2, 1, realRows.length, width).setValues(realRows);
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 1) {
    // ヘッダー行しかまだ無い(=実データが1件も無い)場合に限り、列構成が古ければ安全に上書きする。
    // 実データがある場合は列がズレる恐れがあるため、ここでは一切触らない
    // (既存データがある場合の列追加はensureHeaderColumns_で末尾に追記する形で行う)。
    var currentHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var matches = headers.every(function (h, i) { return currentHeader[i] === h; });
    if (!matches) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// 既にデータが入っているシートへ、後から追加した列を安全に補う(既存列・既存データは一切変更せず、
// ヘッダー行の不足分だけを末尾に追記する)。完了予定・コメントステータス機能を追加した際のように、
// 運用中のシートへ後から列を増やす場合に使う。
function ensureHeaderColumns_(sheet, fullHeaders) {
  var lastCol = sheet.getLastColumn();
  var currentHeader = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  for (var i = currentHeader.length; i < fullHeaders.length; i++) {
    sheet.getRange(1, i + 1).setValue(fullHeaders[i]);
  }
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

// 依頼タスクタブに人が直接入力したタスク名と、tasks.json側でRoutine(LLM)が
// 書き起こしたタスク名とで、全角/半角の数字や「〜」(波ダッシュ)と「~」(半角チルダ)などの
// 表記ゆれが生じることがある。これをrepo+task完全一致で突き合わせると照合に失敗し、
// 完了後も依頼タスクタブの行が消えずに残る不具合になるため、比較前に正規化する。
function normalizeKey(s) {
  if (s === null || s === undefined) return "";
  return String(s).normalize("NFKC").replace(/[〜～]/g, "~").trim();
}

function findRow(sheet, repo, task) {
  var data = sheet.getDataRange().getValues();
  var nRepo = normalizeKey(repo), nTask = normalizeKey(task);
  for (var i = 1; i < data.length; i++) {
    if (normalizeKey(data[i][0]) === nRepo && normalizeKey(data[i][1]) === nTask) return i + 1;
  }
  return -1;
}

function removeRow(sheet, repo, task) {
  var rowIndex = findRow(sheet, repo, task);
  if (rowIndex > 0) sheet.deleteRow(rowIndex);
}

function indexKey(repo, task) {
  return normalizeKey(repo) + "::" + normalizeKey(task);
}

// シートを1回だけ読み込み、repo+task(正規化キー)→行番号のインデックスと、
// 新規行を追記すべき次の行番号を返す。findRow/appendTaskRowをタスク数分ループの中で
// 繰り返し呼ぶと都度シート全体を読み直すことになり遅いため、syncFromGithubではこちらを使う。
function buildSheetIndex(sheet) {
  var data = sheet.getDataRange().getValues();
  var index = {};
  var lastDataRow = 1; // ヘッダー行
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "") continue;
    lastDataRow = i + 1;
    index[indexKey(data[i][0], data[i][1])] = i + 1;
  }
  return { index: index, nextRow: lastDataRow + 1 };
}
