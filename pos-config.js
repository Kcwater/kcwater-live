/** ==========================================================================
 *  KC WATER POS SYSTEM - CONFIGURATION & UTILITIES (pos-config.js)
 *  (Supabase Client, Global App State & Dual Environment Engine)
 *  ========================================================================== */

// 🔑 ១. កំណត់គណនី Supabase ទាំង ២ (PROD & TEST)
var SUPABASE_CONFIGS = {
  // 🏢 ប្រព័ន្ធពិត (Production Live Database)
  PROD: {
    url: "https://hocndqkoumgjijtzpzby.supabase.co",
    key: "sb_publishable_1vUpi09UnohGxYQfTvobww_brkR4HUI",
    name: "ប្រព័ន្ធពិត (PROD)"
  },
  // 🧪 ប្រព័ន្ធសាកល្បង (Test Database)
  TEST: {
    url: "https://ntftdylkcnkxsytptket.supabase.co",
    key: "sb_publishable_58qNd6IpyWqlvuI5BpuHRw__pTm7g7v",
    name: "ប្រព័ន្ធសាកល្បង (TEST)"
  }
};

// 🧠 ២. មុខងារស្គាល់ប្រព័ន្ធស្វ័យប្រវត្តិ (តាម Memory, URL ឬ Link វេបសាយ)
function detectCurrentEnvironment() {
  // ក. ពិនិត្យមើលតាម URL Query ?env= (ឧទាហរណ៍៖ ?env=test ឬ ?env=prod)
  var urlParams = new URLSearchParams(window.location.search);
  var envParam = urlParams.get('env');
  if (envParam) {
    var p = envParam.toUpperCase();
    if (p === 'TEST' || p === 'PROD') {
      localStorage.setItem('kc_current_env', p);
      return p;
    }
  }

  // ខ. ពិនិត្យមើលតាម Memory ដែលអ្នកធ្លាប់ចុចប្តូរ (LocalStorage)
  var savedEnv = localStorage.getItem('kc_current_env');
  if (savedEnv === 'TEST' || savedEnv === 'PROD') {
    return savedEnv;
  }

  // គ. ពិនិត្យមើលតាមឈ្មោះ Link វេបសាយ (Hostname)
  var host = window.location.hostname.toLowerCase();
  if (host.includes('kcwater-store') || host.includes('test') || host.includes('dev') || host === 'localhost' || host === '127.0.0.1') {
    return 'TEST';
  }

  // ឃ. លំនាំដើមគឺប្រព័ន្ធពិត (PROD)
  return 'PROD';
}

var CURRENT_ENV = detectCurrentEnvironment();
var activeEnv = SUPABASE_CONFIGS[CURRENT_ENV] || SUPABASE_CONFIGS.PROD;
var SUPABASE_URL = activeEnv.url;
var SUPABASE_KEY = activeEnv.key;
var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔄 ៣. មុខងារចុចប្តូររវាង PROD និង TEST ភ្លាមៗ (មានសួរបញ្ជាក់តាម Popup POS)
async function switchAppEnvironment(targetEnv) {
  if (targetEnv !== 'TEST' && targetEnv !== 'PROD') return;
  var targetName = (targetEnv === 'TEST') ? 'ប្រព័ន្ធសាកល្បង (TEST)' : 'ប្រព័ន្ធពិត (PROD)';
  
  var ok = true;
  if (typeof kcConfirm === 'function') {
    ok = await kcConfirm({
      title: "ប្តូរប្រព័ន្ធទិន្នន័យ (Database)",
      message: "តើអ្នកចង់ប្តូរទៅកាន់ [" + targetName + "] មែនទេ? ទំព័រនឹងដំណើរការឡើងវិញ។",
      confirmText: "យល់ព្រមប្តូរ"
    });
  } else {
    ok = confirm("តើអ្នកចង់ប្តូរទៅកាន់ [" + targetName + "] មែនទេ?");
  }

  if (ok) {
    localStorage.setItem('kc_current_env', targetEnv);
    // សម្អាត Query ?env= ចេញកុំឱ្យទាក់
    var url = new URL(window.location.href);
    url.searchParams.delete('env');
    window.location.href = url.pathname;
  }
}

