/** ==========================================================================
 *  KC WATER POS SYSTEM - SMART SETTLEMENT ENGINE (pos-settlement.js)
 *  (Smart Auto-Balance, Quick Cash Bills, Audio Chime & Invoicing)
 *  ========================================================================== */

var currentActivePendingPaymentId = null;

// 🔔 សំឡេងរោទ៍ដំណឹងពេលទូទាត់ជោគជ័យ (AUDIO SOUND FEEDBACK)
function playPaymentSuccessAudio() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      var ctx = new AudioContext();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // សំឡេង ទី ១
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // សំឡេង ទី ២
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    }
  } catch(e) {}
}

// ==========================================
// 💳 ១. ផ្ទាំងទូទាត់លុយ SETTLEMENT UI (SMART POS)
// ==========================================
async function renderSettlementModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  currentSettlementCustomer = "";
  currentSettlementItems = [];
  currentSettlementPayMode = "Cash";
  currentActivePendingPaymentId = null;

  var custOptions = '<option value="">-- សូមជ្រើសរើសឈ្មោះម៉ូយ --</option><option value="Walk-in">🛒 -- លក់នៅកន្លែង (Walk-in) --</option>';
  allCustomers.forEach(function(c) {
    if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
      custOptions += '<option value="' + c.full_name + '">' + c.full_name + '</option>';
    }
  });

  area.innerHTML = '<div class="max-w-4xl mx-auto space-y-4">' +
    // ក្បាលទំព័រ
    '<div class="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">' +
      '<div>' +
        '<h2 class="text-base sm:text-xl font-extrabold text-blue-900 flex items-center gap-2">' +
          '<i class="fas fa-calculator text-blue-600"></i>ប្រព័ន្ធទូទាត់ប្រាក់ឆ្លាតវៃ (Smart Settlement)' +
        '</h2>' +
        '<p class="text-xs text-gray-500 mt-0.5">គណនាបំពេញបង្គ្រប់អូតូ គិតលុយអាប់ និងចេញវិក្កយបត្រ Realtime</p>' +
      '</div>' +
      '<button onclick="renderSettlementModule()" class="px-3.5 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 active:scale-95 transition flex items-center gap-1.5 shadow-2xs">' +
        '<i class="fas fa-sync-alt"></i> Refresh' +
      '</button>' +
    '</div>' +

    // 🔔 បដាសំណើទូទាត់រង់ចាំពីម៉ូយ (Pending Approval Banner)
    '<div id="pendingPaymentsBanner" class="hidden card border-t-4 border-yellow-500 bg-yellow-50/80 p-4 shadow-md mb-0 space-y-2">' +
      '<div class="flex justify-between items-center">' +
        '<h3 class="font-extrabold text-yellow-950 text-xs sm:text-sm flex items-center gap-2">' +
          '<i class="fas fa-bell text-yellow-600 animate-bounce"></i> សំណើទូទាត់រង់ចាំផ្ទៀងផ្ទាត់ពីម៉ូយ (Pending Approval)' +
        '</h3>' +
        '<span id="pendingCountBadge" class="bg-yellow-200 text-yellow-900 text-[10px] font-black px-2.5 py-0.5 rounded-full"></span>' +
      '</div>' +
      '<div id="pendingCardsContainer" class="space-y-2 pt-1"></div>' +
    '</div>' +

    // 📊 កាតស្ថិតិ ២ ខាងលើ
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">' +
      '<div class="dash-card border-l-4 border-orange-500 shadow-md p-4 bg-white rounded-2xl">' +
        '<div class="text-gray-500 text-xs font-bold uppercase flex justify-between items-center">' +
          '<span>អ្នកដកថ្ងៃនេះមិនទាន់គិតលុយ</span><i class="fas fa-users-slash text-orange-500 text-lg"></i>' +
        '</div>' +
        '<div id="todayUnpaidCount" class="mt-2 font-black text-orange-800 text-lg sm:text-xl leading-tight">កំពុងឆែកមើល...</div>' +
      '</div>' +
      '<div class="dash-card border-l-4 border-red-500 shadow-md p-4 bg-white rounded-2xl">' +
        '<div class="text-gray-500 text-xs font-bold uppercase flex justify-between items-center">' +
          '<span>ទឹកប្រាក់មិនទាន់ទូទាត់ថ្ងៃនេះសរុប</span><i class="fas fa-coins text-red-500 text-lg"></i>' +
        '</div>' +
        '<div id="todayUnpaidTotal" class="mt-2 font-black text-red-700 text-base sm:text-lg leading-tight">កំពុងគណនា...</div>' +
      '</div>' +
    '</div>' +

    // 📋 តារាងអ្នកដកទំនិញថ្ងៃនេះ
    '<div class="card p-5 border-t-4 border-orange-500 shadow-lg mb-0">' +
      '<h3 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">' +
        '<i class="fas fa-clock text-orange-500"></i>បញ្ជីអ្នកដកទំនិញថ្ងៃនេះ (មិនទាន់ទូទាត់)' +
      '</h3>' +
      '<div class="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-gray-200 shadow-inner">' +
        '<table class="w-full text-left text-xs border-collapse">' +
          '<thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-xs">' +
            '<tr>' +
              '<th class="p-2.5">ម៉ោង</th><th class="p-2.5">ឈ្មោះអតិថិជន</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">តម្លៃសរុប</th><th class="p-2.5 text-center">សកម្មភាព</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="todayUnpaidTbody"><tr><td colspan="6" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +

    // 👥 បញ្ជីឈ្មោះម៉ូយជំពាក់ទាំងអស់
    '<div class="card border-t-4 border-blue-500 shadow-md p-4 mb-0">' +
      '<h4 class="font-bold text-gray-800 text-xs sm:text-sm mb-2 flex items-center gap-1.5">' +
        '<i class="fas fa-users text-blue-600"></i> ចុចរើសឈ្មោះម៉ូយជំពាក់ដើម្បីទូទាត់ភ្លាមៗ៖' +
      '</h4>' +
      '<div id="settleDebtorsBadgesContainer" class="flex flex-wrap gap-2 pt-1 text-xs">' +
        '<i class="fas fa-spinner fa-spin text-blue-600"></i> កំពុងឆែកបញ្ជីជំពាក់...' +
      '</div>' +
    '</div>' +

    // 📝 ទម្រង់គិតលុយ និងចេញវិក្កយបត្រ
    '<div id="settlement_card" class="card border-t-4 border-blue-600 shadow-2xl p-5 sm:p-6 mb-0">' +
      '<h3 class="font-bold text-center mb-4 text-blue-900 text-base sm:text-lg flex items-center justify-center gap-2">' +
        '<i class="fas fa-file-invoice-dollar text-blue-600"></i>ទម្រង់គិតលុយ និងចេញវិក្កយបត្រ' +
      '</h3>' +

      '<div class="mb-4">' +
        '<label class="text-xs font-bold text-gray-500 mb-1 block">ជ្រើសរើសឈ្មោះអតិថិជន</label>' +
        '<select id="set_c" onchange="selectCustomerForSettlement(this.value)" class="border-2 border-blue-200 focus:border-blue-600 font-bold text-gray-800 rounded-xl p-2.5 w-full bg-white outline-none">' +
          custOptions +
        '</select>' +
      '</div>' +

      '<div id="settlement_ui" class="hidden space-y-4">' +
        '<div class="flex justify-between items-center border-b pb-2">' +
          '<b class="text-xs sm:text-sm text-blue-950 flex items-center gap-1.5"><i class="fas fa-boxes text-blue-600"></i>បញ្ជីជើងទឹកដកជំពាក់ជាក់ស្តែង</b>' +
          '<span id="settleSelectedCountBadge" class="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">0 ជើងទឹក</span>' +
        '</div>' +

        // តារាងជើងទឹកជំពាក់
        '<div class="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border mb-3">' +
          '<table class="w-full text-left text-xs border-collapse">' +
            '<thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10">' +
              '<tr>' +
                '<th class="p-2.5 text-center w-10">' +
                  '<input type="checkbox" id="settleSelectAllCb" onchange="toggleSelectAllSettle(this.checked)" checked class="w-4 h-4 accent-green-600 cursor-pointer">' +
                '</th>' +
                '<th class="p-2.5 text-[10px]">កាលបរិច្ឆេទ</th>' +
                '<th class="p-2.5">មុខទំនិញ</th>' +
                '<th class="p-2.5 text-center">ចំនួន</th>' +
                '<th class="p-2.5 text-right">តម្លៃរាយ</th>' +
                '<th class="p-2.5 text-right">សរុប</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody id="settleItemsTableBody"></tbody>' +
          '</table>' +
        '</div>' +

        // ប្រអប់សង្ខេបបំណុល & Checkbox បំណុលចាស់
        '<div class="p-3 bg-orange-50 rounded-2xl border border-orange-200 text-xs space-y-1.5 text-orange-950 font-bold shadow-inner">' +
          '<div class="flex justify-between">' +
            '<span>សរុបទំនិញដែលបានធីក (+)៖</span>' +
            '<b id="settleSelectedSubtotal" class="text-sm text-blue-900">0 ៛</b>' +
          '</div>' +
          '<div id="settleOldDebtRow" class="flex justify-between items-center border-t border-orange-200 pt-1.5">' +
            '<label class="flex items-center gap-2 cursor-pointer">' +
              '<input type="checkbox" id="cbIncludeOldDebt" onchange="recalcSettlementCalculation()" checked class="w-4 h-4 accent-orange-600 cursor-pointer">' +
              '<span>បូកបញ្ចូលបំណុលចាស់ពីមុន៖</span>' +
            '</label>' +
            '<b id="settleOldDebtVal" class="text-orange-700">0 ៛</b>' +
          '</div>' +
          '<div class="flex justify-between text-sm sm:text-base font-black text-orange-950 border-t border-orange-300 pt-1.5 mt-1">' +
            '<span>សរុបត្រូវបង់លើកនេះ (=)៖</span>' +
            '<span id="settleTotalDueText" class="text-base sm:text-lg text-orange-800">0 ៛</span>' +
          '</div>' +
        '</div>' +

        // 🧠 ផ្នែកវិធីបង់ប្រាក់ឆ្លាតវៃ (SMART PAYMENT SECTION)
        '<div class="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3">' +
          '<div class="flex justify-between items-center">' +
            '<label class="text-xs font-bold text-blue-900 uppercase">វិធីទូទាត់ប្រាក់ជាក់ស្តែង</label>' +
            '<button onclick="fillExactSettlementPay()" class="px-3 py-1 bg-white text-blue-700 text-xs font-extrabold rounded-lg border border-blue-300 shadow-2xs active:scale-95 transition">លុយគ្រប់</button>' +
          '</div>' +

          '<div class="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border">' +
            '<button type="button" id="btnSettleCash" onclick="setSettlePayMode(\'Cash\')" class="py-2.5 rounded-lg text-xs font-bold bg-green-700 text-white shadow"><i class="fas fa-money-bill-wave mr-1"></i> លុយសុទ្ធ</button>' +
            '<button type="button" id="btnSettleAba" onclick="setSettlePayMode(\'ABA\')" class="py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fas fa-qrcode mr-1"></i> ស្កេន ABA</button>' +
            '<button type="button" id="btnSettleSplit" onclick="setSettlePayMode(\'Split\')" class="py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fas fa-layer-group mr-1"></i> ចម្រុះ</button>' +
          '</div>' +

          // បង់ធម្មតា (លុយសុទ្ធ ឬ ABA)
          '<div id="settleSingleInputArea" class="space-y-1">' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase">ប្រាក់បានបង់ជាក់ស្តែង (៛)</label>' +
            '<input type="number" id="settlePaidInput" oninput="calcSettleChange()" placeholder="0" class="w-full text-center text-xl font-black text-blue-900 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl p-2.5 outline-none">' +
          '</div>' +

          // 🔀 បង់ចម្រុះឆ្លាតវៃ (SMART AUTO-BALANCE: វាយលុយសុទ្ធ ➔ ABA បំពេញបង្គ្រប់អូតូ)
          '<div id="settleSplitInputArea" class="hidden space-y-2.5 bg-white p-3.5 rounded-2xl border border-blue-200 shadow-2xs">' +
            '<div class="text-[11px] font-black text-blue-900 uppercase flex items-center justify-between">' +
              '<span><i class="fas fa-layer-group text-blue-600 mr-1"></i> បែងចែកការទូទាត់ចម្រុះ (៛)៖</span>' +
              '<span class="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">🧠 Auto-Balance អូតូ</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2.5">' +
              '<div>' +
                '<label class="text-[9.5px] font-bold text-gray-600 block mb-1">💵 ទទួលលុយសុទ្ធ (៛)</label>' +
                '<input type="number" id="splitKhrCash" oninput="onSplitCashInput(this.value)" placeholder="0" class="w-full text-center font-black text-sm p-2.5 bg-gray-50 focus:bg-white rounded-xl border-2 border-gray-300 focus:border-green-600 outline-none">' +
              '</div>' +
              '<div>' +
                '<label class="text-[9.5px] font-black text-blue-700 block mb-1">📱 ស្កេន ABA (៛)</label>' +
                '<input type="number" id="splitKhrScan" oninput="onSplitScanInput(this.value)" placeholder="0" class="w-full text-center font-black text-sm p-2.5 bg-white rounded-xl border-2 border-blue-400 text-blue-900 outline-none">' +
              '</div>' +
            '</div>' +
            '<div class="pt-1">' +
              '<button type="button" onclick="openSplitAbaQrModal()" class="w-full py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 transition">' +
                '<i class="fas fa-qrcode"></i> 📱 បង្ហាញ QR សម្រាប់ស្កេន ៛ <span id="splitAbaAmountLabel">0</span>' +
              '</button>' +
            '</div>' +
          '</div>' +

          // 💵 ប៊ូតុងក្រដាសប្រាក់ខ្មែររហ័ស (QUICK CASH BILLS)
          '<div class="flex gap-1.5 pt-1 text-xs">' +
            '<button type="button" onclick="setQuickCashBill(10000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-800 font-black rounded-xl border shadow-2xs active:scale-95 transition">10,000</button>' +
            '<button type="button" onclick="setQuickCashBill(20000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-800 font-black rounded-xl border shadow-2xs active:scale-95 transition">20,000</button>' +
            '<button type="button" onclick="setQuickCashBill(50000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-800 font-black rounded-xl border shadow-2xs active:scale-95 transition">50,000</button>' +
            '<button type="button" onclick="setQuickCashBill(100000)" class="flex-1 py-1.5 bg-white hover:bg-green-50 text-gray-800 font-black rounded-xl border shadow-2xs active:scale-95 transition">100,000</button>' +
          '</div>' +

          '<div id="settleChangeArea" class="rounded-xl transition-all duration-200 hidden"></div>' +
        '</div>' +

        '<button onclick="submitSettlementPayment()" id="btnSubmitSettlement" class="btn-green shadow-xl py-4 text-base font-black flex items-center justify-center gap-2 active:scale-95 transition mt-3">' +
          '<i class="fas fa-file-invoice-dollar text-xl"></i> ទូទាត់ & ចេញវិក្កយបត្រ (Save Settlement)' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  checkAdminPendingPayments();
  fetchSettlementOverviewData();
  await loadSettlementDebtorsList();
}

