/** ==========================================================================
 *  KC WATER POS SYSTEM - REPORTS & STATEMENTS ENGINE (pos-reports.js)
 *  (Monthly Report, Smart Customer Statement, PDF A4, Debtors & Stock Valuation)
 *  ========================================================================== */

var stmtDataCache = null;
var stmtCurrentFilter = 'ALL';
var allDebtorsCache = [];

// ==========================================
// 📊 ១. របាយការណ៍ប្រចាំខែ & កាតគ្រី (MONTHLY & STATEMENT)
// ==========================================
function renderMonthlyRepModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  var now = new Date();
  var firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  var today = now.toISOString().split('T')[0];

  area.innerHTML = '<div class="max-w-4xl mx-auto space-y-4">' +
    '<div class="flex bg-white p-1.5 rounded-2xl border shadow-sm gap-1.5">' +
      '<button id="tabBtnCompany" onclick="switchRepTab(\'company\')" class="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-green-700 text-white shadow-md flex items-center justify-center gap-2"><i class="fas fa-chart-line"></i> របាយការណ៍អាជីវកម្មសរុប</button>' +
      '<button id="tabBtnCustomer" onclick="switchRepTab(\'customer\')" class="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-2"><i class="fas fa-user-tag"></i> កាតគ្រីអតិថិជនម្នាក់ៗ</button>' +
    '</div>' +
    
    // 🏢 កាតរបាយការណ៍រោងចក្រសរុប
    '<div id="secCompanyRep" class="space-y-4">' +
      '<div class="card border-t-4 border-green-700 shadow-xl p-5 mb-0">' +
        '<h3 class="font-extrabold text-green-900 text-base mb-3 flex items-center gap-2"><i class="fas fa-building text-green-600"></i>របាយការណ៍សរុបទូទាំងសហគ្រាស KC WATER</h3>' +
        '<div class="grid grid-cols-2 gap-3 mb-3">' +
          '<div><label class="text-[10px] font-bold text-gray-500 uppercase">ចាប់ពីថ្ងៃ</label><input type="date" id="compStartDate" value="' + firstDay + '" class="font-bold border p-2 rounded-xl w-full"></div>' +
          '<div><label class="text-[10px] font-bold text-gray-500 uppercase">ដល់ថ្ងៃ</label><input type="date" id="compEndDate" value="' + today + '" class="font-bold border p-2 rounded-xl w-full"></div>' +
        '</div>' +
        '<button onclick="fetchCompanySummaryFromSupabase()" class="btn-green shadow-lg flex items-center justify-center gap-2 py-3 text-sm font-bold"><i class="fas fa-filter"></i> គណនារបាយការណ៍អាជីវកម្ម</button>' +
      '</div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3" id="compCardsArea">' +
        '<div class="dash-card border-l-4 border-blue-600 p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">ចំណូលលក់សរុប</div><div id="compSalesTotal" class="mt-2 text-base sm:text-lg font-black text-blue-900">0 ៛</div></div>' +
        '<div class="dash-card border-l-4 border-green-600 p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">សាច់ប្រាក់ប្រមូលបាន</div><div id="compCashTotal" class="mt-2 text-base sm:text-lg font-black text-green-900">0 ៛</div></div>' +
        '<div class="dash-card border-l-4 border-red-500 p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">បំណុលជំពាក់ថ្មី</div><div id="compDebtTotal" class="mt-2 text-base sm:text-lg font-black text-red-700">0 ៛</div></div>' +
      '</div>' +
      '<div class="card border-t-4 border-blue-600 shadow-lg p-5 mb-0">' +
        '<h4 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-boxes-stacked text-blue-600"></i>បរិមាណទឹក និងទំនិញលក់បានសរុប</h4>' +
        '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-3">មុខទំនិញ</th><th class="p-3 text-center">ចំនួនលក់បាន</th></tr></thead><tbody id="compQtyTableBody"></tbody></table></div>' +
      '</div>' +
    '</div>' +

    // 👤 កាតកាតគ្រីអតិថិជន
    '<div id="secCustomerRep" class="space-y-4 hidden">' +
      '<div class="card border-t-4 border-green-700 shadow-xl p-5 mb-0">' +
        '<h3 class="font-extrabold text-green-900 text-base mb-3 flex items-center gap-2"><i class="fas fa-file-invoice text-green-600"></i>ស្វែងរកកាតគ្រីអតិថិជន</h3>' +
        '<div class="space-y-3">' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-600 uppercase block mb-1">ជ្រើសរើសឈ្មោះអតិថិជន</label>' +
            '<select id="custSelectDropdown" onchange="document.getElementById(\'custSearchInp\').value=this.value" class="font-bold text-blue-900 text-sm border-2 border-blue-200 rounded-xl p-2.5 w-full bg-white"></select>' +
          '</div>' +
          '<input type="text" id="custSearchInp" placeholder="🔍 ឬវាយឈ្មោះម៉ូយ..." class="font-bold border p-2.5 rounded-xl w-full text-xs">' +
          '<div class="grid grid-cols-2 gap-3">' +
            '<div><label class="text-[10px] font-bold text-gray-500 uppercase">ចាប់ពីថ្ងៃ</label><input type="date" id="custStartDate" value="' + firstDay + '" class="font-bold border p-2 rounded-xl w-full"></div>' +
            '<div><label class="text-[10px] font-bold text-gray-500 uppercase">ដល់ថ្ងៃ</label><input type="date" id="custEndDate" value="' + today + '" class="font-bold border p-2 rounded-xl w-full"></div>' +
          '</div>' +
          '<button onclick="fetchFullStatementFromSupabase()" class="btn-green shadow-lg flex items-center justify-center gap-2 py-3 text-sm font-bold"><i class="fas fa-file-invoice"></i> បង្ហាញកាតគ្រី</button>' +
        '</div>' +
      '</div>' +
      '<div id="statementReportContainer"></div>' +
    '</div>' +
  '</div>';

  populateCustSelectDropdown();
  fetchCompanySummaryFromSupabase();
}

