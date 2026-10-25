/** ==========================================================================
 *  KC WATER POS SYSTEM - CORE ENGINE (pos-core.js)
 *  (Authentication, Dashboard, Quick Restock, POS & Discount Engine)
 *  ========================================================================== */

var currentPosDiscount = { type: 'NONE', value: 0 };
var activeQuickRestockData = null;

// 🔑 មុខងារចូលប្រើប្រាស់សុវត្ថិភាពខ្ពស់ (ផ្ទៀងផ្ទាត់តាម Secure RPC ដោយមិនបញ្ចេញ Password មកក្រៅ)
async function login() {
  var userEl = document.getElementById('user');
  var passEl = document.getElementById('pass');
  var btnEl = document.getElementById('loginBtn');
  var remEl = document.getElementById('rememberMe');
  if (!userEl || !passEl) return;

  var u = userEl.value.trim();
  var p = passEl.value.trim();
  if (!u || !p) { 
    showToast("សូមបញ្ចូល Username និង Password!", "error"); 
    return; 
  }

  btnEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> កំពុងផ្ទៀងផ្ទាត់...';
  btnEl.disabled = true;

  try {
    // 🛡️ ផ្ទៀងផ្ទាត់តាមរយៈ Secure RPC Function ក្នុង Database ផ្ទាល់
    const { data, error } = await supabaseClient
      .rpc('verify_user_login', { p_username: u, p_password: p });

    if (error) throw error;

    // បើឈ្មោះ និងលេខកូដត្រឹមត្រូវ (data មិន null)
    if (data) {
      currentUser = {
        id: data.id,
        username: data.username,
        fullName: data.full_name,
        role: data.role,
        type: data.type,
        phone: data.phone,
        linkedBoss: data.linked_boss || ""
      };

      if (remEl && remEl.checked) {
        localStorage.setItem('kc_pos_user', u);
        localStorage.setItem('kc_pos_pass', p);
      } else {
        localStorage.removeItem('kc_pos_user');
        localStorage.removeItem('kc_pos_pass');
      }

      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('mainApp').classList.remove('hidden');

      var roleLabel = (currentUser.role === 'Admin') ? 'Admin៖ ' : 
                      (currentUser.type === 'CompanyDriver' ? 'អ្នកដឹកជញ្ជូនរោងចក្រ៖ ' :
                      (currentUser.role === 'Driver' ? 'អ្នកដឹក (កូនចៅ ' + currentUser.linkedBoss + ')៖ ' : 'ម៉ូយ៖ '));
      document.getElementById('userInfo').innerText = roleLabel + currentUser.fullName;

      renderSidebarMenu();

      // 🔔 ទាញយកចំនួនការកុម្ម៉ង់ Online មកបង្ហាញលើផ្លាកក្រហមភ្លាមៗ
      if (typeof checkPendingOnlineOrdersBadge === 'function') {
        checkPendingOnlineOrdersBadge();
      }

      await loadSettingsAndTelegram();
      await fetchInitialPOSData();

      // 🎯 បែងចែកទំព័រដើមតាមតួនាទី (Role Routing)
      if (currentUser.role === 'Admin') {
        loadModule('Dashboard');
      } else if (currentUser.type === 'CompanyDriver') {
        loadModule('CompanyDeliveries');
      } else if (currentUser.role === 'Seller' || currentUser.role === 'Driver') {
        loadModule('POS');
      } else {
        loadModule('CustPortal');
      }

      showToast("ចូលប្រើប្រាស់ជោគជ័យ! សួស្តី " + currentUser.fullName, "success");
    } else {
      showToast("ឈ្មោះ ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ!", "error");
    }
  } catch (err) {
    showToast("កំហុសតភ្ជាប់៖ " + err.message, "error");
  } finally {
    btnEl.innerHTML = '<span>ចូលប្រើប្រាស់</span>';
    btnEl.disabled = false;
  }
}
function logout() {
  localStorage.removeItem('kc_pos_user');
  localStorage.removeItem('kc_pos_pass');
  currentUser = {};
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginPage').style.display = 'flex';
  closeSidebar();
  showToast("បានចាកចេញពីប្រព័ន្ធ!", "info");
}

// 📱 បែងចែកម៉ឺនុយ SIDEBAR (កំណត់សិទ្ធិដាច់ដោយឡែក ១០០%)
function renderSidebarMenu() {
  var sNav = document.getElementById('sidebarMenuContainer');
  if (!sNav) return;
  var html = '';

  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isCompanyDriver = (currentUser && currentUser.type === 'CompanyDriver');
  var isDriver = (currentUser && currentUser.role === 'Driver' && currentUser.type !== 'CompanyDriver');
  var isReseller = (currentUser && (currentUser.role === 'Customer' || currentUser.type === 'Regular' || currentUser.type === 'Monthly'));

  var navOrderBtn = document.getElementById('navOnlineOrdersBtn');
  if (navOrderBtn) {
    if (isAdmin) {
      navOrderBtn.classList.remove('hidden');
      navOrderBtn.style.setProperty('display', 'inline-flex', 'important');
    } else {
      navOrderBtn.classList.add('hidden');
      navOrderBtn.style.setProperty('display', 'none', 'important');
    }
  }

  // ១. សម្រាប់ ADMIN (មានសិទ្ធិពេញលេញ & មានប៊ូតុងប្តូរ TEST vs PROD តែម្នាក់គត់)
  if (isAdmin) {
    html += '<button onclick="loadModule(\'Dashboard\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-chart-pie mr-3 w-5 text-center"></i>Dashboard</button>';
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-3 pb-1 opacity-80 tracking-wider">ការលក់ & ទូទាត់</div>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-shopping-cart mr-3 w-5 text-center"></i>ផ្ទាំងលក់ (POS)</button>';
    html += '<button onclick="loadModule(\'Settlement\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-calculator mr-3 w-5 text-center"></i>ទូទាត់លុយ</button>';
    html += '<button onclick="loadModule(\'OnlineHub\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-amber-300"><i class="fas fa-globe mr-3 w-5 text-center"></i>គ្រប់គ្រង Online & ប្រវត្តិ</button>';
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-3 pb-1 opacity-80 tracking-wider">ឃ្លាំង & ស្តុក</div>';
    html += '<button onclick="loadModule(\'Stock\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-box mr-3 w-5 text-center"></i>គ្រប់គ្រងស្តុក</button>';
    html += '<button onclick="loadModule(\'StockRep\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-boxes-stacked mr-3 w-5 text-center"></i>របាយការណ៍ស្តុក</button>';
    html += '<button onclick="loadModule(\'BottleLoan\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-dolly mr-3 w-5 text-center"></i>ភ្ញៀវខ្ចីធុង</button>';
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-3 pb-1 opacity-80 tracking-wider">ចំណាយ & របាយការណ៍</div>';
    html += '<button onclick="loadModule(\'Expenses\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-money-bill-wave mr-3 w-5 text-center"></i>កត់ត្រាការចំណាយ</button>';
    html += '<button onclick="loadModule(\'Customers\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-users mr-3 w-5 text-center"></i>គ្រប់គ្រងអតិថិជន</button>';
    html += '<button onclick="loadModule(\'MonthlyRep\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-calendar-alt mr-3 w-5 text-center"></i>របាយការណ៍ប្រចាំខែ</button>';
    html += '<button onclick="loadModule(\'Reports\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-chart-line mr-3 w-5 text-center"></i>របាយការណ៍ជំពាក់</button>';
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-3 pb-1 opacity-80 tracking-wider">ការកំណត់ប្រព័ន្ធ</div>';
    html += '<button onclick="loadModule(\'Settings\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-yellow-300"><i class="fas fa-cog mr-3 w-5 text-center"></i>ការកំណត់ (Settings)</button>';

    // 🔄 ប៊ូតុងប្តូរប្រព័ន្ធ TEST vs PROD (បង្ហាញតែចំពោះ ADMIN ម្នាក់គត់!)
    var nextEnv = (typeof CURRENT_ENV !== 'undefined' && CURRENT_ENV === 'TEST') ? 'PROD' : 'TEST';
    var envBtnClass = (typeof CURRENT_ENV !== 'undefined' && CURRENT_ENV === 'TEST') ? 'bg-amber-500 text-amber-950 font-black' : 'bg-emerald-800 text-green-200 font-bold';
    var envBtnText = (typeof CURRENT_ENV !== 'undefined' && CURRENT_ENV === 'TEST') ? '🧪 កំពុងនៅ៖ សាកល្បង (ចុចប្តូរ 🔄)' : '🏢 កំពុងនៅ៖ ប្រព័ន្ធពិត (ចុចប្តូរ 🔄)';
    html += '<div class="pt-2"><button type="button" onclick="switchAppEnvironment(\'' + nextEnv + '\')" class="w-full text-left p-3 rounded-xl transition flex items-center shadow-xs text-xs ' + envBtnClass + '"><i class="fas fa-database mr-3 w-5 text-center text-base"></i>' + envBtnText + '</button></div>';

  // 🛵 ២. សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver) -> មានតែបេសកកម្មដឹកទឹក គ្មានសិទ្ធិដកទំនិញ POS ឡើយ!
  } else if (isCompanyDriver) {
    html += '<div class="text-[10px] font-black text-emerald-300 uppercase px-3 pt-2 pb-1 opacity-90 tracking-wider">🛵 ការដឹកជញ្ជូន KC WATER</div>';
    html += '<button onclick="loadModule(\'CompanyDeliveries\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white bg-green-800/80 shadow-xs"><i class="fas fa-motorcycle mr-3 w-5 text-center text-emerald-300"></i>បេសកកម្មដឹកទឹកថ្ងៃនេះ</button>';

  // 🚚 ៣. សម្រាប់កូនចៅដកទឹកជំនួសមេ (Driver ធម្មតា)
  } else if (isDriver) {
    html += '<div class="text-[10px] font-bold text-amber-300 uppercase px-3 pt-2 pb-1 opacity-90 tracking-wider">ដកទឹកជំនួសមេ៖ ' + (currentUser.linkedBoss || '') + '</div>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-truck mr-3 w-5 text-center text-amber-300"></i>ផ្ទាំងដកទំនិញ</button>';

  // 🏢 ៤. សម្រាប់ RESELLER / CUSTOMER
  } else if (isReseller) {
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-2 pb-1 opacity-80 tracking-wider">គណនីម៉ូយប្រចាំ</div>';
    html += '<button onclick="loadModule(\'CustPortal\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-house mr-3 w-5 text-center text-emerald-300"></i>ទំព័រដើមរបស់ខ្ញុំ</button>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-shopping-cart mr-3 w-5 text-center text-emerald-300"></i>ផ្ទាំងដកទំនិញ</button>';
    html += '<button onclick="loadModule(\'CustHistory\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-history mr-3 w-5 text-center text-emerald-300"></i>ប្រវត្តិដកទំនិញ</button>';
    html += '<button onclick="loadModule(\'CustBottles\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-dolly mr-3 w-5 text-center text-emerald-300"></i>សំបកធុងកំពុងខ្ចី</button>';

  // 🛒 ៥. បុគ្គលិកលក់នៅកន្លែង (Seller)
  } else {
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-shopping-cart mr-3 w-5 text-center"></i>ផ្ទាំងលក់ (POS)</button>';
  }

  html += '<hr class="border-green-800 my-3">';
  html += '<button onclick="logout()" class="w-full text-left p-3 text-red-300 hover:bg-red-800 rounded-xl transition flex items-center font-bold"><i class="fas fa-sign-out-alt mr-3 w-5 text-center"></i>ចាកចេញ</button>';
  sNav.innerHTML = html;
}