// ==========================================
// 🧠 ២. ប្រព័ន្ធគណនាបំពេញបង្គ្រប់អូតូ (SMART AUTO-BALANCE)
// ==========================================
function getTotalDueAmount() {
  var sub = getSelectedSettlementTotal();
  var cbOldDebt = document.getElementById('cbIncludeOldDebt');
  var includeOldDebt = cbOldDebt ? cbOldDebt.checked : true;
  return sub + (includeOldDebt ? currentSettlementOldDebt : 0);
}

// ពេល Admin វាយលុយសុទ្ធ ➔ ប្រអប់ស្កេន ABA បំពេញបង្គ្រប់អូតូភ្លាម!
function onSplitCashInput(val) {
  var totalDue = getTotalDueAmount();
  var cash = parseFloat(val || 0);
  var scanInp = document.getElementById('splitKhrScan');
  var abaLabel = document.getElementById('splitAbaAmountLabel');

  if (scanInp) {
    if (cash < totalDue) {
      var remainingToScan = totalDue - cash;
      scanInp.value = remainingToScan;
      if (abaLabel) abaLabel.innerText = remainingToScan.toLocaleString();
    } else {
      scanInp.value = 0;
      if (abaLabel) abaLabel.innerText = "0";
    }
  }
  calcSettleChange();
}

