/** ==========================================================================
 *  KC WATER POS SYSTEM - REPORTS & STATEMENTS ENGINE (pos-reports.js)
 *  (Monthly Report, Customer Statement PDF A4, Debtors & Stock Valuation)
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

async function fetchCompanySummaryFromSupabase() {
  var sd = document.getElementById('compStartDate').value;
  var ed = document.getElementById('compEndDate').value;
  if (!sd || !ed) return;

  try {
    const { data: trans } = await supabaseClient
      .from('transactions')
      .select('*')
      .gte('created_at', sd + 'T00:00:00Z')
      .lte('created_at', ed + 'T23:59:59Z');

    var salesTotal = 0, cashTotal = 0, debtTotal = 0;
    var prodQty = {};

    if (trans) {
      trans.forEach(function(t) {
        var tot = parseFloat(t.total || 0);
        var paid = parseFloat(t.paid_khr || 0);
        salesTotal += tot;
        cashTotal += paid;
        if (t.status === 'Unpaid') debtTotal += tot;
        if (t.product_name) {
          prodQty[t.product_name] = (prodQty[t.product_name] || 0) + parseFloat(t.qty || 0);
        }
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
  } catch(e) {}
}

async function fetchFullStatementFromSupabase() {
  var name = document.getElementById('custSearchInp').value.trim();
  var sd = document.getElementById('custStartDate').value;
  var ed = document.getElementById('custEndDate').value;
  var container = document.getElementById('statementReportContainer');

  if (!name || !sd || !ed) { showToast("សូមរើសឈ្មោះ និងកាលបរិច្ឆេទ!", "error"); return; }
  container.innerHTML = '<div class="text-center py-8 text-gray-400 italic text-xs"><i class="fas fa-spinner fa-spin text-green-600 text-base"></i> កំពុងទាញទិន្នន័យកាតគ្រី...</div>';

  try {
    // ១. ស្វែងរកជើងទឹកដក
    const { data: items } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', name)
      .gte('created_at', sd + 'T00:00:00Z')
      .lte('created_at', ed + 'T23:59:59Z')
      .order('created_at', { ascending: true });

    // ២. ស្វែងរកការទូទាត់សង
    const { data: payments } = await supabaseClient
      .from('settlements')
      .select('*')
      .eq('customer_name', name)
      .gte('settled_at', sd + 'T00:00:00Z')
      .lte('settled_at', ed + 'T23:59:59Z')
      .order('settled_at', { ascending: true });

    // ៣. ស្វែងរកបំណុលចាស់មុនថ្ងៃ Start
    const { data: oldSet } = await supabaseClient
      .from('settlements')
      .select('balance_khr')
      .eq('customer_name', name)
      .lt('settled_at', sd + 'T00:00:00Z')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    var prevDebt = oldSet ? parseFloat(oldSet.balance_khr || 0) : 0;
    var totalPurchased = 0, totalPaidInMonth = 0;

    (items || []).forEach(function(i){ totalPurchased += parseFloat(i.total || 0); });
    (payments || []).forEach(function(p){ totalPaidInMonth += parseFloat(p.paid_khr || 0); });

    var finalBalance = Math.max(0, prevDebt + totalPurchased - totalPaidInMonth);

    stmtDataCache = {
      custName: name, sd: sd, ed: ed,
      items: items || [],
      payments: payments || [],
      prevDebt: prevDebt,
      totalPurchased: totalPurchased,
      totalPaid: totalPaidInMonth,
      finalBalance: finalBalance
    };

    renderStatementReportUI();
  } catch(err) {
    container.innerHTML = '<div class="p-4 text-center text-red-500 font-bold">កំហុស៖ ' + err.message + '</div>';
  }
}

function renderStatementReportUI() {
  var res = stmtDataCache;
  var container = document.getElementById('statementReportContainer');
  if (!res || !container) return;

  var itemsHtml = '';
  res.items.forEach(function(item, idx) {
    var isUnpaid = (item.status === 'Unpaid');
    var dateStr = new Date(item.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
    itemsHtml += '<tr class="border-b ' + (isUnpaid ? 'bg-orange-50/40' : '') + '">' +
      '<td class="p-2 text-center text-[10px]">' + (idx + 1) + '</td>' +
      '<td class="p-2 text-gray-500 text-[10px] whitespace-nowrap">' + dateStr + '</td>' +
      '<td class="p-2 font-bold text-gray-800">' + item.product_name + '</td>' +
      '<td class="p-2 text-center font-bold text-blue-700">' + item.qty + '</td>' +
      '<td class="p-2 text-right">' + Number(item.price).toLocaleString() + '</td>' +
      '<td class="p-2 text-right font-black ' + (isUnpaid ? 'text-orange-700' : 'text-green-700') + '">' + Number(item.total).toLocaleString() + ' ៛</td>' +
      '<td class="p-2 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ' + (isUnpaid ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800') + '">' + (isUnpaid ? 'ជំពាក់' : 'បង់រួច') + '</span></td>' +
    '</tr>';
  });

  var payHtml = '';
  if (res.payments && res.payments.length > 0) {
    payHtml += '<div class="p-3 bg-blue-50 border-t border-b border-blue-200 text-xs space-y-1"><b class="text-blue-900 block">ប្រាក់បានបង់សងក្នុងខែនេះ៖</b>';
    res.payments.forEach(function(p) {
      payHtml += '<div class="flex justify-between bg-white p-1.5 rounded border text-[11px]"><span>' + new Date(p.settled_at).toLocaleDateString('km-KH') + ' (' + p.pay_method + ')</span><b class="text-blue-700 font-bold">-៛ ' + Number(p.paid_khr).toLocaleString() + '</b></div>';
    });
    payHtml += '</div>';
  }

  container.innerHTML = '<div class="space-y-3 mt-4">' +
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

      '<div class="overflow-x-auto"><table class="w-full text-left text-xs border-collapse"><thead class="bg-gray-100 text-gray-700 font-bold border-b"><tr><th class="p-2 text-center w-8">ល.រ</th><th class="p-2 text-[10px]">ថ្ងៃ/ម៉ោង</th><th class="p-2">មុខទំនិញ</th><th class="p-2 text-center">ចំនួន</th><th class="p-2 text-right">តម្លៃរាយ</th><th class="p-2 text-right">សរុប</th><th class="p-2 text-center">ស្ថានភាព</th></tr></thead><tbody>' + (itemsHtml || '<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">គ្មានទិន្នន័យដកទំនិញ</td></tr>') + '</tbody></table></div>' +

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

function executePdfGeneration() {
  var el = document.getElementById('statementPrintableArea');
  if (!el) return;
  showToast("កំពុងរៀបចំឯកសារ PDF A4...");
  var opt = {
    margin: [8, 8, 8, 8],
    filename: 'KC-Statement-' + stmtDataCache.custName + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(el).save().then(function(){
    showToast("បានទាញយក PDF ជោគជ័យ!", "success");
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
    allDebtorsCache.sort((a, b) => b.total - a.total); // តម្រៀបអ្នកជំពាក់ច្រើនមកលើ

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
    html += '<div class="card p-4 shadow-md border-l-4 border-red-500 flex justify-between items-center mb-0 hover:shadow-lg transition">' +
      '<div>' +
        '<b class="text-sm font-extrabold text-gray-800 flex items-center gap-1.5"><i class="fas fa-user-circle text-red-500"></i> ' + d.name + '</b>' +
        '<div class="text-xs font-black text-red-700 mt-1">៛ ' + d.total.toLocaleString() + '</div>' +
      '</div>' +
      '<button onclick="loadModule(\'Settlement\')" class="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow active:scale-95 transition flex items-center gap-1"><i class="fas fa-calculator"></i> ទូទាត់</button>' +
    '</div>';
  });
  container.innerHTML = html;
}

function filterDebtorsCards() {
  var q = (document.getElementById('debtorSearchInp').value || "").toLowerCase().trim();
  var filtered = allDebtorsCache.filter(function(d){ return d.name.toLowerCase().indexOf(q) !== -1; });
  renderDebtorsCardsUI(filtered);
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
