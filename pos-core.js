/** ==========================================================================
 *  KC WATER POS SYSTEM - CORE ENGINE (pos-core.js)
 *  (Authentication, Dashboard, Quick Restock, POS & Discount Engine)
 *  ========================================================================== */

var currentPosDiscount = { type: 'NONE', value: 0 };
var activeQuickRestockData = null;

// 🔗 Shortcut Aliases សម្រាប់ Render POS Grid & Cart (ការពារកុំឱ្យ ReferenceError)
var rPG = function() { if (typeof renderProductGrid === 'function') renderProductGrid(); };
var rC = function() { if (typeof renderCart === 'function') renderCart(); };

// 🔑 មុខងារចូលប្រើប្រាស់សុវត្ថិភាពខ្ពស់ (ផ្ទៀងផ្ទាត់ និងចងចាំឈ្មោះមេ ១០០% - ទប់ស្កាត់ Monthly ភ្លាមៗ)
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
    const { data, error } = await supabaseClient
      .rpc('verify_user_login', { p_username: u, p_password: p });

    if (error) throw error;

    // 🔍 ស្រង់យកទិន្នន័យគណនី (គាំទ្រទាំង Array និង Object ធានាស្គាល់ឈ្មោះ និង Role ១០០%)
    var userRow = Array.isArray(data) ? data[0] : data;

    if (userRow && userRow.id) {
      // 🔒 រារាំងអតិថិជនប្រចាំខែ (Monthly) ភ្លាមៗមុនពេលបើកប្រព័ន្ធ ឬទាញទិន្នន័យ!
      if (userRow.type === 'Monthly') {
        showToast("អតិថិជនប្រចាំខែ មិនអនុញ្ញាតឱ្យចូលប្រើប្រព័ន្ធឡើយ! Admin ជាអ្នកដកទំនិញជំនួស។", "error");
        if (remEl) remEl.checked = false;
        localStorage.removeItem('kc_pos_user');
        localStorage.removeItem('kc_pos_pass');
        userEl.value = '';
        passEl.value = '';
        return;
      }

      var bossName = (userRow.linked_boss || "").trim();

      // 🔍 ប្រសិនបើជាកូនចៅ ហើយ RPC មិនបានផ្ញើ linked_boss មក ➔ ទាញយកពីតារាង users ផ្ទាល់
      if ((userRow.role === 'Driver' || userRow.type === 'Driver') && !bossName) {
        try {
          const { data: uRow } = await supabaseClient
            .from('users')
            .select('linked_boss')
            .eq('id', userRow.id)
            .maybeSingle();
          if (uRow && uRow.linked_boss) {
            bossName = uRow.linked_boss.trim();
          }
        } catch(fe) {}
      }

      currentUser = {
        id: userRow.id,
        username: userRow.username,
        fullName: userRow.full_name,
        role: userRow.role,
        type: userRow.type,
        phone: userRow.phone,
        linkedBoss: bossName
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
                      (currentUser.role === 'Driver' ? ('អ្នកដឹក (កូនចៅ ' + (currentUser.linkedBoss || 'មេ') + ')៖ ') : 'ម៉ូយ៖ '));
      document.getElementById('userInfo').innerText = roleLabel + currentUser.fullName;

      renderSidebarMenu();
      if (typeof renderEnvironmentBanner === 'function') {
        renderEnvironmentBanner();
      }

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
  if (typeof renderEnvironmentBanner === 'function') {
    renderEnvironmentBanner();
    var oldFab = document.getElementById('floatingQuickSaleFab');
  if (oldFab) oldFab.remove();
  }
  showToast("បានចាកចេញពីប្រព័ន្ធ!", "info");
}

// 📱 បែងចែកម៉ឺនុយ SIDEBAR (កំណត់សិទ្ធិដាច់ដោយឡែក ១០០% - សម្អាតកូដស្ទួនរួចរាល់)
function renderSidebarMenu() {
  var sNav = document.getElementById('sidebarMenuContainer');
  if (!sNav) return;
  var html = '';

  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isCompanyDriver = (currentUser && currentUser.type === 'CompanyDriver');
  var isDriver = (currentUser && currentUser.role === 'Driver' && currentUser.type !== 'CompanyDriver');
  var isReseller = (currentUser && (currentUser.role === 'Customer' || currentUser.type === 'Regular') && currentUser.type !== 'Monthly' && currentUser.type !== 'CompanyDriver');

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

    // 🔄 ប៊ូតុងប្តូរ TEST vs PROD
    var nextEnv = (typeof CURRENT_ENV !== 'undefined' && CURRENT_ENV === 'TEST') ? 'PROD' : 'TEST';
    var envBtnClass = (typeof CURRENT_ENV !== 'undefined' && CURRENT_ENV === 'TEST') ? 'bg-amber-500 text-amber-950 font-black' : 'bg-emerald-800 text-green-200 font-bold';
    var envBtnText = (typeof CURRENT_ENV !== 'undefined' && CURRENT_ENV === 'TEST') ? '🧪 កំពុងនៅ៖ សាកល្បង (ចុចប្តូរ 🔄)' : '🏢 កំពុងនៅ៖ ប្រព័ន្ធពិត (ចុចប្តូរ 🔄)';
    html += '<div class="pt-2"><button type="button" onclick="switchAppEnvironment(\'' + nextEnv + '\')" class="w-full text-left p-3 rounded-xl transition flex items-center shadow-xs text-xs ' + envBtnClass + '"><i class="fas fa-database mr-3 w-5 text-center text-base"></i>' + envBtnText + '</button></div>';

  // 🛵 ២. សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver) -> មានតែបេសកកម្មដឹកទឹកប៉ុណ្ណោះ!
  } else if (isCompanyDriver) {
    html += '<div class="text-[10px] font-black text-emerald-300 uppercase px-3 pt-2 pb-1 opacity-90 tracking-wider">🛵 ការដឹកជញ្ជូន KC WATER</div>';
    html += '<button onclick="loadModule(\'CompanyDeliveries\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white bg-green-800/80 shadow-xs"><i class="fas fa-motorcycle mr-3 w-5 text-center text-emerald-300"></i>បេសកកម្មដឹកទឹកថ្ងៃនេះ</button>';

  // 🚚 ៣. សម្រាប់កូនចៅដកទឹកជំនួសមេ (Driver ធម្មតា)
  } else if (isDriver) {
    html += '<div class="text-[10px] font-bold text-amber-300 uppercase px-3 pt-2 pb-1 opacity-90 tracking-wider">ដកទឹកជំនួសមេ៖ ' + (currentUser.linkedBoss || '') + '</div>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-truck mr-3 w-5 text-center text-amber-300"></i>ផ្ទាំងដកទំនិញ</button>';

  // 🏢 ៤. សម្រាប់ម៉ូយបោះដុំ (Reseller)
  } else if (isReseller) {
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-2 pb-1 opacity-80 tracking-wider">គណនីម៉ូយប្រចាំ (អ្នកលក់បន្ត)</div>';
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

  // 🛡️ រារាំងអតិថិជនប្រចាំខែ (Monthly) មិនឱ្យចូលផ្ទាំងណាមួយឡើយ
  if (currentUser && currentUser.type === 'Monthly') {
    showToast("អតិថិជនប្រចាំខែ មិនអនុញ្ញាតឱ្យប្រើប្រាស់ប្រព័ន្ធឡើយ!", "error");
    logout();
    return;
  }

  // 💾 ចងចាំទំព័រដែលកំពុងបើក (បើមិនមែន POS) សម្រាប់ប៊ូតុងអណ្តែត ⚡ និង ↩️ ត្រឡប់មកវិញ
  if (name !== 'POS') {
    currentActiveModuleTracking = name;
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
  if (currentUser && currentUser.role === 'Admin') {
    if (!document.getElementById('floatingQuickSaleFab') && typeof initDraggableQuickSaleFab === 'function') {
      initDraggableQuickSaleFab();
    } else if (typeof updateFabButtonState === 'function') {
      updateFabButtonState();
    }
  }
}

// ==========================================
// 📊 ២. ផ្ទាំង DASHBOARD (ពេញអេក្រង់ PC + សមមាត្រលើទូរស័ព្ទ + អក្សរខ្លីស្អាត)
// ==========================================
async function renderDashboardModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  // 🖥️ ប្រើ w-full max-w-[1600px] ដើម្បីឱ្យពេញអេក្រង់កុំព្យូទ័រស្អាត និងមិនបែកលើទូរស័ព្ទ
  area.innerHTML = '<div class="w-full max-w-[1600px] mx-auto space-y-3.5 px-1 sm:px-2">' +
    // របារក្បាលទំព័រ Dashboard
    '<div class="bg-white p-3.5 sm:p-4 rounded-2xl border shadow-sm">' +
      '<h2 class="text-base sm:text-lg font-black text-green-900 flex items-center gap-2">' +
        '<i class="fas fa-chart-pie text-green-600"></i>ផ្ទាំងសង្ខេបអាជីវកម្ម KC WATER' +
      '</h2>' +
      '<p class="text-[11px] text-gray-500 mt-0.5">ទិដ្ឋភាពទូទៅនៃការលក់ សាច់ប្រាក់ ចំណាយ និងប្រាក់ចំណេញសុទ្ធ</p>' +
    '</div>' +

    // 📊 កាតស្ថិតិទាំង ៦ (រត់ ៦ ជួរលើ PC ធំ, ៣ ជួរលើ Laptop, និង ២ ជួរលើទូរស័ព្ទ)
    '<div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">' +
      '<div class="dash-card border-l-4 border-blue-500 p-3 sm:p-3.5 bg-white rounded-2xl">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase truncate">លក់បានថ្ងៃនេះ</div>' +
        '<div id="dashTodaySales" class="mt-1 font-black text-blue-800 text-sm sm:text-base">0 ៛</div>' +
      '</div>' +

      '<div class="dash-card border-l-4 border-green-600 p-3 sm:p-3.5 bg-white rounded-2xl space-y-0.5">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase flex justify-between items-center">' +
          '<span>ប្រមូលបាន</span>' +
          '<b id="dashTodayCashTotal" class="font-black text-green-800 text-xs sm:text-sm">0 ៛</b>' +
        '</div>' +
        '<div class="border-t border-green-100 pt-0.5 text-[10px] text-gray-600 flex justify-between">' +
          '<span>💵 លុយសុទ្ធ៖</span><b id="dashTodayCashInHand" class="text-gray-900">0 ៛</b>' +
        '</div>' +
        '<div class="text-[10px] text-blue-700 flex justify-between">' +
          '<span>📱 ចូល ABA៖</span><b id="dashTodayBankAba" class="text-blue-900">0 ៛</b>' +
        '</div>' +
      '</div>' +

      '<div class="dash-card border-l-4 border-red-500 p-3 sm:p-3.5 bg-white rounded-2xl cursor-pointer hover:bg-red-50/50 transition" onclick="loadModule(\'Settlement\')">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase flex justify-between items-center">' +
          '<span class="truncate">បំណុលជំពាក់សរុប</span><i class="fas fa-chevron-right text-[10px] text-red-400"></i>' +
        '</div>' +
        '<div id="dashTotalDebt" class="mt-1 font-black text-red-700 text-sm sm:text-base">0 ៛</div>' +
      '</div>' +

      '<div class="dash-card border-l-4 border-purple-600 p-3 sm:p-3.5 bg-white rounded-2xl">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase truncate">ចំណូលលក់ខែនេះ</div>' +
        '<div id="dashMonthSales" class="mt-1 font-black text-purple-800 text-sm sm:text-base">0 ៛</div>' +
      '</div>' +

      // 🌟 កាតចំណាយសរុបខែនេះ (ធ្លាក់ជា ២-៣ ជួរស្អាត លែងដាច់អក្សរ)
      '<div class="dash-card border-l-4 border-orange-500 p-3 sm:p-3.5 bg-white rounded-2xl space-y-0.5">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase truncate">ចំណាយសរុបខែនេះ</div>' +
        '<div id="dashMonthExpenses" class="mt-1 font-black text-orange-700 text-sm sm:text-base">0 ៛</div>' +
        '<div id="dashMonthExpDetail" class="border-t border-orange-100 pt-0.5 space-y-0.5 text-[9.5px]"></div>' +
      '</div>' +

      // 🌟 កាតប្រាក់ចំណេញសុទ្ធ
      '<div class="dash-card border-l-4 border-emerald-600 p-3 sm:p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200">' +
        '<div class="text-emerald-900 text-[10px] sm:text-xs font-black uppercase truncate">ចំណេញសុទ្ធខែនេះ</div>' +
        '<div id="dashNetProfit" class="mt-1 font-black text-emerald-800 text-sm sm:text-base">0 ៛</div>' +
        '<div id="dashExchangeRateHint" class="text-[9.5px] text-gray-500 font-bold mt-0.5 truncate"></div>' +
      '</div>' +
    '</div>' +

    // 📦 ជួរកណ្តាល៖ ចំនួនលក់ថ្ងៃនេះ & ស្តុកក្នុងឃ្លាំង
    '<div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5">' +
      '<div class="card p-4 sm:p-5 border-t-4 border-blue-600 shadow-md mb-0 bg-white">' +
        '<h3 class="font-bold text-gray-800 text-xs sm:text-sm mb-2.5 flex items-center gap-2">' +
          '<i class="fas fa-boxes text-blue-600"></i>ចំនួនទឹក/ទំនិញដកលក់ថ្ងៃនេះ' +
        '</h3>' +
        '<div id="dashProductQtyArea" class="space-y-1.5 text-xs max-h-72 overflow-y-auto pr-1">កំពុងគណនា...</div>' +
      '</div>' +

      '<div class="card p-4 sm:p-5 border-t-4 border-orange-500 shadow-md mb-0 bg-white">' +
        '<div class="flex justify-between items-center mb-2.5">' +
          '<h3 class="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-1.5">' +
            '<i class="fas fa-boxes-stacked text-orange-500"></i> ស្តុកទំនិញក្នុងឃ្លាំង & ដំណឹងជិតអស់' +
          '</h3>' +
          '<button onclick="loadModule(\'StockRep\')" class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[10px] sm:text-xs font-bold border border-orange-200 active:scale-95 transition flex items-center gap-1 shadow-2xs">' +
            '<i class="fas fa-arrow-up-right-from-square text-[9px]"></i> របាយការណ៍ស្តុក' +
          '</button>' +
        '</div>' +
        '<div id="dashStockAlertArea" class="space-y-1.5 text-xs max-h-72 overflow-y-auto pr-1">កំពុងឆែកមើលស្តុក...</div>' +
      '</div>' +
    '</div>' +

    // 📋 ជួរក្រោម៖ តារាងប្រតិបត្តិការដកទំនិញថ្ងៃនេះ
    '<div class="card p-4 sm:p-5 border-t-4 border-gray-700 shadow-md mb-0 bg-white">' +
      '<div class="flex justify-between items-center mb-2.5">' +
        '<h3 class="font-extrabold text-gray-800 text-xs sm:text-sm flex items-center gap-2">' +
          '<i class="fas fa-clock-rotate-left text-blue-600"></i> ប្រតិបត្តិការដកទំនិញថ្ងៃនេះ (ពេញមួយថ្ងៃ)' +
        '</h3>' +
        '<span id="dashRecentCountBadge" class="bg-blue-100 text-blue-800 text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold">0 លើក</span>' +
      '</div>' +
      '<div class="overflow-x-auto max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 shadow-inner">' +
        '<table class="w-full text-left text-xs border-collapse">' +
          '<thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-2xs">' +
            '<tr>' +
              '<th class="p-2 sm:p-2.5 text-center w-14">ម៉ោង</th>' +
              '<th class="p-2 sm:p-2.5">អតិថិជន</th>' +
              '<th class="p-2 sm:p-2.5">ទំនិញ</th>' +
              '<th class="p-2 sm:p-2.5 text-center">ចំនួន</th>' +
              '<th class="p-2 sm:p-2.5 text-right">សរុប</th>' +
              '<th class="p-2 sm:p-2.5 text-center">ស្ថានភាព</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="dashRecentTbody">' +
            '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
  '</div>';

  await loadDashboardData();
}

