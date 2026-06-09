const { google } = require('googleapis');
const credentials = require('../google-service-account.json');
const SPREADSHEET_ID = '1K8_QBO650gyd29T0O40bsL6laNdbowkcxF_QGeD5Nws';

async function updateHeaders() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Update Daily Reports header — tambah Float Today
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Daily Reports!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [['Report ID','Date','Day','Branch','Cashier','Cash Sales','QR Sales','Grab','Panda','Shopee','Hubbo','Total Income','Float Today','Bank In','Float Tomorrow','Grand Total','Status','Submitted At']] }
  });

  console.log('✅ Headers updated!');
}

updateHeaders().catch(console.error);