// ពេល Admin វាយលេខលុយស្កេន ABA ➔ ប្រអប់លុយសុទ្ធបំពេញបង្គ្រប់អូតូភ្លាម!
function onSplitScanInput(val) {
  var totalDue = getTotalDueAmount();
  var scan = parseFloat(val || 0);
  var cashInp = document.getElementById('splitKhrCash');
  var abaLabel = document.getElementById('splitAbaAmountLabel');

  if (abaLabel) abaLabel.innerText = scan.toLocaleString();

  if (cashInp) {
    if (scan < totalDue) {
      cashInp.value = totalDue - scan;
    } else {
      cashInp.value = 0;
    }
  }
  calcSettleChange();
}

// ប៊ូតុងក្រដាសប្រាក់ខ្មែររហ័ស (10K, 20K, 50K, 100K)
function setQuickCashBill(amt) {
  if (currentSettlementPayMode === "Split") {
    var cashInp = document.getElementById('splitKhrCash');
    if (cashInp) {
      cashInp.value = amt;
      onSplitCashInput(amt);
    }
  } else {
    var paidInp = document.getElementById('settlePaidInput');
    if (paidInp) {
      paidInp.value = amt;
      calcSettleChange();
    }
  }
}

// បើក QR Modal ជាមួយចំនួនទឹកប្រាក់ជាក់ស្តែងដែលត្រូវស្កេនក្នុង Mode Split
function openSplitAbaQrModal() {
  var scanVal = parseFloat(document.getElementById('splitKhrScan') ? document.getElementById('splitKhrScan').value || 0 : 0);
  if (scanVal <= 0) {
    showToast("មិនមានទឹកប្រាក់ត្រូវស្កេន ABA ឡើយ!", "info");
    return;
  }
  document.getElementById('posKhqrAmountText').innerText = "៛ " + scanVal.toLocaleString();
  document.getElementById('posKhqrModal').classList.remove('hidden');
}

