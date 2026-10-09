/** ==========================================================================
 *  KC WATER POS SYSTEM - CORE ENGINE (pos-core.js)
 *  (Authentication, Dashboard & Role-Based POS System)
 *  ========================================================================== */

var specialPrices = [];

// ==========================================
// ១. AUTHENTICATION & LOGIN (បែងចែកសិទ្ធិ ROLE-BASED)
// ==========================================
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
      .from('users')
      .select('*')
      .eq('username', u)
      .eq('password', p)
      .maybeSingle();

    if (error) throw error;

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
        // 🚚 សម្រាប់អ្នកលក់បន្ត (Reseller) ➔ ចូលទំព័រដើមរបស់គាត់ផ្ទាល់
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

// 📱 បែងចែកម៉ឺនុយ SIDEBAR & លាក់ប៊ូតុង ONLINE ចេញពី RESELLER
function renderSidebarMenu() {
  var sNav = document.getElementById('sidebarMenuContainer');
  if (!sNav) return;
  var html = '';

  var isAdminOrSeller = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Seller'));
  var isReseller = (currentUser.role === 'Customer' || currentUser.type === 'Regular' || currentUser.type === 'Monthly');
  var isCompanyDriver = (currentUser.type === 'CompanyDriver');
  var isDriver = (currentUser.role === 'Driver');

  // 🚫 ពិនិត្យសិទ្ធិ៖ បង្ហាញប៊ូតុង «កុម្ម៉ង់ Online» លើក្បាលទំព័រតែសម្រាប់ Admin & Seller ប៉ុណ្ណោះ (លាក់ចេញពី Reseller ជាដាច់ខាត!)
  var navOrderBtn = document.getElementById('navOnlineOrdersBtn');
  if (navOrderBtn) {
    if (isAdminOrSeller) {
      navOrderBtn.classList.remove('hidden');
      navOrderBtn.style.setProperty('display', 'inline-flex', 'important');
    } else {
      navOrderBtn.classList.add('hidden');
      navOrderBtn.style.setProperty('display', 'none', 'important');
    }
  }

  // ១. សម្រាប់ ADMIN
  if (currentUser.role === 'Admin') {
    html += '<button onclick="loadModule(\'Dashboard\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-chart-pie mr-3 w-5 text-center"></i>Dashboard</button>';
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-3 pb-1 opacity-80 tracking-wider">ការលក់ & ទូទាត់</div>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-shopping-cart mr-3 w-5 text-center"></i>ផ្ទាំងលក់ (POS)</button>';
    html += '<button onclick="loadModule(\'Settlement\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-calculator mr-3 w-5 text-center"></i>ទូទាត់លុយ</button>';
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

  // ២. 🚚 សម្រាប់អ្នកលក់បន្ត (RESELLER / CUSTOMER)
  } else if (isReseller) {
    html += '<div class="text-[10px] font-bold text-green-300 uppercase px-3 pt-2 pb-1 opacity-80 tracking-wider">គណនីម៉ូយប្រចាំ</div>';
    html += '<button onclick="loadModule(\'CustPortal\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-house mr-3 w-5 text-center text-emerald-300"></i>ទំព័រដើមរបស់ខ្ញុំ</button>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-shopping-cart mr-3 w-5 text-center text-emerald-300"></i>ផ្ទាំងដកទំនិញ</button>';
    html += '<button onclick="loadModule(\'CustHistory\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-history mr-3 w-5 text-center text-emerald-300"></i>ប្រវត្តិដកទំនិញ</button>';
    html += '<button onclick="loadModule(\'CustBottles\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-dolly mr-3 w-5 text-center text-emerald-300"></i>សំបកធុងកំពុងខ្ចី</button>';

  // ៣. 🛵 សម្រាប់កូនចៅដកទឹកជំនួសមេ
  } else if (isDriver) {
    html += '<div class="text-[10px] font-bold text-amber-300 uppercase px-3 pt-2 pb-1 opacity-90 tracking-wider">ដកទឹកជំនួសមេ៖ ' + (currentUser.linkedBoss || '') + '</div>';
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-truck mr-3 w-5 text-center text-amber-300"></i>ផ្ទាំងដកទំនិញ</button>';

  // ៤. 🚚 សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ
  } else if (isCompanyDriver) {
    html += '<div class="text-[10px] font-black text-emerald-300 uppercase px-3 pt-2 pb-1 opacity-90 tracking-wider">🛵 ការដឹកជញ្ជូន KC WATER</div>';
    html += '<button onclick="loadModule(\'CompanyDeliveries\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold text-white"><i class="fas fa-motorcycle mr-3 w-5 text-center text-emerald-300"></i>បេសកកម្មដឹកទឹកថ្ងៃនេះ</button>';

  // ៥. បុគ្គលិកលក់នៅកន្លែង
  } else {
    html += '<button onclick="loadModule(\'POS\')" class="w-full text-left p-3 hover:bg-green-700 rounded-xl transition flex items-center font-bold"><i class="fas fa-shopping-cart mr-3 w-5 text-center"></i>ផ្ទាំងលក់ (POS)</button>';
  }

  html += '<hr class="border-green-800 my-3">';
  html += '<button onclick="logout()" class="w-full text-left p-3 text-red-300 hover:bg-red-800 rounded-xl transition flex items-center font-bold"><i class="fas fa-sign-out-alt mr-3 w-5 text-center"></i>ចាកចេញ</button>';
  sNav.innerHTML = html;
}
function loadModule(name) {
  closeSidebar();
  
  // ការពារសិទ្ធិ៖ មិនឱ្យម៉ូយ ឬអ្នកដឹក ចូលមើល Dashboard, ទូទាត់លុយ ឬការកំណត់
  var isRestricted = (currentUser.role !== 'Admin' && currentUser.role !== 'Seller');
  if (isRestricted && (name === 'Dashboard' || name === 'Settlement' || name === 'Stock' || name === 'StockRep' || name === 'Expenses' || name === 'Customers' || name === 'MonthlyRep' || name === 'Reports' || name === 'Settings')) {
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
// 📊 ២. ផ្ទាំង DASHBOARD (សម្រាប់ ADMIN)
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
      '<div class="card p-5 border-t-4 border-blue-600 shadow-lg mb-0"><h3 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-boxes text-blue-600"></i>ចំនួនទឹក/ទំនិញដកលក់ថ្ងៃនេះ</h3><div id="dashProductQtyArea" class="space-y-2 text-xs">កំពុងគណនា...</div></div>' +
      '<div class="card p-5 border-t-4 border-orange-500 shadow-lg mb-0"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-2"><i class="fas fa-boxes-stacked text-orange-500 text-base"></i> ស្តុកទំនិញក្នុងឃ្លាំង & ដំណឹងជិតអស់</h3><button onclick="loadModule(\'StockRep\')" class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold border border-orange-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"><i class="fas fa-arrow-up-right-from-square text-[10px]"></i> របាយការណ៍ស្តុក</button></div><div id="dashStockAlertArea" class="space-y-2 text-xs">កំពុងឆែកមើលស្តុក...</div></div>' +
    '</div>' +
    '<div class="card p-5 border-t-4 border-gray-700 shadow-lg mb-0"><div class="flex justify-between items-center mb-3"><h3 class="font-extrabold text-gray-800 text-xs sm:text-sm flex items-center gap-2"><i class="fas fa-clock-rotate-left text-blue-600 text-base"></i> ប្រតិបត្តិការដកទំនិញថ្ងៃនេះ (ពេញមួយថ្ងៃ)</h3><span id="dashRecentCountBadge" class="bg-blue-100 text-blue-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">0 លើក</span></div><div class="overflow-x-auto max-h-[250px] overflow-y-auto rounded-xl border border-gray-200 shadow-inner"><table class="w-full text-left text-xs border-collapse"><thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-2xs"><tr><th class="p-2.5">ម៉ោង</th><th class="p-2.5">អតិថិជន</th><th class="p-2.5">ទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">ស្ថានភាព</th></tr></thead><tbody id="dashRecentTbody"><tr><td colspan="6" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody></table></div></div>' +
  '</div>';

  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    var now = new Date();
    var todayStr = now.toISOString().split('T')[0];
    var firstDayMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: monthTrans } = await supabaseClient
      .from('transactions')
      .select('*')
      .gte('created_at', firstDayMonthStr + 'T00:00:00Z')
      .order('created_at', { ascending: false });

    const { data: todaySettles } = await supabaseClient
      .from('settlements')
      .select('*')
      .gte('settled_at', todayStr + 'T00:00:00Z');

    const { data: monthExpenses } = await supabaseClient
      .from('expenses')
      .select('*')
      .gte('created_at', firstDayMonthStr + 'T00:00:00Z');

    const { data: unpaids } = await supabaseClient
      .from('transactions')
      .select('total')
      .eq('status', 'Unpaid');

    var todaySalesKHR = 0, todayCashInHand = 0, todayBankAba = 0, monthSalesKHR = 0, monthCOGS = 0;
    var todayProdQty = {}, todayRecentSales = [];

    (monthTrans || []).forEach(function(t) {
      var isToday = String(t.created_at).startsWith(todayStr);
      var tot = parseFloat(t.total || 0);
      var qty = parseFloat(t.qty || 0);
      monthSalesKHR += tot;

      var pObj = allProducts.find(p => p.name === t.product_name);
      if (pObj && pObj.type === 'ទិញគេ' && pObj.cost > 0) {
        monthCOGS += (qty * parseFloat(pObj.cost));
      }

      if (isToday) {
        todaySalesKHR += tot;
        var paid = parseFloat(t.paid_khr || 0);
        if (t.payment_method === 'ABA') todayBankAba += paid;
        else todayCashInHand += paid;

        // 🎯 ទាំងផលិតឯង និងទិញគេ បង្ហាញចំនួនដែលលក់ចេញថ្ងៃនេះនៅទីនេះ!
        if (t.product_name) todayProdQty[t.product_name] = (todayProdQty[t.product_name] || 0) + qty;
        todayRecentSales.push(t);
      }
    });

    (todaySettles || []).forEach(function(s) {
      todayCashInHand += parseFloat(s.cash_khr || 0);
      todayBankAba += parseFloat(s.scan_khr || 0);
    });

    var todayTotalCash = todayCashInHand + todayBankAba;

    var monthOperatingExpKHR = 0;
    (monthExpenses || []).forEach(function(e) {
      var amt = parseFloat(e.amount || 0);
      if (e.currency === 'USD') monthOperatingExpKHR += (amt * 4100);
      else if (e.currency === 'THB') monthOperatingExpKHR += (amt * 115);
      else monthOperatingExpKHR += amt;
    });

    var totalMonthExpensesKHR = monthOperatingExpKHR + monthCOGS;
    var netProfitKHR = monthSalesKHR - totalMonthExpensesKHR;

    var totalDebtKHR = 0;
    (unpaids || []).forEach(u => { totalDebtKHR += parseFloat(u.total || 0); });

    document.getElementById('dashTodaySales').innerText = '៛ ' + todaySalesKHR.toLocaleString();
    document.getElementById('dashTodayCashTotal').innerText = '៛ ' + todayTotalCash.toLocaleString();
    document.getElementById('dashTodayCashInHand').innerText = '៛ ' + todayCashInHand.toLocaleString();
    document.getElementById('dashTodayBankAba').innerText = '៛ ' + todayBankAba.toLocaleString();
    document.getElementById('dashTotalDebt').innerText = '៛ ' + totalDebtKHR.toLocaleString();
    document.getElementById('dashMonthSales').innerText = '៛ ' + monthSalesKHR.toLocaleString();
    document.getElementById('dashMonthExpenses').innerText = '៛ ' + totalMonthExpensesKHR.toLocaleString();
    document.getElementById('dashMonthExpDetail').innerText = '(ប្រតិបត្តិការ: ៛ ' + Math.round(monthOperatingExpKHR).toLocaleString() + (monthCOGS > 0 ? ' | ដើមទឹកយួរ: ៛ ' + Math.round(monthCOGS).toLocaleString() : '') + ')';

    var netEl = document.getElementById('dashNetProfit');
    var isPositive = netProfitKHR >= 0;
    netEl.innerText = (isPositive ? '+ ៛ ' : '- ៛ ') + Math.abs(Math.round(netProfitKHR)).toLocaleString();
    netEl.className = 'mt-2 font-black text-base sm:text-lg ' + (isPositive ? 'text-emerald-700' : 'text-red-600');

    // ១. ចំនួនទឹកដកលក់ថ្ងៃនេះ (ទាំងផលិតឯង និងទិញគេ)
    var pqArea = document.getElementById('dashProductQtyArea');
    var pqHtml = "";
    for (var p in todayProdQty) {
      pqHtml += '<div class="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border"><span class="font-bold text-gray-800">' + p + '</span><span class="px-3 py-1 bg-blue-100 text-blue-800 font-black rounded-lg">' + todayProdQty[p] + '</span></div>';
    }
    pqArea.innerHTML = pqHtml || '<p class="text-gray-400 italic text-center py-4">មិនទាន់មានការដកលក់ថ្ងៃនេះនៅឡើយទេ</p>';

    // ២. ដំណឹងស្តុក & ស្តុកឃ្លាំង (ចម្រាញ់យកតែទំនិញ «ទិញគេ» ប៉ុណ្ណោះ! ដក «ផលិតឯង» ចេញ)
    var alertArea = document.getElementById('dashStockAlertArea');
    var saHtml = "";
    var lowStockItems = [];
    var resaleItems = [];

    allProducts.forEach(function(prod) {
      // 🚫 បើជា «ផលិតឯង» (ទឹកធុង ២០L) មិនបាច់ដាក់ក្នុងដំណឹងស្តុកទិញចូលឡើយ
      if (prod.type === 'ទិញគេ') {
        var s = parseFloat(prod.stock || 0);
        var min = parseFloat(prod.min_stock || 5);
        resaleItems.push(prod);
        if (s <= min) {
          lowStockItems.push(prod);
        }
      }
    });

    // ក. បង្ហាញទំនិញជិតអស់ស្តុក (បើមាន)
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

    // ខ. បង្ហាញបញ្ជីស្តុកទំនិញទិញគេជាក់ស្តែងក្នុងឃ្លាំង
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

    // ៣. ប្រតិបត្តិការដកទំនិញថ្ងៃនេះពេញមួយថ្ងៃ
    var tbodyRecent = document.getElementById('dashRecentTbody');
    var badgeCount = document.getElementById('dashRecentCountBadge');
    if (badgeCount) badgeCount.innerText = todayRecentSales.length + " លើក";

    if (todayRecentSales.length === 0) {
      tbodyRecent.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">មិនទាន់មានប្រតិបត្តិការដកទំនិញថ្ងៃនេះនៅឡើយ</td></tr>';
    } else {
      var rHtml = '';
      todayRecentSales.forEach(function(r) {
        var timeStr = new Date(r.created_at).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
        rHtml += '<tr class="border-b hover:bg-gray-50"><td class="p-2.5 text-gray-500 whitespace-nowrap text-[10px]">' + timeStr + '</td><td class="p-2.5 font-bold text-gray-800">' + r.customer_name + '</td><td class="p-2.5">' + r.product_name + '</td><td class="p-2.5 text-center font-bold text-blue-700">' + r.qty + '</td><td class="p-2.5 text-right font-black text-green-700 whitespace-nowrap">៛ ' + Number(r.total).toLocaleString() + '</td><td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ' + (r.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800 border border-orange-200') + '">' + (r.status === 'Paid' ? 'បង់រួច' : 'ជំពាក់') + '</span></td></tr>';
      });
      tbodyRecent.innerHTML = rHtml;
    }
  } catch(e) {
    console.error("Dashboard error:", e);
  }
}
// ==========================================
// 🛒 ៣. ផ្ទាំងលក់ POS (ចាក់សោតាមតួនាទី - ROLE-BASED POS)
// ==========================================
function renderPOSModule() {
  var area = document.getElementById('contentArea');
  
  var isAdmin = (currentUser && currentUser.role === 'Admin');
  var isSeller = (currentUser && (currentUser.role === 'Seller' || currentUser.role === 'Cashier'));
  var isDriver = (currentUser && currentUser.role === 'Driver' && currentUser.type === 'Driver');
  var isReseller = (!isAdmin && !isSeller && !isDriver); // ម៉ូយប្រចាំ (Reseller / Monthly)

  var customerHeaderHTML = '';

  // ១. បើជា ADMIN ➔ មាន Dropdown រើសឈ្មោះម៉ូយ ឬ Walk-in
  if (isAdmin) {
    var custOptions = '<option value="Walk-in">🛒 -- លក់នៅកន្លែង (Walk-in) --</option>';
    allCustomers.forEach(function(c) {
      if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
        custOptions += '<option value="' + c.full_name + '">' + c.full_name + ' (' + (c.type === 'Monthly' ? 'ប្រចាំខែ' : 'អ្នកលក់បន្ត') + ')</option>';
      }
    });

    customerHeaderHTML = '<div class="card border-l-4 border-blue-500 py-3 shadow-sm mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">' +
      '<div class="flex-1 w-full sm:w-auto">' +
        '<label class="text-xs font-bold text-gray-500 block mb-1"><i class="fas fa-user-tag text-blue-600 mr-1.5"></i>ជ្រើសរើសអតិថិជន / ម៉ូយ</label>' +
        '<select id="posCustSelect" onchange="rPG(); cart=[]; rC();" class="w-full font-bold text-gray-800 border-2 border-blue-200 rounded-xl p-2.5 bg-white outline-none">' + custOptions + '</select>' +
      '</div>' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-200 active:scale-95 transition flex items-center gap-1 shadow-2xs self-end sm:self-auto"><i class="fas fa-sync-alt"></i> Refresh ស្តុក</button>' +
    '</div>';

  // ២. បើជាអ្នកលក់បន្ត (RESELLER) ➔ ចាក់សោជាប់ឈ្មោះគាត់តែម្នាក់គត់ (Locked)
  } else if (isReseller) {
    customerHeaderHTML = '<div class="card border-l-4 border-green-600 bg-green-50 p-3.5 mb-4 flex justify-between items-center">' +
      '<div>' +
        '<span class="text-[10px] text-green-700 font-bold uppercase tracking-wider block">គណនីអ្នកដកទំនិញ (Reseller)</span>' +
        '<b class="text-green-900 text-sm sm:text-base"><i class="fas fa-user mr-2"></i>អ្នកដកទំនិញ៖ ' + currentUser.fullName + '</b>' +
        '<input type="hidden" id="posCustSelect" value="' + currentUser.fullName + '">' +
      '</div>' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-2.5 py-1.5 bg-white hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold border border-green-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"><i class="fas fa-sync-alt"></i> Refresh ស្តុក</button>' +
    '</div>';

  // ៣. បើជាកូនចៅដកទឹកជំនួសមេ ➔ ចាក់សោជាប់ឈ្មោះមេគាត់
  } else if (isDriver) {
    customerHeaderHTML = '<div class="card border-l-4 border-amber-500 bg-amber-50 p-3.5 mb-4 flex justify-between items-center">' +
      '<div>' +
        '<span class="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">កូនចៅដកទឹកជំនួសមេ៖ ' + currentUser.linkedBoss + '</span>' +
        '<b class="text-amber-950 text-sm sm:text-base"><i class="fas fa-truck mr-2"></i>អ្នកមកដកផ្ទាល់៖ ' + currentUser.fullName + '</b>' +
        '<input type="hidden" id="posCustSelect" value="' + currentUser.linkedBoss + '">' +
      '</div>' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '</div>';

  // ៤. បុគ្គលិកលក់នៅកន្លែង
  } else {
    customerHeaderHTML = '<div class="card border-l-4 border-blue-600 bg-blue-50 p-3 mb-4 flex justify-between items-center">' +
      '<b class="text-blue-900 text-sm"><i class="fas fa-store mr-2"></i>លក់នៅកន្លែង (Walk-in)</b>' +
      '<input type="hidden" id="posCustSelect" value="Walk-in">' +
      '<button onclick="fetchInitialPOSData().then(rPG)" class="px-2.5 py-1 bg-white text-blue-700 rounded-lg text-xs font-bold border"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '</div>';
  }

  // ផ្នែកបង់លុយ (បង្ហាញតែ Admin និង Seller ប៉ុណ្ណោះ! លាក់ចោលសម្រាប់ Reseller & Driver)
  var paymentSectionHTML = '';
  if (isAdmin || isSeller) {
    paymentSectionHTML = '<div class="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3 mt-3">' +
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
    '</div>';
  }

  // ប៊ូតុង Submit (ប្តូរតាមតួនាទី)
  var submitBtnHTML = '';
  if (isReseller || isDriver) {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-4 py-4 text-base flex items-center justify-center w-full font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"><i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញ (កត់ចូលបញ្ជីជំពាក់)</button>';
  } else {
    submitBtnHTML = '<button onclick="confirmSale()" id="sBtn" class="btn-green shadow-xl active:scale-95 transition mt-4 py-3.5 text-base flex items-center justify-center w-full font-bold">រក្សាទុកការលក់ (Save Sale)</button>';
  }

  area.innerHTML = '<div class="max-w-4xl mx-auto space-y-4">' +
    customerHeaderHTML +
    '<div class="flex flex-wrap gap-2 pb-1">' +
      '<button onclick="setPosCategoryFilter(\'ALL\')" id="catTab_ALL" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-green-700 text-white shadow-md active:scale-95 transition"><i class="fas fa-border-all mr-1"></i> ទាំងអស់</button>' +
      '<button onclick="setPosCategoryFilter(\'BARREL\')" id="catTab_BARREL" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-wine-bottle text-blue-600 mr-1"></i> ទឹកធុង ២០L</button>' +
      '<button onclick="setPosCategoryFilter(\'PACK\')" id="catTab_PACK" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition"><i class="fas fa-box-open text-amber-600 mr-1"></i> ទឹកយួរ/ដប</button>' +
    '</div>' +
    '<div id="pGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5"></div>' +
    '<div class="card border-t-4 border-green-600 shadow-xl p-4 sm:p-5">' +
      '<div class="flex justify-between items-center mb-3"><h3 class="font-extrabold text-gray-800 text-sm sm:text-base flex items-center"><i class="fas fa-shopping-cart mr-2 text-green-600"></i>បញ្ជីទំនិញក្នុងកន្ត្រក</h3><span id="cartCountBadge" class="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold">0 មុខ</span></div>' +
      '<div class="overflow-x-auto rounded-xl border border-gray-100 mb-3"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">តម្លៃរាយ</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">លុប</th></tr></thead><tbody id="cItemsTableBody"><tr><td colspan="5" class="p-4 text-center text-gray-400 italic">កន្ត្រកទទេ</td></tr></tbody></table></div>' +
      '<div class="bg-green-50 p-3.5 rounded-xl border border-green-200 flex justify-between items-center text-green-900 mb-3 font-extrabold text-sm sm:text-base"><span>សរុបទឹកប្រាក់៖</span><span id="cTotalVal" class="text-green-700 text-base sm:text-lg">0 ៛</span></div>' +
      paymentSectionHTML +
      submitBtnHTML +
    '</div>' +
  '</div>';

  rPG();
  rC();
}

