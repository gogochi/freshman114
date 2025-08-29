/**
 * Web 入口：載入表單頁面（使用模板，支援 include）
 */
function doGet() {
  var t = HtmlService.createTemplateFromFile('form');
  return t
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
    .setTitle('找老師(資訊系新鮮人成長營 114)');
}

/**
 * 接收表單資料、呼叫 OpenAI、寫入試算表，並回傳推薦結果
 * @param {Object} data { className, studentId, name, dream }
 * @return {{teacherName:string, reason:string, web:string}}
 */
function handleForm(data) {
  validateFormData_(data);

  var cfg = getConfig_();
  var prompt = buildPrompt_(data.dream);
  var ai = callOpenAI_(cfg.OPENAI_API_KEY, prompt, cfg);

  var teacherName = ai.teacherName || ai.老師姓名 || '';
  var reason = ai.reason || ai.推薦原因 || '';
  
  if (!teacherName || !reason) {
    // 後備：若無法解析成 JSON，試著從原始文字中找
    teacherName = (ai.rawText || '').match(/老師姓名[:：]\s*([^\n]+)/)?.[1] || '';
    reason = (ai.rawText || '').match(/推薦原因[:：]\s*([\s\S]*)$/)?.[1]?.trim() || '';
  }

  var title = findTitleByName_(teacherName);
  var web = cfg.FACULTY_WEBSITE_PREFIX + teacherName;

  // 寫入試算表（第一個分頁）
  var ss = SpreadsheetApp.openById(cfg.SHEET_ID);
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

  return { teacherName: teacherName, title: title, reason: reason, web: web };
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

/**
 * 讀取設定（含 Script Properties），並提供預設值
 * @return {{SHEET_ID:string, OPENAI_API_KEY:string, MODEL:string, RESPONSES_URL:string, FACULTY_WEBSITE_PREFIX:string, MAX_OUTPUT_TOKENS:(number|null)}}
 */
function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var SHEET_ID = props.getProperty('SHEET_ID');
  var OPENAI_API_KEY = props.getProperty('OPENAI_API_KEY');
  if (!SHEET_ID) throw new Error('尚未在 Script Properties 設定 SHEET_ID');
  if (!OPENAI_API_KEY) throw new Error('尚未在 Script Properties 設定 OPENAI_API_KEY');

  var model = props.getProperty('OPENAI_MODEL') || 'gpt-5-mini';
  var maxTokensStr = props.getProperty('MAX_OUTPUT_TOKENS');
  var maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : null;
  if (isNaN(maxTokens)) maxTokens = null;

  return {
    SHEET_ID: SHEET_ID,
    OPENAI_API_KEY: OPENAI_API_KEY,
    MODEL: model,
    RESPONSES_URL: 'https://api.openai.com/v1/responses',
    FACULTY_WEBSITE_PREFIX: 'https://www.iecs.fcu.edu.tw/',
    MAX_OUTPUT_TOKENS: maxTokens
  };
}

/**
 * 驗證前端送入的表單資料
 * @param {{className:string, studentId:string, name:string, dream:string}} data
 */
function validateFormData_(data) {
  if (!data || !data.className || !data.studentId || !data.name || !data.dream) {
    throw new Error('缺少必要欄位');
  }
}

/**
 * 呼叫 OpenAI Responses API 並解析成建議結果
 * @param {string} apiKey
 * @param {{system:string, user:string}} promptParts
 * @param {Object} cfg
 * @return {{teacherName?:string, reason?:string, rawText?:string}}
 */
function callOpenAI_(apiKey, promptParts, cfg) {
  var payload = makeResponsesPayload_(cfg.MODEL, promptParts, cfg);
  var data = requestOpenAI_(cfg.RESPONSES_URL, apiKey, payload);
  var content = extractTextFromResponses_(data);
  var rec = parseRecommendationFromText_(content);
  if (rec) return { teacherName: rec.teacherName, reason: rec.reason, rawText: content };
  return { rawText: content };
}