// ==========================================
// 📊 ៣. គណនាទិន្នន័យសង្ខេប & តារាងអ្នកដកថ្ងៃនេះ
// ==========================================
async function fetchSettlementOverviewData() {
  try {
    var todayStr = new Date().toISOString().split('T')[0];

    const { data: todayUnpaids } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('status', 'Unpaid')
      .gte('created_at', todayStr + 'T00:00:00Z')
      .order('created_at', { ascending: false });

    var countEl = document.getElementById('todayUnpaidCount');
    var totEl = document.getElementById('todayUnpaidTotal');
    var tbody = document.getElementById('todayUnpaidTbody');

    var custSet = new Set();
    var todayTotalSum = 0;

    (todayUnpaids || []).forEach(function(u) {
      if (u.customer_name && u.customer_name !== "Walk-in") {
        custSet.add(u.customer_name);
      }
      todayTotalSum += parseFloat(u.total || 0);
    });

    if (countEl) countEl.innerText = custSet.size + ' នាក់';
    if (totEl) totEl.innerText = '៛ ' + todayTotalSum.toLocaleString();

    if (tbody) {
      if (!todayUnpaids || todayUnpaids.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> គ្មានអ្នកដកទំនិញជំពាក់ថ្ងៃនេះទេ</td></tr>';
      } else {
        var html = '';
        todayUnpaids.forEach(function(item) {
          var timeStr = new Date(item.created_at).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
          var safeName = String(item.customer_name || '').replace(/'/g, "\\'");

          html += '<tr class="border-b hover:bg-gray-50">' +
            '<td class="p-2.5 text-gray-500 whitespace-nowrap text-[10px]">' + timeStr + '</td>' +
            '<td class="p-2.5 font-bold text-gray-800">' + item.customer_name + '</td>' +
            '<td class="p-2.5">' + item.product_name + '</td>' +
            '<td class="p-2.5 text-center font-bold text-blue-700">' + item.qty + '</td>' +
            '<td class="p-2.5 text-right font-bold text-orange-700 whitespace-nowrap">៛ ' + Number(item.total).toLocaleString() + '</td>' +
            '<td class="p-2.5 text-center">' +
              '<button onclick="selectCustomerForSettlement(\'' + safeName + '\')" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs shadow active:scale-95 transition flex items-center gap-1 mx-auto">' +
                '<i class="fas fa-hand-holding-usd"></i> ចុចទូទាត់' +
              '</button>' +
            '</td>' +
          '</tr>';
        });
        tbody.innerHTML = html;
      }
    }
  } catch(e) {}
}

// ==========================================
// 🔔 ៤. ឆែកមើលសំណើទូទាត់រង់ចាំពីម៉ូយ (PENDING APPROVAL)
// ==========================================
async function checkAdminPendingPayments() {
  var banner = document.getElementById('pendingPaymentsBanner');
  var container = document.getElementById('pendingCardsContainer');
  var badge = document.getElementById('pendingCountBadge');
  if (!banner || !container) return;

  try {
    const { data: list } = await supabaseClient
      .from('pending_payments')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (!list || list.length === 0) {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    if (badge) badge.innerText = list.length + " សំណើ";

    var html = '';
    list.forEach(function(item) {
      var dateStr = new Date(item.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      var safeName = String(item.customer_name || '').replace(/'/g, "\\'");

      html += '<div class="bg-white p-3 rounded-2xl border border-yellow-300 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">' +
        '<div class="space-y-1">' +
          '<div class="flex items-center gap-2">' +
            '<b class="text-xs sm:text-sm text-gray-900"><i class="fas fa-user-circle text-yellow-600 mr-1"></i>' + item.customer_name + '</b>' +
            '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-bold text-[10px]">' + item.method + '</span>' +
            '<small class="text-[10px] text-gray-400">' + dateStr + '</small>' +
          '</div>' +
          '<div class="text-xs font-black text-green-700">៛ ' + Number(item.khr_total || 0).toLocaleString() + '</div>' +
          (item.ref_code ? '<div class="text-[10px] text-gray-500 font-bold">Ref: <code>' + item.ref_code + '</code></div>' : '') +
        '</div>' +
        '<div class="flex items-center gap-1.5 self-end sm:self-auto">' +
          '<button onclick="applyPendingPaymentToSettlement(\'' + item.id + '\', \'' + safeName + '\', ' + (item.khr_total || 0) + ', \'' + (item.method || '') + '\')" class="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black shadow active:scale-95 transition flex items-center gap-1 whitespace-nowrap">' +
            '<i class="fas fa-hand-holding-dollar"></i> យកមកទូទាត់' +
          '</button>' +
          '<button onclick="dismissPendingCard(\'' + item.id + '\')" title="បដិសេធ" class="p-2 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl text-xs active:scale-90 transition">' +
            '<i class="fas fa-times text-sm"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
    });

    container.innerHTML = html;
  } catch(e) {}
}

async function applyPendingPaymentToSettlement(pendingId, custName, amount, method) {
  currentActivePendingPaymentId = pendingId;
  await selectCustomerForSettlement(custName);

  if (method && method.indexOf('ABA') !== -1) {
    setSettlePayMode('ABA');
  } else {
    setSettlePayMode('Cash');
  }

  document.getElementById('settlePaidInput').value = amount > 0 ? amount : "";
  calcSettleChange();

  var card = document.getElementById('settlement_card');
  if (card) card.scrollIntoView({ behavior: 'smooth' });

  showToast("បានបញ្ចូលសំណើទូទាត់របស់ [" + custName + "] រួចរាល់!", "success");
}

async function dismissPendingCard(pendingId) {
  if (!confirm("តើអ្នកចង់បដិសេធសំណើទូទាត់នេះមែនទេ?")) return;
  try {
    await supabaseClient.from('pending_payments').update({ status: 'Cancelled' }).eq('id', pendingId);
    showToast("បានបដិសេធសំណើជោគជ័យ!", "info");
    checkAdminPendingPayments();
  } catch(e) {}
}

// ==========================================
// 📋 ៥. ស្រង់បញ្ជីឈ្មោះម៉ូយជំពាក់ពី SUPABASE
// ==========================================
async function loadSettlementDebtorsList() {
  var badgesContainer = document.getElementById('settleDebtorsBadgesContainer');
  if (!badgesContainer) return;

  try {
    const { data: unpaids } = await supabaseClient
      .from('transactions')
      .select('customer_name, total')
      .eq('status', 'Unpaid');

    if (!unpaids || unpaids.length === 0) {
      badgesContainer.innerHTML = '<span class="text-green-600 font-bold text-xs"><i class="fas fa-check-circle mr-1"></i> អបអរសាទរ! គ្មានអតិថិជនណាជំពាក់ប្រាក់ឡើយ</span>';
      return;
    }

    var custMap = {};
    unpaids.forEach(function(u) {
      var cName = (u.customer_name || "").trim();
      if (cName && cName !== "Walk-in") {
        custMap[cName] = (custMap[cName] || 0) + parseFloat(u.total || 0);
      }
    });

    var html = '';
    for (var name in custMap) {
      html += '<button onclick="selectCustomerForSettlement(\'' + name.replace(/'/g, "\\'") + '\')" class="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-900 rounded-xl border border-blue-200 font-bold shadow-2xs active:scale-95 transition flex items-center gap-1.5">' +
        '<i class="fas fa-user text-blue-600"></i> ' + name + ' <span class="text-[10px] bg-red-100 text-red-700 px-2 py-0.2 rounded-full font-black">៛ ' + custMap[name].toLocaleString() + '</span>' +
      '</button>';
    }

    badgesContainer.innerHTML = html || '<span class="text-green-600 font-bold text-xs">គ្មានអតិថិជនជំពាក់ឡើយ</span>';
  } catch(e) {}
}

// ==========================================
// 🔍 ៦. ជ្រើសរើសម៉ូយ & ទាញជើងទឹកជំពាក់ជាក់ស្តែង
// ==========================================
async function selectCustomerForSettlement(custName) {
  if (!custName) {
    document.getElementById('settlement_ui').classList.add('hidden');
    return;
  }

  currentSettlementCustomer = custName;

  var sel = document.getElementById('set_c');
  if (sel) sel.value = custName;

  document.getElementById('settlement_ui').classList.remove('hidden');

  var tbody = document.getElementById('settleItemsTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic"><i class="fas fa-spinner fa-spin mr-1"></i> កំពុងទាញជើងទឹក...</td></tr>';

  try {
    const { data: items } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', custName)
      .eq('status', 'Unpaid')
      .order('id', { ascending: true });

    currentSettlementItems = items || [];

    const { data: lastSet } = await supabaseClient
      .from('settlements')
      .select('balance_khr')
      .eq('customer_name', custName)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    currentSettlementOldDebt = lastSet ? parseFloat(lastSet.balance_khr || 0) : 0;
    document.getElementById('settleOldDebtVal').innerText = '៛ ' + currentSettlementOldDebt.toLocaleString();

    var html = '';
    currentSettlementItems.forEach(function(item) {
      var dateStr = new Date(item.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      var recTag = item.recorded_by ? '<br><span class="text-[9px] text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 inline-block mt-0.5"><i class="fas fa-truck mr-1"></i>ដកដោយ៖ ' + item.recorded_by + '</span>' : '';

      html += '<tr class="border-b hover:bg-blue-50/40 transition">' +
        '<td class="p-2 text-center">' +
          '<input type="checkbox" class="settle-item-cb w-4 h-4 accent-green-600 cursor-pointer" data-id="' + item.id + '" data-total="' + item.total + '" onchange="recalcSettlementCalculation()" checked>' +
        '</td>' +
        '<td class="p-2 text-gray-500 text-[10px] whitespace-nowrap">' + dateStr + '</td>' +
        '<td class="p-2 font-bold text-gray-800">' + item.product_name + recTag + '</td>' +
        '<td class="p-2 text-center font-bold text-blue-700">' + item.qty + '</td>' +
        '<td class="p-2 text-right">' + Number(item.price).toLocaleString() + '</td>' +
        '<td class="p-2 text-right font-black text-green-700 whitespace-nowrap">' + Number(item.total).toLocaleString() + ' ៛</td>' +
      '</tr>';
    });

    tbody.innerHTML = html || '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">គ្មានទំនិញជំពាក់</td></tr>';
    recalcSettlementCalculation();
    fillExactSettlementPay();

    var card = document.getElementById('settlement_card');
    if (card) card.scrollIntoView({ behavior: 'smooth' });

  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500 font-bold">កំហុស៖ ' + err.message + '</td></tr>';
  }
}

function toggleSelectAllSettle(isChecked) {
  document.querySelectorAll('.settle-item-cb').forEach(function(cb) { cb.checked = isChecked; });
  recalcSettlementCalculation();
  fillExactSettlementPay();
}

function getSelectedSettlementTotal() {
  var sum = 0;
  document.querySelectorAll('.settle-item-cb:checked').forEach(function(cb) {
    sum += parseFloat(cb.getAttribute('data-total') || 0);
  });
  return sum;
}

function recalcSettlementCalculation() {
  var sub = getSelectedSettlementTotal();
  var count = document.querySelectorAll('.settle-item-cb:checked').length;
  
  var cbOldDebt = document.getElementById('cbIncludeOldDebt');
  var includeOldDebt = cbOldDebt ? cbOldDebt.checked : true;
  var oldDebtAmount = includeOldDebt ? currentSettlementOldDebt : 0;
  var totalDue = sub + oldDebtAmount;

  document.getElementById('settleSelectedCountBadge').innerText = count + ' ជើងទឹក';
  document.getElementById('settleSelectedSubtotal').innerText = '៛ ' + sub.toLocaleString();
  document.getElementById('settleTotalDueText').innerText = '៛ ' + totalDue.toLocaleString();

  calcSettleChange();
}

function fillExactSettlementPay() {
  var totalDue = getTotalDueAmount();

  if (currentSettlementPayMode === "Split") {
    var cK = document.getElementById('splitKhrCash');
    var sK = document.getElementById('splitKhrScan');
    var abaLabel = document.getElementById('splitAbaAmountLabel');
    if (sK) sK.value = totalDue > 0 ? totalDue : "";
    if (cK) cK.value = "";
    if (abaLabel) abaLabel.innerText = totalDue > 0 ? totalDue.toLocaleString() : "0";
  } else {
    document.getElementById('settlePaidInput').value = totalDue > 0 ? totalDue : "";
  }
  calcSettleChange();
}

function getSettlementActualPaid() {
  if (currentSettlementPayMode === "Split") {
    var cK = parseFloat(document.getElementById('splitKhrCash') ? document.getElementById('splitKhrCash').value || 0 : 0);
    var sK = parseFloat(document.getElementById('splitKhrScan') ? document.getElementById('splitKhrScan').value || 0 : 0);
    return cK + sK;
  } else {
    return parseFloat(document.getElementById('settlePaidInput') ? document.getElementById('settlePaidInput').value || 0 : 0);
  }
}

function calcSettleChange() {
  var area = document.getElementById('settleChangeArea');
  if (!area) return;

  var totalDue = getTotalDueAmount();
  var paid = getSettlementActualPaid();

  if (paid === 0 || totalDue === 0) { area.classList.add('hidden'); return; }
  var diff = paid - totalDue;

  if (diff > 0) {
    area.className = 'p-3 rounded-xl font-bold text-center border-2 bg-green-100 text-green-900 border-green-400';
    area.innerHTML = '<div class="text-[11px] uppercase text-green-700 font-bold mb-0.5">ប្រាក់អាប់ជូនវិញ</div><div class="text-lg font-black text-green-800">៛ ' + diff.toLocaleString() + '</div>';
    area.classList.remove('hidden');
  } else if (diff < 0) {
    area.className = 'p-3 rounded-xl font-bold text-center border-2 bg-orange-100 text-orange-900 border-orange-400';
    area.innerHTML = '<div class="text-[11px] uppercase text-orange-700 font-bold mb-0.5">នៅជំពាក់សល់</div><div class="text-lg font-black text-orange-800">៛ ' + Math.abs(diff).toLocaleString() + '</div>';
    area.classList.remove('hidden');
  } else {
    area.className = 'p-2.5 rounded-xl font-bold text-center border-2 bg-blue-100 text-blue-900 border-blue-300';
    area.innerHTML = '<i class="fas fa-check-circle text-blue-600 mr-1.5"></i> បង់លុយគ្រប់ចំនួន (គ្មានជំពាក់សល់)';
    area.classList.remove('hidden');
  }
}

function setSettlePayMode(mode) {
  currentSettlementPayMode = mode;
  var btnCash = document.getElementById('btnSettleCash');
  var btnAba = document.getElementById('btnSettleAba');
  var btnSplit = document.getElementById('btnSettleSplit');
  var singleArea = document.getElementById('settleSingleInputArea');
  var splitArea = document.getElementById('settleSplitInputArea');

  btnCash.className = "py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200";
  btnAba.className = "py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200";
  btnSplit.className = "py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200";

  if (mode === 'Cash') {
    btnCash.className = "py-2.5 rounded-lg text-xs font-bold bg-green-700 text-white shadow";
    if (singleArea) singleArea.classList.remove('hidden');
    if (splitArea) splitArea.classList.add('hidden');
  } else if (mode === 'ABA') {
    btnAba.className = "py-2.5 rounded-lg text-xs font-bold bg-blue-700 text-white shadow";
    if (singleArea) singleArea.classList.remove('hidden');
    if (splitArea) splitArea.classList.add('hidden');
  } else if (mode === 'Split') {
    btnSplit.className = "py-2.5 rounded-lg text-xs font-bold bg-purple-700 text-white shadow";
    if (singleArea) singleArea.classList.add('hidden');
    if (splitArea) splitArea.classList.remove('hidden');
    fillExactSettlementPay();
  }

  calcSettleChange();
}

// ==========================================
// 💾 ៧. បញ្ជាក់ការទូទាត់លុយ (SUBMIT SETTLEMENT ទៅ SUPABASE)
// ==========================================
var isSubmittingSettleLock = false;

async function submitSettlementPayment() {
  if (isSubmittingSettleLock) return;

  var checkedCbs = document.querySelectorAll('.settle-item-cb:checked');
  var selectedIds = [];
  checkedCbs.forEach(function(cb) { selectedIds.push(parseInt(cb.getAttribute('data-id'))); });

  var totalDue = getTotalDueAmount();
  var paid = getSettlementActualPaid();
  var cbOldDebt = document.getElementById('cbIncludeOldDebt');
  var includeOldDebt = cbOldDebt ? cbOldDebt.checked : true;

  if (selectedIds.length === 0 && (!includeOldDebt || currentSettlementOldDebt === 0)) {
    showToast("សូមធីកជ្រើសរើសយ៉ាងហោចណាស់ ១ ជួរដើម្បីទូទាត់!", "error"); 
    return;
  }
  if (paid === 0) {
    showToast("សូមបញ្ចូលចំនួនប្រាក់ដែលបានបង់!", "error"); 
    return;
  }

  var remainingBalance = Math.max(0, totalDue - paid);
  var cashKhrRecorded = 0;
  var scanKhrRecorded = 0;

  if (currentSettlementPayMode === 'Split') {
    cashKhrRecorded = parseFloat(document.getElementById('splitKhrCash') ? document.getElementById('splitKhrCash').value || 0 : 0);
    scanKhrRecorded = parseFloat(document.getElementById('splitKhrScan') ? document.getElementById('splitKhrScan').value || 0 : 0);
  } else if (currentSettlementPayMode === 'Cash') {
    cashKhrRecorded = paid;
  } else {
    scanKhrRecorded = paid;
  }

  var btn = document.getElementById('btnSubmitSettlement');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> កំពុងទូទាត់ប្រាក់...';
  isSubmittingSettleLock = true;

  try {
    // ១. ប្តូរ status ទៅ 'Paid' ក្នុង transactions table
    if (selectedIds.length > 0) {
      const { error: updErr } = await supabaseClient
        .from('transactions')
        .update({ status: 'Paid' })
        .in('id', selectedIds);
      if (updErr) throw updErr;
    }

    // ២. កត់ត្រាចូល settlements table ក្នុង Supabase
    const { error: setErr } = await supabaseClient.from('settlements').insert([{
      customer_name: currentSettlementCustomer,
      total_due_khr: totalDue,
      paid_khr: Math.min(paid, totalDue),
      balance_khr: remainingBalance,
      admin_name: currentUser.fullName || "Admin",
      pay_method: currentSettlementPayMode,
      cash_khr: cashKhrRecorded,
      scan_khr: scanKhrRecorded
    }]);
    if (setErr) throw setErr;

    // ៣. បិទបញ្ចប់សំណើ Pending Payment បើមាន
    if (currentActivePendingPaymentId) {
      await supabaseClient.from('pending_payments').update({ status: 'Approved' }).eq('id', currentActivePendingPaymentId);
      currentActivePendingPaymentId = null;
    }

    // ៤. បាញ់ Telegram Alert
    try {
      var methodLabel = (currentSettlementPayMode === 'ABA') ? '📱 ស្កេន ABA' : 
                        (currentSettlementPayMode === 'Split' ? '🔀 ចម្រុះ (លុយសុទ្ធ: ៛ ' + cashKhrRecorded.toLocaleString() + ' + ABA: ៛ ' + scanKhrRecorded.toLocaleString() + ')' : '💵 លុយសុទ្ធ');

      var tgMsg = "🙏 <b>[KC WATER - ទូទាត់ប្រាក់ជោគជ័យ]</b>\n\n" +
                  "👤 <b>អតិថិជន៖</b> " + currentSettlementCustomer + "\n" +
                  "💳 <b>វិធីទូទាត់៖</b> " + methodLabel + "\n" +
                  "💰 <b>សរុបត្រូវបង់៖</b> <b>៛ " + totalDue.toLocaleString() + "</b>\n" +
                  "✅ <b>ប្រាក់បានបង់៖</b> <b>៛ " + paid.toLocaleString() + "</b>\n" +
                  "⚠️ <b>នៅជំពាក់សល់៖</b> <b>៛ " + remainingBalance.toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកទទួល៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}

    // ៥. 🔔 បន្លឺសំឡេងរោទ៍ Chime & បាញ់កាំជ្រួចអបអរសាទរ
    playPaymentSuccessAudio();
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    // ៦. បង្កើតវិក្កយបត្ររូបភាព (Receipt PNG)
    var receiptItems = currentSettlementItems.filter(i => selectedIds.indexOf(i.id) !== -1);
    generateReceiptImage("SET-" + new Date().getTime(), currentSettlementCustomer, totalDue, paid, receiptItems, "វិក្កយបត្រទូទាត់ប្រាក់ (SETTLEMENT)");

    showToast("បានទូទាត់ប្រាក់ និងជម្រះបញ្ជីជោគជ័យ!", "success");

    // Refresh ឡើងវិញ
    document.getElementById('settlement_ui').classList.add('hidden');
    checkAdminPendingPayments();
    fetchSettlementOverviewData();
    await loadSettlementDebtorsList();

  } catch(err) {
    showToast("កំហុសទូទាត់ប្រាក់៖ " + err.message, "error");
  } finally {
    isSubmittingSettleLock = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-file-invoice-dollar text-xl"></i> ទូទាត់ & ចេញវិក្កយបត្រ (Save Settlement)';
  }
}