function setPosCategoryFilter(cat) {
  currentPosCategoryFilter = cat;
  ['ALL', 'BARREL', 'PACK'].forEach(function(t) {
    var btn = document.getElementById('catTab_' + t);
    if (!btn) return;
    if (t === cat) btn.className = "px-3.5 py-2 rounded-xl text-xs font-bold bg-green-700 text-white shadow-md active:scale-95 transition";
    else btn.className = "px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition";
  });
  rPG();
}

// 📦 បង្ហាញទំនិញលើ POS (គណនាតម្លៃពិសេស & ច្រោះទំនិញ MONTHLY)
function rPG() {
  var grid = document.getElementById('pGrid');
  if (!grid) return;

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');

  var custObj = allCustomers.find(c => c.full_name === custName);
  var isMonthly = (custObj && custObj.type === 'Monthly');

  var filtered = allProducts.filter(function(p) {
    if (p.channel === 'ONLINE') return false;

    // 🎯 ប្រសិនបើជាម៉ូយប្រចាំខែ (Monthly) ➔ បង្ហាញតែទំនិញណាដែលមានក្នុង customer_prices របស់គាត់ប៉ុណ្ណោះ!
    if (isMonthly) {
      return specialPrices.some(sp => sp.customer_name === custName && sp.product_name === p.name);
    }

    var nameLower = (p.name || '').toLowerCase();
    if (currentPosCategoryFilter === 'BARREL') return (nameLower.indexOf('ធុង') !== -1 || nameLower.indexOf('20l') !== -1);
    if (currentPosCategoryFilter === 'PACK') return (nameLower.indexOf('យួរ') !== -1 || nameLower.indexOf('ដប') !== -1);
    return true;
  });

  if (isMonthly && filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-10 text-center space-y-1"><p class="text-orange-600 font-bold text-xs"><i class="fas fa-exclamation-triangle mr-1"></i> មិនទាន់មានទំនិញកំណត់តម្លៃពិសេសសម្រាប់អតិថិជននេះនៅឡើយទេ!</p><span class="text-gray-400 text-[11px] block">សូម Admin ចូលទៅម៉ឺនុយ «គ្រប់គ្រងអតិថិជន» ដើម្បីកំណត់មុខទំនិញ និងតម្លៃពិសេសសម្រាប់គាត់</span></div>';
    return;
  }

  var html = '';
  filtered.forEach(function(p) {
    var sp = specialPrices.find(s => s.customer_name === custName && s.product_name === p.name);
    var unitPrice = sp ? parseFloat(sp.price) : parseFloat(p.price || 0);

    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var spBadge = sp ? '<span class="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-yellow-300">តម្លៃពិសេស</span>' : '';

    html += '<div onclick="openProductModal(\'' + p.id + '\')" class="bg-white p-3 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-green-400 transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-between text-center relative group">' +
      spBadge +
      '<span class="absolute top-2 right-2 bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">សល់ ' + p.stock + '</span>' +
      '<div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1"><img src="' + imgUrl + '" class="max-w-full max-h-full object-contain drop-shadow-sm"></div>' +
      '<h4 class="text-xs sm:text-sm font-bold text-gray-800 line-clamp-2 h-8 flex items-center justify-center">' + p.name + '</h4>' +
      '<p class="text-xs sm:text-sm font-extrabold text-green-600 mt-1">' + Number(unitPrice).toLocaleString() + ' ៛</p>' +
      '<div class="mt-2 w-full py-1.5 bg-green-50 group-hover:bg-green-600 text-green-700 group-hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"><i class="fas fa-plus text-[10px]"></i> រើសទិញ</div>' +
    '</div>';
  });

  grid.innerHTML = html || '<p class="col-span-full py-8 text-center text-gray-400 text-xs italic">មិនមានទំនិញក្នុងប្រភេទនេះឡើយ</p>';
}