// 🏷️ ៤. មុខងារបង្ហាញផ្លាកសម្គាល់ប្រព័ន្ធ (ដំណើរការពេញលេញទាំង TEST និង PROD គ្មានកូដស្ទួន)
function renderEnvironmentBanner() {
  // សម្អាតផ្លាកចាស់ចេញសិនដើម្បីកុំឱ្យជាន់គ្នា
  var oldBanner = document.getElementById('kcTestModeBanner');
  if (oldBanner) oldBanner.remove();

  var oldBadge = document.getElementById('navTestBadge');
  if (oldBadge) oldBadge.remove();

  // ក. បើកំពុងនៅប្រព័ន្ធសាកល្បង (TEST)៖ បង្ហាញរបារពណ៌ទឹកក្រូចធំនៅខាងលើបង្អស់
  if (CURRENT_ENV === 'TEST') {
    var bannerHtml = '<div id="kcTestModeBanner" style="background: linear-gradient(135deg, #d97706, #ea580c); color: white; padding: 8px 14px; text-align: center; font-size: 11px; font-weight: 900; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fde047; z-index: 9999; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">' +
      '<div style="display: flex; align-items: center; gap: 8px; margin: 0 auto;">' +
        '<span style="display: inline-block; width: 8px; height: 8px; background: white; border-radius: 50%; box-shadow: 0 0 8px white;"></span>' +
        '<span>🧪 កំពុងប្រើប្រព័ន្ធសាកល្បង (TEST MODE) — មិនប៉ះពាល់ទិន្នន័យលក់ពិតឡើយ</span>' +
      '</div>' +
      '<button type="button" onclick="switchAppEnvironment(\'PROD\')" style="background: white; color: #78350f; font-weight: 900; font-size: 10px; padding: 4px 10px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap;">' +
        'ប្តូរទៅប្រព័ន្ធពិត ➔' +
      '</button>' +
    '</div>';

    var mainApp = document.getElementById('mainApp');
    var loginPage = document.getElementById('loginPage');
    if (mainApp) mainApp.insertAdjacentHTML('afterbegin', bannerHtml);
    else if (loginPage) loginPage.insertAdjacentHTML('beforebegin', bannerHtml);
    else document.body.insertAdjacentHTML('afterbegin', bannerHtml);
  }

  // ខ. បង្ហាញប៊ូតុងផ្លាក [🧪 TEST 🔄] ឬ [🏢 PROD 🔄] នៅលើ Navbar ជាប់ឈ្មោះ Admin
  var userInfo = document.getElementById('userInfo');
  if (userInfo && !document.getElementById('navTestBadge')) {
    var isTest = (CURRENT_ENV === 'TEST');
    var badgeStyle = isTest ? 
      'background: #fbbf24; color: #78350f; border: 1px solid #f59e0b;' : 
      'background: #047857; color: #a7f3d0; border: 1px solid #059669;';
    var badgeText = isTest ? '🧪 TEST 🔄' : '🏢 PROD 🔄';
    var switchTarget = isTest ? 'PROD' : 'TEST';
    var switchTitle = isTest ? 'ចុចដើម្បីប្តូរទៅប្រព័ន្ធពិត (PROD)' : 'ចុចដើម្បីប្តូរទៅប្រព័ន្ធសាកល្បង (TEST)';

    var badgeBtnHtml = '<button type="button" onclick="switchAppEnvironment(\'' + switchTarget + '\')" title="' + switchTitle + '" id="navTestBadge" style="' + badgeStyle + ' font-size: 10px; font-weight: 900; padding: 3px 9px; border-radius: 9999px; margin-right: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">' +
      badgeText +
    '</button>';

    userInfo.insertAdjacentHTML('beforebegin', badgeBtnHtml);
  }
}

