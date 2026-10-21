/** ==========================================================================
 *  KC WATER POS SYSTEM - CONFIGURATION & UTILITIES (pos-config.js)
 *  (Supabase Client, Global App State & Telegram Alerts)
 *  ========================================================================== */

// 🌐 ១. ការកំណត់បរិយាកាស (ENVIRONMENT SWITCH: 'PROD' = ប្រព័ន្ធពិត | 'TEST' = សាកល្បង)
var CURRENT_ENV = 'TEST'; // 👈 ប្តូរទៅ 'TEST' ពេលចង់សាកល្បង ឬ 'PROD' សម្រាប់ដំណើរការជាក់ស្តែង

var SUPABASE_CONFIGS = {
  // 🏢 ១. ប្រព័ន្ធពិត (Production Live)
  PROD: {
    url: "https://hocndqkoumgjijtzpzby.supabase.co",
    key: "sb_publishable_1vUpi09UnohGxYQfTvobww_brkR4HUI"
  },
  // 🧪 ២. ប្រព័ន្ធសាកល្បង (Test Environment)
  TEST: {
    url: "https://hocndqkoumgjijtzpzby.supabase.co", // 👈 ដាក់ URL គម្រោងសាកល្បងរបស់អ្នកនៅទីនេះ
    key: "sb_publishable_1vUpi09UnohGxYQfTvobww_brkR4HUI" // 👈 ដាក់ Key សាកល្បងរបស់អ្នកនៅទីនេះ
  }
};

var activeEnv = SUPABASE_CONFIGS[CURRENT_ENV] || SUPABASE_CONFIGS.PROD;
var SUPABASE_URL = activeEnv.url;
var SUPABASE_KEY = activeEnv.key;
var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🇰🇭 មុខងារជំនួយគណនាថ្ងៃខែតាមម៉ោងកម្ពុជា (UTC+7)
function getCambodiaToday() {
  var d = new Date();
  var formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Phnom_Penh', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  return formatter.format(d);
}

// 🏷️ មុខងារបង្ហាញផ្លាកព្រមានពេលកំពុងនៅ Mode សាកល្បង (Test Mode Banner)
function renderEnvironmentBanner() {
  var oldBanner = document.getElementById('kcTestModeBanner');
  if (oldBanner) oldBanner.remove();

  // បើកំពុងនៅប្រព័ន្ធពិត (PROD) មិនបាច់បង្ហាញអ្វីឡើយ
  if (CURRENT_ENV !== 'TEST') return;

  var bannerHtml = '<div id="kcTestModeBanner" class="sticky top-0 z-[9999] bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 text-white px-4 py-2 text-center text-xs font-black shadow-lg flex items-center justify-center gap-2 border-b-2 border-amber-300 animate-in slide-in-from-top duration-300">' +
    '<span class="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>' +
    '<span>🧪 កំពុងស្ថិតក្នុងប្រព័ន្ធសាកល្បង (TEST MODE) — រាល់ការលក់ និងទិន្នន័យនៅទីនេះ មិនប៉ះពាល់ដល់បញ្ជីពិតឡើយ!</span>' +
  '</div>';

  document.body.insertAdjacentHTML('afterbegin', bannerHtml);
}

// ដំណើរការបង្ហាញផ្លាកព្រមានភ្លាមៗពេលបើកទំព័រ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderEnvironmentBanner);
} else {
  renderEnvironmentBanner();
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
var telegramConfig = { token: "", chatId: "", status: "ON" };

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
async function loadSettingsAndTelegram() {
  try {
    const { data } = await supabaseClient.from('settings').select('*');
    if (data) {
      data.forEach(function(r) {
        if (r.key === 'Telegram_Token') telegramConfig.token = r.value;
        if (r.key === 'Telegram_ChatID') telegramConfig.chatId = r.value;
        if (r.key === 'Telegram_Alert_Status') telegramConfig.status = r.value.toUpperCase();
      });
    }
  } catch(e) {
    console.error("Settings load error:", e);
  }
}

// 📲 ៦. មុខងារផ្ញើសារដំណឹងទៅកាន់ TELEGRAM BOT
async function sendTelegramAlert(message) {
  if (!telegramConfig.token || !telegramConfig.chatId || telegramConfig.status === 'OFF') return;
  try {
    await fetch("https://api.telegram.org/bot" + telegramConfig.token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        chat_id: telegramConfig.chatId, 
        text: message, 
        parse_mode: "HTML" 
      })
    });
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