function openProductModal(id) {
  var p = allProducts.find(item => item.id === id);
  if (!p) return;
  selectedModalProduct = p;

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');
  var sp = specialPrices.find(s => s.customer_name === custName && s.product_name === p.name);
  var unitPrice = sp ? parseFloat(sp.price) : parseFloat(p.price || 0);

  var isAdmin = (currentUser && currentUser.role === 'Admin');

  document.getElementById('modalProdImg').src = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
  document.getElementById('modalProdTitle').innerText = p.name;
  document.getElementById('modalStockStatusBadge').innerText = "សល់ក្នុងស្តុក៖ " + p.stock;
  
  var priceInp = document.getElementById('modalPriceInput');
  priceInp.value = unitPrice;
  // បើមិនមែន Admin ➔ ចាក់សោមិនឱ្យកែតម្លៃឡើយ
  priceInp.readOnly = !isAdmin;
  priceInp.className = !isAdmin ? 
    "w-full text-center text-xl font-black bg-gray-100 py-2 rounded-xl border border-gray-300 text-gray-700 outline-none select-none pointer-events-none" : 
    "w-full text-center text-xl font-black bg-white py-2 rounded-xl border border-blue-300 text-blue-900 outline-none";

  document.getElementById('modalQtyInput').value = 1;
  updateModalSubtotal();
  document.getElementById('productSelectModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productSelectModal').classList.add('hidden');
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
  var q = parseFloat(document.getElementById('modalQtyInput').value || 1);
  var p = parseFloat(document.getElementById('modalPriceInput').value || 0);
  document.getElementById('modalSubtotalText').innerText = Number(q * p).toLocaleString() + ' ៛';
}