// ហៅឱ្យដំណើរការទាំងពេលបើកដំបូង និងពេលទំព័រដើរចប់
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderEnvironmentBanner);
} else {
  renderEnvironmentBanner();
}
window.addEventListener('load', renderEnvironmentBanner);

// ==========================================
// 🇰🇭 ប្រព័ន្ធគ្រប់គ្រងម៉ោងកម្ពុជាស្តង់ដារ (CAMBODIA TIMEZONE UTC+7 ENGINE)
// ==========================================

function getCambodiaToday() {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Phnom_Penh', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
}

function toCambodiaDateStr(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Phnom_Penh', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(d);
}

function isTodayInCambodia(timestamp) {
  if (!timestamp) return false;
  return toCambodiaDateStr(timestamp) === getCambodiaToday();
}

function getCambodiaQueryRange(dateStr) {
  var d = dateStr || getCambodiaToday();
  return {
    start: d + 'T00:00:00+07:00',
    end: d + 'T23:59:59.999+07:00'
  };
}


// 🌐 ២. GLOBAL APP STATE (អថេររួមទូទាំងកម្មវិធី POS)
var currentUser = {};
var allProducts = [];
var allCustomers = [];
var specialPrices = window.specialPrices || [];
var cart = [];
var selectedModalProduct = null;
var currentPosCategoryFilter = 'ALL';
var currentPosPayMethod = 'Cash';
var telegramConfig = { token: "", chatId: "", driverChatId: "", status: "ON" };

// អថេរសម្រាប់ទូទាត់លុយ (Settlement State)
var currentSettlementCustomer = "";
var currentSettlementItems = [];
var currentSettlementPayMode = "Cash";
var currentSettlementOldDebt = 0;

// 🔔 ៣. មុខងារ TOAST NOTIFICATION (សារដំណឹងជ្រុងខាងក្រោម)
function showToast(msg, type) {
  type = type || 'success';
  var toast = document.getElementById('toast');
  var msgEl = document.getElementById('toastMsg');
  var iconEl = document.getElementById('toastIcon');
  var content = document.getElementById('toastContent');
  if (!toast || !msgEl) return;

  msgEl.innerText = msg;
  content.className = 'bg-white border-l-4 p-4 shadow-2xl rounded-r-2xl flex items-center min-w-[260px] pointer-events-auto ' + 
    (type === 'success' ? 'border-green-600' : 'border-red-500');
  iconEl.innerHTML = type === 'success' ? 
    '<i class="fas fa-check-circle text-green-600"></i>' : 
    '<i class="fas fa-exclamation-circle text-red-500"></i>';

  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(function() { 
    toast.classList.add('translate-y-20', 'opacity-0'); 
  }, 3000);
}

// 📱 ៤. មុខងារ SIDEBAR (បើក និងបិទម៉ឺនុយ)
function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var bd = document.getElementById('sidebarBackdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'sidebarBackdrop';
    bd.onclick = closeSidebar;
    document.body.appendChild(bd);
  }
  if (sb) {
    if (sb.classList.contains('hidden-sidebar')) {
      sb.classList.remove('hidden-sidebar');
      if (window.innerWidth < 1024) bd.classList.add('active');
    } else { 
      closeSidebar(); 
    }
  }
}

function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var bd = document.getElementById('sidebarBackdrop');
  if (sb) sb.classList.add('hidden-sidebar');
  if (bd) bd.classList.remove('active');
}

// ⚙️ ៥. ទាញយកការកំណត់ SETTINGS & TELEGRAM BOT ពី SUPABASE
var exchangeRateUSD = 4100;
var exchangeRateTHB = 115;

