const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

function getAuth() {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    credentials = require(path.join(__dirname, '../../google-service-account.json'));
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function getDayName(dateStr) {
  return DAYS[new Date(dateStr).getDay()];
}

// Sync satu report ke Daily Reports sheet
async function syncReportToSheets(report) {
  if (!SPREADSHEET_ID) return;
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });

    // Cari row yang ada Report ID sama (untuk update)
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Daily Reports!A:A',
    });

    const rows = existing.data.values || [];
    let targetRow = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === String(report.id)) {
        targetRow = i + 1; // 1-indexed
        break;
      }
    }

    const expenses = Array.isArray(report.expenses) ? report.expenses : [];
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const rowData = [
      String(report.id),
      formatDate(report.report_date),
      getDayName(report.report_date),
      report.branch_code,
      report.cashier_name || '',
      Number(report.cash_sales || 0).toFixed(2),
      Number(report.qr_amount || 0).toFixed(2),
      Number(report.grab_amount || 0).toFixed(2),
      Number(report.panda_amount || 0).toFixed(2),
      Number(report.shopee_amount || 0).toFixed(2),
      Number(report.hubbo_total_income || 0).toFixed(2),
      Number(report.total_income || 0).toFixed(2),
      Number(report.float_hari_ini || 0).toFixed(2),
      Number(report.bank_in_cash || 0).toFixed(2),
      Number(report.float_cash_esok || 0).toFixed(2),
      Number(report.grand_total || 0).toFixed(2),
      report.status || 'submitted',
      report.submitted_at ? new Date(report.submitted_at).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }) : '',
    ];

    if (targetRow) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Daily Reports!A${targetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Daily Reports!A:A',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowData] },
      });
    }

    // Sync expenses
    await syncExpensesToSheets(report, sheets);

    console.log(`✅ Sheets synced: ${report.branch_code} ${report.report_date}`);
  } catch (err) {
    console.error('❌ Sheets sync error:', err.message);
  }
}

// Sync expenses — delete lama, insert baru
async function syncExpensesToSheets(report, sheets) {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:A',
  });

  const rows = existing.data.values || [];
  const toDelete = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === String(report.id)) {
      toDelete.push(i); // 0-indexed
    }
  }

  // Delete rows dari bawah ke atas
  if (toDelete.length > 0) {
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const expensesSheet = sheetInfo.data.sheets.find(s => s.properties.title === 'Expenses');
    const sheetId = expensesSheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: toDelete.map(rowIdx => ({
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIdx,
              endIndex: rowIdx + 1,
            }
          }
        }))
      }
    });
  }

  // Insert expenses baru
  const expenses = Array.isArray(report.expenses) ? report.expenses : [];
  if (expenses.length > 0) {
    const expenseRows = expenses.map((e, idx) => [
      String(report.id),
      formatDate(report.report_date),
      getDayName(report.report_date),
      report.branch_code,
      report.cashier_name || '',
      idx + 1,
      e.detail || e.description || '',
      Number(e.amount || 0).toFixed(2),
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Expenses!A:A',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: expenseRows },
    });
  }
}

// Delete report dari Sheets
async function deleteReportFromSheets(reportId) {
  if (!SPREADSHEET_ID) return;
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

    for (const sheetName of ['Daily Reports', 'Expenses']) {
      const sheet = sheetInfo.data.sheets.find(s => s.properties.title === sheetName);
      const sheetId = sheet.properties.sheetId;

      const data = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:A`,
      });

      const rows = data.data.values || [];
      const toDelete = [];
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0] === String(reportId)) toDelete.push(i);
      }

      if (toDelete.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: toDelete.map(rowIdx => ({
              deleteDimension: {
                range: { sheetId, dimension: 'ROWS', startIndex: rowIdx, endIndex: rowIdx + 1 }
              }
            }))
          }
        });
      }
    }
    console.log(`🗑️ Sheets deleted: report ${reportId}`);
  } catch (err) {
    console.error('❌ Sheets delete error:', err.message);
  }
}

module.exports = { syncReportToSheets, deleteReportFromSheets };