function confirmAddToCart() {
  if (!selectedModalProduct) return;
  var q = parseInt(document.getElementById('modalQtyInput').value) || 1;
  var pr = parseFloat(document.getElementById('modalPriceInput').value) || 0;

  cart.push({
    id: selectedModalProduct.id,
    name: selectedModalProduct.name,
    price: pr,
    qty: q,
    currency: "KHR"
  });

  closeProductModal();
  rC();
  showToast("បានបញ្ចូលទំនិញក្នុងកន្ត្រក!", "success");
}

function rC() {
  var tbody = document.getElementById('cItemsTableBody');
  var totalValEl = document.getElementById('cTotalVal');
  var badge = document.getElementById('cartCountBadge');

  if (!tbody) return;
  if (cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">កន្ត្រកទទេ</td></tr>';
    if (totalValEl) totalValEl.innerText = "0 ៛";
    if (badge) badge.innerText = "0 មុខ";
    calcPOSChange();
    return;
  }

  var html = '', total = 0;
  cart.forEach(function(i, idx) {
    var sub = i.qty * i.price;
    total += sub;
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
  totalValEl.innerText = Number(total).toLocaleString() + " ៛";
  calcPOSChange();
}

function getCartTotal() {
  return cart.reduce((sum, i) => sum + (i.qty * i.price), 0);
}

function calcPOSChange() {
  var area = document.getElementById('posChangeArea');
  if (!area) return;
  var total = getCartTotal();
  var paid = parseFloat(document.getElementById('pK') ? document.getElementById('pK').value || 0 : 0);

  if (total === 0 || paid === 0) { area.classList.add('hidden'); return; }
  var diff = paid - total;

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
  var tot = getCartTotal();
  if (document.getElementById('pK')) document.getElementById('pK').value = tot > 0 ? tot : "";
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
  var total = getCartTotal();
  if (total === 0) { showToast("សូមជ្រើសរើសទំនិញក្នុងកន្ត្រកជាមុនសិន!", "error"); return; }
  document.getElementById('posKhqrAmountText').innerText = "៛ " + total.toLocaleString();
  document.getElementById('posKhqrModal').classList.remove('hidden');
}

function closePOSKHQR() { 
  document.getElementById('posKhqrModal').classList.add('hidden'); 
}

// ==========================================
// 💾 ៤. រក្សាទុកការលក់ (SUBMIT SALE ទៅ SUPABASE)
// ==========================================
var isSubmittingSaleLock = false;

async function confirmSale() {
  if (isSubmittingSaleLock) return;
  if (cart.length === 0) { showToast("កន្ត្រកទទេ! សូមរើសទំនិញជាមុនសិន", "error"); return; }

  var custNameEl = document.getElementById('posCustSelect');
  var custName = custNameEl ? custNameEl.value.trim() : (currentUser.fullName || '');

  var isResellerOrDriver = (currentUser.role !== 'Admin' && currentUser.role !== 'Seller');
  var total = getCartTotal();
  var paid = parseFloat(document.getElementById('pK') ? document.getElementById('pK').value || 0 : 0);
  
  // ✅ បើជា Reseller ឬ Driver ដកទឹក ➔ ស្ថានភាពគឺ Unpaid (ជំពាក់) ជានិច្ច!
  var status = isResellerOrDriver ? 'Unpaid' : ((custName === 'Walk-in' && paid >= total) ? 'Paid' : 'Unpaid');

  var tid = "TR-" + new Date().getTime();
  var btn = document.getElementById('sBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> កំពុងកត់ត្រា...';
  isSubmittingSaleLock = true;

  try {
    var rowsToInsert = [];
    cart.forEach(function(item) {
      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName,
        product_name: item.name,
        qty: item.qty,
        price: item.price,
        currency: "KHR",
        total: item.qty * item.price,
        paid_khr: isResellerOrDriver ? 0 : paid,
        recorded_by: currentUser.fullName || "Admin",
        status: status,
        payment_method: isResellerOrDriver ? 'Debt' : currentPosPayMethod
      });
    });

    const { error: insErr } = await supabaseClient.from('transactions').insert(rowsToInsert);
    if (insErr) throw insErr;

    // កាត់ស្តុកក្នុង Products
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var prodObj = allProducts.find(p => p.id === item.id);
      if (prodObj && prodObj.type === 'ទិញគេ') {
        var newStock = Math.max(0, parseFloat(prodObj.stock || 0) - item.qty);
        await supabaseClient.from('products').update({ stock: newStock }).eq('id', item.id);
        prodObj.stock = newStock;
      }
    }

    // ផ្ញើសារដំណឹង Telegram
    try {
      var itemSummary = cart.map(item => "  • " + item.name + " x " + item.qty + " = ៛ " + (item.qty * item.price).toLocaleString()).join("\n");
      var tgHeader = isResellerOrDriver ? "💧 <b>[KC WATER - ដកទំនិញថ្មី (ជំពាក់)]</b>" : "💧 <b>[KC WATER - លក់នៅកន្លែង POS]</b>";
      var tgMsg = tgHeader + "\n\n" +
                  "🆔 <b>កូដ៖</b> <code>" + tid + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "✍️ <b>អ្នកកត់ត្រា៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "📦 <b>ទំនិញ៖</b>\n" + itemSummary + "\n" +
                  "💰 <b>សរុប៖</b> <b>៛ " + total.toLocaleString() + "</b>\n" +
                  "📌 <b>ស្ថានភាព៖</b> <b>" + (status === 'Paid' ? 'ទូទាត់រួច' : 'ជំពាក់ / កត់ត្រាទុក') + "</b>\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}

    generateReceiptImage(tid, custName, total, (isResellerOrDriver ? 0 : paid), cart, isResellerOrDriver ? "ប័ណ្ណដកទំនិញ (WITHDRAWAL VOUCHER)" : "វិក្កយបត្រលក់ទំនិញ (RECEIPT)");

    cart = [];
    rC();
    if (document.getElementById('pK')) document.getElementById('pK').value = "";
    calcPOSChange();
    showToast(isResellerOrDriver ? "បានកត់ត្រាការដកទំនិញចូលបញ្ជីជំពាក់ជោគជ័យ!" : "បានកត់ត្រាការលក់ជោគជ័យ!", "success");
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

  } catch(err) {
    showToast("កំហុសកត់ត្រា៖ " + err.message, "error");
  } finally {
    isSubmittingSaleLock = false;
    btn.disabled = false;
    btn.innerHTML = isResellerOrDriver ? '<i class="fas fa-clipboard-check mr-2 text-lg"></i>កត់ត្រាការដកទំនិញ (កត់ចូលបញ្ជីជំពាក់)' : 'រក្សាទុកការលក់ (Save Sale)';
  }
}

// 🧾 បង្កើតរូបវិក្កយបត្រ
function generateReceiptImage(tid, cust, total, paid, items, titleText) {
  var dateStr = new Date().toLocaleString('km-KH');
  var change = Math.max(0, paid - total);

  var itemsHtml = '';
  (items || []).forEach(function(i) {
    var pName = i.name || i.product_name || "ទំនិញ";
    var tot = (i.qty * i.price);
    itemsHtml += '<tr style="border-bottom:1px dashed #cbd5e1;">' +
      '<td style="padding:6px 4px;">' + pName + '</td>' +
      '<td align="center" style="padding:6px 4px; font-weight:bold; color:#1d4ed8;">' + i.qty + '</td>' +
      '<td align="right" style="padding:6px 4px; font-weight:bold;">' + tot.toLocaleString() + ' ៛</td>' +
    '</tr>';
  });

  var h = '<div id="pos-canvas-box" style="width:360px; padding:20px; background:white; color:#0f172a; font-family:\'Battambang\', sans-serif; border-radius:12px;">' +
    '<div style="text-align:center; border-bottom:2px dashed #16a34a; padding-bottom:8px; margin-bottom:10px;">' +
      '<b style="font-size:16px; color:#15803d;">KC WATER</b><br>' +
      '<span style="font-size:11px; color:#64748b; font-weight:bold;">' + (titleText || 'វិក្កយបត្រ (RECEIPT)') + '</span>' +
    '</div>' +
    '<div style="font-size:10.5px; line-height:1.6; margin-bottom:10px; color:#334155;">' +
      'លេខកូដ៖ <b>' + tid + '</b><br>' +
      'អតិថិជន៖ <b>' + cust + '</b><br>' +
      'កាលបរិច្ឆេទ៖ ' + dateStr + '<br>' +
      'អ្នកកត់ត្រា៖ <b>' + (currentUser.fullName || "Admin") + '</b>' +
    '</div>' +
    '<table style="width:100%; font-size:11px; border-collapse:collapse; margin-bottom:10px;">' +
      '<tr style="background:#f1f5f9; color:#475569; border-bottom:1px solid #cbd5e1;"><th align="left" style="padding:5px 4px;">ទំនិញ</th><th align="center" style="padding:5px 4px;">ចំនួន</th><th align="right" style="padding:5px 4px;">សរុប</th></tr>' +
      itemsHtml +
    '</table>' +
    '<div style="background:#f0fdf4; padding:10px; border-radius:8px; font-size:11px; line-height:1.7; border:1px solid #bbf7d0;">' +
      '<div style="display:flex; justify-content:space-between; font-weight:bold;"><span>សរុបទឹកប្រាក់៖</span><b>៛ ' + total.toLocaleString() + '</b></div>' +
      (paid > 0 ? '<div style="display:flex; justify-content:space-between; color:#1d4ed8;"><span>ប្រាក់បានបង់៖</span><b>៛ ' + paid.toLocaleString() + '</b></div>' : '<div style="display:flex; justify-content:space-between; color:#c2410c; font-weight:bold;"><span>ស្ថានភាព៖</span><b>កត់ត្រាជំពាក់</b></div>') +
      (change > 0 ? '<div style="display:flex; justify-content:space-between; color:#15803d; font-weight:bold; border-top:1px dashed #86efac; padding-top:4px; margin-top:4px;"><span>ប្រាក់អាប់ជូនវិញ៖</span><b>៛ ' + change.toLocaleString() + '</b></div>' : '') +
    '</div>' +
    '<div style="text-align:center; margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:8px;">' +
      '<span style="font-size:9.5px; color:#64748b;">សូមអរគុណ! សូមអញ្ជើញមកពិសាម្តងទៀត 🙏</span>' +
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
