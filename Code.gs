// ═══════════════════════════════════════════════
// SHEET NAMES
// ═══════════════════════════════════════════════
var SHEET_TRANSACTIONS = 'Transactions';
var SHEET_RECURRING    = 'Recurring';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function getOrCreateSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════
function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var p  = e.parameter || {};
    var action = p.action || 'get';
    var result;

    var txSh = getOrCreateSheet(ss, SHEET_TRANSACTIONS,
      ['id','date','description','category','amount','type','store']);
    var recSh = getOrCreateSheet(ss, SHEET_RECURRING,
      ['id','name','amount','category','day','type','store','lastRun']);

    if (action === 'add') {
      txSh.appendRow([
        p.id          || '',
        p.date        || '',
        p.description || '',
        p.category    || '',
        Number(p.amount) || 0,
        p.type        || 'expense',
        p.store       || ''
      ]);
      result = { ok: true };

    } else if (action === 'delete') {
      var id   = String(p.id || '');
      var rows = txSh.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === id) { txSh.deleteRow(i + 1); break; }
      }
      result = { ok: true };

    } else if (action === 'addRecurring') {
      recSh.appendRow([
        p.id          || String(Date.now()),
        p.name        || '',
        Number(p.amount) || 0,
        p.category    || '',
        Number(p.day) || 1,
        p.type        || 'expense',
        p.store       || '',
        p.lastRun     || ''
      ]);
      result = { ok: true };

    } else if (action === 'deleteRecurring') {
      var rid   = String(p.id || '');
      var rrows = recSh.getDataRange().getValues();
      for (var j = rrows.length - 1; j >= 1; j--) {
        if (String(rrows[j][0]) === rid) { recSh.deleteRow(j + 1); break; }
      }
      result = { ok: true };

    } else if (action === 'updateRecurringLastRun') {
      var uid   = String(p.id || '');
      var urows = recSh.getDataRange().getValues();
      for (var k = urows.length - 1; k >= 1; k--) {
        if (String(urows[k][0]) === uid) {
          recSh.getRange(k + 1, 8).setValue(p.lastRun || '');
          break;
        }
      }
      result = { ok: true };

    } else if (action === 'getRecurring') {
      result = getAllRecurring(recSh);

    } else {
      result = getAllTransactions(txSh);
    }

    var json = JSON.stringify(result);
    if (p.callback) {
      return ContentService
        .createTextOutput(p.callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doPost(e) { return doGet(e); }

function getAllTransactions(sh) {
  var rows = sh.getDataRange().getValues();
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    data.push({
      id:          rows[i][0],
      date:        rows[i][1],
      description: rows[i][2],
      category:    rows[i][3],
      amount:      rows[i][4],
      type:        rows[i][5] || 'expense',
      store:       rows[i][6] || ''
    });
  }
  return data;
}

function getAllRecurring(sh) {
  var rows = sh.getDataRange().getValues();
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    data.push({
      id:       String(rows[i][0]),
      name:     rows[i][1],
      amount:   rows[i][2],
      category: rows[i][3],
      day:      rows[i][4],
      type:     rows[i][5] || 'expense',
      store:    rows[i][6] || '',
      lastRun:  rows[i][7] || ''
    });
  }
  return data;
}
