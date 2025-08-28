function doGet() {
  return HtmlService.createHtmlOutputFromFile('form')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
    .setTitle('找老師(資訊系新鮮人成長營 114)');
}

/**
 * 接收表單資料、呼叫 OpenAI、寫入試算表，並回傳推薦結果
 * @param {Object} data { className, studentId, name, dream }
 * @return {{teacherName:string, reason:string, web:string}}
 */
function handleForm(data) {
  if (!data || !data.className || !data.studentId || !data.name || !data.dream) {
    throw new Error('缺少必要欄位');
  }

  var props = PropertiesService.getScriptProperties();
  var SHEET_ID = props.getProperty('SHEET_ID');
  var OPENAI_API_KEY = props.getProperty('OPENAI_API_KEY');

  if (!SHEET_ID) throw new Error('尚未在 Script Properties 設定 SHEET_ID');
  if (!OPENAI_API_KEY) throw new Error('尚未在 Script Properties 設定 OPENAI_API_KEY');

  var prompt = buildPrompt_(data.dream);
  var ai = callOpenAI_(OPENAI_API_KEY, prompt);

  var teacherName = ai.teacherName || ai.老師姓名 || '';
  var reason = ai.reason || ai.推薦原因 || '';
  if (!teacherName || !reason) {
    // 後備：若無法解析成 JSON，試著從原始文字中找
    teacherName = (ai.rawText || '').match(/老師姓名[:：]\s*([^\n]+)/)?.[1] || '';
    reason = (ai.rawText || '').match(/推薦原因[:：]\s*([\s\S]*)$/)?.[1]?.trim() || '';
  }

  var web = 'https://www.iecs.fcu.edu.tw/' + teacherName;

  // 寫入試算表（第一個分頁）
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheets()[0];
  sheet.appendRow([
    new Date(),
    data.className,
    data.studentId,
    data.name,
    data.dream,
    teacherName,
    reason
  ]);

  return { teacherName: teacherName, reason: reason, web: web };
}

function buildPrompt_(dream) {
  var system = '你是資工系新鮮人導師配對助理。根據學生的「夢想」內容，從提供的老師清單中，挑選最能幫助學生完成夢想的一位老師，並簡短解釋原因。只選一位。請輸出 JSON，欄位為 teacherName, reason。不要多餘文字。';
  var teachers = getFacultyList_();
  var user = [
    '以下是學生的夢想：',
    dream,
    '',
    '以下是老師清單（姓名與研究專長等）：',
    teachers,
    '',
    '請只回傳 JSON：',
    '{"teacherName": "老師姓名", "reason": "推薦原因（一句到三句）"}'
  ].join('\n');
  return { system: system, user: user };
}

function callOpenAI_(apiKey, promptParts) {
  var url = 'https://api.openai.com/v1/chat/completions';
  var payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: promptParts.system },
      { role: 'user', content: promptParts.user }
    ],
    temperature: 0.2
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('OpenAI API 錯誤: ' + code + ' ' + text);
  }

  var data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { rawText: text };
  }

  var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
  // 嘗試解析 JSON
  try {
    var jsonStart = content.indexOf('{');
    var jsonEnd = content.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd >= 0) {
      var jsonStr = content.substring(jsonStart, jsonEnd + 1);
      var parsed = JSON.parse(jsonStr);
      return { teacherName: parsed.teacherName, reason: parsed.reason, rawText: content };
    }
  } catch (e2) {}

  return { rawText: content };
}

function getFacultyList_() {
  // 內容由 faculty_list.gs 中的 FACULTY_LIST 提供
  return typeof FACULTY_LIST !== 'undefined' ? FACULTY_LIST : '';
}