// ==========================================
// 📊 មុខងារទាញទិន្នន័យ DASHBOARD
// ==========================================
async function loadDashboardData() {
  try {
    var todayStr = getCambodiaToday();
    var firstDayMonthStr = todayStr.substring(0, 7) + '-01';

    var monthQueryStart = firstDayMonthStr + 'T00:00:00+07:00';
    var todayQueryStart = todayStr + 'T00:00:00+07:00';

    const [
      { data: monthTrans },
      { data: todaySettles },
      { data: monthExpenses },
      { data: unpaids },
      { data: allSettleBalances }
    ] = await Promise.all([
      supabaseClient.from('transactions').select('*').gte('created_at', monthQueryStart).order('created_at', { ascending: false }),
      supabaseClient.from('settlements').select('*').gte('settled_at', todayQueryStart),
      supabaseClient.from('expenses').select('*').gte('created_at', monthQueryStart),
      supabaseClient.from('transactions').select('total').eq('status', 'Unpaid'),
      supabaseClient.from('settlements').select('id, customer_name, balance_khr').order('id', { ascending: false })
    ]);

    var todaySalesKHR = 0, todayCashInHand = 0, todayBankAba = 0, monthSalesKHR = 0, monthCOGS = 0;
    var todayProdQty = {}, todayRecentSales = [];

    (monthTrans || []).forEach(function(t) {
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
        monthCOGS += (qty * itemCostKHR); // ថ្លៃដើមទំនិញលក់ដាច់ (COGS)
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
    var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
    var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

    // គណនាការចំណាយ
    var monthOperatingExpKHR = 0;
    var monthDepotSettlementsKHR = 0;

    (monthExpenses || []).forEach(function(e) {
      var amt = parseFloat(e.amount || 0);
      var amtKhr = amt;
      if (e.currency === 'USD') amtKhr = amt * rateUSD;
      else if (e.currency === 'THB') amtKhr = amt * rateTHB;

      if (e.category === 'ទូទាត់ថ្លៃដើមដេប៉ូដៃគូ') {
        monthDepotSettlementsKHR += amtKhr;
      } else {
        monthOperatingExpKHR += amtKhr;
      }
    });

    // ចំណាយសរុប = ចំណាយប្រតិបត្តិការ + ថ្លៃដើមទំនិញលក់ដាច់ (COGS)
    var totalMonthExpensesKHR = monthOperatingExpKHR + monthCOGS;
    var netProfitKHR = monthSalesKHR - totalMonthExpensesKHR;

    var totalDebtKHR = 0;
    (unpaids || []).forEach(u => { totalDebtKHR += parseFloat(u.total || 0); });

    var latestSettleSeen = {};
    (allSettleBalances || []).forEach(function(s) {
      var cName = (s.customer_name || "").trim();
      if (cName && cName !== "Walk-in" && !latestSettleSeen[cName]) {
        latestSettleSeen[cName] = true;
        var oldBal = parseFloat(s.balance_khr || 0);
        if (oldBal > 0) totalDebtKHR += oldBal;
      }
    });

    if (document.getElementById('dashTodaySales')) document.getElementById('dashTodaySales').innerText = '៛ ' + todaySalesKHR.toLocaleString();
    if (document.getElementById('dashTodayCashTotal')) document.getElementById('dashTodayCashTotal').innerText = '៛ ' + todayTotalCash.toLocaleString();
    if (document.getElementById('dashTodayCashInHand')) document.getElementById('dashTodayCashInHand').innerText = '៛ ' + todayCashInHand.toLocaleString();
    if (document.getElementById('dashTodayBankAba')) document.getElementById('dashTodayBankAba').innerText = '៛ ' + todayBankAba.toLocaleString();
    if (document.getElementById('dashTotalDebt')) document.getElementById('dashTotalDebt').innerText = '៛ ' + totalDebtKHR.toLocaleString();
    if (document.getElementById('dashMonthSales')) document.getElementById('dashMonthSales').innerText = '៛ ' + monthSalesKHR.toLocaleString();
    if (document.getElementById('dashMonthExpenses')) document.getElementById('dashMonthExpenses').innerText = '៛ ' + Math.round(totalMonthExpensesKHR).toLocaleString();
    
    // 🌟 បង្ហាញព័ត៌មានលម្អិតនៃចំណាយជា ២-៣ ជួរស្អាត (លែងដាច់អក្សរ ១០០%)
    var expDetailEl = document.getElementById('dashMonthExpDetail');
    if (expDetailEl) {
      var dHtml = '<div class="text-slate-500 flex justify-between"><span>🛠️ ប្រតិបត្តិការ៖</span><b class="text-slate-800">៛ ' + Math.round(monthOperatingExpKHR).toLocaleString() + '</b></div>';
      if (monthCOGS > 0) {
        dHtml += '<div class="text-amber-800 flex justify-between"><span>📦 ថ្លៃដើមទឹកយួរ៖</span><b class="text-amber-950">៛ ' + Math.round(monthCOGS).toLocaleString() + '</b></div>';
      }
      if (monthDepotSettlementsKHR > 0) {
        dHtml += '<div class="text-rose-700 flex justify-between"><span>🏬 សងដេប៉ូ៖</span><b class="text-rose-900">៛ ' + Math.round(monthDepotSettlementsKHR).toLocaleString() + '</b></div>';
      }
      expDetailEl.innerHTML = dHtml;
    }

    // 🌟 បង្ហាញប្រាក់ចំណេញសុទ្ធ
    var netEl = document.getElementById('dashNetProfit');
    var hintEl = document.getElementById('dashExchangeRateHint');
    if (netEl) {
      var isPositive = netProfitKHR >= 0;
      netEl.innerText = (isPositive ? '+ ៛ ' : '- ៛ ') + Math.abs(Math.round(netProfitKHR)).toLocaleString();
      netEl.className = 'mt-1 font-black text-sm sm:text-base ' + (isPositive ? 'text-emerald-700' : 'text-red-600');
    }
    if (hintEl) {
      hintEl.innerText = 'គិតតាម $1=' + rateUSD.toLocaleString() + '៛ | 1฿=' + rateTHB.toLocaleString() + '៛';
    }

    var pqArea = document.getElementById('dashProductQtyArea');
    if (pqArea) {
      var pqHtml = "";
      for (var p in todayProdQty) {
        pqHtml += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded-xl border border-gray-100"><span class="font-bold text-gray-800">' + p + '</span><span class="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-black rounded-lg text-xs">' + todayProdQty[p] + '</span></div>';
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

          saHtml += '<div class="flex justify-between items-center p-2 rounded-xl border ' + (isZero ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') + ' mb-1.5">' +
            '<div>' +
              '<b class="' + (isZero ? 'text-red-900' : 'text-orange-900') + '">' + prod.name + '</b>' +
              '<div class="text-[9.5px] text-gray-400 font-bold">កម្រិតកំណត់៖ ' + (prod.min_stock || 5) + ' ' + unitLabel + '</div>' +
            '</div>' +
            '<div class="flex items-center gap-1.5">' +
              '<span class="px-2 py-0.5 font-black rounded-lg text-xs ' + (isZero ? 'bg-red-600 text-white' : 'bg-orange-500 text-white') + '">' +
                (isZero ? 'អស់ (០)' : 'សល់ ' + prod.stock + ' ' + unitLabel) +
              '</span>' +
              '<button type="button" onclick="openQuickRestockModal(\'' + prod.id + '\', \'' + prod.name.replace(/'/g, "\\'") + '\', ' + (prod.cost || 0) + ')" class="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black shadow-2xs active:scale-95 transition flex items-center gap-1">' +
                '<i class="fas fa-plus"></i> បញ្ចូល' +
              '</button>' +
            '</div>' +
          '</div>';
        });
      } else {
        saHtml += '<div class="p-2 bg-green-50 text-green-800 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-1.5 border border-green-200 mb-2">' +
          '<i class="fas fa-check-circle text-green-600"></i> ស្តុកទំនិញទិញចូលទាំងអស់មានសុវត្ថិភាពល្អ' +
        '</div>';
      }

      if (resaleItems.length > 0) {
        saHtml += '<div class="pt-1 space-y-1">';
        resaleItems.forEach(function(r) {
          var uLabel = (r.name.indexOf("យួរ") !== -1) ? "យួរ" : ((r.name.indexOf("ធុង") !== -1) ? "ធុង" : "ឯកតា");
          var isLowNow = parseFloat(r.stock || 0) <= parseFloat(r.min_stock || 5);

          saHtml += '<div class="flex justify-between items-center p-1.5 px-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 text-xs">' +
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
          var timeStr = new Date(r.created_at).toLocaleTimeString('km-KH', { 
            timeZone: 'Asia/Phnom_Penh', 
            hour: '2-digit', 
            minute: '2-digit' 
          });

          var recByClean = String(r.recorded_by || '').replace(/\s*\(.*?\)/g, '').trim();
          var isWithdrawnByOther = (recByClean && recByClean !== r.customer_name && recByClean !== 'Admin');
          var isAdminProxy = (r.recorded_by && r.recorded_by.includes('Admin') && r.customer_name !== 'Walk-in');

          var withdrawTag = '';
          if (isWithdrawnByOther) {
            withdrawTag = '<br><span class="text-[9px] text-amber-950 font-bold bg-amber-100 border border-amber-300 px-1 py-0.2 rounded inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[8px] text-amber-600"></i>ជំនួស: ' + recByClean + '</span>';
          } else if (isAdminProxy) {
            withdrawTag = '<br><span class="text-[9px] text-blue-900 font-bold bg-blue-50 border border-blue-200 px-1 py-0.2 rounded inline-flex items-center gap-1 mt-0.5"><i class="fas fa-user-pen text-[8px] text-blue-500"></i>Admin កត់ជំនួស</span>';
          }

          rHtml += '<tr class="border-b hover:bg-gray-50">' +
         '<td class="p-2 text-center text-gray-500 whitespace-nowrap text-[10px]">' + timeStr + '</td>' +
         '<td class="p-2 font-bold text-gray-800">' + r.customer_name + withdrawTag + '</td>' +
         '<td class="p-2">' + r.product_name + '</td>' +
         '<td class="p-2 text-center font-bold text-blue-700">' + r.qty + '</td>' +
         '<td class="p-2 text-right font-black text-green-700 whitespace-nowrap">៛ ' + Number(r.total).toLocaleString() + '</td>' +
         '<td class="p-2 text-center whitespace-nowrap">' +
           '<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold ' + (r.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800 border border-orange-200') + '">' + (r.status === 'Paid' ? 'បង់រួច' : 'ជំពាក់') + '</span>' +
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
  var prod = (allProducts || []).find(function(p) { return p.id === prodId; });
  var curr = prod ? (prod.currency || 'KHR').toUpperCase() : 'KHR';
  activeQuickRestockData = { id: prodId, name: prodName, cost: currentCost, currency: curr };

  var titleEl = document.getElementById('qrProdTitle');
  var qtyInp = document.getElementById('qrQtyInput');
  var costInp = document.getElementById('qrCostInput');
  var hintEl = document.getElementById('qrCurrentCostHint');
  var modal = document.getElementById('quickRestockModal');

  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  function formatQuickCostHint(val) {
    var num = parseFloat(val || 0);
    if (num <= 0) return '-';
    if (curr === 'USD') return '$ ' + num.toFixed(2) + ' (≈ ៛ ' + Math.round(num * rateUSD).toLocaleString() + ')';
    if (curr === 'THB') return '฿ ' + num.toLocaleString() + ' (≈ ៛ ' + Math.round(num * rateTHB).toLocaleString() + ')';
    return '៛ ' + num.toLocaleString();
  }

  if (titleEl) titleEl.innerText = "ទំនិញ៖ [" + prodName + "] (" + curr + ")";
  if (qtyInp) { qtyInp.value = "50"; setTimeout(function() { qtyInp.focus(); qtyInp.select(); }, 150); }
  if (costInp) {
    costInp.value = currentCost > 0 ? currentCost : "";
    costInp.placeholder = "វាយថ្លៃដើមថ្មី (" + curr + ")";
    costInp.oninput = function() {
      var v = parseFloat(this.value || 0);
      if (hintEl) {
        hintEl.innerText = v > 0
          ? "👉 ថ្លៃដើមថ្មីលើកនេះ៖ " + formatQuickCostHint(v)
          : "*ថ្លៃដើមបច្ចុប្បន្ន៖ " + formatQuickCostHint(currentCost) + " [" + curr + "]";
      }
    };
  }
  if (hintEl) hintEl.innerText = "*ថ្លៃដើមបច្ចុប្បន្ន៖ " + formatQuickCostHint(currentCost) + " [" + curr + "]";

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
  var curr = (activeQuickRestockData.currency || 'KHR').toUpperCase();
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
      var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
      var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;
      var costTgDisplay = '';
      if (newCost > 0) {
        if (curr === 'USD') costTgDisplay = "$ " + newCost.toFixed(2) + " (≈ ៛ " + Math.round(newCost * rateUSD).toLocaleString() + ")";
        else if (curr === 'THB') costTgDisplay = "฿ " + newCost.toLocaleString() + " (≈ ៛ " + Math.round(newCost * rateTHB).toLocaleString() + ")";
        else costTgDisplay = "៛ " + newCost.toLocaleString();
      }
      var tgMsg = "📦 <b>[KC WATER - បញ្ចូលស្តុកថ្មី (Dashboard)]</b>\n\n" +
                  "• ទំនិញ៖ <b>" + prodName + "</b>\n" +
                  "• ចំនួនទិញចូល៖ <b>+" + q + "</b>\n" +
                  (costTgDisplay ? "• ថ្លៃដើមថ្មី៖ <b>" + costTgDisplay + "</b>\n" : "") +
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
// 🛒 ៣. ផ្ទាំងលក់ POS (ពេញអេក្រង់ PC + ៥-៦ ជួរទំនិញ + សមមាត្រលើទូរស័ព្ទ)
// ==========================================
var currentPosSearchKeyword = '';
function renderPOSModule() {
  // 🛡️ រារាំងអ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver) ដាច់ខាត ១០០%
  if (currentUser && currentUser.type === 'CompanyDriver') {
    if (typeof kcAlert === 'function') {
      kcAlert({
        title: "គ្មានសិទ្ធិប្រើប្រាស់!",
        message: "អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដក ឬលក់ទំនិញក្នុង POS ឡើយ! លោកអ្នកត្រូវបានបញ្ជូនទៅផ្ទាំងដឹកទឹកវិញ។",
        type: "danger"
      });
    } else {
      showToast("អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដកទំនិញឡើយ!", "error");
    }
    loadModule('CompanyDeliveries');
    return;
  }
  
  var area = document.getElementById('contentArea');
  if (!area) return;

  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isSeller = (currentUser && (currentUser.role === 'Seller' || currentUser.role === 'Cashier'));
  var isDriver = (currentUser && currentUser.role === 'Driver' && currentUser.type === 'Driver');
  var isReseller = (!isAdmin && !isSeller && !isDriver);

  var customerHeaderHTML = '';

  if (isAdmin) {
    var custOptions = '<option value="Walk-in">🛒 -- លក់នៅកន្លែង (Walk-in) --</option>';
    allCustomers.forEach(function(c) {
      var isDriverMember = (c.role === 'Driver' || c.type === 'Driver' || c.type === 'CompanyDriver');
      if (c.role !== 'Admin' && c.full_name !== 'Walk-in' && !isDriverMember) {
        custOptions += '<option value="' + c.full_name + '">' + c.full_name + ' (' + (c.type === 'Monthly' ? 'ប្រចាំខែ' : 'អ្នកលក់បន្ត') + ')</option>';
      }
    });

    customerHeaderHTML = '<div class="card border-l-4 border-blue-500 p-3 sm:p-3.5 shadow-sm mb-3 bg-white">' +
      '<div>' +
        '<label class="text-[11px] font-bold text-gray-500 block mb-1"><i class="fas fa-user-tag text-blue-600 mr-1.5"></i>ជ្រើសរើសអតិថិជន / ម៉ូយ (ឬលក់នៅកន្លែង Walk-in)</label>' +
        '<select id="posCustSelect" onchange="onAdminPosCustomerChange(this.value)" class="w-full font-bold text-gray-800 border-2 border-blue-200 focus:border-blue-600 rounded-xl p-2.5 bg-white outline-none text-xs sm:text-sm shadow-2xs">' + custOptions + '</select>' +
      '</div>' +
    '</div>' +
    '<div id="adminProxyModeNotice" class="hidden p-2.5 bg-blue-50 border-2 border-blue-400 rounded-2xl mb-3 text-xs font-bold text-blue-950 flex items-center justify-between shadow-2xs animate-in zoom-in duration-200">' +
      '<span class="flex items-center gap-2"><i class="fas fa-truck-ramp-box text-blue-600 text-base"></i> របៀបដកទំនិញជំនួស៖ <b id="adminProxyCustName" class="text-blue-900 text-sm"></b></span>' +
      '<span class="px-2.5 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-black">ជំពាក់ (Unpaid)</span>' +
    '</div>';

  } else if (isReseller) {
    customerHeaderHTML = '<div class="card border-l-4 border-green-600 bg-green-50 p-3 sm:p-3.5 mb-3 flex justify-between items-center">' +
      '<div>' +
        '<span class="text-[10px] text-green-700 font-bold uppercase tracking-wider block">គណនីអ្នកដកទំនិញ (Reseller)</span>' +
        '<b class="text-green-900 text-xs sm:text-base"><i class="fas fa-user mr-1.5"></i>អ្នកដកទំនិញ៖ ' + currentUser.fullName + '</b>' +
        '<input type="hidden" id="posCustSelect" value="' + currentUser.fullName + '">' +
      '</div>' +
    '</div>';

  } else if (isDriver) {
    customerHeaderHTML = '<div class="card border-l-4 border-amber-500 bg-amber-50 p-3 sm:p-3.5 mb-3 flex justify-between items-center">' +
      '<div>' +
        '<span class="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">កូនចៅដកទឹកជំនួសមេ៖ ' + (currentUser.linkedBoss || '') + '</span>' +
        '<b class="text-amber-950 text-xs sm:text-base"><i class="fas fa-truck mr-1.5"></i>អ្នកមកដកផ្ទាល់៖ ' + currentUser.fullName + '</b>' +
        '<input type="hidden" id="posCustSelect" value="' + (currentUser.linkedBoss || '') + '">' +
      '</div>' +
    '</div>';

  } else {
    customerHeaderHTML = '<div class="card border-l-4 border-blue-600 bg-blue-50 p-3 mb-3 flex justify-between items-center">' +
      '<b class="text-blue-900 text-xs sm:text-sm"><i class="fas fa-store mr-1.5"></i>លក់នៅកន្លែង (Walk-in)</b>' +
      '<input type="hidden" id="posCustSelect" value="Walk-in">' +
    '</div>';
  }
  
  // ផ្នែក Discount
  var discountSectionHTML = '';
  if (isAdmin) {
    discountSectionHTML = '<div class="bg-yellow-50/70 p-2.5 sm:p-3 rounded-xl border border-yellow-200 mb-3 space-y-1.5">' +
      '<div class="flex justify-between items-center">' +
        '<span class="text-xs font-bold text-yellow-900 flex items-center gap-1"><i class="fas fa-tags text-yellow-600"></i> បញ្ចុះតម្លៃ (Discount)</span>' +
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
    paymentSectionHTML = '<div id="posPaymentSectionWrapper"><div class="bg-blue-50/60 p-3 sm:p-4 rounded-2xl border border-blue-200 space-y-2.5 mt-3">' +
      '<div class="flex justify-between items-center"><span class="text-xs font-bold text-blue-900 uppercase tracking-wider"><i class="fas fa-coins text-blue-600 mr-1.5"></i>ទូទាត់ប្រាក់នៅកន្លែង</span><button onclick="fillExactPOSPay()" class="px-3 py-1 bg-white hover:bg-blue-100 text-blue-700 text-xs font-extrabold rounded-lg border border-blue-300 shadow-2xs active:scale-95 transition">លុយគ្រប់</button></div>' +
      '<div class="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border">' +
        '<button type="button" id="btnPosPayCash" onclick="setPosPaymentMethod(\'Cash\')" class="py-2 rounded-lg text-xs font-bold bg-green-700 text-white shadow"><i class="fas fa-money-bill-wave"></i> 💵 លុយសុទ្ធ</button>' +
        '<button type="button" id="btnPosPayAba" onclick="setPosPaymentMethod(\'ABA\')" class="py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fas fa-qrcode"></i> 📱 ស្កេន ABA</button>' +
      '</div>' +
      '<div class="space-y-1"><label class="text-[10px] font-bold text-gray-500 uppercase">ប្រាក់រៀលទទួល (៛)</label><input type="number" id="pK" oninput="calcPOSChange()" placeholder="0" class="text-center font-black text-xl text-blue-900 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-600 p-2.5 w-full outline-none"></div>' +
      '<div class="flex gap-1.5 pt-0.5 text-xs">' +
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
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-3 py-3.5 sm:py-4 text-sm sm:text-base flex items-center justify-center w-full font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"><i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញ (កត់ចូលបញ្ជីជំពាក់)</button>';
  } else if (isSeller) {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-3 py-3.5 text-sm sm:text-base flex items-center justify-center w-full font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-2xl"><i class="fas fa-file-pen mr-2 text-lg"></i>កត់ត្រាការលក់</button>';
  } else {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-3 py-3.5 text-sm sm:text-base flex items-center justify-center w-full font-bold">រក្សាទុកការលក់ (Save Sale)</button>';
  }

  // 🖥️ ពេញផ្ទៃអេក្រង់កុំព្យូទ័រ w-full max-w-[1600px] + ក្រឡាចត្រង្គទំនិញ ៥-៦ ជួរលើ PC
  area.innerHTML = '<div class="w-full max-w-[1600px] mx-auto space-y-3.5 px-1 sm:px-2">' +
    customerHeaderHTML +

    // 🏷️ ប៊ូតុងប្រភេទ ៤
    '<div class="flex flex-wrap gap-1.5 pb-0.5">' +
      '<button onclick="setPosCategoryFilter(\'ALL\')" id="catTab_ALL" class="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-green-700 text-white shadow-md active:scale-95 transition"><i class="fas fa-border-all mr-1"></i> ទាំងអស់</button>' +
      '<button onclick="setPosCategoryFilter(\'BARREL\')" id="catTab_BARREL" class="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-wine-bottle text-blue-600 mr-1"></i> ទឹកធុង ២០L</button>' +
      '<button onclick="setPosCategoryFilter(\'PACK\')" id="catTab_PACK" class="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-box-open text-amber-600 mr-1"></i> ទឹកយួរ/ដប</button>' +
      '<button onclick="setPosCategoryFilter(\'GENERAL\')" id="catTab_GENERAL" class="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-boxes-stacked text-emerald-600 mr-1"></i> ទំនិញទូទៅ/គ្រឿងទេស</button>' +
    '</div>' +

    // 🔍 ប្រអប់ស្វែងរក
    '<div class="relative">' +
      '<input type="text" id="posProductSearchInp" oninput="onPosSearchInput(this.value)" placeholder="🔍 វាយឈ្មោះទំនិញដើម្បីស្វែងរក (ឧ៖ ក្រដាស, អង្ករ, 500ml, ធុងស)..." class="w-full border-2 border-gray-200 focus:border-green-600 rounded-2xl p-2.5 pl-9 font-bold text-xs outline-none bg-white shadow-2xs">' +
      '<i class="fas fa-search absolute left-3 top-3.5 text-gray-400 text-xs pointer-events-none"></i>' +
    '</div>' +

    // 🖼️ ក្រឡាចត្រង្គទំនិញ (៦ ជួរលើ PC ធំ, ៤-៥ ជួរលើ Laptop, ២-៣ ជួរលើទូរស័ព្ទ)
    '<div id="pGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 pt-0.5"></div>' +

    // 🛒 កន្ត្រកទំនិញខាងក្រោម
    '<div class="card border-t-4 border-green-600 shadow-xl p-3.5 sm:p-5 bg-white">' +
      '<div class="flex justify-between items-center mb-2.5">' +
        '<h3 class="font-extrabold text-gray-800 text-xs sm:text-base flex items-center"><i class="fas fa-shopping-cart mr-1.5 text-green-600"></i>បញ្ជីទំនិញក្នុងកន្ត្រក</h3>' +
        '<span id="cartCountBadge" class="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold">0 មុខ</span>' +
      '</div>' +
      '<div class="overflow-x-auto rounded-xl border border-gray-100 mb-2.5">' +
        '<table class="w-full text-left text-xs border-collapse">' +
          '<thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">តម្លៃរាយ</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">លុប</th></tr></thead>' +
          '<tbody id="cItemsTableBody"><tr><td colspan="5" class="p-4 text-center text-gray-400 italic">កន្ត្រកទទេ</td></tr></tbody>' +
        '</table>' +
      '</div>' +
      discountSectionHTML +
      '<div class="bg-green-50 p-3 rounded-2xl border border-green-200 flex justify-between items-center text-green-900 mb-2.5 font-extrabold text-xs sm:text-base">' +
        '<span>សរុបទឹកប្រាក់៖</span><span id="cTotalVal" class="text-green-700 text-base sm:text-lg">0 ៛</span>' +
      '</div>' +
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

// 🚚 មុខងារឆ្លាតវៃពេល Admin ជ្រើសរើសឈ្មោះម៉ូយក្នុង POS (ចាក់សោរម៉ូយ Monthly ដាច់ខាត ១០០%)
async function onAdminPosCustomerChange(val) {
  var notice = document.getElementById('adminProxyModeNotice');
  var nameLabel = document.getElementById('adminProxyCustName');
  var paySec = document.getElementById('posPaymentSectionWrapper');
  var sBtn = document.getElementById('sBtn');

  var isWalkIn = (!val || val === 'Walk-in');
  var custObj = allCustomers.find(c => c.full_name === val);
  var isMonthly = (custObj && custObj.type === 'Monthly');

  // បើជ្រើសរើសម៉ូយ បង្ហាញបដាដកជំនួស
  if (notice && nameLabel) {
    if (!isWalkIn) {
      nameLabel.innerText = val + (isMonthly ? ' [ប្រចាំខែ - កុងត្រា]' : '');
      notice.classList.remove('hidden');
    } else {
      notice.classList.add('hidden');
    }
  }

  // បើដកជំនួសម៉ូយ លាក់ប្រអប់ទូទាត់លុយរាយចោលភ្លាម
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

  // 🔒 ត្រួតពិនិត្យកន្ត្រកទំនិញចំពោះម៉ូយប្រចាំខែ (Monthly Contract Enforcer)
  if (isMonthly && cart && cart.length > 0) {
    var removedItems = [];
    var validCart = [];

    cart.forEach(function(item) {
      var sp = specialPrices.find(s => s.customer_name === val && s.product_name === item.name);
      if (sp) {
        // បើមានក្នុងកុងត្រា កំណត់យកតម្លៃកុងត្រាអូតូ
        item.price = parseFloat(sp.price);
        validCart.push(item);
      } else {
        // បើគ្មានក្នុងកុងត្រា ត្រូវដកចេញពីកន្ត្រក
        removedItems.push(item.name);
      }
    });

    cart = validCart;

    if (removedItems.length > 0) {
      await kcAlert({
        title: "ទំនិញគ្មានក្នុងកុងត្រា!",
        message: "ទំនិញខាងក្រោមនេះត្រូវបានដកចេញពីកន្ត្រក ដោយសារអតិថិជនប្រចាំខែ [" + val + "] គ្មានតម្លៃកុងត្រាសម្រាប់មុខទំនិញនេះឡើយ៖\n👉 " + removedItems.join(", "),
        type: "warning"
      });
    }
  } else if (!isMonthly && cart && cart.length > 0) {
    var rU = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
    var rT = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;
    // ចំពោះម៉ូយធម្មតា អាប់ដេតតម្លៃពិសេសបើមាន និងបំប្លែងជាប្រាក់រៀលត្រឹមត្រូវ
    cart.forEach(function(item) {
      var sp = specialPrices.find(s => s.customer_name === val && s.product_name === item.name);
      var prod = allProducts.find(p => p.id === item.id);
      if (sp) {
        var spCurr = (sp.currency || 'KHR').toUpperCase();
        var spRaw = parseFloat(sp.price || 0);
        item.price = (spCurr === 'USD') ? Math.round(spRaw * rU) : ((spCurr === 'THB') ? Math.round(spRaw * rT) : Math.round(spRaw));
      } else if (prod) {
        var pCurr = (prod.currency || 'KHR').toUpperCase();
        var pRaw = parseFloat(prod.price || 0);
        item.price = (pCurr === 'USD') ? Math.round(pRaw * rU) : ((pCurr === 'THB') ? Math.round(pRaw * rT) : Math.round(pRaw));
      }
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

// 📦 មុខងារទាញទំនិញមកបង្ហាញក្នុងក្រឡាចត្រង្គ POS
function renderProductGrid() {
  var grid = document.getElementById('pGrid');
  if (!grid) return;

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');

  var custObj = allCustomers.find(c => c.full_name === custName);
  var isMonthly = (custObj && custObj.type === 'Monthly');

  var filtered = allProducts.filter(function(p) {
    if (p.channel === 'ONLINE') return false;

    // 🔒 លក្ខខណ្ឌចាក់សោរម៉ូយប្រចាំខែ (Monthly): បង្ហាញតែមុខទំនិញណាដែលមានក្នុង Contract កុងត្រាប៉ុណ្ណោះ!
    if (isMonthly) {
      var hasContractPrice = specialPrices.some(sp => sp.customer_name === custName && sp.product_name === p.name);
      if (!hasContractPrice) return false; // បើគ្មានក្នុងកុងត្រា មិនបង្ហាញឡើយ!
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

  // បើម៉ូយប្រចាំខែ មិនទាន់មានទំនិញកុងត្រាណាមួយសោះ
  if (isMonthly && filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-10 text-center space-y-2 bg-amber-50 rounded-2xl border-2 border-amber-200 p-4">' +
      '<p class="text-amber-900 font-black text-sm"><i class="fas fa-triangle-exclamation text-amber-600 mr-1.5"></i> ម៉ូយប្រចាំខែ [' + custName + '] មិនទាន់មានទំនិញកុងត្រានៅឡើយទេ!</p>' +
      '<span class="text-slate-500 text-xs block">សូម Admin ចូលទៅកាន់ម៉ឺនុយ <b>«គ្រប់គ្រងអតិថិជន»</b> ដើម្បីកំណត់មុខទំនិញ និងតម្លៃកុងត្រាសម្រាប់គាត់ជាមុនសិន។</span>' +
    '</div>';
    return;
  }

  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  var html = '';
  filtered.forEach(function(p) {
    var sp = specialPrices.find(s => s.customer_name === custName && s.product_name === p.name);
    var unitPrice = sp ? parseFloat(sp.price) : parseFloat(p.price || 0);
    var rawCurr = sp ? (sp.currency || 'KHR').toUpperCase() : (p.currency || 'KHR').toUpperCase();

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

    var khrText = '៛ ' + Number(khrVal).toLocaleString();
    var thbText = '฿ ' + Number(thbVal).toLocaleString();
    var usdText = '$ ' + Number(usdVal).toFixed(2);

    var priceDisplay = '<div class="space-y-0.5 text-center mt-1 leading-tight">' +
      '<div class="text-xs sm:text-sm font-black text-green-700">' + khrText + '</div>' +
      '<div class="text-[10px] sm:text-[11px] font-black text-amber-600">' + thbText + '</div>' +
      '<div class="text-[10px] sm:text-[11px] font-black text-blue-700">' + usdText + '</div>' +
    '</div>';

    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var spBadge = isMonthly ? 
      '<span class="absolute top-2 left-2 bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-amber-300">🔒 តម្លៃកុងត្រា</span>' : 
      (sp ? '<span class="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-yellow-300">តម្លៃពិសេស</span>' : '');

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

// 🔄 ១. មុខងារចុចប្តូររូបិយប័ណ្ណ & គណនាតម្លៃតាមអត្រាប្តូរប្រាក់អូតូ (៦០០៛ ➔ ៥฿ ➔ 0.15$)
function setModalCurrency(curr) {
  currentModalCurrency = curr;

  var btnKhr = document.getElementById('btnModalCurr_KHR');
  var btnThb = document.getElementById('btnModalCurr_THB');
  var btnUsd = document.getElementById('btnModalCurr_USD');
  var suffixEl = document.getElementById('modalCurrencySymbolSuffix');
  var priceBox = document.getElementById('modalPriceInput');

  // Reset ពណ៌ប៊ូតុង
  ['KHR', 'THB', 'USD'].forEach(function(c) {
    var btn = document.getElementById('btnModalCurr_' + c);
    if (btn) btn.className = "py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-white transition flex items-center justify-center gap-1";
  });

  // 🪙 ទាញយកតម្លៃដើមជាលុយខ្មែរ (៛) របស់ទំនិញនេះ
  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');
  var sp = (selectedModalProduct && specialPrices) ? specialPrices.find(s => s.customer_name === custName && s.product_name === selectedModalProduct.name) : null;
  
  var basePrice = sp ? parseFloat(sp.price) : (selectedModalProduct ? parseFloat(selectedModalProduct.price || 0) : 0);
  var baseCurr = sp ? (sp.currency || 'KHR').toUpperCase() : (selectedModalProduct ? (selectedModalProduct.currency || 'KHR').toUpperCase() : 'KHR');

  var rateU = (typeof exchangeRateUSD !== 'undefined' && exchangeRateUSD > 0) ? exchangeRateUSD : 4100;
  var rateT = (typeof exchangeRateTHB !== 'undefined' && exchangeRateTHB > 0) ? exchangeRateTHB : 115;

  // បំប្លែងតម្លៃគោលជាប្រាក់រៀល (KHR) ជាមុនសិន
  var baseKhr = basePrice;
  if (baseCurr === 'USD') baseKhr = Math.round(basePrice * rateU);
  else if (baseCurr === 'THB') baseKhr = Math.round(basePrice * rateT);

  // 🎨 ប្តូរពណ៌ និងគណនាតម្លៃបំប្លែងតាមអត្រាប្តូរប្រាក់
  if (curr === 'THB') {
    // 🟠 លុយថៃ (៦០០៛ / ១១៥ = ៥฿)
    var valThb = Math.round(baseKhr / rateT);
    if (btnThb) btnThb.className = "py-2 rounded-xl text-xs font-black shadow-xs bg-amber-600 text-white transition flex items-center justify-center gap-1";
    if (suffixEl) { suffixEl.innerText = '฿'; suffixEl.className = "absolute right-3 top-3 font-black text-amber-600 text-sm"; }
    if (priceBox) {
      priceBox.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-amber-300 focus:border-amber-600 text-amber-950 outline-none pr-8";
      priceBox.value = valThb > 0 ? valThb : "";
      priceBox.placeholder = "0";
    }
  } else if (curr === 'USD') {
    // 🟢 លុយដុល្លារ (៦០០៛ / ៤១០០ = 0.15$)
    var valUsd = parseFloat((baseKhr / rateU).toFixed(2));
    if (btnUsd) btnUsd.className = "py-2 rounded-xl text-xs font-black shadow-xs bg-emerald-600 text-white transition flex items-center justify-center gap-1";
    if (suffixEl) { suffixEl.innerText = '$'; suffixEl.className = "absolute right-3 top-3 font-black text-emerald-600 text-sm"; }
    if (priceBox) {
      priceBox.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-emerald-300 focus:border-emerald-600 text-emerald-950 outline-none pr-8";
      priceBox.value = valUsd > 0 ? valUsd : "";
      priceBox.placeholder = "0.00";
    }
  } else {
    // 🔵 លុយខ្មែរ (៦០០៛)
    if (btnKhr) btnKhr.className = "py-2 rounded-xl text-xs font-black shadow-xs bg-blue-600 text-white transition flex items-center justify-center gap-1";
    if (suffixEl) { suffixEl.innerText = '៛'; suffixEl.className = "absolute right-3 top-3 font-black text-blue-600 text-sm"; }
    if (priceBox) {
      priceBox.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-blue-300 focus:border-blue-600 text-blue-950 outline-none pr-8";
      priceBox.value = baseKhr > 0 ? baseKhr : "";
      priceBox.placeholder = "0";
    }
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


// ==========================================
// 🪙 មុខងារជំនួយតម្លៃលើផ្ទាំង MODAL (ស្វ័យប្រវត្តិ 00 លើ KHR & ស្គាល់ , ឬ . លើ USD)
// ==========================================

// ➕ មុខងារថែមលេខសូន្យ (+00 ឬ +000) លើប្រអប់តម្លៃ Modal
function appendModalZeros(zeros) {
  var inp = document.getElementById('modalPriceInput');
  if (!inp || inp.readOnly) return; // ការពារមិនឱ្យកែបើជាម៉ូយ Monthly

  var cur = String(inp.value || '').trim().replace(/[^0-9]/g, '');
  if (!cur || cur === '0') {
    inp.value = '1' + zeros; // បើប្រអប់ទទេ ចុច +00 ចេញ 100
  } else {
    inp.value = cur + zeros; // បើមានលេខ 5 រួច ចុច +00 ចេញ 500
  }
  updateModalSubtotal();
}

// 💵 មុខងារកំណត់តម្លៃជាក់លាក់ (500, 1000, 2000) លើប្រអប់តម្លៃ Modal
function setModalExactPrice(amt) {
  var inp = document.getElementById('modalPriceInput');
  if (!inp || inp.readOnly) return; // ការពារមិនឱ្យកែបើជាម៉ូយ Monthly

  inp.value = amt;
  updateModalSubtotal();
}

// ១. មុខងារវាយតម្លៃផ្ទាល់ក្នុងប្រអប់
function onModalPriceInput(val) {
  updateModalSubtotal();
}

// 🔄 ២. មុខងារសម្រួលតម្លៃស្វ័យប្រវត្តពេលវាយរួច (On Blur)
function onModalPriceBlur() {
  var inp = document.getElementById('modalPriceInput');
  if (!inp || inp.readOnly) return;

  var rawVal = String(inp.value || '').trim();
  if (!rawVal) return;

  // 🇰🇭 ក. លុយខ្មែរ (KHR)៖ បើវាយចន្លោះពី 1 ដល់ 99 ➔ ថែម 00 លើប្រអប់ភ្លាម (ឧ. 6 -> 600, 15 -> 1500)
  if (currentModalCurrency === 'KHR') {
    var clean = rawVal.replace(/[^0-9]/g, '');
    var num = parseInt(clean);
    if (!isNaN(num) && num > 0 && num < 100) {
      inp.value = num * 100;
    }
  } 
  // 💵 ខ. លុយដុល្លារ (USD)៖ បើវាយសញ្ញាក្បៀស (,) ➔ ប្តូរមកសញ្ញាចុច (.) ឱ្យស្អាត (ឧ. 1,5 -> 1.5)
  else if (currentModalCurrency === 'USD') {
    if (rawVal.includes(',')) {
      inp.value = rawVal.replace(',', '.');
    }
  }
  updateModalSubtotal();
}

// 🧮 ៣. មុខងារបំប្លែង និងទាញយកតម្លៃលក់ជាក់ស្តែង
function getModalParsedPrice() {
  var inp = document.getElementById('modalPriceInput');
  
  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');
  var sp = (selectedModalProduct && specialPrices) ? specialPrices.find(s => s.customer_name === custName && s.product_name === selectedModalProduct.name) : null;
  var defaultPrice = sp ? parseFloat(sp.price) : (selectedModalProduct ? parseFloat(selectedModalProduct.price || 0) : 0);

  if (!inp) return defaultPrice;

  var rawVal = String(inp.value || '').trim();
  if (rawVal === '') {
    return defaultPrice;
  }

  // 💵 ករណីទី ១៖ លុយដុល្លារ (USD) -> ស្គាល់ទាំងសញ្ញាក្បៀស (,) និងសញ្ញាចុច (.) គ្មានថែម 00 ឡើយ
  if (currentModalCurrency === 'USD') {
    var cleanUsd = rawVal.replace(',', '.').replace(/[^0-9.]/g, '');
    var numUsd = parseFloat(cleanUsd);
    return isNaN(numUsd) ? defaultPrice : numUsd;
  } 
  // 🪙 ករណីទី ២៖ លុយថៃ (THB) -> គិតតម្លៃធម្មតា គ្មានថែម 00 ឡើយ
  else if (currentModalCurrency === 'THB') {
    var cleanThb = rawVal.replace(/[^0-9.]/g, '');
    var numThb = parseFloat(cleanThb);
    return isNaN(numThb) ? defaultPrice : numThb;
  } 
  // 🇰🇭 ករណីទី ៣៖ លុយខ្មែរ (KHR) -> ថែម 00 ស្វ័យប្រវត្តិបើវាយលេខចន្លោះពី 1 ដល់ 99
  else {
    var cleanKhr = rawVal.replace(/[^0-9]/g, '');
    var numKhr = parseFloat(cleanKhr);
    if (isNaN(numKhr)) return defaultPrice;

    // បើវាយលេខ 1 ដល់ 99 ➔ ថែម 00 (ឧ. 1->100, 6->600, 15->1500)
    if (numKhr > 0 && numKhr < 100) {
      return numKhr * 100;
    }
    // បើវាយចាប់ពី 100 ឡើង (ឧ. 600, 2500) ➔ ទុកតម្លៃនោះដដែល
    return numKhr;
  }
}

// 🛍️ មុខងារបើកផ្ទាំង Modal រើសទំនិញ (ចាក់សោរម៉ូយ Monthly & រារាំង CompanyDriver)
function openProductModal(id) {
  // 🛡️ ១. រារាំងអ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver) ដាច់ខាត
  if (currentUser && currentUser.type === 'CompanyDriver') {
    if (typeof kcAlert === 'function') {
      kcAlert({
        title: "គ្មានសិទ្ធិដកទំនិញ!",
        message: "អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដកទំនិញ ឬលក់ក្នុង POS ឡើយ!",
        type: "danger"
      });
    } else {
      showToast("អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដកទំនិញឡើយ!", "error");
    }
    return;
  }

  var p = allProducts.find(item => item.id === id);
  if (!p) return;
  selectedModalProduct = p;

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');
  var custObj = allCustomers.find(c => c.full_name === custName);
  var isMonthly = (custObj && custObj.type === 'Monthly');

  // 🏢 ២. ឆែកតម្លៃពិសេសសម្រាប់ម៉ូយប្រចាំខែ (Monthly)
  var sp = specialPrices.find(s => s.customer_name === custName && s.product_name === p.name);
  if (isMonthly && !sp) {
    if (typeof kcAlert === 'function') {
      kcAlert({
        title: "គ្មានក្នុងកុងត្រា!",
        message: "ទំនិញ [" + p.name + "] នេះ មិនមានក្នុងកុងត្រាតម្លៃពិសេសរបស់ម៉ូយប្រចាំខែ [" + custName + "] ឡើយ! សូម Admin កំណត់តម្លៃក្នុង «គ្រប់គ្រងអតិថិជន» ជាមុនសិន។",
        type: "warning"
      });
    } else {
      showToast("ទំនិញនេះគ្មានក្នុងកុងត្រាតម្លៃរបស់ម៉ូយប្រចាំខែនេះទេ!", "error");
    }
    return;
  }

  var unitPrice = sp ? parseFloat(sp.price) : parseFloat(p.price || 0);

  document.getElementById('modalProdImg').src = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
  document.getElementById('modalProdTitle').innerText = p.name;
  document.getElementById('modalStockStatusBadge').innerText = p.type || "ទំនិញ";
  
  var costHint = document.getElementById('modalOriginalCostHint');
  setModalCurrency(isMonthly ? 'KHR' : (p.currency || 'KHR'));

  var priceInp = document.getElementById('modalPriceInput');
  if (priceInp) priceInp.onblur = onModalPriceBlur;
  var quickPayBtn = document.getElementById('btnModalQuickPay');
  var addToCartBtn = document.getElementById('btnModalAddToCart');
  var khrQuickRow = document.getElementById('modalKhrQuickButtonsRow');
  var khrHintText = document.getElementById('modalKhrHintText');
  var currTabsRow = document.getElementById('btnModalCurr_KHR') ? document.getElementById('btnModalCurr_KHR').parentElement : null;

  var canEditPriceAndQuickPay = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Seller' || currentUser.role === 'Cashier'));

  // 🔒 សម្រាប់ម៉ូយប្រចាំខែ Monthly៖ លាក់ប្រអប់ប្តូរលុយ ($/฿)
  if (currTabsRow) {
    if (canEditPriceAndQuickPay && !isMonthly) {
      currTabsRow.classList.remove('hidden');
    } else {
      currTabsRow.classList.add('hidden');
    }
  }

  // 🏢 ករណីទី ១៖ អតិថិជនប្រចាំខែ (Monthly) -> ចាក់សោរតម្លៃកុងត្រា មិនឱ្យកែតម្លៃ មិនឱ្យ Quick Pay
  if (isMonthly) {
    priceInp.readOnly = true;
    priceInp.value = unitPrice;
    priceInp.className = "w-full text-center text-xl font-black bg-amber-50 py-2.5 rounded-xl border-2 border-amber-300 text-amber-950 outline-none select-none pr-8";

    if (costHint) costHint.innerHTML = '<span class="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">🔒 តម្លៃកុងត្រា: ៛ ' + Number(unitPrice).toLocaleString() + '</span>';
    if (khrQuickRow) khrQuickRow.classList.add('hidden');
    if (khrHintText) khrHintText.classList.add('hidden');
    if (quickPayBtn) quickPayBtn.classList.add('hidden');
    if (addToCartBtn) addToCartBtn.className = "col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";

  // 👑 ករណីទី ២៖ Admin ឬ Seller លក់ Walk-in -> អាចកែតម្លៃ អាច Quick Pay
  } else if (canEditPriceAndQuickPay) {
    priceInp.readOnly = false;
    priceInp.value = unitPrice > 0 ? unitPrice : "";
    priceInp.placeholder = unitPrice > 0 ? unitPrice : "0";
    priceInp.className = "w-full text-center text-xl font-black bg-white py-2.5 rounded-xl border-2 border-blue-300 focus:border-blue-600 text-blue-950 outline-none pr-8";

    if (costHint) costHint.innerText = "(តម្លៃដើម: " + Number(unitPrice).toLocaleString() + " " + (p.currency || 'KHR') + ")";
    if (quickPayBtn) quickPayBtn.classList.remove('hidden');
    if (addToCartBtn) addToCartBtn.className = "py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";

  // 🚚 ករណីទី ៣៖ ម៉ូយបោះដុំ (Reseller) ឬកូនចៅមេ (Driver) -> ចាក់សោរតម្លៃបោះដុំ
  } else {
    priceInp.readOnly = true;
    priceInp.value = unitPrice;
    priceInp.placeholder = unitPrice;
    priceInp.className = "w-full text-center text-xl font-black bg-slate-100 py-2.5 rounded-xl border border-slate-300 text-slate-700 outline-none select-none pointer-events-none pr-8";

    if (costHint) costHint.innerText = "(តម្លៃដើម: " + Number(unitPrice).toLocaleString() + " " + (p.currency || 'KHR') + ")";
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

// ⚡ មុខងារទូទាត់រហ័ស (QUICK CHECKOUT) - កែសម្រួលរួចរាល់
async function quickCheckoutSingleItem() {
  // 🛡️ ១. រារាំងអ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver) ដាច់ខាត
  if (currentUser && currentUser.type === 'CompanyDriver') {
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "គ្មានសិទ្ធិលក់!",
        message: "អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដក ឬលក់ទំនិញក្នុង POS ឡើយ!",
        type: "danger"
      });
    } else {
      showToast("អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដក ឬលក់ទំនិញក្នុង POS ឡើយ!", "error");
    }
    return;
  }

  // 🛡️ ២. ឆែកសិទ្ធិអ្នកលក់ (Admin / Seller)
  var canQuickPay = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Seller' || currentUser.role === 'Cashier'));
  if (!canQuickPay) {
    showToast("អ្នកមិនមានសិទ្ធិប្រើប្រាស់មុខងារទូទាត់រហ័សនេះឡើយ!", "error");
    return;
  }

  // 🏢 ៣. រារាំងម៉ូយប្រចាំខែ (Monthly) មិនឱ្យប្រើ Quick Pay (ត្រូវកត់ចូលកុងត្រាជំពាក់)
  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : '';
  var custObj = allCustomers.find(c => c.full_name === custName);
  if (custObj && custObj.type === 'Monthly') {
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "អតិថិជនប្រចាំខែ (Monthly)",
        message: "ម៉ូយប្រចាំខែមិនអាចគិតលុយរហ័សបានទេ! សូមចុច «បញ្ចូលកន្ត្រក» រួចចុច «កត់ត្រាការដកទំនិញជំនួស» ដើម្បីកត់ចូលបញ្ជីកុងត្រា។",
        type: "warning"
      });
    } else {
      showToast("ម៉ូយប្រចាំខែ ត្រូវកត់ចូលបញ្ជីកុងត្រាជំពាក់ មិនអាចគិតលុយភ្លាមៗទេ!", "error");
    }
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
function renderCart() {
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
  var qrModal = document.getElementById('posKhqrModal');
  if (qrModal) {
    qrModal.classList.add('hidden'); 
    qrModal.style.zIndex = ''; // 👈 Reset z-index មកធម្មតាវិញ
  }
}

// 💾 ៤. រក្សាទុកការលក់ (SUBMIT SALE & ADMIN PROXY WITHDRAWAL)
var isSubmittingSaleLock = false;

async function confirmSale() {
  // 🛡️ ១. រារាំងអ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver) ដាច់ខាត
  if (currentUser && currentUser.type === 'CompanyDriver') {
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "គ្មានសិទ្ធិដកទំនិញ!",
        message: "អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដក ឬលក់ទំនិញក្នុង POS ឡើយ! មានតែសិទ្ធិដឹកទំនិញដែល Admin ចាត់ចែងប៉ុណ្ណោះ។",
        type: "danger"
      });
    } else {
      showToast("អ្នកដឹកជញ្ជូនរោងចក្រ គ្មានសិទ្ធិដក ឬលក់ទំនិញក្នុង POS ឡើយ!", "error");
    }
    return;
  }

  if (isSubmittingSaleLock) return;

  // 🛡️ ២. ពិនិត្យកន្ត្រកទំនិញ
  if (!cart || cart.length === 0) { 
    showToast("កន្ត្រកទទេ! សូមរើសទំនិញជាមុនសិន", "error"); 
    return; 
  }

  // 🛡️ ៣. កំណត់ឈ្មោះអតិថិជនឱ្យបានត្រឹមត្រូវជាមុនសិន (ដោះស្រាយបញ្ហា Hoisting Bug)
  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');

  // 🛵 ករណីកូនចៅដកជំនួសមេ៖ បង្ខំយកឈ្មោះមេជា customer_name ដាច់ខាត ១០០%
  var isDriverWithdraw = (currentUser && (currentUser.role === 'Driver' || (currentUser.linkedBoss && currentUser.linkedBoss.trim() !== '')) && currentUser.type !== 'CompanyDriver');
  if (isDriverWithdraw) {
    var bossNameFromProfile = (currentUser.linkedBoss || '').trim();
    if (bossNameFromProfile) {
      custName = bossNameFromProfile;
    }
  }

  // 🔒 ៤. រនាំងការពារសុវត្ថិភាពចុងក្រោយសម្រាប់ម៉ូយប្រចាំខែ (Monthly Customer Guard)
  var custObjCheck = allCustomers.find(c => c.full_name === custName);
  var isMonthlyCustomer = (custObjCheck && custObjCheck.type === 'Monthly');

  if (isMonthlyCustomer) {
    var invalidItems = [];
    cart.forEach(function(item) {
      var hasContract = specialPrices.some(s => s.customer_name === custName && s.product_name === item.name);
      if (!hasContract) invalidItems.push(item.name);
    });

    if (invalidItems.length > 0) {
      if (typeof kcAlert === 'function') {
        await kcAlert({
          title: "មិនអាចកត់ត្រាបានទេ!",
          message: "រកឃើញទំនិញក្រៅកុងត្រាក្នុងកន្ត្រក៖ [" + invalidItems.join(", ") + "] មិនអាចលក់ឱ្យម៉ូយប្រចាំខែ [" + custName + "] បានឡើយ! បង្ហាញ និងលក់បានតែទំនិញក្នុងកុងត្រាប៉ុណ្ណោះ។",
          type: "danger"
        });
      } else {
        showToast("មានទំនិញក្រៅកុងត្រារបស់ម៉ូយប្រចាំខែ!", "error");
      }
      return;
    }
  }

  var isWalkIn = (!custName || custName === 'Walk-in');
  var isDebtWithdrawal = (!isWalkIn);
  var isAdmin = (currentUser && currentUser.role === 'Admin');

  var calc = getCartCalculations();
  var paid = isDebtWithdrawal ? 0 : parseFloat(document.getElementById('pK') ? document.getElementById('pK').value || 0 : 0);
  var status = (isWalkIn && paid >= calc.finalTotal) ? 'Paid' : 'Unpaid';

  var tid = "TR-" + new Date().getTime();
  var btn = document.getElementById('sBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> កំពុងកត់ត្រា...';
  }
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
        customer_name: custName,
        product_name: item.name,
        qty: item.qty,
        price: item.price,
        currency: "KHR",
        total: itemTotal,
        paid_khr: isDebtWithdrawal ? 0 : allocatedPaid,
        recorded_by: isDriverWithdraw ? (currentUser.fullName + " (កូនចៅដកជំនួស)") : (isDebtWithdrawal && isAdmin ? "Admin (ដកជំនួស)" : (currentUser.fullName || "Admin")),
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
        recorded_by: isDriverWithdraw ? (currentUser.fullName + " (កូនចៅដកជំនួស)") : (isDebtWithdrawal && isAdmin ? "Admin (ដកជំនួស)" : (currentUser.fullName || "Admin")),
        status: status,
        payment_method: isDebtWithdrawal ? 'Debt' : currentPosPayMethod
      });
    }

    const { error: insErr } = await supabaseClient.from('transactions').insert(rowsToInsert);
    if (insErr) throw insErr;

    // 📦 ៥. កាត់ស្តុកទំនិញទិញគេចេញពីឃ្លាំងដោយស្វ័យប្រវត្តិ
    for (var sIdx = 0; sIdx < cart.length; sIdx++) {
      var cartItm = cart[sIdx];
      var prodObj = allProducts.find(p => p.id === cartItm.id);
      if (prodObj && prodObj.type === 'ទិញគេ' && cartItm.qty > 0) {
        var updatedStock = Math.max(0, parseFloat(prodObj.stock || 0) - cartItm.qty);
        await supabaseClient.from('products').update({ stock: updatedStock }).eq('id', prodObj.id);
        prodObj.stock = updatedStock;
      }
    }

    // 🔔 ៦. ផ្ញើ Telegram Alert
    try {
      var itemSummary = cart.map(function(item) {
        return "  • <b>" + item.name + "</b> x " + item.qty + " = ៛ " + (item.qty * item.price).toLocaleString();
      }).join("\n");

      var tgHeader = isDriverWithdraw ? "🛵 <b>[KC WATER - កូនចៅមកដកទឹកជំនួសមេ]</b>" : 
                    (isMonthlyCustomer ? "🏢 <b>[KC WATER - ដកទំនិញម៉ូយប្រចាំខែ (កុងត្រា)]</b>" :
                    (isDebtWithdrawal && isAdmin ? "🏢 <b>[KC WATER - Admin ដកទំនិញជំនួសម៉ូយ]</b>" : 
                    (isDebtWithdrawal ? "🚚 <b>[KC WATER - ម៉ូយដកទំនិញ (Login)]</b>" : "🛒 <b>[KC WATER - លក់នៅកន្លែង (Walk-in)]</b>")));

      var withdrawPersonInfo = isDriverWithdraw ? 
        ("🚚 <b>អ្នកមកដកផ្ទាល់៖</b> <b>" + currentUser.fullName + " (កូនចៅ)</b>\n" +
         "🏢 <b>ដកជំនួសមេ៖</b> <b>" + custName + "</b>\n") :
        (isDebtWithdrawal && isAdmin ? 
        ("👤 <b>អតិថិជន / ម៉ូយ៖</b> <b>" + custName + (isMonthlyCustomer ? " [ប្រចាំខែ]" : "") + "</b>\n" +
         "✍️ <b>អ្នកកត់ត្រា៖</b> <b>Admin (" + (currentUser.fullName || "Admin") + ")</b>\n") :
        ("👤 <b>អតិថិជន៖</b> " + custName + "\n"));

      var statusText = (status === 'Paid') ? "✅ <b>បង់ប្រាក់រួច</b>" : "⚠️ <b>កត់ចូលបញ្ជីជំពាក់ (Unpaid)</b>";
      var timeKhNow = new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh', dateStyle: 'short', timeStyle: 'short' });

      var tgMsg = tgHeader + "\n" +
                  "━━━━━━━━━━━━━━━━━━━━\n" +
                  "🆔 <b>កូដប្រតិបត្តិការ៖</b> <code>" + tid + "</code>\n" +
                  withdrawPersonInfo +
                  "📦 <b>ទំនិញដែលបានដក៖</b>\n" + itemSummary + "\n" +
                  (calc.discountK > 0 ? ("🏷️ <b>បញ្ចុះតម្លៃ៖</b> -៛ " + calc.discountK.toLocaleString() + "\n") : "") +
                  "💰 <b>ទឹកប្រាក់សរុប៖</b> <b>៛ " + calc.finalTotal.toLocaleString() + "</b>\n" +
                  "📌 <b>ស្ថានភាពទូទាត់៖</b> " + statusText + "\n" +
                  "🕒 <b>កាលបរិច្ឆេទ៖</b> " + timeKhNow;

      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg);
      }
    } catch(e) {}

    // 🧾 ៧. បង្កើតរូបភាពវិក្កយបត្រ
    if (typeof generateReceiptImage === 'function') {
      generateReceiptImage(
        tid, 
        custName, 
        calc.finalTotal, 
        (isDebtWithdrawal ? 0 : paid), 
        cart, 
        isDebtWithdrawal ? "ប័ណ្ណដកទំនិញ (WITHDRAWAL VOUCHER)" : "វិក្កយបត្រលក់ទំនិញ (RECEIPT)", 
        calc.discountK
      );
    }

    cart = [];
    currentPosDiscount = { type: 'NONE', value: 0 };
    rC();
    if (document.getElementById('pK')) document.getElementById('pK').value = "";
    calcPOSChange();

    var successMsg = isDriverWithdraw ? ("បានកត់ត្រាការដកទឹកចូលគណនីមេ [" + custName + "] ជោគជ័យ!") : 
                     (isMonthlyCustomer ? ("បានកត់ត្រាការដកទឹកចូលកុងត្រាម៉ូយប្រចាំខែ [" + custName + "] ជោគជ័យ!") :
                     (isDebtWithdrawal ? ("បានកត់ត្រាការដកទំនិញចូលបញ្ជីជំពាក់របស់ [" + custName + "] ជោគជ័យ!") : "បានកត់ត្រាការលក់ជោគជ័យ!"));
    showToast(successMsg, "success");
    if (typeof closeQuickPosModal === 'function') closeQuickPosModal();
    if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

  } catch(err) {
    showToast("កំហុសកត់ត្រា៖ " + err.message, "error");
  } finally {
    isSubmittingSaleLock = false;
    if (btn) {
      btn.disabled = false;
      if (isDebtWithdrawal) {
        btn.innerHTML = '<i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញ (កត់ចូលបញ្ជីជំពាក់)';
      } else {
        btn.innerHTML = 'រក្សាទុកការលក់ (Save Sale)';
      }
    }
  }
}
  
// ==========================================
// 🧾 បង្កើតរូបវិក្កយបត្រ (RECEIPT GENERATOR)
// បូកសរុបបញ្ចូលគ្នាតាមមុខទំនិញស្វ័យប្រវត្ត & គាំទ្រទាញយកលើទូរស័ព្ទ ១០០%
// ==========================================
function generateReceiptImage(tid, cust, total, paid, items, titleText, discountAmount) {
  var dateStr = new Date().toLocaleString('km-KH', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  var change = Math.max(0, paid - total);
  discountAmount = parseFloat(discountAmount || 0);

  var isPaidComplete = (paid >= total && total > 0);
  var statusBadgeText = isPaidComplete ? 
    '<span style="color:#15803d; font-weight:bold;">ទូទាត់រួចរាល់ (បង់ប្រាក់គ្រប់ចំនួន)</span>' : 
    (total === 0 ? '<span style="color:#15803d; font-weight:bold;">ឥតគិតថ្លៃ (Free)</span>' : '<span style="color:#c2410c; font-weight:bold;">កត់ត្រាជំពាក់ (Unpaid)</span>');

  // 📦 ១. បូកសរុបបញ្ចូលគ្នាតាមមុខទំនិញនីមួយៗ (Group & Sum by Product)
  var groupedMap = {};
  var specialRows = [];
  var prodQtyMap = {};

  (items || []).forEach(function(i) {
    var pName = (i.name || i.product_name || "ទំនិញ").trim();
    var pPrice = parseFloat(i.price || 0);
    var pQty = parseFloat(i.qty || 1);
    var pCurr = i.currency || 'KHR';
    var isSpecial = pName.includes("Discount") || pName.includes("បញ្ចុះតម្លៃ") || 
                    pName.includes("Old Debt") || pName.includes("បំណុលចាស់") || 
                    pName.includes("សេវាដឹក") || pPrice < 0;

    if (isSpecial) {
      specialRows.push({
        name: pName,
        price: pPrice,
        qty: pQty,
        total: pQty * pPrice,
        currency: pCurr
      });
    } else {
      // បូកបញ្ចូលគ្នាតាមឈ្មោះទំនិញ និងតម្លៃរាយ
      var groupKey = pName + '___' + pPrice;
      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
          name: pName,
          price: pPrice,
          qty: 0,
          total: 0,
          currency: pCurr
        };
      }
      groupedMap[groupKey].qty += pQty;
      groupedMap[groupKey].total += (pQty * pPrice);

      var cleanSummaryName = pName.replace(/🎁\s*\[Free\]/gi, '').replace(/\[Free\]/gi, '').trim();
      prodQtyMap[cleanSummaryName] = (prodQtyMap[cleanSummaryName] || 0) + pQty;
    }
  });

  // រួមបញ្ចូលទំនិញដែលបានបូកសរុប + ជួរពិសេស
  var finalDisplayItems = Object.values(groupedMap).concat(specialRows);

  var itemsHtml = '';
  finalDisplayItems.forEach(function(i, idx) {
    var currSymbol = (i.currency === 'USD') ? '$ ' : ((i.currency === 'THB') ? '฿ ' : '៛ ');

    itemsHtml += '<tr style="border-bottom:1px dashed #cbd5e1; font-size:11px; line-height:1.7;">' +
      '<td align="center" style="padding:7px 2px; color:#64748b;">' + (idx + 1) + '</td>' +
      '<td style="padding:7px 4px; font-weight:bold; color:#0f172a;">' + i.name + '</td>' +
      '<td align="center" style="padding:7px 4px; font-weight:bold; color:#1d4ed8;">' + i.qty + '</td>' +
      '<td align="right" style="padding:7px 4px; color:#475569;">' + Number(i.price).toLocaleString() + '</td>' +
      '<td align="right" style="padding:7px 4px; font-weight:bold; color:#15803d;">' + currSymbol + Number(i.total).toLocaleString() + '</td>' +
    '</tr>';
  });

  // 📊 ២. ប្រអប់សង្ខេបបរិមាណតាមមុខទំនិញ
  var prodSummaryBoxHtml = '';
  var summaryKeys = Object.keys(prodQtyMap);
  if (summaryKeys.length > 0) {
    prodSummaryBoxHtml = '<div style="margin-top:6px; margin-bottom:10px; padding:7px 10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; font-size:10.5px; line-height:1.7;">' +
      '<b style="color:#0f172a; display:block; margin-bottom:2px;">📦 សរុបបរិមាណតាមមុខទំនិញ៖</b>';
    summaryKeys.forEach(function(k) {
      var unitLabel = (k.indexOf("ធុង") !== -1) ? "ធុង" : ((k.indexOf("យួរ") !== -1) ? "យួរ" : ((k.indexOf("កេស") !== -1) ? "កេស" : ((k.indexOf("បាវ") !== -1) ? "បាវ" : ((k.indexOf("កំប៉ុង") !== -1) ? "កំប៉ុង" : ((k.indexOf("ដប") !== -1) ? "ដប" : "ឯកតា")))));
      prodSummaryBoxHtml += '<span style="display:inline-block; margin-right:12px; color:#334155;">• ' + k + '៖ <b style="color:#1d4ed8;">' + Number(prodQtyMap[k]).toLocaleString() + ' ' + unitLabel + '</b></span>';
    });
    prodSummaryBoxHtml += '</div>';
  }

  // 🚚 ៣. ព័ត៌មានអ្នកមកដកផ្ទាល់
  var isDriverWithdraw = (currentUser && (currentUser.role === 'Driver' || (currentUser.linkedBoss && currentUser.linkedBoss.trim() !== '')) && currentUser.type !== 'CompanyDriver');
  var driverWithdrawLine = isDriverWithdraw ? 
    ('អ្នកមកដកផ្ទាល់៖ <b style="color:#b45309;">' + currentUser.fullName + ' (កូនចៅ/អ្នកដឹក)</b><br>') : '';

  var custInfoHtml = '<div style="font-size:11px; line-height:1.7; margin-bottom:10px; color:#334155; background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0;">' +
    'លេខកូដវិក្កយបត្រ៖ <b style="color:#0f172a; font-family:monospace;">' + tid + '</b><br>' +
    'អតិថិជន៖ <b style="color:#0f172a;">' + cust + '</b><br>' +
    driverWithdrawLine +
    'កាលបរិច្ឆេទ៖ ' + dateStr + '<br>' +
    'អ្នកកត់ត្រា៖ <b style="color:#0f172a;">' + (currentUser.fullName || "Admin") + '</b>' +
  '</div>';

  var h = '<div id="pos-canvas-box" style="width:360px; padding:22px 18px; background:#ffffff; color:#0f172a; font-family:\'Battambang\', sans-serif; border-radius:16px; line-height:1.7;">' +
    '<div style="text-align:center; border-bottom:2px dashed #16a34a; padding-bottom:10px; margin-bottom:10px;">' +
      '<b style="font-size:17px; color:#15803d; letter-spacing:0.5px;">រោងចក្រទឹកបរិសុទ្ធ ខេ ស៊ី (KC WATER)</b><br>' +
      '<span style="font-size:10.5px; color:#64748b; font-weight:bold;">ទីតាំង៖ ក្រុងប៉ោយប៉ែត | ទូរស័ព្ទ៖ 077 934 748, 066 934 748</span><br>' +
      '<div style="display:inline-block; margin-top:6px; padding:3px 14px; background:#f0fdf4; border:1px solid #86efac; border-radius:20px; font-size:11px; font-weight:bold; color:#166534;">' + 
        (titleText || 'វិក្កយបត្រលក់ទំនិញ (RECEIPT)') + 
      '</div>' +
    '</div>' +

    custInfoHtml +

    '<table style="width:100%; border-collapse:collapse; margin-bottom:8px;">' +
      '<thead>' +
        '<tr style="background:#f1f5f9; color:#475569; font-size:10.5px; border-bottom:1px solid #cbd5e1; line-height:1.6;">' +
          '<th align="center" style="padding:6px 2px; width:22px;">ល.រ</th>' +
          '<th align="left" style="padding:6px 4px;">មុខទំនិញ</th>' +
          '<th align="center" style="padding:6px 4px; width:35px;">ចំនួន</th>' +
          '<th align="right" style="padding:6px 4px; width:55px;">តម្លៃរាយ</th>' +
          '<th align="right" style="padding:6px 4px; width:65px;">តម្លៃសរុប</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + itemsHtml + '</tbody>' +
    '</table>' +

    prodSummaryBoxHtml +

    '<div style="background:#f0fdf4; padding:10px 12px; border-radius:10px; font-size:11px; line-height:1.8; border:1px solid #bbf7d0;">' +
      (discountAmount > 0 ? '<div style="display:flex; justify-content:space-between; color:#c2410c;"><span>បញ្ចុះតម្លៃ (Discount)៖</span><b>-៛ ' + discountAmount.toLocaleString() + '</b></div>' : '') +
      '<div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12.5px; color:#0f172a; border-bottom:1px solid #bbf7d0; padding-bottom:4px; margin-bottom:4px;">' +
        '<span>សរុបទឹកប្រាក់ត្រូវបង់៖</span><b>៛ ' + total.toLocaleString() + '</b>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; color:#334155;"><span>ស្ថានភាពទូទាត់៖</span>' + statusBadgeText + '</div>' +
      (isPaidComplete ? 
        ('<div style="display:flex; justify-content:space-between; color:#1d4ed8;"><span>ប្រាក់បានទទួល៖</span><b>៛ ' + paid.toLocaleString() + '</b></div>' +
         (change > 0 ? '<div style="display:flex; justify-content:space-between; color:#15803d; font-weight:bold;"><span>ប្រាក់អាប់ជូនវិញ៖</span><b>៛ ' + change.toLocaleString() + '</b></div>' : '')) : 
        '') +
    '</div>' +

    '<div style="text-align:center; margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:8px;">' +
      '<b style="font-size:10.5px; color:#166534;">សូមអរគុណចំពោះការគាំទ្រទឹកបរិសុទ្ធ ខេ ស៊ី!</b><br>' +
      '<span style="font-size:9.5px; color:#64748b;">សូមអញ្ជើញមកម្តងទៀត 🙏</span>' +
    '</div>' +
  '</div>';

  var hiddenArea = document.getElementById('hidden_receipt_canvas');
  if (!hiddenArea) return;
  hiddenArea.innerHTML = h;

  html2canvas(document.getElementById('pos-canvas-box'), { scale: 3 }).then(function(canvas) {
    var imgUrl = canvas.toDataURL("image/png");
    var receiptImg = document.getElementById('posModalReceiptImg');
    if (receiptImg) receiptImg.src = imgUrl;
    var modal = document.getElementById('posSaleReceiptModal');
    if (modal) modal.classList.remove('hidden');
  });
}

function closePOSReceiptModal() { 
  var modal = document.getElementById('posSaleReceiptModal');
  if (modal) modal.classList.add('hidden'); 
}

// 📥 មុខងារទាញយករូបវិក្កយបត្រលើទូរស័ព្ទដៃ (គាំទ្រ Android, iPhone & PC ១០០%)
async function downloadPOSReceiptImage() {
  var img = document.getElementById('posModalReceiptImg');
  if (!img || !img.src || img.src.length < 50) {
    showToast("មិនទាន់មានរូបភាពវិក្កយបត្រឡើយ!", "error");
    return;
  }

  showToast("កំពុងទាញយករូបវិក្កយបត្រ...", "info");

  try {
    // ១. បំប្លែង Base64 ទៅជា Blob (Binary Data) ដើម្បីកុំឱ្យ Chrome Mobile ប្លុក
    var res = await fetch(img.src);
    var blob = await res.blob();
    var fileName = 'KC-Receipt-' + Date.now() + '.png';

    // 🍎 ២. សម្រាប់ iPhone / iPad៖ បើក Share Sheet ឱ្យរើស «Save Image» ចូល Photos ផ្ទាល់
    var isIos = /iphone|ipad|ipod/.test((navigator.userAgent || '').toLowerCase());
    if (isIos && navigator.share) {
      var file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'វិក្កយបត្រ KC WATER'
        });
        showToast("បានរក្សាទុកវិក្កយបត្រជោគជ័យ!", "success");
        return;
      }
    }

    // 🤖 ៣. សម្រាប់ Android & កុំព្យូទ័រ៖ ទាញយកតាម Blob URL ស្តង់ដារ
    var blobUrl = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 3000);

    showToast("បានទាញយកវិក្កយបត្រជោគជ័យ!", "success");

  } catch(err) {
    // ៤. ដំណោះស្រាយបម្រុង (Fallback)
    try {
      var w = window.open('');
      if (w) {
        w.document.write('<title>វិក្កយបត្រ KC WATER</title><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#1e293b;min-height:100vh;"><div style="text-align:center;"><p style="color:white;font-family:sans-serif;font-size:13px;font-weight:bold;margin-bottom:10px;">សូមចុចសង្កត់លើរូបភាព រួចរើសយក «Save image / រក្សាទុករូបភាព»៖</p><img src="' + img.src + '" style="max-width:92vw;border-radius:16px;"></div></body>');
      } else {
        window.location.href = img.src;
      }
    } catch(e) {
      window.location.href = img.src;
    }
  }
}

// 📲 មុខងារផ្ញើ ឬចែករំលែកវិក្កយបត្រតាម Telegram / App ផ្សេងៗ
async function sharePOSReceiptImage() {
  var img = document.getElementById('posModalReceiptImg');
  if (!img || !img.src) return;

  try {
    var res = await fetch(img.src);
    var blob = await res.blob();
    var file = new File([blob], 'KC-Receipt-' + Date.now() + '.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'វិក្កយបត្រ KC WATER',
        text: 'វិក្កយបត្រទូទាត់ប្រាក់ KC WATER'
      });
    } else {
      downloadPOSReceiptImage();
    }
  } catch(e) {
    downloadPOSReceiptImage();
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

// 📱 បិទ Sidebar ស្វ័យប្រវត្តិពេលចុចលើផ្ទៃខាងក្រៅ (ទាំងលើកុំព្យូទ័រ និងទូរស័ព្ទ)
document.addEventListener('click', function(e) {
  var sb = document.getElementById('sidebar');
  var toggleBtn = e.target.closest('[onclick="toggleSidebar()"]');
  if (!sb || sb.classList.contains('hidden-sidebar') || toggleBtn) return;
  if (!sb.contains(e.target)) {
    closeSidebar();
  }
});

// ==========================================
// 🔄 មុខងារ SMART REFRESH ១០០% (ទាញទាំងទិន្នន័យ & ទាញទាំងកូដថ្មី)
// - ចុច ១ ដង (Click)៖ ទាញទិន្នន័យថ្មីពី Database ភ្លាមៗ (០.២ វិនាទី)
// - ចុច ២ ដងញាប់ (Double-Click)៖ ទាញកូដថ្មីដែលទើបកែក្នុង VS Code មកដំណើរការ ១០០%
// ==========================================
var isAppRefreshingLock = false;

async function triggerAppSmartRefresh(forceHardReload) {
  // ⚡ ករណីទី ១៖ ចុច ២ ដងញាប់ (Double-Click) ➔ បង្ខំ Browser ទម្លាក់កូដចាស់ចោល ហើយទាញកូដថ្មីពី VS Code ភ្លាមៗ
  if (forceHardReload === true) {
    showToast("កំពុងទាញយកកូដមុខងារថ្មីពីឯកសារ...", "info");
    setTimeout(function() {
      // ប្រើ ?v=timestamp ដើម្បីកម្ទេច Cache ចាស់ក្នុង Browser មិនឱ្យសល់
      var cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
      window.location.href = cleanUrl;
    }, 300);
    return;
  }

  // ⚡ ករណីទី ២៖ ចុច ១ ដង (Single Click) ➔ ទាញទិន្នន័យពី Database Supabase (0.2s មិនបាច់ Reload ទំព័រ)
  if (isAppRefreshingLock) return;
  isAppRefreshingLock = true;

  var icon = document.getElementById('navRefreshSpinIcon');
  var btn = document.getElementById('navQuickRefreshBtn');
  if (icon) icon.classList.add('fa-spin');
  if (btn) btn.classList.add('opacity-60');

  showToast("កំពុងទាញយកទិន្នន័យថ្មី...", "info");

  try {
    // ១. បោសសម្អាត Cache ចាស់ៗក្នុង Memory
    if (typeof specialPrices !== 'undefined') specialPrices = [];
    allProducts = [];
    allCustomers = [];

    // ២. ទាញទិន្នន័យស្រស់ៗពី Supabase
    if (typeof fetchInitialPOSData === 'function') {
      await fetchInitialPOSData();
    }
    if (typeof loadSettingsAndTelegram === 'function') {
      await loadSettingsAndTelegram();
    }

    var role = (currentUser && currentUser.role) ? currentUser.role : '';
    var type = (currentUser && currentUser.type) ? currentUser.type : '';

    // ៣. ធ្វើបច្ចុប្បន្នភាពទិន្នន័យតាមតួនាទីគណនីនីមួយៗ
    // 🛵 ក. អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver)
    if (type === 'CompanyDriver') {
      if (typeof renderCompanyDeliveriesModule === 'function') {
        await renderCompanyDeliveriesModule(true);
      }
    }
    // 🏢 ខ. ម៉ូយប្រចាំ (Customer / Reseller)
    else if (role === 'Customer' || type === 'Regular' || type === 'Monthly') {
      if (document.getElementById('cpGrandTotalDue') && typeof fetchCustomerPortalData === 'function') {
        await fetchCustomerPortalData();
      }
      if (document.getElementById('chAllUnpaidTbody') && typeof loadAllUnpaidHistory === 'function') {
        var secUnpaid = document.getElementById('chSecUnpaid');
        var secItems = document.getElementById('chSecItems');
        if (secUnpaid && !secUnpaid.classList.contains('hidden')) {
          await loadAllUnpaidHistory();
        } else if (secItems && !secItems.classList.contains('hidden') && typeof fetchCustomHistoryByDate === 'function') {
          await fetchCustomHistoryByDate();
        }
      }
      if (document.getElementById('cbBottlesTbody') && typeof renderCustomerBottlesModule === 'function') {
        await renderCustomerBottlesModule();
      }
      if (document.getElementById('pGrid') && typeof rPG === 'function') {
        rPG();
        if (typeof rC === 'function') rC();
      }
    }
    // 🚚 គ. កូនចៅដកជំនួសមេ & អ្នកលក់
    else if (role === 'Driver' || role === 'Seller' || role === 'Cashier') {
      if (document.getElementById('pGrid') && typeof rPG === 'function') {
        rPG();
        if (typeof rC === 'function') rC();
      }
    }
    // 👑 ឃ. Admin (គ្រប់គ្រងគ្រប់ផ្ទាំង)
    else if (role === 'Admin') {
      if (typeof checkPendingOnlineOrdersBadge === 'function') {
        await checkPendingOnlineOrdersBadge();
      }
      if (document.getElementById('dashTodaySales') && typeof loadDashboardData === 'function') {
        await loadDashboardData();
      } else if (document.getElementById('pGrid') && typeof rPG === 'function') {
        rPG();
        if (typeof rC === 'function') rC();
      } else if (document.getElementById('stockModuleTableBody') && typeof renderStockTableRows === 'function') {
        renderStockTableRows();
      } else if (document.getElementById('todayUnpaidTbody') && typeof fetchSettlementOverviewData === 'function') {
        await fetchSettlementOverviewData();
        if (typeof loadSettlementDebtorsList === 'function') await loadSettlementDebtorsList();
      } else if (document.getElementById('expTableBody') && typeof fetchExpensesHistory === 'function') {
        await fetchExpensesHistory();
      } else if (document.getElementById('blTableBody') && typeof fetchBottleLoansData === 'function') {
        await fetchBottleLoansData();
      } else if (document.getElementById('usersModuleTableBody') && typeof fetchUsersModuleTable === 'function') {
        await fetchUsersModuleTable();
      } else if (document.getElementById('hubTabContent_ORDERS') && typeof loadOnlineHubOrdersTab === 'function') {
        loadOnlineHubOrdersTab();
      }
    }

    if (typeof playOrderChime === 'function') playOrderChime();
    showToast("✅ បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យចុងក្រោយជោគជ័យ!", "success");

  } catch(err) {
    showToast("កំហុស Refresh៖ " + err.message, "error");
  } finally {
    isAppRefreshingLock = false;
    if (icon) icon.classList.remove('fa-spin');
    if (btn) btn.classList.remove('opacity-60');
  }
}

// ==========================================================================
// 🔔 មជ្ឈមណ្ឌលជូនដំណឹងក្នុង POS (NOTIFICATION CENTER ENGINE)
// ==========================================================================

var lastKnownNotificationTotal = 0;

// ១. មុខងារទាញយក និងបង្ហាញចំនួនដំណឹងលើកណ្តឹង Navbar
async function updateNotificationCenterBadge() {
  var badge = document.getElementById('navNotificationTotalBadge');
  var bellBtn = document.getElementById('navNotificationBellBtn');
  if (!badge) return;

  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isCompanyDriver = (currentUser && currentUser.type === 'CompanyDriver');

  // លាក់កណ្តឹងពីម៉ូយធម្មតា
  if (!isAdmin && !isCompanyDriver) {
    if (bellBtn) bellBtn.classList.add('hidden');
    return;
  }
  if (bellBtn) bellBtn.classList.remove('hidden');

  try {
    var totalCount = 0;

    // ក. ប្រសិនបើជាអ្នកដឹកជញ្ជូនរោងចក្រ ➔ រាប់តែការងារដឹករបស់គាត់
    if (isCompanyDriver) {
      const { count } = await supabaseClient
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Assigned', 'Departed'])
        .ilike('driver_name', (currentUser.fullName || '').trim());
      
      totalCount = count || 0;

    // ខ. ប្រសិនបើជា Admin ➔ រាប់សរុបទាំង ៣ ប្រភេទ (Orders + Payments + Low Stock)
    } else if (isAdmin) {
      const [ordRes, payRes] = await Promise.all([
        supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabaseClient.from('pending_payments').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
      ]);

      var pendingOrders = ordRes.count || 0;
      var pendingPays = payRes.count || 0;

      var lowStockCount = 0;
      (allProducts || []).forEach(function(p) {
        if (p.type === 'ទិញគេ' && parseFloat(p.stock || 0) <= parseFloat(p.min_stock || 5)) {
          lowStockCount++;
        }
      });

      totalCount = pendingOrders + pendingPays + lowStockCount;
    }

    if (totalCount > 0) {
      badge.innerText = totalCount > 99 ? '99+' : totalCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    // បន្លឺសំឡេងរោទ៍ Chime បើមានដំណឹងថ្មីលោតឡើង
    if (totalCount > lastKnownNotificationTotal && lastKnownNotificationTotal !== 0) {
      if (typeof playOrderChime === 'function') playOrderChime();
    }
    lastKnownNotificationTotal = totalCount;

  } catch(e) {}
}

// ២. មុខងារបើកផ្ទាំង Pop-up មជ្ឈមណ្ឌលជូនដំណឹង
async function openNotificationCenterModal() {
  var existing = document.getElementById('notificationCenterModal');
  if (existing) existing.remove();

  var isAdmin = (currentUser && currentUser.role === 'Admin');

  var modalHtml = '<div id="notificationCenterModal" class="fixed inset-0 z-[7000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/65 backdrop-blur-xs" onclick="closeNotificationCenterModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-md p-5 space-y-3.5 text-center relative border border-slate-100 animate-in zoom-in-95 duration-200 my-auto max-h-[90dvh] flex flex-col">' +
      
      // ក្បាលផ្ទាំង
      '<div class="flex justify-between items-center border-b pb-2.5">' +
        '<div class="text-left">' +
          '<h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">' +
            '<i class="fas fa-bell text-amber-500"></i> មជ្ឈមណ្ឌលជូនដំណឹង (Notifications)' +
          '</h3>' +
          '<p class="text-[10px] text-slate-500 font-bold mt-0.5">ដំណឹងបន្ទាន់ដែលទាមទារការពិនិត្យ និងចាត់ចែង</p>' +
        '</div>' +
        '<button type="button" onclick="closeNotificationCenterModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 text-lg font-bold flex items-center justify-center">&times;</button>' +
      '</div>' +

      // តួខ្លួនបញ្ជីដំណឹង
      '<div id="notifCenterListArea" class="flex-1 overflow-y-auto space-y-2.5 text-left text-xs pr-1">' +
        '<div class="text-center py-8 text-slate-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1.5 text-amber-600"></i> កំពុងពិនិត្យដំណឹង...</div>' +
      '</div>' +

      // ប៊ូតុង Refresh & បិទ
      '<div class="grid grid-cols-2 gap-2 pt-1 border-t">' +
        '<button type="button" onclick="fetchNotificationCenterData()" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition flex items-center justify-center gap-1.5">' +
          '<i class="fas fa-sync-alt text-[10px]"></i> ពិនិត្យម្តងទៀត' +
        '</button>' +
        '<button type="button" onclick="closeNotificationCenterModal()" class="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs shadow-md active:scale-95 transition">' +
          'រួចរាល់ (បិទ)' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  await fetchNotificationCenterData();
}

function closeNotificationCenterModal() {
  var modal = document.getElementById('notificationCenterModal');
  if (modal) modal.remove();
}

// ៣. មុខងារទាញទិន្នន័យជាក់ស្តែងចូលក្នុង Pop-up
async function fetchNotificationCenterData() {
  var area = document.getElementById('notifCenterListArea');
  if (!area) return;

  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isCompanyDriver = (currentUser && currentUser.type === 'CompanyDriver');

  try {
    // 🛵 ក. សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ
    if (isCompanyDriver) {
      const { data: missions } = await supabaseClient
        .from('orders')
        .select('*')
        .in('status', ['Assigned', 'Departed'])
        .ilike('driver_name', (currentUser.fullName || '').trim())
        .order('created_at', { ascending: false });

      if (!missions || missions.length === 0) {
        area.innerHTML = '<div class="p-6 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 font-bold space-y-1">' +
          '<i class="fas fa-check-circle text-2xl text-emerald-600 mb-1 block"></i>' +
          '<b>គ្មានបេសកកម្មដែលនៅសល់ឡើយ!</b>' +
          '<p class="text-[10px] text-slate-500 font-normal">រាល់ពេល Admin ចាត់ចែងការងារថ្មី វានឹងលោតមកទីនេះភ្លាមៗ។</p>' +
        '</div>';
        return;
      }

      var mHtml = '';
      missions.forEach(function(m) {
        mHtml += '<div class="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1.5">' +
          '<div class="flex justify-between items-center">' +
            '<b class="text-xs text-blue-950 font-black"><i class="fas fa-motorcycle text-blue-600 mr-1"></i> ' + m.customer_name + '</b>' +
            '<span class="text-[9.5px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">' + m.status + '</span>' +
          '</div>' +
          '<div class="text-[11px] text-slate-700">📦 ' + m.items + '</div>' +
          '<div class="flex justify-between items-center pt-1 border-t border-blue-200/60">' +
            '<b class="text-emerald-700 font-black">៛ ' + Number(m.total || 0).toLocaleString() + '</b>' +
            '<button type="button" onclick="closeNotificationCenterModal(); loadModule(\'CompanyDeliveries\');" class="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px] active:scale-95 transition">ទៅកាន់បេសកកម្ម ➔</button>' +
          '</div>' +
        '</div>';
      });
      area.innerHTML = mHtml;
      return;
    }

    // 👑 ខ. សម្រាប់ Admin ➔ ទាញយកទាំង ៣ ប្រភេទ
    const [ordRes, payRes] = await Promise.all([
      supabaseClient.from('orders').select('*').eq('status', 'Pending').order('created_at', { ascending: false }),
      supabaseClient.from('pending_payments').select('*').eq('status', 'Pending').order('created_at', { ascending: false })
    ]);

    var orders = ordRes.data || [];
    var payments = payRes.data || [];
    var lowStockItems = [];

    (allProducts || []).forEach(function(p) {
      if (p.type === 'ទិញគេ' && parseFloat(p.stock || 0) <= parseFloat(p.min_stock || 5)) {
        lowStockItems.push(p);
      }
    });

    var hasAny = (orders.length > 0 || payments.length > 0 || lowStockItems.length > 0);

    if (!hasAny) {
      area.innerHTML = '<div class="p-6 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 font-bold space-y-1">' +
        '<i class="fas fa-circle-check text-3xl text-emerald-600 mb-1 block"></i>' +
        '<b class="text-xs sm:text-sm">គ្មានដំណឹងបន្ទាន់ឡើយ!</b>' +
        '<p class="text-[10.5px] text-slate-500 font-normal">ប្រព័ន្ធកំពុងដំណើរការយ៉ាងរលូន គ្មានការកុម្ម៉ង់ ឬសំណើបង់ប្រាក់រង់ចាំឡើយ។</p>' +
      '</div>';
      return;
    }

    var html = '';

    // ១. ផ្នែកការកុម្ម៉ង់ Online ថ្មីៗ
    if (orders.length > 0) {
      html += '<div class="space-y-1.5">' +
        '<div class="flex justify-between items-center text-[11px] font-black text-amber-950 uppercase">' +
          '<span><i class="fas fa-truck-fast text-amber-600 mr-1"></i> កុម្ម៉ង់ Online រង់ចាំចាត់ចែង (' + orders.length + ')</span>' +
          '<button type="button" onclick="closeNotificationCenterModal(); openOnlineOrdersModal();" class="text-blue-600 underline font-bold">មើលទាំងអស់</button>' +
        '</div>';
      orders.slice(0, 3).forEach(function(o) {
        html += '<div class="p-2.5 bg-amber-50/80 border border-amber-300 rounded-2xl flex justify-between items-center gap-2">' +
          '<div class="min-w-0 flex-1">' +
            '<b class="text-xs text-amber-950 truncate block">' + o.customer_name + ' (📞 ' + (o.phone || '-') + ')</b>' +
            '<span class="text-[10px] text-amber-800 truncate block">' + o.items + '</span>' +
          '</div>' +
          '<button type="button" onclick="closeNotificationCenterModal(); openOnlineOrdersModal();" class="px-2.5 py-1.5 bg-amber-600 text-white rounded-xl font-black text-[10px] shrink-0 active:scale-95 transition">ចាត់ចែង</button>' +
        '</div>';
      });
      html += '</div>';
    }

    // ២. ផ្នែកសំណើទូទាត់ប្រាក់ពីម៉ូយ
    if (payments.length > 0) {
      html += '<div class="space-y-1.5 pt-1 border-t border-slate-100">' +
        '<div class="flex justify-between items-center text-[11px] font-black text-blue-950 uppercase">' +
          '<span><i class="fas fa-wallet text-blue-600 mr-1"></i> សំណើបង់ប្រាក់ពីម៉ូយ (' + payments.length + ')</span>' +
          '<button type="button" onclick="closeNotificationCenterModal(); loadModule(\'Settlement\');" class="text-blue-600 underline font-bold">ទៅផ្ទាំងទូទាត់</button>' +
        '</div>';
      payments.slice(0, 3).forEach(function(pm) {
        html += '<div class="p-2.5 bg-blue-50/80 border border-blue-300 rounded-2xl flex justify-between items-center gap-2">' +
          '<div class="min-w-0 flex-1">' +
            '<b class="text-xs text-blue-950 truncate block">' + pm.customer_name + '</b>' +
            '<span class="text-[10px] text-emerald-800 font-bold block">៛ ' + Number(pm.khr_total || 0).toLocaleString() + ' (' + pm.method + ')</span>' +
          '</div>' +
          '<button type="button" onclick="closeNotificationCenterModal(); loadModule(\'Settlement\');" class="px-2.5 py-1.5 bg-blue-600 text-white rounded-xl font-black text-[10px] shrink-0 active:scale-95 transition">ផ្ទៀងផ្ទាត់</button>' +
        '</div>';
      });
      html += '</div>';
    }

    // ៣. ផ្នែកទំនិញជិតអស់ស្តុក
    if (lowStockItems.length > 0) {
      html += '<div class="space-y-1.5 pt-1 border-t border-slate-100">' +
        '<div class="flex justify-between items-center text-[11px] font-black text-rose-950 uppercase">' +
          '<span><i class="fas fa-boxes-stacked text-rose-600 mr-1"></i> ទំនិញជិតអស់ស្តុក (' + lowStockItems.length + ')</span>' +
          '<button type="button" onclick="closeNotificationCenterModal(); loadModule(\'StockRep\');" class="text-rose-600 underline font-bold">មើលស្តុក</button>' +
        '</div>';
      lowStockItems.slice(0, 3).forEach(function(pr) {
        var isZero = parseFloat(pr.stock || 0) <= 0;
        html += '<div class="p-2.5 bg-rose-50/70 border border-rose-200 rounded-2xl flex justify-between items-center gap-2">' +
          '<div class="min-w-0 flex-1">' +
            '<b class="text-xs text-rose-950 truncate block">' + pr.name + '</b>' +
            '<span class="text-[10px] font-black ' + (isZero ? 'text-red-600' : 'text-rose-700') + '">' + (isZero ? 'អស់ស្តុក (០)' : 'សល់ត្រឹម ' + pr.stock) + '</span>' +
          '</div>' +
          '<button type="button" onclick="closeNotificationCenterModal(); openQuickRestockModal(\'' + pr.id + '\', \'' + pr.name.replace(/'/g, "\\'") + '\', ' + (pr.cost || 0) + ');" class="px-2.5 py-1.5 bg-rose-600 text-white rounded-xl font-black text-[10px] shrink-0 active:scale-95 transition">+ បញ្ចូល</button>' +
        '</div>';
      });
      html += '</div>';
    }

    area.innerHTML = html;

  } catch(e) {
    area.innerHTML = '<div class="text-center py-4 text-red-500 font-bold text-xs">កំហុស៖ ' + e.message + '</div>';
  }
}

// 🔄 ដំណើរការពិនិត្យដំណឹងស្វ័យប្រវត្តរៀងរាល់ ២០ វិនាទីម្តង
setInterval(updateNotificationCenterBadge, 20000);
window.addEventListener('load', function() {
  setTimeout(updateNotificationCenterBadge, 1500);
});

// ==========================================================================
// ⚡ ប៊ូតុងអណ្តែត «លក់រហ័ស» រាងមូល 48px រលូន ១០០% (SMOOTH ROUND CHATHEAD)
// ==========================================================================
var previousActiveModuleBeforeQuickSale = "Dashboard";
var currentActiveModuleTracking = "Dashboard";
var fabIsDragging = false;
var fabHasMoved = false;
var fabStartX = 0;
var fabStartY = 0;
var fabInitialLeft = 0;
var fabInitialTop = 0;

// 🔄 ១. ធ្វើបច្ចុប្បន្នភាពរូបរាងប៊ូតុង (⚡ លក់រហ័ស VS ↩️ ត្រឡប់ក្រោយ - រាងមូលស្អាត គ្មានធ្លាក់អក្សរ)
function updateFabButtonState() {
  var fabBtn = document.getElementById('btnInsideQuickSaleFab');
  var fabIcon = document.getElementById('fabIconEl');
  if (!fabBtn || !fabIcon) return;

  var isCurrentlyOnPos = (document.getElementById('pGrid') !== null);
  if (fabBtn.dataset.lastPosState === String(isCurrentlyOnPos)) return;
  fabBtn.dataset.lastPosState = String(isCurrentlyOnPos);

  if (isCurrentlyOnPos) {
    // ពេលនៅ POS ➔ បង្ហាញព្រួញត្រឡប់ក្រោយ ↩️ ពណ៌ខ្មៅរលោង
    fabBtn.className = "flex items-center justify-center w-12 h-12 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-full shadow-2xl border-2 border-white/80 active:scale-90 transition cursor-pointer";
    fabIcon.className = "fas fa-arrow-left text-amber-300 text-base";
    fabBtn.title = "ត្រឡប់ទៅកាន់៖ " + previousActiveModuleBeforeQuickSale;
  } else {
    // ពេលនៅទំព័រផ្សេង ➔ បង្ហាញផ្លេកបន្ទោរ ⚡ ពណ៌ខៀវស្អាត
    fabBtn.className = "flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-full shadow-2xl border-2 border-white/90 active:scale-90 transition cursor-pointer";
    fabIcon.className = "fas fa-bolt text-yellow-300 text-base animate-pulse";
    fabBtn.title = "ចុចចូលលក់ POS ភ្លាមៗ (អូសឡើងចុះ ឬឆ្វេងស្តាំបាន)";
  }
}

// 🎯 ២. មុខងារចុចប្តូរទៅ POS ឬ ត្រឡប់មកការងារចាស់វិញ (លុប Toast ក្រហមរំខានចោល)
function handleQuickSaleShortcutAction() {
  var isCurrentlyOnPos = (document.getElementById('pGrid') !== null);

  if (isCurrentlyOnPos) {
    var target = previousActiveModuleBeforeQuickSale || "Dashboard";
    if (typeof loadModule === 'function') {
      loadModule(target);
    }
  } else {
    // ចងចាំទំព័រដែលកំពុងបើកមុននឹងចូល POS
    if (typeof currentActiveModuleTracking !== 'undefined') {
      previousActiveModuleBeforeQuickSale = currentActiveModuleTracking;
    }
    if (typeof loadModule === 'function') {
      loadModule('POS');
    }
  }
}

// ==========================================================================
// ⚡ បង្កើតប៊ូតុងអណ្តែត (រាងមូលតូចស្អាត មិនបាំងទិន្នន័យ មិនបាំង Menu)
// ==========================================================================
function initDraggableQuickSaleFab() {
  var mainApp = document.getElementById('mainApp');
  if (!mainApp || mainApp.classList.contains('hidden')) return;

  // 🛡️ សុវត្ថិភាពដាច់ខាត៖ សម្រាប់តែ ADMIN តែម្នាក់គត់!
  if (!currentUser || currentUser.role !== 'Admin') {
    var oldFab = document.getElementById('floatingQuickSaleFab');
    if (oldFab) oldFab.remove();
    return;
  }

  // សម្អាត Pop-up ចាស់ចោលជាស្ថាពរ
  var oldBrokenModal = document.getElementById('quickPosModalOverlay');
  if (oldBrokenModal) oldBrokenModal.remove();

  if (document.getElementById('floatingQuickSaleFab')) return;

  var savedTop = localStorage.getItem('kc_fab_top_pos') || (window.innerHeight * 0.65) + 'px';
  var savedSide = localStorage.getItem('kc_fab_side') || 'right';
  var sideStyle = (savedSide === 'left') ? 'left:12px; right:auto;' : 'right:12px; left:auto;';

  // 🌟 ប៊ូតុងរាងមូលសុទ្ធ 48px (Z-Index 1900 នៅក្រោម Sidebar Menu កុំឱ្យបាំង)
  var fabHtml = '<div id="floatingQuickSaleFab" style="top:' + savedTop + '; ' + sideStyle + '" class="fixed z-[1900] select-none touch-none">' +
    '<button type="button" id="btnInsideQuickSaleFab" onclick="onFabClickAction(event)" class="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-full shadow-2xl border-2 border-white/90 active:scale-90 transition cursor-pointer">' +
      '<i id="fabIconEl" class="fas fa-bolt text-yellow-300 text-base animate-pulse"></i>' +
    '</button>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', fabHtml);

  var fab = document.getElementById('floatingQuickSaleFab');
  if (!fab) return;

  function onDragStart(clientX, clientY) {
    fabIsDragging = true;
    fabHasMoved = false;
    fabStartX = clientX;
    fabStartY = clientY;
    var rect = fab.getBoundingClientRect();
    fabInitialLeft = rect.left;
    fabInitialTop = rect.top;
    fab.style.transition = 'none';
  }

  function onDragMove(clientX, clientY) {
    if (!fabIsDragging) return;
    var deltaX = clientX - fabStartX;
    var deltaY = clientY - fabStartY;

    if (Math.hypot(deltaX, deltaY) > 8) {
      fabHasMoved = true;
      var newLeft = fabInitialLeft + deltaX;
      var newTop = fabInitialTop + deltaY;

      var minTop = 60;
      var maxTop = window.innerHeight - 60;
      newTop = Math.max(minTop, Math.min(newTop, maxTop));

      fab.style.top = newTop + 'px';
      fab.style.left = newLeft + 'px';
      fab.style.right = 'auto';
    }
  }

  function onDragEnd() {
    if (!fabIsDragging) return;
    fabIsDragging = false;
    fab.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    if (fabHasMoved) {
      // តោងគែមឆ្វេង ឬស្តាំស្វ័យប្រវត្តិ
      var rect = fab.getBoundingClientRect();
      var isCloserToLeft = (rect.left + rect.width / 2) < (window.innerWidth / 2);

      if (isCloserToLeft) {
        fab.style.left = '12px';
        fab.style.right = 'auto';
        localStorage.setItem('kc_fab_side', 'left');
      } else {
        fab.style.left = 'auto';
        fab.style.right = '12px';
        localStorage.setItem('kc_fab_side', 'right');
      }

      localStorage.setItem('kc_fab_top_pos', fab.style.top);
    } else {
      handleQuickSaleShortcutAction();
    }
  }

  // 📱 Touch លើទូរស័ព្ទដៃ
  fab.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches[0]) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (fabIsDragging && e.touches && e.touches[0]) onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchend', onDragEnd);

  // 🖱️ Mouse លើកុំព្យូទ័រ
  fab.addEventListener('mousedown', function(e) {
    onDragStart(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', function(e) {
    if (fabIsDragging) onDragMove(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', onDragEnd);

  updateFabButtonState();
}

function onFabClickAction(e) {
  if (fabHasMoved) {
    e.preventDefault();
    return;
  }
  handleQuickSaleShortcutAction();
}