/**
 * 建立 Responses API 的 payload
 * @param {string} model
 * @param {{system:string, user:string}} promptParts
 * @param {Object} cfg
 */
function makeResponsesPayload_(model, promptParts, cfg) {
  var payload = {
    model: model,
    input: [
      'System:\n' + promptParts.system,
      '',
      'User:\n' + promptParts.user
    ].join('\n')
  };
  if (cfg && cfg.MAX_OUTPUT_TOKENS) payload.max_output_tokens = cfg.MAX_OUTPUT_TOKENS;
  return payload;
}

/**
 * 發送請求到 OpenAI，回傳解析後物件或拋出具體錯誤
 */
function requestOpenAI_(url, apiKey, payload) {
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
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('OpenAI 回應非 JSON：' + text);
  }
}

/**
 * 從 Responses/Chat 回應物件擷取純文字
 * 盡可能相容不同模型/結構
 */
function extractTextFromResponses_(data) {
  if (!data) return '';
  if (data.output_text) return data.output_text;
  if (data.output && Array.isArray(data.output)) {
    var parts = [];
    for (var i = 0; i < data.output.length; i++) {
      var item = data.output[i];
      if (!item) continue;
      if (item.type === 'output_text' && item.text) parts.push(item.text);
      else if (item.type === 'message' && item.content && Array.isArray(item.content)) {
        for (var j = 0; j < item.content.length; j++) {
          var c = item.content[j];
          if (!c) continue;
          if (c.type === 'output_text' && c.text) parts.push(c.text);
          else if (typeof c.text === 'string') parts.push(c.text);
        }
      }
    }
    return parts.join('\n');
  }
  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  return '';
}

/**
 * 嘗試自純文字解析推薦 JSON（含移除程式碼區塊與尋找物件）
 * @param {string} content
 * @return {{teacherName:string, reason:string}|null}
 */
function parseRecommendationFromText_(content) {
  if (!content) return null;
  var cleaned = stripCodeFences_(content || '');
  try {
    // 優先嘗試整段解析
    var direct = JSON.parse(cleaned);
    if (direct && (direct.teacherName || direct.老師姓名)) {
      return {
        teacherName: direct.teacherName || direct.老師姓名 || '',
        reason: direct.reason || direct.推薦原因 || ''
      };
    }
  } catch (e) {}

  // 從文字中擷取第一個 JSON 物件
  var start = cleaned.indexOf('{');
  var end = cleaned.lastIndexOf('}');
  if (start >= 0 && end >= 0 && end > start) {
    try {
      var obj = JSON.parse(cleaned.substring(start, end + 1));
      if (obj) {
        return {
          teacherName: obj.teacherName || obj.老師姓名 || '',
          reason: obj.reason || obj.推薦原因 || ''
        };
      }
    } catch (e2) {}
  }
  return null;
}

/**
 * 去除三引號程式碼區塊（含 ```json ...```）
 */
function stripCodeFences_(text) {
  if (!text) return text;
  // 移除```開頭/結尾的區塊標記
  return String(text)
    .replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, '$1')
    .trim();
}

function getFacultyList_() {
  // 優先回傳結構化 JSON（FACULTY_JSON），否則退回原始文字（FACULTY_LIST）
  if (typeof FACULTY_JSON !== 'undefined' && FACULTY_JSON) return FACULTY_JSON;
  return typeof FACULTY_LIST !== 'undefined' ? FACULTY_LIST : '';
}

/** 依老師姓名查找職稱（title）；若找不到回傳空字串 */
function findTitleByName_(name) {
  try {
    if (!name) return '';
    if (typeof FACULTY_STRUCTURED !== 'undefined' && Array.isArray(FACULTY_STRUCTURED)) {
      for (var i = 0; i < FACULTY_STRUCTURED.length; i++) {
        var t = FACULTY_STRUCTURED[i];
        if (t && t.name === name) return t.title || '';
      }
    }
  } catch (e) {}
  return '';
}