// 🎯 មុខងារប្តូរផ្ទាំងកម្មវិធី (បិទសិទ្ធិ POS ពីអ្នកដឹកជញ្ជូនរោងចក្រ ១០០%)
function loadModule(name) {
  closeSidebar();

  // 🛡️ បើសិនជាអ្នកដឹកជញ្ជូនរោងចក្រ (CompanyDriver) គឺអនុញ្ញាតឱ្យចូលតែផ្ទាំងដឹកទឹកមួយគត់!
  if (currentUser && currentUser.type === 'CompanyDriver') {
    if (name !== 'CompanyDeliveries') {
      showToast("អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដកទំនិញ ឬលក់ក្នុង POS ឡើយ!", "error");
      renderCompanyDeliveriesModule();
      return;
    }
    renderCompanyDeliveriesModule();
    return;
  }

  // 🛡️ រារាំងតួនាទីផ្សេងទៀតពីផ្ទាំង Admin
  var isRestricted = (currentUser.role !== 'Admin' && currentUser.role !== 'Seller');
  if (isRestricted && (name === 'Dashboard' || name === 'Settlement' || name === 'OnlineHub' || name === 'Stock' || name === 'StockRep' || name === 'Expenses' || name === 'Customers' || name === 'MonthlyRep' || name === 'Reports' || name === 'Settings')) {
    showToast("អ្នកមិនមានសិទ្ធិចូលផ្ទាំងនេះឡើយ!", "error");
    if (currentUser.role === 'Customer' || currentUser.type === 'Regular' || currentUser.type === 'Monthly') {
      loadModule('CustPortal');
    } else {
      loadModule('POS');
    }
    return;
  }

  if (name === 'Dashboard') renderDashboardModule();
  else if (name === 'POS') renderPOSModule();
  else if (name === 'Settlement' && typeof renderSettlementModule === 'function') renderSettlementModule();
  else if (name === 'OnlineHub' && typeof renderOnlineHubModule === 'function') renderOnlineHubModule();
  else if (name === 'Stock' && typeof renderStockModule === 'function') renderStockModule();
  else if (name === 'StockRep' && typeof renderStockRepModule === 'function') renderStockRepModule();
  else if (name === 'BottleLoan' && typeof renderBottleLoanModule === 'function') renderBottleLoanModule();
  else if (name === 'Expenses' && typeof renderExpensesModule === 'function') renderExpensesModule();
  else if (name === 'Customers' && typeof renderCustomersModule === 'function') renderCustomersModule();
  else if (name === 'MonthlyRep' && typeof renderMonthlyRepModule === 'function') renderMonthlyRepModule();
  else if (name === 'Reports' && typeof renderDebtorsReportModule === 'function') renderDebtorsReportModule();
  else if (name === 'Settings' && typeof renderSettingsModule === 'function') renderSettingsModule();
  else if (name === 'CustPortal' && typeof renderCustomerPortalHome === 'function') renderCustomerPortalHome();
  else if (name === 'CustHistory' && typeof renderCustomerHistoryModule === 'function') renderCustomerHistoryModule();
  else if (name === 'CustBottles' && typeof renderCustomerBottlesModule === 'function') renderCustomerBottlesModule();
  else if (name === 'CompanyDeliveries' && typeof renderCompanyDeliveriesModule === 'function') renderCompanyDeliveriesModule();
}

// ==========================================
// 📊 ២. ផ្ទាំង DASHBOARD & QUICK RESTOCK MODAL
// ==========================================
async function renderDashboardModule() {
  var area = document.getElementById('contentArea');
  area.innerHTML = '<div class="max-w-5xl mx-auto space-y-4">' +
    '<div class="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">' +
      '<div>' +
        '<h2 class="text-base sm:text-xl font-extrabold text-green-900 flex items-center gap-2"><i class="fas fa-chart-pie text-green-600"></i>ផ្ទាំងសង្ខេបអាជីវកម្ម KC WATER</h2>' +
        '<p class="text-xs text-gray-500 mt-0.5">ទិដ្ឋភាពទូទៅនៃការលក់ សាច់ប្រាក់ ចំណាយ និងប្រាក់ចំណេញសុទ្ធ</p>' +
      '</div>' +
      '<button onclick="renderDashboardModule()" class="px-3.5 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-200 active:scale-95 transition flex items-center gap-1.5 shadow-2xs"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">' +
      '<div class="dash-card border-l-4 border-blue-500 p-4 bg-white rounded-2xl"><div class="text-gray-500 text-xs font-bold uppercase">លក់បានថ្ងៃនេះ</div><div id="dashTodaySales" class="mt-2 font-black text-blue-800 text-base sm:text-lg">0 ៛</div></div>' +
      '<div class="dash-card border-l-4 border-green-600 p-4 bg-white rounded-2xl space-y-1">' +
        '<div class="text-gray-500 text-xs font-bold uppercase flex justify-between"><span>សាច់ប្រាក់ប្រមូលបាន</span><span id="dashTodayCashTotal" class="font-black text-green-800 text-sm">0 ៛</span></div>' +
        '<div class="border-t border-green-200 pt-1 text-[11px] text-gray-600 flex justify-between"><span>💵 លុយសុទ្ធក្នុងថត៖</span><b id="dashTodayCashInHand" class="text-gray-900">0 ៛</b></div>' +
        '<div class="text-[11px] text-blue-700 flex justify-between"><span>📱 ចូលកុង ABA៖</span><b id="dashTodayBankAba" class="text-blue-900">0 ៛</b></div>' +
      '</div>' +
      '<div class="dash-card border-l-4 border-red-500 p-4 bg-white rounded-2xl cursor-pointer hover:bg-red-50/50 transition" onclick="loadModule(\'Settlement\')"><div class="text-gray-500 text-xs font-bold uppercase flex justify-between"><span>បំណុលគេជំពាក់សរុប</span><i class="fas fa-chevron-right text-xs text-red-400"></i></div><div id="dashTotalDebt" class="mt-2 font-black text-red-700 text-base sm:text-lg">0 ៛</div></div>' +
      '<div class="dash-card border-l-4 border-purple-600 p-4 bg-white rounded-2xl"><div class="text-gray-500 text-xs font-bold uppercase">ចំណូលលក់ខែនេះ</div><div id="dashMonthSales" class="mt-2 font-black text-purple-800 text-base sm:text-lg">0 ៛</div></div>' +
      '<div class="dash-card border-l-4 border-orange-500 p-4 bg-white rounded-2xl"><div class="text-gray-500 text-xs font-bold uppercase">ចំណាយសរុបខែនេះ</div><div id="dashMonthExpenses" class="mt-2 font-black text-orange-700 text-base sm:text-lg">0 ៛</div><div id="dashMonthExpDetail" class="text-[10px] text-gray-400 font-bold mt-0.5"></div></div>' +
      '<div class="dash-card border-l-4 border-emerald-600 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-300"><div class="text-emerald-900 text-xs font-black uppercase">ប្រាក់ចំណេញសុទ្ធខែនេះ</div><div id="dashNetProfit" class="mt-2 font-black text-emerald-800 text-base sm:text-lg">0 ៛</div><div class="text-[10px] text-gray-500 font-bold mt-0.5">គិតតាមអត្រា $1=4,100៛ | 1฿=115៛</div></div>' +
    '</div>' +
    '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
      '<div class="card p-5 border-t-4 border-blue-600 shadow-lg mb-0"><h3 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-boxes text-blue-600"></i>ចំនួនទឹក/ទំនិញដកលក់ថ្ងៃនេះ</h3><div id="dashProductQtyArea" class="space-y-2 text-xs max-h-64 overflow-y-auto pr-1">កំពុងគណនា...</div></div>' +
      '<div class="card p-5 border-t-4 border-orange-500 shadow-lg mb-0"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-2"><i class="fas fa-boxes-stacked text-orange-500 text-base"></i> ស្តុកទំនិញក្នុងឃ្លាំង & ដំណឹងជិតអស់</h3><button onclick="loadModule(\'StockRep\')" class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold border border-orange-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"><i class="fas fa-arrow-up-right-from-square text-[10px]"></i> របាយការណ៍ស្តុក</button></div><div id="dashStockAlertArea" class="space-y-2 text-xs max-h-64 overflow-y-auto pr-1">កំពុងឆែកមើលស្តុក...</div></div>' +
    '</div>' +
    '<div class="card p-5 border-t-4 border-gray-700 shadow-lg mb-0"><div class="flex justify-between items-center mb-3"><h3 class="font-extrabold text-gray-800 text-xs sm:text-sm flex items-center gap-2"><i class="fas fa-clock-rotate-left text-blue-600 text-base"></i> ប្រតិបត្តិការដកទំនិញថ្ងៃនេះ (ពេញមួយថ្ងៃ)</h3><span id="dashRecentCountBadge" class="bg-blue-100 text-blue-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">0 លើក</span></div><div class="overflow-x-auto max-h-[250px] overflow-y-auto rounded-xl border border-gray-200 shadow-inner"><table class="w-full text-left text-xs border-collapse"><thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-2xs"><tr><th class="p-2.5">ម៉ោង</th><th class="p-2.5">អតិថិជន</th><th class="p-2.5">ទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">ស្ថានភាព</th></tr></thead><tbody id="dashRecentTbody"><tr><td colspan="6" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody></table></div></div>' +
  '</div>';

  await loadDashboardData();
}