async function loadSettingsAndTelegram() {
  try {
    const { data } = await supabaseClient.from('settings').select('*');
    if (data) {
      data.forEach(function(r) {
        if (r.key === 'Telegram_Token') telegramConfig.token = r.value;
        if (r.key === 'Telegram_ChatID') telegramConfig.chatId = r.value;
        if (r.key === 'Telegram_Driver_ChatID') telegramConfig.driverChatId = r.value;
        if (r.key === 'Telegram_Alert_Status') telegramConfig.status = r.value.toUpperCase();
        if (r.key === 'Exchange_Rate_USD') exchangeRateUSD = parseFloat(r.value) || 4100;
        if (r.key === 'Exchange_Rate_THB') exchangeRateTHB = parseFloat(r.value) || 115;
      });
    }
  } catch(e) {
    console.error("Settings load error:", e);
  }
}

// 📲 មុខងារផ្ញើសារដំណឹង Telegram (ប្រើផ្ទាំងជូនដំណឹងរបស់ POS kcAlert ពេលមានបញ្ហា)
async function sendTelegramAlert(message, customChatId) {
  if (!telegramConfig.token || telegramConfig.status === 'OFF') return;
  var target = customChatId || telegramConfig.chatId;
  if (!target) return;

  try {
    var response = await fetch("https://api.telegram.org/bot" + telegramConfig.token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        chat_id: target, 
        text: message, 
        parse_mode: "HTML" 
      })
    });

    var resData = await response.json();
    if (!resData.ok) {
      if (typeof kcAlert === 'function') {
        kcAlert({
          title: "⚠️ Telegram Bot Error",
          message: "មិនអាចផ្ញើសារទៅ Chat ID [" + target + "] បានទេ៖\n👉 " + resData.description,
          type: "warning"
        });
      }
    }
  } catch(e) {
    console.error("Telegram alert error:", e);
  }
}

// 📦 ៧. មុខងារទាញយកទិន្នន័យដំបូង (ទំនិញ, អតិថិជន និងតម្លៃពិសេស) ពី SUPABASE
async function fetchInitialPOSData() {
  try {
    const { data: prods } = await supabaseClient
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    if (prods) {
  allProducts = prods.sort((a, b) => (parseInt(a.sort_order) || 99) - (parseInt(b.sort_order) || 99));
}

    const { data: custs } = await supabaseClient
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });
    if (custs) allCustomers = custs;

    const { data: prices } = await supabaseClient
      .from('customer_prices')
      .select('*');
    if (prices) {
      specialPrices = prices;
      window.specialPrices = prices;
    }
  } catch(e) {
    console.error("Initial data load error:", e);
  }
}

// ==========================================
// 🌟 ៨. KC POS CUSTOM DIALOG ENGINE (ALERT, CONFIRM & PROMPT)
// ==========================================

