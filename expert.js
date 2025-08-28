function doGet() {
  return HtmlService.createHtmlOutputFromFile('form')
      .setTitle('專家連結產生器')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function processForm(expertName) {
  if (!expertName || expertName.trim() === "") {
    return "Error: 專家姓名不能為空。";
  }

  try {
    var spreadsheetId = "1y_sNljFc4Aa1GSswWDScGp7OXf3Mn6fR848a3tuUesE";
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheets()[0]; // Use the first sheet

    // Append the expert name and a timestamp
    sheet.appendRow([expertName.trim(), new Date()]);
    Logger.log("記錄專家：" + expertName);

  } catch (e) {
    Logger.log("寫入試算表時發生錯誤：" + e.toString());
    return "Error: 存取試算表時發生錯誤。請確認試算表 ID 正確，且您已授權指令碼存取權限。";
  }

  // Return the URL
  return "https://www.iecs.fcu.edu.tw/" + expertName.trim();
}