// ==========================================
// 📊 ទាញទិន្នន័យ DASHBOARD (ប្រើប្រព័ន្ធម៉ោងកម្ពុជាស្ដង់ដារ UTC+7 ត្រឹមត្រូវ ១០០%)
// ==========================================
async function loadDashboardData() {
  try {
    var todayStr = getCambodiaToday();
    var firstDayMonthStr = todayStr.substring(0, 7) + '-01';

    // 🇰🇭 ប្រើម៉ោង +07:00 នៃប្រទេសកម្ពុជា (មិនឱ្យកាត់ជើងទឹកព្រឹកព្រលឹមឡើយ)
    var monthQueryStart = firstDayMonthStr + 'T00:00:00+07:00';
    var todayQueryStart = todayStr + 'T00:00:00+07:00';

    const { data: monthTrans } = await supabaseClient
      .from('transactions')
      .select('*')
      .gte('created_at', monthQueryStart)
      .order('created_at', { ascending: false });

    const { data: todaySettles } = await supabaseClient
      .from('settlements')
      .select('*')
      .gte('settled_at', todayQueryStart);

    const { data: monthExpenses } = await supabaseClient
      .from('expenses')
      .select('*')
      .gte('created_at', monthQueryStart);

    const { data: unpaids } = await supabaseClient
      .from('transactions')
      .select('total')
      .eq('status', 'Unpaid');

    var todaySalesKHR = 0, todayCashInHand = 0, todayBankAba = 0, monthSalesKHR = 0, monthCOGS = 0;
    var todayProdQty = {}, todayRecentSales = [];

    (monthTrans || []).forEach(function(t) {
      // 🛡️ ឆែកថ្ងៃនេះដោយប្រើកូនសោរ isTodayInCambodia (ត្រឹមត្រូវ ១០០%)
      var isToday = isTodayInCambodia(t.created_at);
      var tot = parseFloat(t.total || 0);
      var qty = parseFloat(t.qty || 0);
      monthSalesKHR += tot;

      var pObj = allProducts.find(p => p.name === t.product_name);
      if (pObj && pObj.type === 'ទិញគេ' && pObj.cost > 0) {
        var itemCostKHR = parseFloat(pObj.cost);
        if (pObj.currency === 'USD') {
          itemCostKHR = itemCostKHR * (typeof exchangeRateUSD !== 'undefined' ? exchangeRateUSD : 4100);
        } else if (pObj.currency === 'THB') {
          itemCostKHR = itemCostKHR * (typeof exchangeRateTHB !== 'undefined' ? exchangeRateTHB : 115);
        }
        monthCOGS += (qty * itemCostKHR);
      }

      if (isToday) {
        todaySalesKHR += tot;
        var paid = parseFloat(t.paid_khr || 0);
        if (t.payment_method === 'ABA') todayBankAba += paid;
        else todayCashInHand += paid;

        if (t.product_name) todayProdQty[t.product_name] = (todayProdQty[t.product_name] || 0) + qty;
        todayRecentSales.push(t);
      }
    });

    (todaySettles || []).forEach(function(s) {
      todayCashInHand += parseFloat(s.cash_khr || 0);
      todayBankAba += parseFloat(s.scan_khr || 0);
    });

    var todayTotalCash = todayCashInHand + todayBankAba;

    // 💵 អត្រាប្តូរប្រាក់ស្វ័យប្រវត្តិ
    var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
    var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

    var monthOperatingExpKHR = 0;
    (monthExpenses || []).forEach(function(e) {
      var amt = parseFloat(e.amount || 0);
      if (e.currency === 'USD') monthOperatingExpKHR += (amt * rateUSD);
      else if (e.currency === 'THB') monthOperatingExpKHR += (amt * rateTHB);
      else monthOperatingExpKHR += amt;
    });

    var totalMonthExpensesKHR = monthOperatingExpKHR + monthCOGS;
    var netProfitKHR = monthSalesKHR - totalMonthExpensesKHR;

    var totalDebtKHR = 0;
    (unpaids || []).forEach(u => { totalDebtKHR += parseFloat(u.total || 0); });

    if (document.getElementById('dashTodaySales')) document.getElementById('dashTodaySales').innerText = '៛ ' + todaySalesKHR.toLocaleString();
    if (document.getElementById('dashTodayCashTotal')) document.getElementById('dashTodayCashTotal').innerText = '៛ ' + todayTotalCash.toLocaleString();
    if (document.getElementById('dashTodayCashInHand')) document.getElementById('dashTodayCashInHand').innerText = '៛ ' + todayCashInHand.toLocaleString();
    if (document.getElementById('dashTodayBankAba')) document.getElementById('dashTodayBankAba').innerText = '៛ ' + todayBankAba.toLocaleString();
    if (document.getElementById('dashTotalDebt')) document.getElementById('dashTotalDebt').innerText = '៛ ' + totalDebtKHR.toLocaleString();
    if (document.getElementById('dashMonthSales')) document.getElementById('dashMonthSales').innerText = '៛ ' + monthSalesKHR.toLocaleString();
    if (document.getElementById('dashMonthExpenses')) document.getElementById('dashMonthExpenses').innerText = '៛ ' + totalMonthExpensesKHR.toLocaleString();
    if (document.getElementById('dashMonthExpDetail')) document.getElementById('dashMonthExpDetail').innerText = '(ប្រតិបត្តិការ: ៛ ' + Math.round(monthOperatingExpKHR).toLocaleString() + (monthCOGS > 0 ? ' | ដើមទឹកយួរ: ៛ ' + Math.round(monthCOGS).toLocaleString() : '') + ')';

    var netEl = document.getElementById('dashNetProfit');
    if (netEl) {
      var isPositive = netProfitKHR >= 0;
      netEl.innerText = (isPositive ? '+ ៛ ' : '- ៛ ') + Math.abs(Math.round(netProfitKHR)).toLocaleString();
      netEl.className = 'mt-2 font-black text-base sm:text-lg ' + (isPositive ? 'text-emerald-700' : 'text-red-600');

      if (!document.getElementById('dashExchangeRateHint')) {
        netEl.insertAdjacentHTML('afterend', '<div id="dashExchangeRateHint" class="text-[10px] text-gray-500 font-bold mt-0.5"></div>');
      }
      var hintEl = document.getElementById('dashExchangeRateHint');
      if (hintEl) {
        hintEl.innerText = 'គិតតាមអត្រា $1=' + rateUSD.toLocaleString() + '៛ | 1฿=' + rateTHB.toLocaleString() + '៛';
      }
    }

    var pqArea = document.getElementById('dashProductQtyArea');
    if (pqArea) {
      var pqHtml = "";
      for (var p in todayProdQty) {
        pqHtml += '<div class="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border"><span class="font-bold text-gray-800">' + p + '</span><span class="px-3 py-1 bg-blue-100 text-blue-800 font-black rounded-lg">' + todayProdQty[p] + '</span></div>';
      }
      pqArea.innerHTML = pqHtml || '<p class="text-gray-400 italic text-center py-4">មិនទាន់មានការដកលក់ថ្ងៃនេះនៅឡើយទេ</p>';
    }

    var alertArea = document.getElementById('dashStockAlertArea');
    if (alertArea) {
      var saHtml = "";
      var lowStockItems = [];
      var resaleItems = [];

      allProducts.forEach(function(prod) {
        if (prod.type === 'ទិញគេ') {
          var s = parseFloat(prod.stock || 0);
          var min = parseFloat(prod.min_stock || 5);
          resaleItems.push(prod);
          if (s <= min) lowStockItems.push(prod);
        }
      });

      if (lowStockItems.length > 0) {
        lowStockItems.forEach(function(prod) {
          var isZero = parseFloat(prod.stock || 0) <= 0;
          var unitLabel = (prod.name.indexOf("យួរ") !== -1) ? "យួរ" : ((prod.name.indexOf("ធុង") !== -1) ? "ធុង" : "ឯកតា");

          saHtml += '<div class="flex justify-between items-center p-2.5 rounded-xl border ' + (isZero ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') + ' mb-1.5">' +
            '<div>' +
              '<b class="' + (isZero ? 'text-red-900' : 'text-orange-900') + '">' + prod.name + '</b>' +
              '<div class="text-[10px] text-gray-400 font-bold">កម្រិតកំណត់៖ ' + (prod.min_stock || 5) + ' ' + unitLabel + '</div>' +
            '</div>' +
            '<div class="flex items-center gap-1.5">' +
              '<span class="px-2.5 py-1 font-black rounded-lg text-xs ' + (isZero ? 'bg-red-600 text-white' : 'bg-orange-500 text-white') + '">' +
                (isZero ? 'អស់ (០)' : 'សល់ ' + prod.stock + ' ' + unitLabel) +
              '</span>' +
              '<button type="button" onclick="openQuickRestockModal(\'' + prod.id + '\', \'' + prod.name.replace(/'/g, "\\'") + '\', ' + (prod.cost || 0) + ')" class="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black shadow-2xs active:scale-95 transition flex items-center gap-1">' +
                '<i class="fas fa-plus"></i> បញ្ចូល' +
              '</button>' +
            '</div>' +
          '</div>';
        });
      } else {
        saHtml += '<div class="p-2.5 bg-green-50 text-green-800 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-1.5 border border-green-200 mb-2">' +
          '<i class="fas fa-check-circle text-green-600"></i> ស្តុកទំនិញទិញចូលទាំងអស់មានសុវត្ថិភាពល្អ' +
        '</div>';
      }

      if (resaleItems.length > 0) {
        saHtml += '<div class="pt-1 space-y-1.5">';
        resaleItems.forEach(function(r) {
          var uLabel = (r.name.indexOf("យួរ") !== -1) ? "យួរ" : ((r.name.indexOf("ធុង") !== -1) ? "ធុង" : "ឯកតា");
          var isLowNow = parseFloat(r.stock || 0) <= parseFloat(r.min_stock || 5);

          saHtml += '<div class="flex justify-between items-center p-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-xs">' +
            '<span><i class="fas fa-box text-blue-500 mr-1.5"></i><b>' + r.name + '</b></span>' +
            '<span class="font-black ' + (isLowNow ? 'text-red-600' : 'text-blue-900') + '">' + Number(r.stock).toLocaleString() + ' ' + uLabel + '</span>' +
          '</div>';
        });
        saHtml += '</div>';
      }

      alertArea.innerHTML = saHtml || '<p class="text-gray-400 italic text-center py-4">គ្មានទំនិញទិញគេក្នុងឃ្លាំង</p>';
    }

    var tbodyRecent = document.getElementById('dashRecentTbody');
    var badgeCount = document.getElementById('dashRecentCountBadge');
    if (badgeCount) badgeCount.innerText = todayRecentSales.length + " លើក";

    if (tbodyRecent) {
      if (todayRecentSales.length === 0) {
        tbodyRecent.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">មិនទាន់មានប្រតិបត្តិការដកទំនិញថ្ងៃនេះនៅឡើយ</td></tr>';
      } else {
        var rHtml = '';
        var isAdmin = (currentUser && currentUser.role === 'Admin');

        todayRecentSales.forEach(function(r) {
          // 🇰🇭 បង្ហាញម៉ោងកម្ពុជាត្រឹមត្រូវ ១០០%
          var timeStr = new Date(r.created_at).toLocaleTimeString('km-KH', { 
            timeZone: 'Asia/Phnom_Penh', 
            hour: '2-digit', 
            minute: '2-digit' 
          });

          var isWithdrawnByOther = (r.recorded_by && r.recorded_by !== r.customer_name && r.recorded_by !== 'Admin');
          var withdrawTag = isWithdrawnByOther ? 
            ('<br><span class="text-[9.5px] text-amber-950 font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[9px] text-amber-600"></i>ដកជំនួសដោយ៖ ' + r.recorded_by + '</span>') : 
            (r.recorded_by && r.recorded_by !== 'Admin' && r.recorded_by !== r.customer_name ? ('<br><small class="text-slate-400 font-normal text-[9px]">កត់ដោយ៖ ' + r.recorded_by + '</small>') : '');

          var voidBtnHtml = isAdmin ? 
            ('<button type="button" onclick="voidTransaction(' + r.id + ', \'' + (r.transaction_id || '') + '\', \'' + (r.product_name || '').replace(/'/g, "\\'") + '\', ' + (r.qty || 1) + ', ' + (r.total || 0) + ')" class="ml-1.5 text-slate-300 hover:text-red-600 active:scale-90 transition p-1" title="បោះបង់ការកត់ត្រានេះ"><i class="fas fa-trash-can text-xs"></i></button>') : '';

          rHtml += '<tr class="border-b hover:bg-gray-50">' +
            '<td class="p-2.5 text-gray-500 whitespace-nowrap text-[10px]">' + timeStr + '</td>' +
            '<td class="p-2.5 font-bold text-gray-800">' + r.customer_name + withdrawTag + '</td>' +
            '<td class="p-2.5">' + r.product_name + '</td>' +
            '<td class="p-2.5 text-center font-bold text-blue-700">' + r.qty + '</td>' +
            '<td class="p-2.5 text-right font-black text-green-700 whitespace-nowrap">៛ ' + Number(r.total).toLocaleString() + '</td>' +
            '<td class="p-2.5 text-center whitespace-nowrap">' +
              '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold ' + (r.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800 border border-orange-200') + '">' + (r.status === 'Paid' ? 'បង់រួច' : 'ជំពាក់') + '</span>' +
              voidBtnHtml +
            '</td>' +
          '</tr>';
        });
        tbodyRecent.innerHTML = rHtml;
      }
    }
  } catch(e) {
    console.error("Dashboard error:", e);
  }
}
// 🗑️ មុខងារបោះបង់ការលក់ & បង្វិលស្តុកសងចូលឃ្លាំងវិញដោយស្វ័យប្រវត្តិ (Void Sale)
async function voidTransaction(rowId, tid, prodName, qty, total) {
  if (!rowId) return;

  var ok = await kcConfirm({
    title: "បោះបង់ការលក់ (Void Sale)",
    message: "តើអ្នកពិតជាចង់បោះបង់ប្រតិបត្តិការ [" + prodName + " x " + qty + "] ចំនួន ៛ " + Number(total).toLocaleString() + " នេះមែនទេ? ស្តុកទំនិញនឹងត្រូវបង្វិលសងចូលឃ្លាំងវិញដោយស្វ័យប្រវត្តិ។",
    type: "danger",
    confirmText: "យល់ព្រមបោះបង់"
  });

  if (!ok) return;

  try {
    // ១. បង្វិលស្តុកទំនិញសងចូលឃ្លាំងវិញ (បើជាទំនិញទិញគេ)
    var prodObj = allProducts.find(p => p.name.trim().toLowerCase() === prodName.trim().toLowerCase());
    if (prodObj && prodObj.type === 'ទិញគេ' && qty > 0) {
      var restoredStock = parseFloat(prodObj.stock || 0) + parseFloat(qty);
      await supabaseClient.from('products').update({ stock: restoredStock }).eq('id', prodObj.id);
      prodObj.stock = restoredStock;
    }

    // ២. លុបកំណត់ត្រាចេញពីតារាង Transactions
    const { error: delErr } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', rowId);

    if (delErr) throw delErr;

    showToast("បានបោះបង់ការលក់ និងបង្វិលស្តុកសងវិញជោគជ័យ!", "success");

    // ៣. បាញ់សារ Telegram Alert ទៅកាន់ថៅកែ
    try {
      var tgMsg = "⚠️ <b>[KC WATER - បោះបង់ការលក់ (Void Sale)]</b>\n\n" +
                  "🆔 <b>កូដប្រតិបត្តិការ៖</b> <code>" + (tid || rowId) + "</code>\n" +
                  "📦 <b>ទំនិញ៖</b> " + prodName + " x " + qty + "\n" +
                  "💰 <b>ទឹកប្រាក់៖</b> <b>-៛ " + Number(total).toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកលុប៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(tgE) {}

    // ៤. ទាញទិន្នន័យ Dashboard ឡើងវិញភ្លាមៗ
    await fetchInitialPOSData();
    loadDashboardData();

  } catch(err) {
    showToast("កំហុសបោះបង់ការលក់៖ " + err.message, "error");
  }
}
// 📦 មុខងារ QUICK RESTOCK MODAL លើ DASHBOARD
function injectQuickRestockModal() {
  if (document.getElementById('quickRestockModal')) return;
  var html = '<div id="quickRestockModal" class="fixed inset-0 z-[7500] flex items-center justify-center p-4 hidden">' +
    '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="closeQuickRestockModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm overflow-hidden p-5 text-center relative border space-y-3.5 animate-in zoom-in duration-200">' +
      '<div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-green-100 text-green-700">' +
        '<i class="fas fa-boxes-packing"></i>' +
      '</div>' +
      '<div>' +
        '<h3 class="font-black text-gray-900 text-base">បញ្ចូលស្តុកថ្មីភ្លាមៗ</h3>' +
        '<p id="qrProdTitle" class="text-xs text-blue-700 font-bold mt-0.5"></p>' +
      '</div>' +
      '<div class="space-y-2.5 text-left text-xs">' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-600 uppercase block mb-1">១. ចំនួនទិញចូលបន្ថែម (*ឯកតា)</label>' +
          '<input type="number" id="qrQtyInput" placeholder="ឧ៖ 50" class="w-full text-center text-xl font-black text-green-800 bg-gray-50 border-2 border-green-300 focus:border-green-600 rounded-xl p-2.5 outline-none">' +
        '</div>' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-600 uppercase block mb-1">២. ថ្លៃដើមទិញចូលលើកនេះ (បើតម្លៃប្រែប្រួល)</label>' +
          '<input type="number" id="qrCostInput" placeholder="វាយថ្លៃដើមថ្មីនៅទីនេះ" class="w-full text-center text-lg font-black text-blue-900 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl p-2.5 outline-none">' +
          '<p id="qrCurrentCostHint" class="text-[10px] text-blue-600 font-bold mt-1 text-center"></p>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 pt-1">' +
        '<button type="button" onclick="closeQuickRestockModal()" class="py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs active:scale-95 transition">បោះបង់</button>' +
        '<button type="button" id="qrConfirmBtn" onclick="confirmQuickRestockSubmit()" class="py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition">យល់ព្រមបញ្ចូល</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function openQuickRestockModal(prodId, prodName, currentCost) {
  injectQuickRestockModal();
  activeQuickRestockData = { id: prodId, name: prodName, cost: currentCost };

  var titleEl = document.getElementById('qrProdTitle');
  var qtyInp = document.getElementById('qrQtyInput');
  var costInp = document.getElementById('qrCostInput');
  var hintEl = document.getElementById('qrCurrentCostHint');
  var modal = document.getElementById('quickRestockModal');

  if (titleEl) titleEl.innerText = "ទំនិញ៖ [" + prodName + "]";
  if (qtyInp) { qtyInp.value = "50"; setTimeout(() => { qtyInp.focus(); qtyInp.select(); }, 150); }
  if (costInp) costInp.value = currentCost > 0 ? currentCost : "";
  if (hintEl) hintEl.innerText = "*ថ្លៃដើមបច្ចុប្បន្ន៖ ៛ " + Number(currentCost).toLocaleString() + " (អាចកែប្រែបាន)";

  if (modal) modal.classList.remove('hidden');
}

function closeQuickRestockModal() {
  var modal = document.getElementById('quickRestockModal');
  if (modal) modal.classList.add('hidden');
  activeQuickRestockData = null;
}

async function confirmQuickRestockSubmit() {
  if (!activeQuickRestockData || !activeQuickRestockData.id) return;
  var qtyInp = document.getElementById('qrQtyInput');
  var costInp = document.getElementById('qrCostInput');

  var q = parseFloat(qtyInp ? qtyInp.value : 0);
  var newCost = parseFloat(costInp && costInp.value !== "" ? costInp.value : 0);

  if (isNaN(q) || q <= 0) {
    showToast("សូមបញ្ចូលចំនួនទិញចូលធំជាង ០!", "error");
    return;
  }

  var targetProdId = activeQuickRestockData.id;
  var prodName = activeQuickRestockData.name;
  var btn = document.getElementById('qrConfirmBtn');
  btn.disabled = true;

  try {
    var prod = allProducts.find(p => p.id === targetProdId);
    var curStock = prod ? parseFloat(prod.stock || 0) : 0;
    var finalStock = curStock + q;

    var updateObj = { stock: finalStock };
    if (newCost > 0) updateObj.cost = newCost;

    await supabaseClient.from('products').update(updateObj).eq('id', targetProdId);
    await supabaseClient.from('stock_in').insert([{
      product_id: targetProdId,
      product_name: prodName,
      qty: q,
      cost: newCost > 0 ? newCost : activeQuickRestockData.cost,
      admin_name: currentUser.fullName || "Admin"
    }]);

    closeQuickRestockModal();
    showToast("បានបញ្ចូលស្តុក +" + q + " ចូលឃ្លាំងជោគជ័យ!", "success");
    await fetchInitialPOSData();
    renderDashboardModule();

    try {
      var tgMsg = "📦 <b>[KC WATER - បញ្ចូលស្តុកថ្មី (Dashboard)]</b>\n\n" +
                  "• ទំនិញ៖ <b>" + prodName + "</b>\n" +
                  "• ចំនួនទិញចូល៖ <b>+" + q + "</b>\n" +
                  (newCost > 0 ? "• ថ្លៃដើមថ្មី៖ <b>៛ " + Number(newCost).toLocaleString() + "</b>\n" : "") +
                  "• ស្តុកសរុបបច្ចុប្បន្ន៖ <b>" + finalStock + "</b>\n" +
                  "• អ្នកកត់ត្រា៖ " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 ម៉ោង៖ " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}

  } catch(err) {
    showToast("កំហុសបញ្ចូលស្តុក៖ " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// ==========================================
// 🛒 ៣. ផ្ទាំងលក់ POS (មានប្រអប់ SEARCH & ប្រភេទ «ទំនិញទូទៅ/គ្រឿងទេស»)
// ==========================================
var currentPosSearchKeyword = '';

function renderPOSModule() {
  var area = document.getElementById('contentArea');
  
  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isSeller = (currentUser && (currentUser.role === 'Seller' || currentUser.role === 'Cashier'));
  var isDriver = (currentUser && currentUser.role === 'Driver' && currentUser.type === 'Driver');
  var isReseller = (!isAdmin && !isSeller && !isDriver);

  var customerHeaderHTML = '';

  if (isAdmin) {
    var custOptions = '<option value="Walk-in">🛒 -- លក់នៅកន្លែង (Walk-in) --</option>';
    allCustomers.forEach(function(c) {
      if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
        custOptions += '<option value="' + c.full_name + '">' + c.full_name + ' (' + (c.type === 'Monthly' ? 'ប្រចាំខែ' : 'អ្នកលក់បន្ត') + ')</option>';
      }
    });

    customerHeaderHTML = '<div class="card border-l-4 border-blue-500 py-3 shadow-sm mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">' +
      '<div class="flex-1 w-full sm:w-auto">' +
        '<label class="text-xs font-bold text-gray-500 block mb-1"><i class="fas fa-user-tag text-blue-600 mr-1.5"></i>ជ្រើសរើសអតិថិជន / ម៉ូយ (ឬលក់នៅកន្លែង Walk-in)</label>' +
        '<select id="posCustSelect" onchange="onAdminPosCustomerChange(this.value)" class="w-full font-bold text-gray-800 border-2 border-blue-200 focus:border-blue-600 rounded-xl p-2.5 bg-white outline-none">' + custOptions + '</select>' +
      '</div>' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-200 active:scale-95 transition flex items-center gap-1 shadow-2xs self-end sm:self-auto"><i class="fas fa-sync-alt"></i> Refresh ស្តុក</button>' +
    '</div>' +
    // 🚚 បដាសម្គាល់របៀបដកទំនិញជំនួសម៉ូយ
    '<div id="adminProxyModeNotice" class="hidden p-3 bg-blue-50 border-2 border-blue-400 rounded-2xl mb-3 text-xs font-bold text-blue-950 flex items-center justify-between shadow-2xs animate-in zoom-in duration-200">' +
      '<span class="flex items-center gap-2"><i class="fas fa-truck-ramp-box text-blue-600 text-base"></i> របៀបដកទំនិញជំនួស៖ <b id="adminProxyCustName" class="text-blue-900 text-sm"></b> (កត់ត្រាចូលបញ្ជីជំពាក់អូតូ)</span>' +
      '<span class="px-2.5 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-black">ជំពាក់ (Unpaid)</span>' +
    '</div>';

  } else if (isReseller) {
    customerHeaderHTML = '<div class="card border-l-4 border-green-600 bg-green-50 p-3.5 mb-4 flex justify-between items-center">' +
      '<div>' +
        '<span class="text-[10px] text-green-700 font-bold uppercase tracking-wider block">គណនីអ្នកដកទំនិញ (Reseller)</span>' +
        '<b class="text-green-900 text-sm sm:text-base"><i class="fas fa-user mr-2"></i>អ្នកដកទំនិញ៖ ' + currentUser.fullName + '</b>' +
        '<input type="hidden" id="posCustSelect" value="' + currentUser.fullName + '">' +
      '</div>' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-2.5 py-1.5 bg-white hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold border border-green-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"><i class="fas fa-sync-alt"></i> Refresh ស្តុក</button>' +
    '</div>';

  } else if (isDriver) {
    customerHeaderHTML = '<div class="card border-l-4 border-amber-500 bg-amber-50 p-3.5 mb-4 flex justify-between items-center">' +
      '<div>' +
        '<span class="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">កូនចៅដកទឹកជំនួសមេ៖ ' + currentUser.linkedBoss + '</span>' +
        '<b class="text-amber-950 text-sm sm:text-base"><i class="fas fa-truck mr-2"></i>អ្នកមកដកផ្ទាល់៖ ' + currentUser.fullName + '</b>' +
        '<input type="hidden" id="posCustSelect" value="' + currentUser.linkedBoss + '">' +
      '</div>' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '</div>';

  } else {
    customerHeaderHTML = '<div class="card border-l-4 border-blue-600 bg-blue-50 p-3 mb-4 flex justify-between items-center">' +
      '<b class="text-blue-900 text-sm"><i class="fas fa-store mr-2"></i>លក់នៅកន្លែង (Walk-in)</b>' +
      '<input type="hidden" id="posCustSelect" value="Walk-in">' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-2.5 py-1 bg-white text-blue-700 rounded-lg text-xs font-bold border"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '</div>';
  }

  // ផ្នែក Discount (បង្ហាញសម្រាប់ Admin)
  var discountSectionHTML = '';
  if (isAdmin) {
    discountSectionHTML = '<div class="bg-yellow-50/70 p-3 rounded-xl border border-yellow-200 mb-3 space-y-2">' +
      '<div class="flex justify-between items-center">' +
        '<span class="text-xs font-bold text-yellow-900 flex items-center gap-1"><i class="fas fa-tags text-yellow-600"></i> បញ្ចុះតម្លៃលើវិក្កយបត្រ (Discount)</span>' +
        '<div class="flex gap-1 text-[10px]">' +
          '<button type="button" onclick="setDiscountType(\'NONE\')" id="btnDiscNone" class="px-2 py-0.5 rounded-md font-bold bg-yellow-600 text-white">គ្មាន</button>' +
          '<button type="button" onclick="setDiscountType(\'CASH\')" id="btnDiscCash" class="px-2 py-0.5 rounded-md font-bold bg-white text-gray-700 border">សាច់ប្រាក់</button>' +
          '<button type="button" onclick="setDiscountType(\'PERCENT\')" id="btnDiscPercent" class="px-2 py-0.5 rounded-md font-bold bg-white text-gray-700 border">%</button>' +
        '</div>' +
      '</div>' +
      '<div id="discountInputRow" class="hidden flex items-center gap-2">' +
        '<input type="number" id="posDiscountVal" oninput="applyDiscountValue(this.value)" placeholder="ចំនួនចុះតម្លៃ" class="text-center font-bold text-xs p-2 bg-white border border-yellow-300 rounded-lg flex-1 outline-none">' +
        '<span id="discountPreviewLabel" class="text-xs font-bold text-red-600 whitespace-nowrap"></span>' +
      '</div>' +
    '</div>';
  }

  // ផ្នែកបង់លុយ
  var paymentSectionHTML = '';
  if (isAdmin || isSeller) {
    paymentSectionHTML = '<div id="posPaymentSectionWrapper"><div class="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3 mt-3">' +
      '<div class="flex justify-between items-center"><span class="text-xs font-bold text-blue-900 uppercase tracking-wider"><i class="fas fa-coins text-blue-600 mr-1.5"></i>ទូទាត់ប្រាក់នៅកន្លែង</span><button onclick="fillExactPOSPay()" class="px-3 py-1 bg-white hover:bg-blue-100 text-blue-700 text-xs font-extrabold rounded-lg border border-blue-300 shadow-2xs active:scale-95 transition">លុយគ្រប់</button></div>' +
      '<div class="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border">' +
        '<button type="button" id="btnPosPayCash" onclick="setPosPaymentMethod(\'Cash\')" class="py-2 rounded-lg text-xs font-bold bg-green-700 text-white shadow"><i class="fas fa-money-bill-wave"></i> 💵 លុយសុទ្ធ</button>' +
        '<button type="button" id="btnPosPayAba" onclick="setPosPaymentMethod(\'ABA\')" class="py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fas fa-qrcode"></i> 📱 ស្កេន ABA</button>' +
      '</div>' +
      '<div class="space-y-1"><label class="text-[10px] font-bold text-gray-500 uppercase">ប្រាក់រៀលទទួល (៛)</label><input type="number" id="pK" oninput="calcPOSChange()" placeholder="0" class="text-center font-black text-xl text-blue-900 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-600 p-2.5 w-full outline-none"></div>' +
      '<div class="flex gap-2 pt-1 text-xs">' +
        '<button onclick="setPOSQuickCash(10000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-700 font-bold rounded-xl border shadow-2xs active:scale-95 transition">10,000</button>' +
        '<button onclick="setPOSQuickCash(20000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-700 font-bold rounded-xl border shadow-2xs active:scale-95 transition">20,000</button>' +
        '<button onclick="setPOSQuickCash(50000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-700 font-bold rounded-xl border shadow-2xs active:scale-95 transition">50,000</button>' +
      '</div>' +
      '<div id="posChangeArea" class="rounded-xl transition-all duration-200 hidden"></div>' +
      '<button onclick="openPOSKHQR()" type="button" class="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-2 active:scale-95 transition"><i class="fas fa-qrcode text-base"></i> បង្ហាញ ABA KHQR</button>' +
    '</div></div>';
  }

  var submitBtnHTML = '';
  if (isReseller || isDriver) {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-4 py-4 text-base flex items-center justify-center w-full font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"><i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញ (កត់ចូលបញ្ជីជំពាក់)</button>';
  } else if (isSeller) {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-4 py-3.5 text-base flex items-center justify-center w-full font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-2xl"><i class="fas fa-file-pen mr-2 text-lg"></i>កត់ត្រាការលក់ (រង់ចាំ Admin ពិនិត្យ)</button>';
  } else {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-4 py-3.5 text-base flex items-center justify-center w-full font-bold">រក្សាទុកការលក់ (Save Sale)</button>';
  }

  area.innerHTML = '<div class="max-w-4xl mx-auto space-y-4">' +
    customerHeaderHTML +

    // 🏷️ ប៊ូតុងប្រភេទ ៤ (ទាំងអស់ / ទឹកធុង ២០L / ទឹកយួរ/ដប / ទំនិញទូទៅ/គ្រឿងទេស)
    '<div class="flex flex-wrap gap-2 pb-1">' +
      '<button onclick="setPosCategoryFilter(\'ALL\')" id="catTab_ALL" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-green-700 text-white shadow-md active:scale-95 transition"><i class="fas fa-border-all mr-1"></i> ទាំងអស់</button>' +
      '<button onclick="setPosCategoryFilter(\'BARREL\')" id="catTab_BARREL" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-wine-bottle text-blue-600 mr-1"></i> ទឹកធុង ២០L</button>' +
      '<button onclick="setPosCategoryFilter(\'PACK\')" id="catTab_PACK" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-box-open text-amber-600 mr-1"></i> ទឹកយួរ/ដប</button>' +
      '<button onclick="setPosCategoryFilter(\'GENERAL\')" id="catTab_GENERAL" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-boxes-stacked text-emerald-600 mr-1"></i> ទំនិញទូទៅ/គ្រឿងទេស</button>' +
    '</div>' +

    // 🔍 ប្រអប់ Search រកទំនិញរហ័សលើ POS
    '<div class="relative">' +
      '<input type="text" id="posProductSearchInp" oninput="onPosSearchInput(this.value)" placeholder="🔍 វាយឈ្មោះទំនិញដើម្បីស្វែងរក (ឧ៖ ក្រដាស, អង្ករ, 500ml, ធុងស)..." class="w-full border-2 border-gray-200 focus:border-green-600 rounded-2xl p-2.5 pl-9 font-bold text-xs outline-none bg-white shadow-2xs">' +
      '<i class="fas fa-search absolute left-3 top-3.5 text-gray-400 text-xs pointer-events-none"></i>' +
    '</div>' +

    // ក្រឡាចត្រង្គទំនិញ
    '<div id="pGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-1"></div>' +

    // កន្ត្រកទំនិញ
    '<div class="card border-t-4 border-green-600 shadow-xl p-4 sm:p-5">' +
      '<div class="flex justify-between items-center mb-3"><h3 class="font-extrabold text-gray-800 text-sm sm:text-base flex items-center"><i class="fas fa-shopping-cart mr-2 text-green-600"></i>បញ្ជីទំនិញក្នុងកន្ត្រក</h3><span id="cartCountBadge" class="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold">0 មុខ</span></div>' +
      '<div class="overflow-x-auto rounded-xl border border-gray-100 mb-3"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">តម្លៃរាយ</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">លុប</th></tr></thead><tbody id="cItemsTableBody"><tr><td colspan="5" class="p-4 text-center text-gray-400 italic">កន្ត្រកទទេ</td></tr></tbody></table></div>' +
      discountSectionHTML +
      '<div class="bg-green-50 p-3.5 rounded-2xl border border-green-200 flex justify-between items-center text-green-900 mb-3 font-extrabold text-sm sm:text-base"><span>សរុបទឹកប្រាក់៖</span><span id="cTotalVal" class="text-green-700 text-base sm:text-lg">0 ៛</span></div>' +
      paymentSectionHTML +
      submitBtnHTML +
    '</div>' +
  '</div>';

  rPG();
  rC();
}

// 🔍 មុខងារ Search រកទំនិញលើ POS ភ្លាមៗ
function onPosSearchInput(val) {
  currentPosSearchKeyword = (val || '').toLowerCase().trim();
  rPG();
}

// 🚚 មុខងារឆ្លាតវៃពេល Admin ជ្រើសរើសឈ្មោះម៉ូយក្នុង POS (Smart Proxy Handler)
function onAdminPosCustomerChange(val) {
  var notice = document.getElementById('adminProxyModeNotice');
  var nameLabel = document.getElementById('adminProxyCustName');
  var paySec = document.getElementById('posPaymentSectionWrapper');
  var sBtn = document.getElementById('sBtn');

  var isWalkIn = (!val || val === 'Walk-in');

  // បើជ្រើសរើសម៉ូយ បង្ហាញបដាដកជំនួស
  if (notice && nameLabel) {
    if (!isWalkIn) {
      nameLabel.innerText = val;
      notice.classList.remove('hidden');
    } else {
      notice.classList.add('hidden');
    }
  }

  // បើដកជំនួសម៉ូយ លាក់ប្រអប់ទូទាត់លុយរាយចោលភ្លាម ដើម្បីកុំឱ្យច្រឡំដៃគិតលុយ
  if (paySec) {
    if (!isWalkIn) {
      paySec.classList.add('hidden');
      if (document.getElementById('pK')) document.getElementById('pK').value = "";
    } else {
      paySec.classList.remove('hidden');
    }
  }

  // ប្តូរប៊ូតុងខាងក្រោមទៅជាប៊ូតុងដកទំនិញជំពាក់ជំនួសម៉ូយ
  if (sBtn) {
    if (!isWalkIn) {
      sBtn.className = "btn-green shadow-xl active:scale-95 transition mt-4 py-4 text-base flex items-center justify-center w-full font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl";
      sBtn.innerHTML = '<i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញជំនួស (កត់ចូលបញ្ជីជំពាក់ម៉ូយ)';
    } else {
      sBtn.className = "btn-green shadow-xl active:scale-95 transition mt-4 py-3.5 text-base flex items-center justify-center w-full font-bold";
      sBtn.innerHTML = 'រក្សាទុកការលក់ (Save Sale)';
    }
  }

  // អាប់ដេតតម្លៃពិសេសក្នុងកន្ត្រកបើម៉ូយមានតម្លៃពិសេស (មិនសម្អាតកន្ត្រកចោលឡើយ)
  if (cart && cart.length > 0) {
    cart.forEach(function(item) {
      var sp = specialPrices.find(s => s.customer_name === val && s.product_name === item.name);
      var prod = allProducts.find(p => p.id === item.id);
      if (sp) item.price = parseFloat(sp.price);
      else if (prod) item.price = parseFloat(prod.price || 0);
    });
  }

  rPG();
  rC();
}

function setDiscountType(type) {
  currentPosDiscount.type = type;
  var row = document.getElementById('discountInputRow');
  var btnNone = document.getElementById('btnDiscNone');
  var btnCash = document.getElementById('btnDiscCash');
  var btnPercent = document.getElementById('btnDiscPercent');

  if (btnNone) btnNone.className = (type === 'NONE' ? "px-2 py-0.5 rounded-md font-bold bg-yellow-600 text-white" : "px-2 py-0.5 rounded-md font-bold bg-white text-gray-700 border");
  if (btnCash) btnCash.className = (type === 'CASH' ? "px-2 py-0.5 rounded-md font-bold bg-yellow-600 text-white" : "px-2 py-0.5 rounded-md font-bold bg-white text-gray-700 border");
  if (btnPercent) btnPercent.className = (type === 'PERCENT' ? "px-2 py-0.5 rounded-md font-bold bg-yellow-600 text-white" : "px-2 py-0.5 rounded-md font-bold bg-white text-gray-700 border");

  if (type === 'NONE') {
    if (row) row.classList.add('hidden');
    currentPosDiscount.value = 0;
    if (document.getElementById('posDiscountVal')) document.getElementById('posDiscountVal').value = "";
  } else {
    if (row) row.classList.remove('hidden');
    if (document.getElementById('posDiscountVal')) document.getElementById('posDiscountVal').placeholder = (type === 'PERCENT' ? "ចុះតម្លៃជា % (ឧ៖ 5)" : "ចុះតម្លៃជាសាច់ប្រាក់ (ឧ៖ 2000)");
  }
  rC();
}

function applyDiscountValue(val) {
  currentPosDiscount.value = parseFloat(val || 0);
  rC();
}

function setPosCategoryFilter(cat) {
  currentPosCategoryFilter = cat;
  ['ALL', 'BARREL', 'PACK', 'GENERAL'].forEach(function(t) {
    var btn = document.getElementById('catTab_' + t);
    if (!btn) return;
    if (t === cat) btn.className = "px-3.5 py-2 rounded-xl text-xs font-bold bg-green-700 text-white shadow-md active:scale-95 transition";
    else btn.className = "px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition";
  });
  rPG();
}

// 📦 មុខងារទាញទំនិញមកបង្ហាញក្នុងក្រឡាចត្រង្គ POS (តម្លៃ ៣ ជាន់៖ ៛ លើ, ฿ កណ្តាល, $ ក្រោម គ្មានវង់ក្រចក ())
function rPG() {
  var grid = document.getElementById('pGrid');
  if (!grid) return;

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');

  var custObj = allCustomers.find(c => c.full_name === custName);
  var isMonthly = (custObj && custObj.type === 'Monthly');

  var filtered = allProducts.filter(function(p) {
    if (p.channel === 'ONLINE') return false;

    if (isMonthly) {
      return specialPrices.some(sp => sp.customer_name === custName && sp.product_name === p.name);
    }

    var nameLower = (p.name || '').toLowerCase();

    // ១. ចម្រាញ់តាមប្រភេទ Category
    if (currentPosCategoryFilter === 'BARREL') {
      if (nameLower.indexOf('ធុង') === -1 && nameLower.indexOf('20l') === -1 && nameLower.indexOf('២០') === -1) return false;
    } else if (currentPosCategoryFilter === 'PACK') {
      if (nameLower.indexOf('យួរ') === -1 && nameLower.indexOf('ដប') === -1 && nameLower.indexOf('កេស') === -1) return false;
    } else if (currentPosCategoryFilter === 'GENERAL') {
      var isBarrel = (nameLower.indexOf('ធុង') !== -1 || nameLower.indexOf('20l') !== -1 || nameLower.indexOf('២០') !== -1);
      var isPack = (nameLower.indexOf('យួរ') !== -1 || nameLower.indexOf('ដប') !== -1 || nameLower.indexOf('កេស') !== -1);
      if (isBarrel || isPack) return false;
    }

    // ២. ចម្រាញ់តាមពាក្យ Search
    if (currentPosSearchKeyword) {
      if (nameLower.indexOf(currentPosSearchKeyword) === -1 && String(p.id || '').toLowerCase().indexOf(currentPosSearchKeyword) === -1) {
        return false;
      }
    }

    return true;
  });

  if (isMonthly && filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-10 text-center space-y-1"><p class="text-orange-600 font-bold text-xs"><i class="fas fa-exclamation-triangle mr-1"></i> មិនទាន់មានទំនិញកំណត់តម្លៃពិសេសសម្រាប់អតិថិជននេះនៅឡើយទេ!</p><span class="text-gray-400 text-[11px] block">សូម Admin ចូលទៅម៉ឺនុយ «គ្រប់គ្រងអតិថិជន» ដើម្បីកំណត់មុខទំនិញ និងតម្លៃពិសេសសម្រាប់គាត់</span></div>';
    return;
  }

  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  var html = '';
  filtered.forEach(function(p) {
    var sp = specialPrices.find(s => s.customer_name === custName && s.product_name === p.name);
    var unitPrice = sp ? parseFloat(sp.price) : parseFloat(p.price || 0);
    var rawCurr = (p.currency || 'KHR').toUpperCase();

    // 🪙 គណនា ៣ រូបិយប័ណ្ណស្មើៗគ្នា (៛, ฿, $) តាមអត្រាប្តូរប្រាក់ជាក់ស្តែង
    var khrVal = 0, thbVal = 0, usdVal = 0;

    if (rawCurr === 'USD') {
      khrVal = Math.round(unitPrice * rateUSD);
      usdVal = unitPrice;
      thbVal = Math.round(khrVal / rateTHB);
    } else if (rawCurr === 'THB') {
      khrVal = Math.round(unitPrice * rateTHB);
      thbVal = unitPrice;
      usdVal = parseFloat((khrVal / rateUSD).toFixed(2));
    } else {
      khrVal = Math.round(unitPrice);
      thbVal = Math.round(unitPrice / rateTHB);
      usdVal = parseFloat((unitPrice / rateUSD).toFixed(2));
    }

    // 💵 ទម្រង់តម្លៃ ៣ ជាន់ (៛ លើ, ฿ កណ្តាល, $ ក្រោម ដោយគ្មានសញ្ញាវង់ក្រចក () ឡើយ)
    var khrText = '៛ ' + Number(khrVal).toLocaleString();
    var thbText = '฿ ' + Number(thbVal).toLocaleString();
    var usdText = '$ ' + Number(usdVal).toFixed(2);

    var priceDisplay = '<div class="space-y-0.5 text-center mt-1 leading-tight">' +
      '<div class="text-xs sm:text-sm font-black text-green-700">' + khrText + '</div>' +
      '<div class="text-[10px] sm:text-[11px] font-black text-amber-600">' + thbText + '</div>' +
      '<div class="text-[10px] sm:text-[11px] font-black text-blue-700">' + usdText + '</div>' +
    '</div>';

    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var spBadge = sp ? '<span class="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-yellow-300">តម្លៃពិសេស</span>' : '';

    html += '<div onclick="openProductModal(\'' + p.id + '\')" class="bg-white p-3 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-green-400 transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-between text-center relative group">' +
      spBadge +
      '<span class="absolute top-2 right-2 bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">' + (p.type === 'ផលិតឯង' ? 'ផលិតឯង' : ('សល់ ' + p.stock)) + '</span>' +
      '<div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1"><img src="' + imgUrl + '" class="max-w-full max-h-full object-contain drop-shadow-sm"></div>' +
      '<h4 class="text-xs sm:text-sm font-bold text-gray-800 line-clamp-2 h-8 flex items-center justify-center">' + p.name + '</h4>' +
      priceDisplay +
      '<div class="mt-2 w-full py-1.5 bg-green-50 group-hover:bg-green-600 text-green-700 group-hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"><i class="fas fa-plus text-[10px]"></i> រើសទិញ</div>' +
    '</div>';
  });

  grid.innerHTML = html || '<p class="col-span-full py-8 text-center text-gray-400 text-xs italic">រកមិនឃើញទំនិញត្រូវនឹងការស្វែងរកឡើយ</p>';
}

// ==========================================
// 💵 ប្រព័ន្ធគ្រប់គ្រង ៣ រូបិយប័ណ្ណ, ប្តូរពណ៌ & ថែម 00 (MODAL LOGIC)
// ==========================================
var currentModalCurrency = 'KHR';

// 🔄 ១. មុខងារចុចប្តូររូបិយប័ណ្ណ & ប្តូរពណ៌ (ខៀវ / ទឹកក្រូច / បៃតង)
function setModalCurrency(curr) {
  currentModalCurrency = curr;

  var btnKhr = document.getElementById('btnModalCurr_KHR');
  var btnThb = document.getElementById('btnModalCurr_THB');
  var btnUsd = document.getElementById('btnModalCurr_USD');
  var suffixEl = document.getElementById('modalCurrencySymbolSuffix');
  var priceBox = document.getElementById('modalPriceInput');

  // Reset ពណ៌ប៊ូតុងអត់ជ្រើសរើស
  ['KHR', 'THB', 'USD'].forEach(function(c) {
    var btn = document.getElementById('btnModalCurr_' + c);
    if (btn) btn.className = "py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-white transition flex items-center justify-center gap-1";
  });

  // 🎨 ប្តូរពណ៌តាមប្រភេទលុយនីមួយៗ
  if (curr === 'THB') {
    // 🟠 លុយថៃ ពណ៌ទឹកក្រូច
    if (btnThb) btnThb.className = "py-2 rounded-xl text-xs font-black shadow-xs bg-amber-600 text-white transition flex items-center justify-center gap-1";
    if (suffixEl) { suffixEl.innerText = '฿'; suffixEl.className = "absolute right-3 top-3 font-black text-amber-600 text-sm"; }
    if (priceBox) priceBox.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-amber-300 focus:border-amber-600 text-amber-950 outline-none pr-8";
  } else if (curr === 'USD') {
    // 🟢 លុយដុល្លារ ពណ៌បៃតង
    if (btnUsd) btnUsd.className = "py-2 rounded-xl text-xs font-black shadow-xs bg-emerald-600 text-white transition flex items-center justify-center gap-1";
    if (suffixEl) { suffixEl.innerText = '$'; suffixEl.className = "absolute right-3 top-3 font-black text-emerald-600 text-sm"; }
    if (priceBox) priceBox.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-emerald-300 focus:border-emerald-600 text-emerald-950 outline-none pr-8";
  } else {
    // 🔵 លុយខ្មែរ ពណ៌ខៀវ
    if (btnKhr) btnKhr.className = "py-2 rounded-xl text-xs font-black shadow-xs bg-blue-600 text-white transition flex items-center justify-center gap-1";
    if (suffixEl) { suffixEl.innerText = '៛'; suffixEl.className = "absolute right-3 top-3 font-black text-blue-600 text-sm"; }
    if (priceBox) priceBox.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-blue-300 focus:border-blue-600 text-blue-950 outline-none pr-8";
  }

  // បង្ហាញជួរប៊ូតុងជំនួយ +00 តែលើលុយខ្មែរ (KHR) ប៉ុណ្ណោះ
  var khrRow = document.getElementById('modalKhrQuickButtonsRow');
  var khrHint = document.getElementById('modalKhrHintText');
  if (khrRow) {
    if (curr === 'KHR') {
      khrRow.classList.remove('hidden');
      if (khrHint) khrHint.classList.remove('hidden');
    } else {
      khrRow.classList.add('hidden');
      if (khrHint) khrHint.classList.add('hidden');
    }
  }

  updateModalSubtotal();
}

// 🧮 ២. មុខងារបំប្លែង និងទាញយកតម្លៃលក់ (ស្គាល់តម្លៃកុងត្រាអតិថិជន Monthly ជានិច្ច)
function getModalParsedPrice() {
  var inp = document.getElementById('modalPriceInput');
  
  // ទាញតម្លៃកុងត្រាពិសេសបើមាន ឬតម្លៃដើមទំនិញ
  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');
  var sp = (selectedModalProduct && specialPrices) ? specialPrices.find(s => s.customer_name === custName && s.product_name === selectedModalProduct.name) : null;
  var defaultPrice = sp ? parseFloat(sp.price) : (selectedModalProduct ? parseFloat(selectedModalProduct.price || 0) : 0);

  if (!inp) return defaultPrice;

  var rawVal = String(inp.value || '').trim();
  if (rawVal === '') {
    return defaultPrice;
  }

  if (currentModalCurrency === 'USD') {
    rawVal = rawVal.replace(',', '.');
    var num = parseFloat(rawVal);
    return isNaN(num) ? defaultPrice : num;
  } else {
    var clean = rawVal.replace(/[^0-9.]/g, '');
    var num = parseFloat(clean);
    return isNaN(num) ? defaultPrice : num;
  }
}

// 🛍️ ៤. បើកផ្ទាំង Modal រើសទំនិញ (ប្រអប់ ៣ រូបិយប័ណ្ណ មានតែលើ Admin និង Seller ប៉ុណ្ណោះ)
function openProductModal(id) {
  var p = allProducts.find(item => item.id === id);
  if (!p) return;
  selectedModalProduct = p;

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');
  var sp = specialPrices.find(s => s.customer_name === custName && s.product_name === p.name);
  var unitPrice = sp ? parseFloat(sp.price) : parseFloat(p.price || 0);

  var custObj = allCustomers.find(c => c.full_name === custName);
  var isMonthly = (custObj && custObj.type === 'Monthly');

  document.getElementById('modalProdImg').src = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
  document.getElementById('modalProdTitle').innerText = p.name;
  document.getElementById('modalStockStatusBadge').innerText = p.type || "ទំនិញ";
  
  var costHint = document.getElementById('modalOriginalCostHint');
  if (costHint) costHint.innerText = "(តម្លៃដើម: " + Number(unitPrice).toLocaleString() + " " + (p.currency || 'KHR') + ")";

  // កំណត់រូបិយប័ណ្ណតាមទំនិញ (លំនាំដើម KHR)
  setModalCurrency(p.currency || 'KHR');

  var priceInp = document.getElementById('modalPriceInput');
  var quickPayBtn = document.getElementById('btnModalQuickPay');
  var addToCartBtn = document.getElementById('btnModalAddToCart');
  var khrQuickRow = document.getElementById('modalKhrQuickButtonsRow');
  var khrHintText = document.getElementById('modalKhrHintText');

  // 🪙 ប្រអប់រើស ៣ រូបិយប័ណ្ណ (៛ រៀល / ฿ បាត / $ ដុល្លារ)
  var currTabsRow = document.getElementById('btnModalCurr_KHR') ? document.getElementById('btnModalCurr_KHR').parentElement : null;

  // 👑 ឆែកសិទ្ធិ៖ មានតែ Admin និង Seller ប៉ុណ្ណោះទើបជាអ្នកលក់
  var canEditPriceAndQuickPay = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Seller' || currentUser.role === 'Cashier'));

  // 🔒 លក្ខខណ្ឌច្បាស់លាស់៖ ប្រអប់ ៣ រូបិយប័ណ្ណ បង្ហាញតែលើ Admin និង Seller ប៉ុណ្ណោះ (បើជាម៉ូយ Reseller, Driver ឬភ្ញៀវ Monthly គឺលាក់ចោលស្វ័យប្រវត្តិ!)
  if (currTabsRow) {
    if (canEditPriceAndQuickPay && !isMonthly) {
      currTabsRow.classList.remove('hidden');
    } else {
      currTabsRow.classList.add('hidden');
    }
  }

  // 🏢 ១. បើជាអតិថិជនប្រចាំខែ (Monthly)៖ ចាក់សោរតម្លៃកុងត្រា មិនឱ្យកែតម្លៃ មិនឱ្យ Quick Pay និងមិនឱ្យប្តូរលុយឡើយ!
  if (isMonthly) {
    priceInp.readOnly = true;
    priceInp.value = unitPrice;
    priceInp.className = "w-full text-center text-xl font-black bg-amber-50 py-2.5 rounded-xl border-2 border-amber-300 text-amber-950 outline-none select-none pr-8";

    if (costHint) costHint.innerHTML = '<span class="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">🔒 តម្លៃកុងត្រាប្រចាំខែ (ចាក់សោរ)</span>';
    if (khrQuickRow) khrQuickRow.classList.add('hidden');
    if (khrHintText) khrHintText.classList.add('hidden');
    if (quickPayBtn) quickPayBtn.classList.add('hidden');
    if (addToCartBtn) addToCartBtn.className = "col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";

  // 👑 ២. បើជា Admin ឬ Seller (លក់នៅកន្លែង Walk-in)៖ អាចកែតម្លៃ អាច Quick Pay និងអាចប្តូរ ៣ រូបិយប័ណ្ណបាន
  } else if (canEditPriceAndQuickPay) {
    priceInp.readOnly = false;
    priceInp.value = unitPrice > 0 ? unitPrice : "";
    priceInp.placeholder = unitPrice > 0 ? unitPrice : "0";
    priceInp.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-blue-300 focus:border-blue-600 text-blue-950 outline-none pr-8";

    if (quickPayBtn) quickPayBtn.classList.remove('hidden');
    if (addToCartBtn) addToCartBtn.className = "py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";

  // 🚚 ៣. បើជាម៉ូយដកទឹក (Reseller) ឬកូនចៅមេ (Driver)៖ ចាក់សោរតម្លៃបោះដុំ មិនឱ្យកែតម្លៃ មិនឱ្យ Quick Pay និងលាក់ប្រអប់ប្តូរលុយចោល!
  } else {
    priceInp.readOnly = true;
    priceInp.value = unitPrice;
    priceInp.placeholder = unitPrice;
    priceInp.className = "w-full text-center text-xl font-black bg-slate-100 py-2.5 rounded-xl border border-slate-300 text-slate-700 outline-none select-none pointer-events-none pr-8";

    if (quickPayBtn) quickPayBtn.classList.add('hidden');
    if (khrQuickRow) khrQuickRow.classList.add('hidden');
    if (khrHintText) khrHintText.classList.add('hidden');
    if (addToCartBtn) addToCartBtn.className = "col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";
  }

  document.getElementById('modalQtyInput').value = 1;
  updateModalSubtotal();
  document.getElementById('productSelectModal').classList.remove('hidden');

  if (canEditPriceAndQuickPay && !isMonthly) {
    setTimeout(function() { priceInp.focus(); }, 150);
  }
}

// ❌ មុខងារបិទផ្ទាំង Modal រើសទំនិញ
function closeProductModal() {
  var modal = document.getElementById('productSelectModal');
  if (modal) modal.classList.add('hidden');
  selectedModalProduct = null;
}

function changeModalQty(delta) {
  var inp = document.getElementById('modalQtyInput');
  var val = (parseInt(inp.value) || 1) + delta;
  if (val < 1) val = 1;
  inp.value = val;
  updateModalSubtotal();
}

function updateModalSubtotal() {
  var q = parseFloat(document.getElementById('modalQtyInput') ? document.getElementById('modalQtyInput').value || 1 : 1);
  var p = getModalParsedPrice();
  var sub = q * p;
  var subEl = document.getElementById('modalSubtotalText');
  if (!subEl) return;

  if (currentModalCurrency === 'USD') {
    subEl.innerText = '$ ' + sub.toFixed(2) + ' USD';
  } else if (currentModalCurrency === 'THB') {
    subEl.innerText = '฿ ' + Math.round(sub).toLocaleString() + ' THB';
  } else {
    subEl.innerText = '៛ ' + Math.round(sub).toLocaleString() + ' KHR';
  }
}

// 🛒 ៥. បញ្ចូលកន្ត្រកធម្មតា
function confirmAddToCart() {
  if (!selectedModalProduct) return;
  var q = parseInt(document.getElementById('modalQtyInput').value) || 1;
  var pr = getModalParsedPrice();

  if (isNaN(q) || q <= 0) {
    showToast("សូមបញ្ចូលចំនួនឱ្យត្រឹមត្រូវ!", "error");
    return;
  }

  if (selectedModalProduct.type === 'ទិញគេ') {
    var inCartQty = cart.filter(i => i.id === selectedModalProduct.id).reduce((sum, i) => sum + i.qty, 0);
    var curStock = parseFloat(selectedModalProduct.stock || 0);
    var available = curStock - inCartQty;

    if (q > available) {
      showToast("មិនអាចបញ្ចូលបានទេ! សល់ត្រឹម " + Math.max(0, available) + " ក្នុងស្តុក!", "error");
      return;
    }
  }

  var prodName = selectedModalProduct.name;
  var prodId = selectedModalProduct.id;
  var curr = currentModalCurrency || "KHR";

  var rateU = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateT = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;
  var prKhr = pr;

  if (curr === 'USD') prKhr = Math.round(pr * rateU);
  else if (curr === 'THB') prKhr = Math.round(pr * rateT);

  var existingItem = cart.find(function(item) {
    return item.id === prodId && item.price === prKhr;
  });

  if (existingItem) {
    existingItem.qty += q;
  } else {
    cart.push({
      id: prodId,
      name: prodName,
      price: prKhr,
      qty: q,
      currency: 'KHR'
    });
  }

  closeProductModal();
  renderCart();
  showToast("បានបញ្ចូល [" + prodName + "] x " + q + " ក្នុងកន្ត្រក!", "success");
}

// ==========================================
// ⚡ ៦. មុខងារទូទាត់រហ័ស (QUICK CHECKOUT)
// ==========================================
async function quickCheckoutSingleItem() {
  var canQuickPay = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Seller' || currentUser.role === 'Cashier'));
  if (!canQuickPay) {
    showToast("អ្នកមិនមានសិទ្ធិប្រើប្រាស់មុខងារទូទាត់រហ័សនេះឡើយ!", "error");
    return;
  }

  if (!selectedModalProduct) return;
  var q = parseInt(document.getElementById('modalQtyInput') ? document.getElementById('modalQtyInput').value : 1) || 1;
  var pr = getModalParsedPrice();

  if (isNaN(q) || q <= 0) {
    showToast("សូមបញ្ចូលចំនួនឱ្យត្រឹមត្រូវ!", "error");
    return;
  }

  if (selectedModalProduct.type === 'ទិញគេ') {
    var curStock = parseFloat(selectedModalProduct.stock || 0);
    if (q > curStock) {
      showToast("មិនអាចទូទាត់បានទេ! សល់ត្រឹម " + curStock + " ក្នុងស្តុក!", "error");
      return;
    }
  }

  var curr = currentModalCurrency || "KHR";
  var prKhr = pr;
  var rateU = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateT = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  if (curr === 'USD') {
    prKhr = Math.round(pr * rateU);
  } else if (curr === 'THB') {
    prKhr = Math.round(pr * rateT);
  }

  cart = [{
    id: selectedModalProduct.id,
    name: selectedModalProduct.name,
    price: prKhr,
    qty: q,
    currency: "KHR"
  }];

  currentPosDiscount = { type: 'NONE', value: 0 };
  closeProductModal();
  renderCart();

  var calc = getCartCalculations();
  if (document.getElementById('pK')) {
    document.getElementById('pK').value = calc.finalTotal > 0 ? calc.finalTotal : "";
  }
  calcPOSChange();

  await confirmSale();
}

function getCartCalculations() {
  var rawTotal = cart.reduce((sum, i) => sum + (i.qty * i.price), 0);
  var discountK = 0;

  if (currentPosDiscount.type === 'PERCENT' && currentPosDiscount.value > 0) {
    discountK = Math.round((rawTotal * currentPosDiscount.value) / 100);
  } else if (currentPosDiscount.type === 'CASH' && currentPosDiscount.value > 0) {
    discountK = Math.min(rawTotal, currentPosDiscount.value);
  }

  var finalTotal = Math.max(0, rawTotal - discountK);
  return { rawTotal: rawTotal, discountK: discountK, finalTotal: finalTotal };
}
function rC() {
  var tbody = document.getElementById('cItemsTableBody');
  var totalValEl = document.getElementById('cTotalVal');
  var badge = document.getElementById('cartCountBadge');
  var previewLabel = document.getElementById('discountPreviewLabel');

  if (!tbody) return;
  if (cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">កន្ត្រកទទេ</td></tr>';
    if (totalValEl) totalValEl.innerText = "0 ៛";
    if (badge) badge.innerText = "0 មុខ";
    if (previewLabel) previewLabel.innerText = "";
    calcPOSChange();
    return;
  }

  var html = '';
  cart.forEach(function(i, idx) {
    var sub = i.qty * i.price;
    html += '<tr class="border-b hover:bg-gray-50">' +
      '<td class="p-2.5 font-bold text-gray-800">' + i.name + '</td>' +
      '<td class="p-2.5 text-center font-bold text-blue-700">' + i.qty + '</td>' +
      '<td class="p-2.5 text-right">' + Number(i.price).toLocaleString() + '</td>' +
      '<td class="p-2.5 text-right font-black text-green-700">' + Number(sub).toLocaleString() + ' ៛</td>' +
      '<td class="p-2.5 text-center"><button onclick="cart.splice(' + idx + ', 1); rC();" class="text-red-400 hover:text-red-600 p-1"><i class="fas fa-trash-can"></i></button></td>' +
    '</tr>';
  });

  tbody.innerHTML = html;
  badge.innerText = cart.length + " មុខ";

  var calc = getCartCalculations();
  if (previewLabel) {
    if (calc.discountK > 0) {
      previewLabel.innerText = "-៛ " + calc.discountK.toLocaleString();
    } else {
      previewLabel.innerText = "";
    }
  }

  totalValEl.innerText = Number(calc.finalTotal).toLocaleString() + " ៛";
  calcPOSChange();
}

function calcPOSChange() {
  var area = document.getElementById('posChangeArea');
  if (!area) return;
  var calc = getCartCalculations();
  var paid = parseFloat(document.getElementById('pK') ? document.getElementById('pK').value || 0 : 0);

  if (calc.finalTotal === 0 || paid === 0) { area.classList.add('hidden'); return; }
  var diff = paid - calc.finalTotal;

  if (diff > 0) {
    area.className = 'p-3 rounded-xl font-bold text-center border-2 bg-green-100 text-green-900 border-green-400';
    area.innerHTML = '<div class="text-[11px] uppercase text-green-700 font-bold mb-0.5">ប្រាក់អាប់ជូនភ្ញៀវវិញ</div><div class="text-lg font-black text-green-800">៛ ' + diff.toLocaleString() + '</div>';
    area.classList.remove('hidden');
  } else if (diff < 0) {
    area.className = 'p-3 rounded-xl font-bold text-center border-2 bg-orange-100 text-orange-900 border-orange-400';
    area.innerHTML = '<div class="text-[11px] uppercase text-orange-700 font-bold mb-0.5">ប្រាក់នៅខ្វះ</div><div class="text-lg font-black text-orange-800">៛ ' + Math.abs(diff).toLocaleString() + '</div>';
    area.classList.remove('hidden');
  } else {
    area.className = 'p-2.5 rounded-xl font-bold text-center border-2 bg-blue-100 text-blue-900 border-blue-300';
    area.innerHTML = '<i class="fas fa-check-circle text-blue-600 mr-1.5"></i> បង់លុយគ្រប់ចំនួន';
    area.classList.remove('hidden');
  }
}

function fillExactPOSPay() {
  var calc = getCartCalculations();
  if (document.getElementById('pK')) document.getElementById('pK').value = calc.finalTotal > 0 ? calc.finalTotal : "";
  calcPOSChange();
}

function setPOSQuickCash(amt) {
  if (document.getElementById('pK')) document.getElementById('pK').value = amt;
  calcPOSChange();
}

function setPosPaymentMethod(mode) {
  currentPosPayMethod = mode;
  var btnCash = document.getElementById('btnPosPayCash'), btnAba = document.getElementById('btnPosPayAba');
  if (mode === 'Cash') {
    if (btnCash) btnCash.className = "py-2 rounded-lg text-xs font-bold bg-green-700 text-white shadow";
    if (btnAba) btnAba.className = "py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200";
  } else {
    if (btnAba) btnAba.className = "py-2 rounded-lg text-xs font-bold bg-blue-700 text-white shadow";
    if (btnCash) btnCash.className = "py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200";
  }
}

function openPOSKHQR() {
  var calc = getCartCalculations();
  if (calc.finalTotal === 0) { showToast("សូមជ្រើសរើសទំនិញក្នុងកន្ត្រកជាមុនសិន!", "error"); return; }
  document.getElementById('posKhqrAmountText').innerText = "៛ " + calc.finalTotal.toLocaleString();
  document.getElementById('posKhqrModal').classList.remove('hidden');
}

function closePOSKHQR() { 
  document.getElementById('posKhqrModal').classList.add('hidden'); 
}

// 💾 ៤. រក្សាទុកការលក់ (SUBMIT SALE & ADMIN PROXY WITHDRAWAL)
var isSubmittingSaleLock = false;

async function confirmSale() {
  if (isSubmittingSaleLock) return;
  if (cart.length === 0) { showToast("កន្ត្រកទទេ! សូមរើសទំនិញជាមុនសិន", "error"); return; }

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');

  var isWalkIn = (!custName || custName === 'Walk-in');
  var isDebtWithdrawal = (!isWalkIn); // ប្រសិនបើរើសម៉ូយ គឺចាត់ទុកជាការដកទំនិញជំពាក់ជានិច្ច
  var isAdmin = (currentUser && currentUser.role === 'Admin');

  var calc = getCartCalculations();
  var paid = isDebtWithdrawal ? 0 : parseFloat(document.getElementById('pK') ? document.getElementById('pK').value || 0 : 0);
  
  // 🔒 បើដកជំនួសម៉ូយ គឺ status ស្មើ 'Unpaid' ជានិច្ច (ដើម្បីឱ្យលោតចូលគណនីម៉ូយភ្លាមៗ)
  var status = (isWalkIn && paid >= calc.finalTotal) ? 'Paid' : 'Unpaid';

  var tid = "TR-" + new Date().getTime();
  var btn = document.getElementById('sBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> កំពុងកត់ត្រា...';
  isSubmittingSaleLock = true;

  try {
    var rowsToInsert = [];
    var netPaidCollected = isDebtWithdrawal ? 0 : Math.min(paid, calc.finalTotal);
    var remainingPaidToDistribute = netPaidCollected;

    cart.forEach(function(item) {
      var itemTotal = item.qty * item.price;
      var allocatedPaid = 0;
      if (remainingPaidToDistribute > 0) {
        allocatedPaid = Math.min(remainingPaidToDistribute, itemTotal);
        remainingPaidToDistribute -= allocatedPaid;
      }

      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName, // ឈ្មោះម៉ូយត្រូវចំ ១០០%
        product_name: item.name,
        qty: item.qty,
        price: item.price,
        currency: "KHR",
        total: itemTotal,
        paid_khr: isDebtWithdrawal ? 0 : allocatedPaid,
        recorded_by: isDebtWithdrawal && isAdmin ? "Admin (ដកជំនួស)" : (currentUser.fullName || "Admin"),
        status: status,
        payment_method: isDebtWithdrawal ? 'Debt' : currentPosPayMethod
      });
    });

    if (calc.discountK > 0) {
      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName,
        product_name: "បញ្ចុះតម្លៃលើវិក្កយបត្រ (Discount)",
        qty: 1,
        price: -calc.discountK,
        currency: "KHR",
        total: -calc.discountK,
        paid_khr: 0,
        recorded_by: isDebtWithdrawal && isAdmin ? "Admin (ដកជំនួស)" : (currentUser.fullName || "Admin"),
        status: status,
        payment_method: isDebtWithdrawal ? 'Debt' : currentPosPayMethod
      });
    }

    const { error: insErr } = await supabaseClient.from('transactions').insert(rowsToInsert);
    if (insErr) throw insErr;

    // កាត់ស្តុកទំនិញទិញគេ
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var prodObj = allProducts.find(p => p.id === item.id);
      if (prodObj && prodObj.type === 'ទិញគេ') {
        var newStock = Math.max(0, parseFloat(prodObj.stock || 0) - item.qty);
        await supabaseClient.from('products').update({ stock: newStock }).eq('id', item.id);
        prodObj.stock = newStock;
      }
    }

    try {
      var itemSummary = cart.map(item => "  • " + item.name + " x " + item.qty + " = ៛ " + (item.qty * item.price).toLocaleString()).join("\n");
      var tgHeader = isDebtWithdrawal ? 
        ("💧 <b>[KC WATER - Admin ដកទំនិញជំនួសម៉ូយ]</b>") : 
        ("💧 <b>[KC WATER - លក់នៅកន្លែង POS]</b>");

      var tgMsg = tgHeader + "\n\n" +
                  "🆔 <b>កូដ៖</b> <code>" + tid + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "✍️ <b>អ្នកកត់ត្រា៖</b> " + (isDebtWithdrawal && isAdmin ? "Admin (ដកជំនួស)" : (currentUser.fullName || "Admin")) + "\n" +
                  "📦 <b>ទំនិញ៖</b>\n" + itemSummary + "\n" +
                  (calc.discountK > 0 ? "🏷️ <b>បញ្ចុះតម្លៃ៖</b> -៛ " + calc.discountK.toLocaleString() + "\n" : "") +
                  "💰 <b>សរុប៖</b> <b>៛ " + calc.finalTotal.toLocaleString() + "</b>\n" +
                  "📌 <b>ស្ថានភាព៖</b> <b>" + (status === 'Paid' ? 'ទូទាត់រួច' : 'ជំពាក់ (Unpaid)') + "</b>\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}

    generateReceiptImage(tid, custName, calc.finalTotal, (isDebtWithdrawal ? 0 : paid), cart, isDebtWithdrawal ? "ប័ណ្ណដកទំនិញ (WITHDRAWAL VOUCHER)" : "វិក្កយបត្រលក់ទំនិញ (RECEIPT)", calc.discountK);

    cart = [];
    currentPosDiscount = { type: 'NONE', value: 0 };
    rC();
    if (document.getElementById('pK')) document.getElementById('pK').value = "";
    calcPOSChange();

    showToast(isDebtWithdrawal ? "បានកត់ត្រាការដកទំនិញចូលបញ្ជីជំពាក់របស់ [" + custName + "] ជោគជ័យ!" : "បានកត់ត្រាការលក់ជោគជ័យ!", "success");
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

  } catch(err) {
    showToast("កំហុសកត់ត្រា៖ " + err.message, "error");
  } finally {
    isSubmittingSaleLock = false;
    btn.disabled = false;
    // កំណត់ប៊ូតុងឱ្យត្រូវតាមអតិថិជនដែលបានជ្រើសរើស
    if (isDebtWithdrawal) {
      btn.innerHTML = '<i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញជំនួស (កត់ចូលបញ្ជីជំពាក់ម៉ូយ)';
    } else {
      btn.innerHTML = 'រក្សាទុកការលក់ (Save Sale)';
    }
  }
}
// ==========================================
// 🧾 បង្កើតរូបវិក្កយបត្រ (RECEIPT GENERATOR)
// ==========================================
function generateReceiptImage(tid, cust, total, paid, items, titleText, discountAmount) {
  var dateStr = new Date().toLocaleString('km-KH');
  var change = Math.max(0, paid - total);
  discountAmount = parseFloat(discountAmount || 0);

  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isSeller = (currentUser && (currentUser.role === 'Seller' || currentUser.role === 'Cashier'));

  // កំណត់ស្ថានភាពលើវិក្កយបត្រឱ្យច្បាស់
  var isPaidComplete = (isAdmin && paid >= total && total > 0);
  var statusBadgeText = isPaidComplete ? 
    '<span style="color:#15803d; font-weight:bold;">ទូទាត់រួចរាល់ (បង់ប្រាក់គ្រប់)</span>' : 
    (isSeller ? '<span style="color:#d97706; font-weight:bold;">កត់ត្រាទុក (រង់ចាំ Admin ពិនិត្យ)</span>' : '<span style="color:#c2410c; font-weight:bold;">កត់ត្រាជំពាក់</span>');

  var itemsHtml = '';
  (items || []).forEach(function(i, idx) {
    var pName = i.name || i.product_name || "ទំនិញ";
    var pPrice = parseFloat(i.price || 0);
    var pQty = parseFloat(i.qty || 1);
    var tot = (pQty * pPrice);
    var currSymbol = (i.currency === 'USD') ? '$ ' : ((i.currency === 'THB') ? '฿ ' : '៛ ');

    itemsHtml += '<tr style="border-bottom:1px dashed #cbd5e1; font-size:10.5px;">' +
      '<td align="center" style="padding:6px 2px; color:#64748b;">' + (idx + 1) + '</td>' +
      '<td style="padding:6px 4px; font-weight:bold; color:#0f172a;">' + pName + '</td>' +
      '<td align="center" style="padding:6px 4px; font-weight:bold; color:#1d4ed8;">' + pQty + '</td>' +
      '<td align="right" style="padding:6px 4px; color:#475569;">' + Number(pPrice).toLocaleString() + '</td>' +
      '<td align="right" style="padding:6px 4px; font-weight:bold; color:#15803d;">' + currSymbol + Number(tot).toLocaleString() + '</td>' +
    '</tr>';
  });

  // 🚚 ១. ឆែកមើលថាតើជាកូនចៅដកទឹកជំនួសមេដែរឬទេ
  var isDriverWithdraw = (currentUser && currentUser.role === 'Driver' && currentUser.linkedBoss);
  var driverWithdrawLine = isDriverWithdraw ? 
    ('អ្នកមកដកផ្ទាល់៖ <b style="color:#b45309;">' + currentUser.fullName + ' (កូនចៅ/អ្នកដឹក)</b><br>') : '';

  // 📋 ២. ព័ត៌មានអតិថិជន & កាលបរិច្ឆេទ
  var custInfoHtml = '<div style="font-size:10.5px; line-height:1.7; margin-bottom:10px; color:#334155; background:#f8fafc; padding:8px 10px; border-radius:8px;">' +
    'លេខកូដវិក្កយបត្រ៖ <b style="color:#0f172a;">' + tid + '</b><br>' +
    'អតិថិជន / ម៉ូយ៖ <b style="color:#0f172a;">' + cust + '</b><br>' +
    driverWithdrawLine +
    'កាលបរិច្ឆេទ៖ ' + dateStr + '<br>' +
    'អ្នកកត់ត្រា៖ <b style="color:#0f172a;">' + (currentUser.fullName || "Admin") + '</b>' +
  '</div>';

  // 🧾 ៣. តួខ្លួនវិក្កយបត្រ (បានសម្អាតស្លាក table ស្ទួនរួចរាល់)
  var h = '<div id="pos-canvas-box" style="width:360px; padding:22px 18px; background:#ffffff; color:#0f172a; font-family:\'Battambang\', sans-serif; border-radius:16px;">' +
    // ក្បាលវិក្កយបត្រ
    '<div style="text-align:center; border-bottom:2px dashed #16a34a; padding-bottom:10px; margin-bottom:10px;">' +
      '<b style="font-size:17px; color:#15803d; letter-spacing:0.5px;">រោងចក្រទឹកបរិសុទ្ធ ខេ ស៊ី (KC WATER)</b><br>' +
      '<span style="font-size:10px; color:#64748b; font-weight:bold;">ទីតាំង៖ ក្រុងប៉ោយប៉ែត | ទូរស័ព្ទ៖ 077 934 748</span><br>' +
      '<div style="display:inline-block; margin-top:6px; padding:3px 12px; background:#f0fdf4; border:1px solid #86efac; border-radius:20px; font-size:11px; font-weight:bold; color:#166534;">' + 
        (titleText || 'វិក្កយបត្រលក់ទំនិញ (RECEIPT)') + 
      '</div>' +
    '</div>' +
    // ភ្ជាប់ព័ត៌មានអតិថិជនចូល
    custInfoHtml +
    // តារាងមុខទំនិញ (មានតែ <table> មួយត្រឹមត្រូវ)
    '<table style="width:100%; border-collapse:collapse; margin-bottom:10px;">' +
      '<thead>' +
        '<tr style="background:#f1f5f9; color:#475569; font-size:10px; border-bottom:1px solid #cbd5e1;">' +
          '<th align="center" style="padding:5px 2px; width:22px;">ល.រ</th>' +
          '<th align="left" style="padding:5px 4px;">មុខទំនិញ</th>' +
          '<th align="center" style="padding:5px 4px; width:35px;">ចំនួន</th>' +
          '<th align="right" style="padding:5px 4px; width:55px;">តម្លៃរាយ</th>' +
          '<th align="right" style="padding:5px 4px; width:65px;">តម្លៃសរុប</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + itemsHtml + '</tbody>' +
    '</table>' +

    // ប្រអប់សរុបប្រាក់ & ស្ថានភាព
    '<div style="background:#f0fdf4; padding:10px 12px; border-radius:10px; font-size:11px; line-height:1.8; border:1px solid #bbf7d0;">' +
      (discountAmount > 0 ? '<div style="display:flex; justify-content:space-between; color:#c2410c;"><span>បញ្ចុះតម្លៃ (Discount)៖</span><b>-៛ ' + discountAmount.toLocaleString() + '</b></div>' : '') +
      '<div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px; color:#0f172a; border-bottom:1px solid #bbf7d0; padding-bottom:4px; margin-bottom:4px;">' +
        '<span>សរុបទឹកប្រាក់ត្រូវបង់៖</span><b>៛ ' + total.toLocaleString() + '</b>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; color:#334155;"><span>ស្ថានភាពទូទាត់៖</span>' + statusBadgeText + '</div>' +
      (isPaidComplete ? 
        ('<div style="display:flex; justify-content:space-between; color:#1d4ed8;"><span>ប្រាក់បានទទួល៖</span><b>៛ ' + paid.toLocaleString() + '</b></div>' +
         (change > 0 ? '<div style="display:flex; justify-content:space-between; color:#15803d; font-weight:bold;"><span>ប្រាក់អាប់ជូនវិញ៖</span><b>៛ ' + change.toLocaleString() + '</b></div>' : '')) : 
        '') +
    '</div>' +

    // ពាក្យជូនពរខាងក្រោម
    '<div style="text-align:center; margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:8px;">' +
      '<b style="font-size:10px; color:#166534;">សូមអរគុណចំពោះការជាវទឹកបរិសុទ្ធ ខេ ស៊ី!</b><br>' +
      '<span style="font-size:9px; color:#64748b;">សូមអញ្ជើញមកម្តងទៀត 🙏</span>' +
    '</div>' +
  '</div>';

  var hiddenArea = document.getElementById('hidden_receipt_canvas');
  if (!hiddenArea) return;
  hiddenArea.innerHTML = h;

  html2canvas(document.getElementById('pos-canvas-box'), { scale: 3 }).then(function(canvas) {
    var imgUrl = canvas.toDataURL("image/png");
    document.getElementById('posModalReceiptImg').src = imgUrl;
    document.getElementById('posModalReceiptDownloadBtn').href = imgUrl;
    document.getElementById('posSaleReceiptModal').classList.remove('hidden');
  });
}
function closePOSReceiptModal() { 
  document.getElementById('posSaleReceiptModal').classList.add('hidden'); 
}

function sharePOSReceiptImage() {
  var img = document.getElementById('posModalReceiptImg');
  if (img && navigator.share) {
    fetch(img.src).then(r => r.blob()).then(blob => {
      navigator.share({ files: [new File([blob], 'Receipt.png', { type: 'image/png' })], title: 'វិក្កយបត្រ KC WATER' });
    });
  } else {
    document.getElementById('posModalReceiptDownloadBtn').click();
  }
}

// 🔄 Auto-Login បើមាន Remember Me
window.addEventListener('load', function() {
  var savedU = localStorage.getItem('kc_pos_user');
  var savedP = localStorage.getItem('kc_pos_pass');
  if (savedU && savedP) {
    document.getElementById('user').value = savedU;
    document.getElementById('pass').value = savedP;
    document.getElementById('rememberMe').checked = true;
    login();
  }
});
// 🔄 បង្កើតឈ្មោះស្តង់ដារពេញលេញ
var renderProductGrid = rPG;
var renderCart = rC;

// 📱 បិទ Sidebar ស្វ័យប្រវត្តិពេលចុចលើផ្ទៃខាងក្រៅ (ទាំងលើកុំព្យូទ័រ និងទូរស័ព្ទ)
document.addEventListener('click', function(e) {
  var sb = document.getElementById('sidebar');
  var toggleBtn = e.target.closest('[onclick="toggleSidebar()"]');
  if (!sb || sb.classList.contains('hidden-sidebar') || toggleBtn) return;
  if (!sb.contains(e.target)) {
    closeSidebar();
  }
});