function ensureKcDialogMarkup() {
  if (document.getElementById('kcDialogModal')) return;
  var html = '<div id="kcDialogModal" class="fixed inset-0 z-[8500] flex items-center justify-center p-4 hidden overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity" id="kcDialogBackdrop"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3.5 text-center relative border border-slate-100 animate-in zoom-in-95 duration-200 my-auto max-h-[88dvh] overflow-y-auto">' +
      '<div id="kcDialogIconBox" class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner">' +
        '<i id="kcDialogIcon" class="fas fa-circle-question"></i>' +
      '</div>' +
      '<div>' +
        '<h3 id="kcDialogTitle" class="text-base font-black text-slate-900 leading-snug"></h3>' +
        '<p id="kcDialogMessage" class="text-xs text-slate-500 font-bold mt-1 leading-relaxed"></p>' +
      '</div>' +
      '<div id="kcDialogInputArea" class="hidden pt-1">' +
        '<input type="text" id="kcDialogInput" class="w-full text-center text-lg font-black text-slate-900 bg-slate-50 border-2 border-emerald-400 focus:border-emerald-600 rounded-xl p-2.5 outline-none shadow-inner">' +
      '</div>' +
      '<div class="flex items-center gap-2 pt-1" id="kcDialogButtonsContainer">' +
        '<button type="button" id="kcDialogBtnCancel" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition">បោះបង់</button>' +
        '<button type="button" id="kcDialogBtnConfirm" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md active:scale-95 transition">យល់ព្រម</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

// 🔔 ១. ផ្ទាំងជូនដំណឹង kcAlert (ជំនួស alert() ចាស់)
function kcAlert(opts) {
  return new Promise(function(resolve) {
    if (typeof opts === 'string') opts = { message: opts };
    opts = opts || {};
    ensureKcDialogMarkup();

    var modal = document.getElementById('kcDialogModal');
    var titleEl = document.getElementById('kcDialogTitle');
    var msgEl = document.getElementById('kcDialogMessage');
    var iconBox = document.getElementById('kcDialogIconBox');
    var iconEl = document.getElementById('kcDialogIcon');
    var inputArea = document.getElementById('kcDialogInputArea');
    var btnConfirm = document.getElementById('kcDialogBtnConfirm');
    var btnCancel = document.getElementById('kcDialogBtnCancel');
    var backdrop = document.getElementById('kcDialogBackdrop');

    var type = opts.type || 'info';
    titleEl.innerText = opts.title || (type === 'success' ? 'ជោគជ័យ' : (type === 'danger' ? 'កំហុស' : (type === 'warning' ? 'ដំណឹងព្រមាន' : 'ដំណឹង')));
    msgEl.innerText = opts.message || '';
    inputArea.classList.add('hidden');
    btnCancel.classList.add('hidden');

    btnConfirm.className = "w-full py-2.5 font-black rounded-xl text-xs shadow-md active:scale-95 transition text-white ";
    if (type === 'success') {
      iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-emerald-100 text-emerald-600";
      iconEl.className = "fas fa-circle-check";
      btnConfirm.className += "bg-emerald-600 hover:bg-emerald-700";
    } else if (type === 'danger') {
      iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-red-100 text-red-600";
      iconEl.className = "fas fa-circle-xmark";
      btnConfirm.className += "bg-red-600 hover:bg-red-700";
    } else if (type === 'warning') {
      iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-amber-100 text-amber-600";
      iconEl.className = "fas fa-triangle-exclamation animate-bounce";
      btnConfirm.className += "bg-amber-600 hover:bg-amber-700";
    } else {
      iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-blue-100 text-blue-600";
      iconEl.className = "fas fa-circle-info";
      btnConfirm.className += "bg-blue-600 hover:bg-blue-700";
    }
    btnConfirm.innerText = opts.confirmText || "យល់ព្រម (បិទ)";

    modal.classList.remove('hidden');

    function cleanUp() {
      modal.classList.add('hidden');
      btnCancel.classList.remove('hidden');
      btnConfirm.onclick = null;
      backdrop.onclick = null;
      resolve(true);
    }

    btnConfirm.onclick = cleanUp;
    backdrop.onclick = cleanUp;
  });
}

// ❓ ២. ផ្ទាំងសួរបញ្ជាក់ kcConfirm (ជំនួស confirm() ចាស់)
function kcConfirm(opts) {
  return new Promise(function(resolve) {
    if (typeof opts === 'string') opts = { message: opts };
    opts = opts || {};
    ensureKcDialogMarkup();

    var modal = document.getElementById('kcDialogModal');
    var titleEl = document.getElementById('kcDialogTitle');
    var msgEl = document.getElementById('kcDialogMessage');
    var iconBox = document.getElementById('kcDialogIconBox');
    var iconEl = document.getElementById('kcDialogIcon');
    var inputArea = document.getElementById('kcDialogInputArea');
    var btnConfirm = document.getElementById('kcDialogBtnConfirm');
    var btnCancel = document.getElementById('kcDialogBtnCancel');
    var backdrop = document.getElementById('kcDialogBackdrop');

    var isDanger = (opts.type === 'danger');
    titleEl.innerText = opts.title || (isDanger ? "បញ្ជាក់ការលុប" : "បញ្ជាក់ប្រតិបត្តិការ");
    msgEl.innerText = opts.message || "តើអ្នកប្រាកដដែរឬទេ?";
    inputArea.classList.add('hidden');
    btnCancel.classList.remove('hidden');

    btnCancel.innerText = opts.cancelText || "បោះបង់";
    btnConfirm.className = "flex-1 py-2.5 font-black rounded-xl text-xs shadow-md active:scale-95 transition text-white ";

    if (isDanger) {
      iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-red-100 text-red-600";
      iconEl.className = "fas fa-trash-can animate-pulse";
      btnConfirm.className += "bg-red-600 hover:bg-red-700";
      btnConfirm.innerText = opts.confirmText || "យល់ព្រមលុប";
    } else {
      iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-emerald-100 text-emerald-700";
      iconEl.className = "fas fa-circle-question";
      btnConfirm.className += "bg-emerald-600 hover:bg-emerald-700";
      btnConfirm.innerText = opts.confirmText || "យល់ព្រម";
    }

    modal.classList.remove('hidden');

    function cleanUp(result) {
      modal.classList.add('hidden');
      btnConfirm.onclick = null;
      btnCancel.onclick = null;
      backdrop.onclick = null;
      resolve(result);
    }

    btnConfirm.onclick = function() { cleanUp(true); };
    btnCancel.onclick = function() { cleanUp(false); };
    backdrop.onclick = function() { cleanUp(false); };
  });
}

// ⌨️ ៣. ផ្ទាំងបញ្ចូលទិន្នន័យ kcPrompt (ជំនួស prompt() ចាស់)
function kcPrompt(opts) {
  return new Promise(function(resolve) {
    if (typeof opts === 'string') opts = { message: opts };
    opts = opts || {};
    ensureKcDialogMarkup();

    var modal = document.getElementById('kcDialogModal');
    var titleEl = document.getElementById('kcDialogTitle');
    var msgEl = document.getElementById('kcDialogMessage');
    var iconBox = document.getElementById('kcDialogIconBox');
    var iconEl = document.getElementById('kcDialogIcon');
    var inputArea = document.getElementById('kcDialogInputArea');
    var inputEl = document.getElementById('kcDialogInput');
    var btnConfirm = document.getElementById('kcDialogBtnConfirm');
    var btnCancel = document.getElementById('kcDialogBtnCancel');
    var backdrop = document.getElementById('kcDialogBackdrop');

    titleEl.innerText = opts.title || "បញ្ចូលព័ត៌មាន";
    msgEl.innerText = opts.message || "";
    iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-blue-100 text-blue-700";
    iconEl.className = "fas fa-keyboard";

    btnCancel.classList.remove('hidden');
    btnCancel.innerText = opts.cancelText || "បោះបង់";
    btnConfirm.className = "flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md active:scale-95 transition";
    btnConfirm.innerText = opts.confirmText || "យល់ព្រម";

    inputArea.classList.remove('hidden');
    inputEl.value = (opts.defaultValue !== undefined) ? opts.defaultValue : "";
    if (opts.inputType) inputEl.type = opts.inputType;

    modal.classList.remove('hidden');
    setTimeout(function() { inputEl.focus(); inputEl.select(); }, 150);

    function cleanUp(val) {
      modal.classList.add('hidden');
      inputArea.classList.add('hidden');
      btnConfirm.onclick = null;
      btnCancel.onclick = null;
      backdrop.onclick = null;
      resolve(val);
    }

    btnConfirm.onclick = function() { cleanUp(inputEl.value.trim()); };
    btnCancel.onclick = function() { cleanUp(null); };
    backdrop.onclick = function() { cleanUp(null); };
    inputEl.onkeyup = function(e) { if (e.key === 'Enter') cleanUp(inputEl.value.trim()); };
  });
}
