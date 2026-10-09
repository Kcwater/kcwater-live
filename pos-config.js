/** ==========================================================================
 *  KC WATER POS SYSTEM - CONFIGURATION & UTILITIES (pos-config.js)
 *  ========================================================================== */

// 🔑 ១. SUPABASE CLIENT INITIALIZATION
const SUPABASE_URL = "https://ntftdylkcnkxsytptket.supabase.co";
const SUPABASE_KEY = "sb_publishable_58qNd6IpyWqlvuI5BpuHRw__pTm7g7v";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🌐 ២. GLOBAL APP STATE (អថេររួមទូទាំងកម្មវិធី)
var currentUser = {};
var allProducts = [];
var allCustomers = [];
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

// 🔔 ៣. មុខងារ TOAST NOTIFICATION (លោតសារដំណឹង)
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
        if (r.key === 'Telegram_Alert_Status') telegramConfig.status = r.value;
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

// 📦 ៧. មុខងារទាញយកទិន្នន័យទំនិញ និងអតិថិជនដំបូងពី SUPABASE
async function fetchInitialPOSData() {
  try {
    const { data: prods } = await supabaseClient
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    if (prods) allProducts = prods;

    const { data: custs } = await supabaseClient
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });
    if (custs) allCustomers = custs;
  } catch(e) {
    console.error("Initial data load error:", e);
  }
}