function switchRepTab(tab) {
  var secComp = document.getElementById('secCompanyRep');
  var secCust = document.getElementById('secCustomerRep');
  var btnComp = document.getElementById('tabBtnCompany');
  var btnCust = document.getElementById('tabBtnCustomer');

  if (tab === 'company') {
    secComp.classList.remove('hidden'); secCust.classList.add('hidden');
    btnComp.className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-green-700 text-white shadow-md flex items-center justify-center gap-2';
    btnCust.className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-2';
  } else {
    secComp.classList.add('hidden'); secCust.classList.remove('hidden');
    btnCust.className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-green-700 text-white shadow-md flex items-center justify-center gap-2';
    btnComp.className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-2';
  }
}

function populateCustSelectDropdown() {
  var sel = document.getElementById('custSelectDropdown');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- រើសឈ្មោះម៉ូយ --</option>';
  allCustomers.forEach(function(c) {
    if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
      sel.innerHTML += '<option value="' + c.full_name + '">' + c.full_name + '</option>';
    }
  });
}

// ==========================================
// 🏢 គណនារបាយការណ៍អាជីវកម្មសរុប (ប្រើម៉ោងកម្ពុជា UTC+7 ពេញលេញ ២៤ ម៉ោង)
// ==========================================
async function fetchCompanySummaryFromSupabase() {
  var sd = document.getElementById('compStartDate').value;
  var ed = document.getElementById('compEndDate').value;
  if (!sd || !ed) return;

  try {
    // 🇰🇭 កំណត់ម៉ោងកម្ពុជា UTC+7 ចាប់ពី 00:00:00 ដល់ 23:59:59 នៃថ្ងៃដែលបានជ្រើសរើស
    var startIso = sd + 'T00:00:00+07:00';
    var endIso = ed + 'T23:59:59.999+07:00';

    // ១. ទាញទិន្នន័យប្រតិបត្តិការលក់ (Transactions) ក្នុងចន្លោះម៉ោងកម្ពុជា
    const { data: trans } = await supabaseClient
      .from('transactions')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // ២. ទាញទិន្នន័យសាច់ប្រាក់ដែលប្រមូលបានពីការទូទាត់បំណុល (Settlements) ក្នុងចន្លោះម៉ោងកម្ពុជា
    const { data: settles } = await supabaseClient
      .from('settlements')
      .select('*')
      .gte('settled_at', startIso)
      .lte('settled_at', endIso);

    var salesTotal = 0, cashTotal = 0, debtTotal = 0;
    var prodQty = {};

    // គណនាពីការលក់ទំនិញ
    if (trans) {
      trans.forEach(function(t) {
        var tot = parseFloat(t.total || 0);
        var paid = parseFloat(t.paid_khr || 0);
        salesTotal += tot;
        cashTotal += paid; // សាច់ប្រាក់បានទទួលពេលលក់ភ្លាមៗ
        if (t.status === 'Unpaid') debtTotal += tot;
        if (t.product_name) {
          prodQty[t.product_name] = (prodQty[t.product_name] || 0) + parseFloat(t.qty || 0);
        }
      });
    }

    // បូកបន្ថែមសាច់ប្រាក់ពីការទូទាត់បំណុលរបស់ម៉ូយ (Settlements)
    if (settles) {
      settles.forEach(function(s) {
        cashTotal += parseFloat(s.paid_khr || 0);
      });
    }

    document.getElementById('compSalesTotal').innerText = '៛ ' + salesTotal.toLocaleString();
    document.getElementById('compCashTotal').innerText = '៛ ' + cashTotal.toLocaleString();
    document.getElementById('compDebtTotal').innerText = '៛ ' + debtTotal.toLocaleString();

    var tbody = document.getElementById('compQtyTableBody');
    var html = '';
    for (var p in prodQty) {
      html += '<tr class="border-b hover:bg-gray-50"><td class="p-3 font-bold text-gray-800">' + p + '</td><td class="p-3 text-center font-black text-blue-700">' + prodQty[p].toLocaleString() + '</td></tr>';
    }
    tbody.innerHTML = html || '<tr><td colspan="2" class="p-4 text-center text-gray-400 italic">គ្មានការលក់ក្នុងចន្លោះថ្ងៃនេះ</td></tr>';
  } catch(e) {
    console.error("Company summary error:", e);
  }
}
async function fetchFullStatementFromSupabase() {
  var name = document.getElementById('custSearchInp').value.trim();
  var sd = document.getElementById('custStartDate').value;
  var ed = document.getElementById('custEndDate').value;
  var container = document.getElementById('statementReportContainer');

  if (!name || !sd || !ed) { showToast("សូមរើសឈ្មោះ និងកាលបរិច្ឆេទ!", "error"); return; }
  container.innerHTML = '<div class="text-center py-8 text-gray-400 italic text-xs"><i class="fas fa-spinner fa-spin text-green-600 text-base"></i> កំពុងទាញទិន្នន័យកាតគ្រី...</div>';

  try {
    // ១. ស្វែងរកជើងទឹកដកក្នុងចន្លោះថ្ងៃ
    const { data: items } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', name)
      .gte('created_at', sd + 'T00:00:00Z')
      .lte('created_at', ed + 'T23:59:59Z')
      .order('created_at', { ascending: true });

    // ២. ស្វែងរកការទូទាត់សងក្នុងចន្លោះថ្ងៃ
    const { data: payments } = await supabaseClient
      .from('settlements')
      .select('*')
      .eq('customer_name', name)
      .gte('settled_at', sd + 'T00:00:00Z')
      .lte('settled_at', ed + 'T23:59:59Z')
      .order('settled_at', { ascending: true });

    // ៣. ស្វែងរកបំណុលចាស់មុនថ្ងៃ Start (Settlement Balance)
    const { data: oldSet } = await supabaseClient
      .from('settlements')
      .select('balance_khr, settled_at')
      .eq('customer_name', name)
      .lt('settled_at', sd + 'T00:00:00Z')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    var prevDebt = oldSet ? parseFloat(oldSet.balance_khr || 0) : 0;
    var lastSetTime = oldSet ? oldSet.settled_at : null;

    // ៤. បូកបន្ថែមជើងទឹកជំពាក់ដែលកើតឡើងក្រោយ Settlement ចុងក្រោយ តែមុនថ្ងៃ Start Date
    var oldUnpaidQuery = supabaseClient
      .from('transactions')
      .select('total')
      .eq('customer_name', name)
      .eq('status', 'Unpaid')
      .lt('created_at', sd + 'T00:00:00Z');

    if (lastSetTime) {
      oldUnpaidQuery = oldUnpaidQuery.gt('created_at', lastSetTime);
    }

    const { data: extraUnpaid } = await oldUnpaidQuery;
    (extraUnpaid || []).forEach(function(u) {
      prevDebt += parseFloat(u.total || 0);
    });

    var totalPurchased = 0, totalPaidInMonth = 0;
    var unpaidCount = 0, unpaidTotal = 0;
    var productSummary = {};

    (items || []).forEach(function(i) {
      var tot = parseFloat(i.total || 0);
      var q = parseFloat(i.qty || 0);
      totalPurchased += tot;
      if (i.status === 'Unpaid') {
        unpaidCount++;
        unpaidTotal += tot;
      }
      if (i.product_name) {
        productSummary[i.product_name] = (productSummary[i.product_name] || 0) + q;
      }
    });

    (payments || []).forEach(function(p) {
      totalPaidInMonth += parseFloat(p.paid_khr || 0);
    });

    var finalBalance = Math.max(0, prevDebt + totalPurchased - totalPaidInMonth);

    stmtDataCache = {
      custName: name, sd: sd, ed: ed,
      items: items || [],
      payments: payments || [],
      prevDebt: prevDebt,
      totalPurchased: totalPurchased,
      totalPaid: totalPaidInMonth,
      finalBalance: finalBalance,
      unpaidCount: unpaidCount,
      unpaidTotal: unpaidTotal,
      productSummary: productSummary
    };

    stmtCurrentFilter = 'ALL';
    renderStatementReportUI();
  } catch(err) {
    container.innerHTML = '<div class="p-4 text-center text-red-500 font-bold">កំហុស៖ ' + err.message + '</div>';
  }
}

function setStatementFilter(filterType) {
  stmtCurrentFilter = filterType;
  renderStatementReportUI();
}

function renderStatementReportUI() {
  var res = stmtDataCache;
  var container = document.getElementById('statementReportContainer');
  if (!res || !container) return;

  var allCount = res.items.length;
  var unpaidCount = res.unpaidCount || 0;
  var paidCount = allCount - unpaidCount;

  // ១. បដាដំណឹងជំពាក់
  var alertBannerHtml = '';
  if (unpaidCount > 0) {
    alertBannerHtml = '<div onclick="setStatementFilter(\'UNPAID\')" class="cursor-pointer p-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-300 hover:border-orange-500 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 transition shadow-xs">' +
      '<div class="flex items-center gap-2.5">' +
        '<div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl shadow-inner">' +
          '<i class="fas fa-triangle-exclamation animate-bounce"></i>' +
        '</div>' +
        '<div>' +
          '<b class="text-xs sm:text-sm text-orange-950 block">⚠️ អតិថិជននេះមានទំនិញជំពាក់ចំនួន <span class="text-red-600 font-black">' + unpaidCount + ' ជើង</span></b>' +
          '<span class="text-[11px] text-orange-700 font-bold">ទឹកប្រាក់ជំពាក់ក្នុងខែនេះ៖ ៛ ' + res.unpaidTotal.toLocaleString() + '</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow active:scale-95 transition flex items-center gap-1.5">' +
        '<i class="fas fa-filter"></i> មើលតែជើងជំពាក់' +
      '</button>' +
    '</div>';
  } else {
    alertBannerHtml = '<div class="p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-green-900 text-xs font-bold">' +
      '<i class="fas fa-check-circle text-green-600 text-base"></i> អតិថិជននេះបានទូទាត់គ្រប់ចំនួនក្នុងខែនេះ (គ្មានជើងជំពាក់)' +
    '</div>';
  }

  // ២. ប្រអប់សង្ខេបបរិមាណទឹក
  var prodSummaryHtml = '';
  var prodKeys = Object.keys(res.productSummary || {});
  if (prodKeys.length > 0) {
    prodSummaryHtml = '<div class="bg-blue-50/80 p-3 rounded-2xl border border-blue-200 space-y-1.5">' +
      '<div class="text-xs font-black text-blue-950 flex items-center gap-1.5">' +
        '<i class="fas fa-cubes-stacked text-blue-600"></i> សរុបបរិមាណទឹកដែលបានដកក្នុងខែនេះ៖' +
      '</div>' +
      '<div class="flex flex-wrap gap-2 pt-0.5">';
    prodKeys.forEach(function(pKey) {
      var unitLabel = (pKey.indexOf("ធុង") !== -1) ? "ធុង" : (pKey.indexOf("យួរ") !== -1 ? "យួរ" : "ឯកតា");
      prodSummaryHtml += '<div class="bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs flex items-center gap-1.5">' +
        '<span class="text-xs text-gray-700 font-bold">' + pKey + '៖</span>' +
        '<b class="text-xs text-blue-800 font-black">' + Number(res.productSummary[pKey]).toLocaleString() + ' ' + unitLabel + '</b>' +
      '</div>';
    });
    prodSummaryHtml += '</div></div>';
  }

  // ៣. ប៊ូតុង Filter Tabs
  var filterTabsHtml = '<div class="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-2xl border">' +
    '<button type="button" onclick="setStatementFilter(\'ALL\')" class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ' + (stmtCurrentFilter === 'ALL' ? 'bg-blue-700 text-white shadow' : 'bg-transparent text-gray-600 hover:bg-gray-200') + '">' +
      'ទាំងអស់ (' + allCount + ')' +
    '</button>' +
    '<button type="button" onclick="setStatementFilter(\'UNPAID\')" class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ' + (stmtCurrentFilter === 'UNPAID' ? 'bg-orange-600 text-white shadow' : 'bg-transparent text-gray-600 hover:bg-gray-200') + '">' +
      '⚠️ តែជើងជំពាក់ (' + unpaidCount + ')' +
    '</button>' +
    '<button type="button" onclick="setStatementFilter(\'PAID\')" class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ' + (stmtCurrentFilter === 'PAID' ? 'bg-green-700 text-white shadow' : 'bg-transparent text-gray-600 hover:bg-gray-200') + '">' +
      '✅ ទូទាត់រួច (' + paidCount + ')' +
    '</button>' +
  '</div>';

  // ៤. តារាងជើងទឹកតាម Filter
  var filteredItems = res.items.filter(function(i) {
    if (stmtCurrentFilter === 'UNPAID') return i.status === 'Unpaid';
    if (stmtCurrentFilter === 'PAID') return i.status === 'Paid';
    return true;
  });

  var itemsHtml = '';
  filteredItems.forEach(function(item, idx) {
    var isUnpaid = (item.status === 'Unpaid');
    var dateStr = new Date(item.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
    var recText = item.recorded_by ? '<br><small class="text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 text-[9px] inline-block mt-0.5"><i class="fas fa-truck mr-1"></i>ដកដោយ: ' + item.recorded_by + '</small>' : '';

    itemsHtml += '<tr class="border-b ' + (isUnpaid ? 'bg-orange-50/40' : 'hover:bg-gray-50') + '">' +
      '<td class="p-2 text-center text-[10px]">' + (idx + 1) + '</td>' +
      '<td class="p-2 text-gray-500 text-[10px] whitespace-nowrap">' + dateStr + '</td>' +
      '<td class="p-2 font-bold text-gray-800">' + item.product_name + recText + '</td>' +
      '<td class="p-2 text-center font-bold text-blue-700">' + item.qty + '</td>' +
      '<td class="p-2 text-right text-gray-600">' + Number(item.price).toLocaleString() + '</td>' +
      '<td class="p-2 text-right font-black ' + (isUnpaid ? 'text-orange-700' : 'text-green-700') + '">' + Number(item.total).toLocaleString() + ' ៛</td>' +
      '<td class="p-2 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ' + (isUnpaid ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-green-100 text-green-800') + '">' + (isUnpaid ? 'ជំពាក់' : 'បង់រួច') + '</span></td>' +
    '</tr>';
  });

  var payHtml = '';
  if (res.payments && res.payments.length > 0) {
    payHtml += '<div class="p-3 bg-blue-50/80 border-t border-b border-blue-200 text-xs space-y-1"><b class="text-blue-900 block"><i class="fas fa-hand-holding-dollar mr-1"></i> ប្រាក់បានបង់សងក្នុងខែនេះ៖</b>';
    res.payments.forEach(function(p) {
      payHtml += '<div class="flex justify-between bg-white p-2 rounded-xl border border-blue-100 text-xs text-blue-900"><span>' + new Date(p.settled_at).toLocaleDateString('km-KH') + ' (' + p.pay_method + ' - ទទួល៖ ' + p.admin_name + ')</span><b class="text-blue-700 font-black">-៛ ' + Number(p.paid_khr).toLocaleString() + '</b></div>';
    });
    payHtml += '</div>';
  }

  container.innerHTML = '<div class="space-y-3 mt-4">' +
    alertBannerHtml +
    prodSummaryHtml +
    filterTabsHtml +

    '<div id="statementPrintableArea" class="card p-0 overflow-hidden shadow-2xl border border-gray-200 mb-0 bg-white">' +
      '<div class="bg-green-800 text-white p-5 text-center">' +
        '<b class="text-lg uppercase tracking-widest flex items-center justify-center gap-2"><i class="fas fa-file-invoice"></i> KC WATER - កាតគ្រីអតិថិជន</b>' +
        '<p class="text-xs mt-1 font-bold">ឈ្មោះអតិថិជន៖ ' + res.custName + '</p>' +
        '<p class="text-[10px] opacity-80 mt-0.5">គិតចាប់ពីថ្ងៃ៖ ' + res.sd + ' ដល់ ' + res.ed + '</p>' +
      '</div>' +

      '<div class="p-3 bg-orange-50 border-b border-orange-200 flex justify-between items-center text-xs text-orange-950 font-bold">' +
        '<span>បំណុលចាស់ពីមុន (Balance Forward)៖</span>' +
        '<b class="text-sm font-black text-orange-700">៛ ' + res.prevDebt.toLocaleString() + '</b>' +
      '</div>' +

      '<div class="overflow-x-auto"><table class="w-full text-left text-xs border-collapse"><thead class="bg-gray-100 text-gray-700 font-bold border-b"><tr><th class="p-2.5 text-center w-8">ល.រ</th><th class="p-2.5 text-[10px]">ថ្ងៃ/ម៉ោង</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">តម្លៃរាយ</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">ស្ថានភាព</th></tr></thead><tbody>' + (itemsHtml || '<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">គ្មានទិន្នន័យដកទំនិញត្រូវតាមការចម្រាញ់នេះឡើយ</td></tr>') + '</tbody></table></div>' +

      payHtml +

      '<div class="p-4 bg-green-50 space-y-1.5 text-xs border-t-2 border-green-200 font-bold">' +
        '<div class="flex justify-between text-gray-700"><span>សរុបទំនិញដកថ្មី (+)៖</span><b class="text-gray-900">៛ ' + res.totalPurchased.toLocaleString() + '</b></div>' +
        '<div class="flex justify-between text-blue-700"><span>សរុបប្រាក់បានសងក្នុងខែ (-)៖</span><b>-៛ ' + res.totalPaid.toLocaleString() + '</b></div>' +
        '<div class="flex justify-between text-base font-black text-green-950 border-t border-green-300 pt-1 mt-1"><span>សរុបបំណុលនៅសល់ជាក់ស្ដែង (=)៖</span><span class="text-green-800 text-lg">៛ ' + res.finalBalance.toLocaleString() + '</span></div>' +
      '</div>' +
    '</div>' +

    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">' +
      '<button onclick="downloadStatementPDF()" class="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fas fa-file-pdf"></i> ទាញយក PDF A4</button>' +
      '<button onclick="downloadStatementPNG()" class="py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fas fa-image"></i> ទាញយក PNG</button>' +
      '<button onclick="shareStatementPNG()" class="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fas fa-share-nodes"></i> ផ្ញើ Telegram</button>' +
      '<button onclick="window.print()" class="py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fas fa-print"></i> បោះពុម្ព</button>' +
    '</div>' +
  '</div>';
}

function downloadStatementPNG() {
  var el = document.getElementById('statementPrintableArea');
  if (!el) return;
  showToast("កំពុងទាញយករូបភាព...");
  html2canvas(el, { scale: 2.5 }).then(function(canvas) {
    var a = document.createElement('a');
    a.download = 'Statement-' + stmtDataCache.custName + '.png';
    a.href = canvas.toDataURL("image/png");
    a.click();
    showToast("បានទាញយកកាតគ្រីជោគជ័យ!", "success");
  });
}

function shareStatementPNG() {
  var el = document.getElementById('statementPrintableArea');
  if (!el) return;
  html2canvas(el, { scale: 2.5 }).then(function(canvas) {
    var img = canvas.toDataURL("image/png");
    if (navigator.share) {
      fetch(img).then(r => r.blob()).then(blob => {
        navigator.share({ files: [new File([blob], 'Statement.png', { type: 'image/png' })], title: 'កាតគ្រី KC WATER' });
      });
    } else {
      downloadStatementPNG();
    }
  });
}

function downloadStatementPDF() {
  if (typeof html2pdf === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    s.onload = executePdfGeneration;
    document.head.appendChild(s);
  } else {
    executePdfGeneration();
  }
}

// 📄 បង្កើតឯកសារ PDF A4 ស្តង់ដារផ្លូវការ (មាន Header, សង្ខេប, ហត្ថលេខា និងមិនបាក់ជើងអក្សរ)
function executePdfGeneration() {
  var res = stmtDataCache;
  if (!res) return;

  showToast("កំពុងរៀបចំឯកសារ PDF A4...");
  var dateNow = new Date().toLocaleDateString('km-KH');

  var itemsRows = '';
  res.items.forEach(function(item, idx) {
    var isUnpaid = (item.status === 'Unpaid');
    var statusText = isUnpaid ? '<span style="color:#c2410c; font-weight:bold;">ជំពាក់</span>' : '<span style="color:#15803d; font-weight:bold;">បង់រួច</span>';
    var recText = item.recorded_by ? '<br><small style="color:#64748b; font-size:9.5px;">(ដកដោយ: ' + item.recorded_by + ')</small>' : '';
    var dateStr = new Date(item.created_at).toLocaleDateString('km-KH');

    itemsRows += '<tr style="border-bottom:1px solid #e2e8f0; font-size:11px;">' +
      '<td style="padding:6px 4px; text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="padding:6px 4px; white-space:nowrap;">' + dateStr + '</td>' +
      '<td style="padding:6px 4px;"><b>' + item.product_name + '</b>' + recText + '</td>' +
      '<td style="padding:6px 4px; text-align:center; font-weight:bold; color:#1d4ed8;">' + item.qty + '</td>' +
      '<td style="padding:6px 4px; text-align:right;">' + Number(item.price).toLocaleString() + '</td>' +
      '<td style="padding:6px 4px; text-align:right; font-weight:bold;">' + Number(item.total).toLocaleString() + ' ៛</td>' +
      '<td style="padding:6px 4px; text-align:center;">' + statusText + '</td>' +
    '</tr>';
  });

  var prodSummaryRows = '';
  for (var pKey in res.productSummary) {
    var unit = (pKey.indexOf("ធុង") !== -1) ? "ធុង" : (pKey.indexOf("យួរ") !== -1 ? "យួរ" : "ឯកតា");
    prodSummaryRows += '<div style="display:inline-block; margin-right:12px; font-size:10.5px;">• ' + pKey + ': <b>' + Number(res.productSummary[pKey]).toLocaleString() + ' ' + unit + '</b></div>';
  }

  var payRows = '';
  if (res.payments && res.payments.length > 0) {
    payRows += '<div style="margin-top:8px; padding:6px 10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:10.5px;">' +
      '<b style="color:#166534;">ប្រវត្តិប្រាក់បានសងក្នុងខែនេះ៖</b>';
    res.payments.forEach(function(p) {
      payRows += '<div style="display:flex; justify-content:space-between; margin-top:2px; color:#14532d;">' +
        '<span>' + new Date(p.settled_at).toLocaleDateString('km-KH') + ' (' + p.pay_method + ' - ទទួល៖ ' + p.admin_name + ')</span>' +
        '<b>-៛ ' + Number(p.paid_khr).toLocaleString() + '</b>' +
      '</div>';
    });
    payRows += '</div>';
  }

  var templateHtml = '<div id="pdf-export-template" style="width:720px; padding:24px 28px; background:#ffffff; color:#1e293b; font-family:\'Battambang\', sans-serif; line-height:1.4;">' +
    '<div style="text-align:center; border-bottom:2.5px double #15803d; padding-bottom:8px; margin-bottom:10px;">' +
      '<h2 style="margin:0; font-size:17px; color:#15803d; text-transform:uppercase; font-weight:900;">សហគ្រាសផលិតទឹកបរិសុទ្ធ ខេ ស៊ី វ៉ត់ធ័រ (KC WATER)</h2>' +
      '<p style="margin:2px 0 0 0; font-size:10.5px; color:#475569;">ទូរស័ព្ទទំនាក់ទំនង៖ 077 934 748, 066 934 748 | ក្រុងប៉ោយប៉ែត</p>' +
      '<div style="margin-top:6px; display:inline-block; padding:3px 14px; background:#15803d; color:white; border-radius:15px; font-size:11.5px; font-weight:bold;">' +
        'លិខិតបញ្ជាក់ការទូទាត់ប្រាក់ និងកាតគ្រីអតិថិជន (STATEMENT)' +
      '</div>' +
    '</div>' +

    '<div style="display:flex; justify-content:space-between; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; font-size:11px; margin-bottom:10px;">' +
      '<div>' +
        '<div>អតិថិជន៖ <b style="font-size:12px; color:#0f172a;">' + res.custName + '</b></div>' +
        '<div style="margin-top:2px; color:#64748b;">គិតចាប់ពីថ្ងៃ៖ <b>' + res.sd + '</b> ដល់ <b>' + res.ed + '</b></div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div>ថ្ងៃចេញឯកសារ៖ <b>' + dateNow + '</b></div>' +
        '<div style="margin-top:2px; color:#64748b;">អ្នករៀបចំ៖ <b>' + (currentUser.fullName || 'Admin') + '</b></div>' +
      '</div>' +
    '</div>' +

    '<div style="display:flex; justify-content:space-between; background:#fff7ed; border:1px solid #fed7aa; padding:6px 12px; border-radius:6px; font-size:11px; margin-bottom:10px; color:#9a3412;">' +
      '<span>បំណុលចាស់ពីមុន (Balance Forward)៖</span>' +
      '<b style="font-size:12px;">៛ ' + res.prevDebt.toLocaleString() + '</b>' +
    '</div>' +

    '<table style="width:100%; border-collapse:collapse; margin-bottom:8px;">' +
      '<thead>' +
        '<tr style="background:#15803d; color:white; font-size:10.5px;">' +
          '<th style="padding:6px 4px; text-align:center; width:30px;">ល.រ</th>' +
          '<th style="padding:6px 4px; text-align:left; width:90px;">កាលបរិច្ឆេទ</th>' +
          '<th style="padding:6px 4px; text-align:left;">មុខទំនិញ</th>' +
          '<th style="padding:6px 4px; text-align:center; width:45px;">ចំនួន</th>' +
          '<th style="padding:6px 4px; text-align:right; width:70px;">តម្លៃរាយ</th>' +
          '<th style="padding:6px 4px; text-align:right; width:90px;">សរុប</th>' +
          '<th style="padding:6px 4px; text-align:center; width:60px;">ស្ថានភាព</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + (itemsRows || '<tr><td colspan="7" style="text-align:center; padding:12px; color:#94a3b8;">គ្មានទិន្នន័យដកទំនិញ</td></tr>') + '</tbody>' +
    '</table>' +

    (prodSummaryRows ? '<div style="background:#f1f5f9; padding:6px 10px; border-radius:6px; margin-bottom:8px; border:1px solid #e2e8f0;"><span style="font-weight:bold; color:#334155; font-size:10.5px;">សរុបបរិមាណទឹកដកក្នុងខែ៖ </span>' + prodSummaryRows + '</div>' : '') +

    payRows +

    '<div style="margin-top:10px; padding:10px 14px; background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; font-size:11.5px; line-height:1.6;">' +
      '<div style="display:flex; justify-content:space-between; color:#334155;"><span>សរុបទំនិញដកថ្មី (+)៖</span><b>៛ ' + res.totalPurchased.toLocaleString() + '</b></div>' +
      '<div style="display:flex; justify-content:space-between; color:#1d4ed8;"><span>សរុបប្រាក់បានសងក្នុងខែ (-)៖</span><b>-៛ ' + res.totalPaid.toLocaleString() + '</b></div>' +
      '<div style="display:flex; justify-content:space-between; font-size:13px; font-weight:900; color:#14532d; border-top:1.5px solid #86efac; padding-top:5px; margin-top:5px;">' +
        '<span>សរុបបំណុលនៅសល់ជាក់ស្ដែង (=)៖</span>' +
        '<span style="font-size:15px; color:#15803d;">៛ ' + res.finalBalance.toLocaleString() + '</span>' +
      '</div>' +
    '</div>' +

    '<div style="display:flex; justify-content:space-between; margin-top:35px; padding:0 20px; text-align:center; font-size:11px;">' +
      '<div>' +
        '<div><b>ហត្ថលេខាអ្នកទិញ</b></div>' +
        '<div style="margin-top:40px; border-bottom:1px dashed #94a3b8; width:120px;"></div>' +
        '<div style="margin-top:4px; color:#64748b;">( ' + res.custName + ' )</div>' +
      '</div>' +
      '<div>' +
        '<div><b>ហត្ថលេខាអ្នកគិតលុយ</b></div>' +
        '<div style="margin-top:40px; border-bottom:1px dashed #94a3b8; width:120px;"></div>' +
        '<div style="margin-top:4px; color:#64748b;">( ' + (currentUser.fullName || 'Admin') + ' )</div>' +
      '</div>' +
    '</div>' +

    '<div style="text-align:center; margin-top:18px; font-size:9.5px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:6px;">' +
      'សូមអរគុណចំពោះការគាំទ្រទឹកបរិសុទ្ធ KC WATER! 🙏' +
    '</div>' +
  '</div>';

  var renderContainer = document.createElement('div');
  renderContainer.style.position = 'fixed';
  renderContainer.style.left = '0';
  renderContainer.style.top = '0';
  renderContainer.style.zIndex = '-9999';
  renderContainer.style.background = '#ffffff';
  renderContainer.innerHTML = templateHtml;
  document.body.appendChild(renderContainer);

  var elementToPdf = document.getElementById('pdf-export-template');
  var opt = {
    margin: [8, 8, 8, 8],
    filename: 'KC-Statement-' + res.custName + '-' + res.ed + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(elementToPdf).save().then(function() {
    showToast("បានទាញយកឯកសារ PDF A4 ជោគជ័យ!", "success");
    renderContainer.remove();
  }).catch(function(err) {
    showToast("កំហុស PDF៖ " + err.message, "error");
    renderContainer.remove();
  });
}

// ==========================================
// 📉 ២. របាយការណ៍បញ្ជីអ្នកជំពាក់សរុប (DEBTORS REPORT)
// ==========================================
async function renderDebtorsReportModule() {
  var area = document.getElementById('contentArea');
  area.innerHTML = '<div class="max-w-2xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-red-600 shadow-xl p-5 mb-0">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<h2 class="font-extrabold text-red-800 text-base flex items-center gap-2"><i class="fas fa-hand-holding-dollar text-red-600"></i>បញ្ជីអ្នកជំពាក់ប្រាក់សរុប (Debtors Report)</h2>' +
        '<button onclick="renderDebtorsReportModule()" class="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border active:scale-95 transition flex items-center gap-1"><i class="fas fa-sync-alt"></i> Refresh</button>' +
      '</div>' +
      '<div class="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-center mb-3">' +
        '<div class="text-[11px] font-bold text-red-700 uppercase mb-1">ទឹកប្រាក់ដែលគេជំពាក់សរុបទាំងអស់</div>' +
        '<div id="debtorsGrandTotalText" class="text-xl font-black text-red-800">0 ៛</div>' +
      '</div>' +
      '<input type="text" id="debtorSearchInp" onkeyup="filterDebtorsCards()" placeholder="🔍 វាយឈ្មោះម៉ូយដើម្បីស្វែងរក..." class="font-bold border p-2.5 rounded-xl w-full text-xs">' +
    '</div>' +
    '<div class="space-y-2.5" id="debtorsCardsContainer"><div class="card text-center py-8 italic text-gray-400">កំពុងទាញទិន្នន័យ...</div></div>' +
  '</div>';

  await fetchDebtorsListFromSupabase();
}

async function fetchDebtorsListFromSupabase() {
  try {
    const { data: unpaids } = await supabaseClient.from('transactions').select('customer_name, total').eq('status', 'Unpaid');
    var map = {};
    var grandTotal = 0;

    if (unpaids) {
      unpaids.forEach(function(u) {
        var c = (u.customer_name || "").trim();
        if (c && c !== "Walk-in") {
          var tot = parseFloat(u.total || 0);
          map[c] = (map[c] || 0) + tot;
          grandTotal += tot;
        }
      });
    }

    allDebtorsCache = [];
    for (var k in map) { allDebtorsCache.push({ name: k, total: map[k] }); }
    allDebtorsCache.sort((a, b) => b.total - a.total);

    document.getElementById('debtorsGrandTotalText').innerText = '៛ ' + grandTotal.toLocaleString();
    renderDebtorsCardsUI(allDebtorsCache);
  } catch(e) {}
}

function renderDebtorsCardsUI(list) {
  var container = document.getElementById('debtorsCardsContainer');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div class="card p-8 text-center text-green-700 font-bold bg-green-50 border border-green-200"><i class="fas fa-check-circle text-2xl mb-2 block"></i> អបអរសាទរ! បច្ចុប្បន្នគ្មានម៉ូយណាជំពាក់ប្រាក់ឡើយ</div>';
    return;
  }

  var html = '';
  list.forEach(function(d) {
    var safeName = String(d.name || '').replace(/'/g, "\\'");
    html += '<div class="card p-4 shadow-md border-l-4 border-red-500 flex justify-between items-center mb-0 hover:shadow-lg transition">' +
      '<div>' +
        '<b class="text-sm font-extrabold text-gray-800 flex items-center gap-1.5"><i class="fas fa-user-circle text-red-500"></i> ' + d.name + '</b>' +
        '<div class="text-xs font-black text-red-700 mt-1">៛ ' + d.total.toLocaleString() + '</div>' +
      '</div>' +
      '<button onclick="goToSettleCustomerFromReport(\'' + safeName + '\')" class="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow active:scale-95 transition flex items-center gap-1"><i class="fas fa-calculator"></i> ទូទាត់</button>' +
    '</div>';
  });
  container.innerHTML = html;
}

function filterDebtorsCards() {
  var q = (document.getElementById('debtorSearchInp').value || "").toLowerCase().trim();
  var filtered = allDebtorsCache.filter(function(d){ return d.name.toLowerCase().indexOf(q) !== -1; });
  renderDebtorsCardsUI(filtered);
}

function goToSettleCustomerFromReport(name) {
  loadModule('Settlement');
  setTimeout(function() {
    selectCustomerForSettlement(name);
  }, 350);
}

// ==========================================
// 📦 ៣. របាយការណ៍ស្តុក & ដើមទុន (STOCK REPORT & VALUATION)
// ==========================================
async function renderStockRepModule() {
  var area = document.getElementById('contentArea');
  area.innerHTML = '<div class="max-w-4xl mx-auto space-y-4">' +
    '<div class="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">' +
      '<div><h2 class="text-base sm:text-xl font-extrabold text-green-900 flex items-center gap-2"><i class="fas fa-boxes-stacked text-green-600"></i>របាយការណ៍ស្តុក និងដើមទុនក្នុងឃ្លាំង (Stock Report)</h2><p class="text-xs text-gray-500 mt-0.5">តាមដានដើមទុនសរុប និងចលនាស្តុក Realtime</p></div>' +
      '<button onclick="renderStockRepModule()" class="px-3.5 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold border active:scale-95 transition flex items-center gap-1"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      '<div class="dash-card border-l-4 border-blue-600 p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">តម្លៃដើមទុនក្នុងស្តុកសរុប</div><div id="repStockValuation" class="mt-2 font-black text-blue-900 text-lg">0 ៛</div></div>' +
      '<div class="dash-card border-l-4 border-orange-500 p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">ទំនិញជិតអស់ស្តុក</div><div id="repStockAlertCount" class="mt-2 font-black text-orange-700 text-lg">0 មុខ</div></div>' +
    '</div>' +
    '<div class="card p-0 overflow-x-auto shadow-lg rounded-2xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-3">រូប</th><th class="p-3">ឈ្មោះទំនិញ</th><th class="p-3 text-right">ថ្លៃដើម</th><th class="p-3 text-center">សល់ក្នុងស្តុក</th><th class="p-3 text-right">ដើមទុនសរុប</th><th class="p-3 text-center">ស្ថានភាព</th></tr></thead><tbody id="stockRepTableBody"></tbody></table></div>' +
  '</div>';

  await loadStockRepDataFromSupabase();
}

async function loadStockRepDataFromSupabase() {
  try {
    const { data: prods } = await supabaseClient.from('products').select('*');
    if (!prods) return;

    var totalValuation = 0, alertCount = 0;
    var tbody = document.getElementById('stockRepTableBody');
    var html = '';

    prods.forEach(function(p) {
      var cost = parseFloat(p.cost || 0);
      var stock = parseFloat(p.stock || 0);
      var min = parseFloat(p.min_stock || 5);
      var val = (p.type === 'ទិញគេ') ? (cost * stock) : 0;
      totalValuation += val;

      var isLow = (stock <= min);
      if (isLow && p.type === 'ទិញគេ') alertCount++;

      var statusBadge = (p.type === 'ផលិតឯង') ? '<span class="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">ផលិតឯង</span>' : (isLow ? '<span class="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">ជិតអស់</span>' : '<span class="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700 font-bold">គ្រប់គ្រាន់</span>');

      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5"><img src="' + (p.img || 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png') + '" class="w-8 h-8 object-contain rounded border"></td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + p.name + '</td>' +
        '<td class="p-2.5 text-right">' + (cost > 0 ? Number(cost).toLocaleString() + ' ៛' : '-') + '</td>' +
        '<td class="p-2.5 text-center font-black ' + (isLow ? 'text-red-600' : 'text-blue-800') + '">' + stock + '</td>' +
        '<td class="p-2.5 text-right font-black text-green-700">' + (val > 0 ? Number(val).toLocaleString() + ' ៛' : '-') + '</td>' +
        '<td class="p-2.5 text-center">' + statusBadge + '</td>' +
      '</tr>';
    });

    document.getElementById('repStockValuation').innerText = '៛ ' + totalValuation.toLocaleString();
    document.getElementById('repStockAlertCount').innerText = alertCount + ' មុខទំនិញ';
    tbody.innerHTML = html;
  } catch(e) {}
}
