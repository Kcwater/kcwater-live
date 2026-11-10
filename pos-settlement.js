/** ==========================================================================
 *  KC WATER POS SYSTEM - SMART SETTLEMENT ENGINE (pos-settlement.js)
 *  (Smart Auto-Balance, Quick Cash Bills, Audio Chime & Invoicing)
 *  ========================================================================== */

var currentActivePendingPaymentId = null;
var isSubmittingSettleLock = false;

// 🔔 សំឡេងរោទ៍ដំណឹងពេលទូទាត់ជោគជ័យ (AUDIO SOUND FEEDBACK)
function playPaymentSuccessAudio() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      var ctx = new AudioContext();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    }
  } catch(e) {}
}

// ==========================================================================
// 💳 ១. ផ្ទាំងទូទាត់លុយ SETTLEMENT (DROPDOWN ពេញទំហំស្អាត គ្មានប៊ូតុងស្ទួន)
// ==========================================================================
async function renderSettlementModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  currentSettlementCustomer = "";
  currentSettlementItems = [];
  currentSettlementPayMode = "Cash";
  currentSettlementOldDebt = 0;
  currentActivePendingPaymentId = null;

  var custOptions = '<option value="">-- 🔍 ជ្រើសរើសឈ្មោះម៉ូយដើម្បីទូទាត់ --</option><option value="Walk-in">🛒 -- លក់នៅកន្លែង (Walk-in) --</option>';
  allCustomers.forEach(function(c) {
    if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
      var tag = (c.type === 'Monthly') ? ' [ប្រចាំខែ]' : ' [អ្នកលក់បន្ត]';
      custOptions += '<option value="' + c.full_name + '">' + c.full_name + tag + '</option>';
    }
  });

  // 🖥️ ទំព័រដើមរចនាបថស្តង់ដារ (លុបប៊ូតុងស្ទួន ទុកតែប៊ូតុង Navbar ខាងលើ)
  area.innerHTML = '<div class="w-full max-w-[1600px] mx-auto space-y-3 px-1 sm:px-2">' +
    
    // របារក្បាលទំព័រ (Dropdown ពេញទំហំស្អាត មិនដាច់អក្សរ)
    '<div class="bg-white p-3.5 sm:p-4 rounded-3xl border shadow-sm space-y-2.5">' +
      '<div>' +
        '<h2 class="text-sm sm:text-base font-black text-blue-900 flex items-center gap-1.5">' +
          '<i class="fas fa-calculator text-blue-600"></i>ប្រព័ន្ធទូទាត់ប្រាក់ (Smart Settlement)' +
        '</h2>' +
        '<p class="text-[10px] sm:text-[11px] text-gray-500 font-bold mt-0.5">ជ្រើសរើសម៉ូយខាងក្រោម ឬចុចប៊ូតុង «ទូទាត់» ដើម្បីចេញវិក្កយបត្រ</p>' +
      '</div>' +

      // 🌟 Dropdown ពេញទំហំកាត ១០០% ស្រួលចុច មិនកាត់អក្សរ គ្មានប៊ូតុងស្ទួននាំទើស
      '<div class="w-full">' +
        '<select id="set_c_quick" onchange="selectCustomerForSettlement(this.value)" class="w-full border-2 border-blue-300 focus:border-blue-600 font-black text-blue-950 rounded-2xl p-3 bg-blue-50/40 outline-none text-xs sm:text-sm shadow-xs">' +
          custOptions +
        '</select>' +
      '</div>' +
    '</div>' +

    // 🔔 បដាសំណើទូទាត់រង់ចាំពីម៉ូយ (Pending Approval Banner)
    '<div id="pendingPaymentsBanner" class="hidden card border-t-4 border-yellow-500 bg-yellow-50/80 p-3.5 shadow-md mb-0 space-y-2 rounded-2xl">' +
      '<div class="flex justify-between items-center">' +
        '<h3 class="font-extrabold text-yellow-950 text-xs sm:text-sm flex items-center gap-2">' +
          '<i class="fas fa-bell text-yellow-600 animate-bounce"></i> សំណើទូទាត់រង់ចាំផ្ទៀងផ្ទាត់ពីម៉ូយ' +
        '</h3>' +
        '<span id="pendingCountBadge" class="bg-yellow-200 text-yellow-900 text-[10px] font-black px-2.5 py-0.5 rounded-full"></span>' +
      '</div>' +
      '<div id="pendingCardsContainer" class="space-y-2 pt-1"></div>' +
    '</div>' +

    // 📊 កាតស្ថិតិសង្ខេប ២
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">' +
      '<div class="dash-card border-l-4 border-orange-500 shadow-md p-3.5 bg-white rounded-2xl">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase truncate">ចំនួនអ្នកដកទឹកថ្ងៃនេះមិនទាន់ទូទាត់</div>' +
        '<div id="todayUnpaidCount" class="mt-1 font-black text-orange-800 text-base sm:text-lg">កំពុងឆែកមើល...</div>' +
      '</div>' +
      '<div class="dash-card border-l-4 border-red-500 shadow-md p-3.5 bg-white rounded-2xl">' +
        '<div class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase truncate">ទឹកប្រាក់ដកថ្ងៃនេះមិនទាន់ទូទាត់សរុប</div>' +
        '<div id="todayUnpaidTotal" class="mt-1 font-black text-red-700 text-base sm:text-lg">កំពុងគណនា...</div>' +
      '</div>' +
    '</div>' +

    // 📋 តារាងអ្នកដកទំនិញថ្ងៃនេះ
    '<div class="card p-3.5 sm:p-5 border-t-4 border-orange-500 shadow-xl mb-0 bg-white rounded-2xl">' +
      '<h3 class="font-bold text-gray-800 text-xs sm:text-sm mb-2.5 flex items-center gap-2">' +
        '<i class="fas fa-clock text-orange-500"></i>បញ្ជីអ្នកដកទំនិញថ្ងៃនេះ (មិនទាន់ទូទាត់)' +
      '</h3>' +
      '<div class="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-gray-200 shadow-inner">' +
        '<table class="w-full text-left text-xs border-collapse">' +
          '<thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-xs">' +
            '<tr>' +
              '<th class="p-2 sm:p-2.5 text-center w-14">ម៉ោង</th>' +
              '<th class="p-2 sm:p-2.5">ឈ្មោះអតិថិជន</th>' +
              '<th class="p-2 sm:p-2.5">មុខទំនិញ</th>' +
              '<th class="p-2 sm:p-2.5 text-center">ចំនួន</th>' +
              '<th class="p-2 sm:p-2.5 text-right">តម្លៃសរុប</th>' +
              '<th class="p-2 sm:p-2.5 text-center w-24">សកម្មភាព</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="todayUnpaidTbody"><tr><td colspan="6" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +

    // 👥 បញ្ជីឈ្មោះម៉ូយជំពាក់ទាំងអស់
    '<div class="card border-t-4 border-blue-500 shadow-xl p-3.5 sm:p-5 mb-0 bg-white rounded-2xl">' +
      '<h4 class="font-bold text-gray-800 text-xs sm:text-sm mb-2.5 flex items-center gap-2">' +
        '<i class="fas fa-users text-blue-600"></i> ចុចលើឈ្មោះម៉ូយជំពាក់ ដើម្បីបើកផ្ទាំងទូទាត់ភ្លាមៗ៖' +
      '</h4>' +
      '<div id="settleDebtorsBadgesContainer" class="flex flex-wrap gap-2 pt-0.5 text-xs max-h-60 overflow-y-auto pr-1">' +
        '<i class="fas fa-spinner fa-spin text-blue-600"></i> កំពុងឆែកបញ្ជីជំពាក់...' +
      '</div>' +
    '</div>' +

  '</div>' +

  // 🌟 ផ្ទាំង POP-UP MODAL គិតលុយចំកណ្តាលអេក្រង់
  '<div id="settlementActionModal" class="fixed inset-0 z-[7000] flex items-center justify-center p-3 sm:p-4 hidden overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity" onclick="closeSettlementModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-lg p-4 sm:p-5 space-y-3 relative border border-slate-100 animate-in zoom-in-95 duration-200 my-auto max-h-[92dvh] flex flex-col text-left">' +
      '<div class="flex justify-between items-center border-b pb-2.5">' +
        '<div>' +
          '<h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">' +
            '<i class="fas fa-file-invoice-dollar text-blue-600 text-lg"></i>' +
            '<span>ទូទាត់ប្រាក់៖ <b id="settleModalCustName" class="text-blue-700"></b></span>' +
          '</h3>' +
          '<p class="text-[10px] text-slate-500 font-bold mt-0.5">ផ្ទៀងផ្ទាត់ជើងទឹក និងប្រមូលប្រាក់ចេញវិក្កយបត្រ</p>' +
        '</div>' +
        '<button type="button" onclick="closeSettlementModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 text-lg font-bold flex items-center justify-center shadow-xs">&times;</button>' +
      '</div>' +
      '<div class="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs" id="settlementModalScrollableBody">' +
        '<div class="flex justify-between items-center">' +
          '<b class="text-slate-800 font-black flex items-center gap-1.5"><i class="fas fa-boxes text-blue-600"></i>បញ្ជីជើងទឹកដកជំពាក់</b>' +
          '<span id="settleSelectedCountBadge" class="bg-blue-100 text-blue-800 text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold">0 ជើងទឹក</span>' +
        '</div>' +
        '<div id="settleProductSummaryArea" class="hidden p-2 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs space-y-1"></div>' +
        '<div class="overflow-x-auto max-h-48 overflow-y-auto rounded-xl border border-slate-200">' +
          '<table class="w-full text-left text-xs border-collapse">' +
            '<thead class="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b z-10">' +
              '<tr>' +
                '<th class="p-2 text-center w-8"><input type="checkbox" id="settleSelectAllCb" onchange="toggleSelectAllSettle(this.checked)" checked class="w-4 h-4 accent-green-600 cursor-pointer"></th>' +
                '<th class="p-2 text-[10px] text-center w-20">កាលបរិច្ឆេទ</th>' +
                '<th class="p-2">មុខទំនិញ</th>' +
                '<th class="p-2 text-center">ចំនួន</th>' +
                '<th class="p-2 text-right">តម្លៃរាយ</th>' +
                '<th class="p-2 text-right">សរុប</th>' +
                '<th class="p-2 text-center w-16">កែ/លុប</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody id="settleItemsTableBody"></tbody>' +
          '</table>' +
        '</div>' +
        '<div class="p-3 bg-orange-50 rounded-2xl border border-orange-200 text-xs space-y-1 text-orange-950 font-bold shadow-2xs">' +
          '<div class="flex justify-between"><span>សរុបទំនិញដែលបានធីក (+)៖</span><b id="settleSelectedSubtotal" class="text-xs text-blue-900">0 ៛</b></div>' +
          '<div id="settleOldDebtRow" class="flex justify-between items-center border-t border-orange-200 pt-1">' +
            '<label class="flex items-center gap-1.5 cursor-pointer select-none">' +
              '<input type="checkbox" id="cbIncludeOldDebt" onchange="recalcSettlementCalculation()" checked class="w-4 h-4 accent-orange-600 cursor-pointer">' +
              '<span>បូកបញ្ចូលបំណុលចាស់ពីមុន៖</span>' +
            '</label>' +
            '<b id="settleOldDebtVal" class="text-orange-700">0 ៛</b>' +
          '</div>' +
          '<div class="flex justify-between text-xs sm:text-sm font-black text-orange-950 border-t border-orange-300 pt-1 mt-0.5">' +
            '<span>សរុបត្រូវបង់លើកនេះ (=)៖</span><span id="settleTotalDueText" class="text-sm sm:text-base text-orange-800 font-black">0 ៛</span>' +
          '</div>' +
        '</div>' +
        '<div class="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 space-y-2">' +
          '<div class="flex justify-between items-center">' +
            '<label class="text-[10px] font-bold text-blue-900 uppercase">វិធីទូទាត់ប្រាក់ជាក់ស្តែង</label>' +
            '<button type="button" onclick="fillExactSettlementPay()" class="px-2.5 py-0.5 bg-white text-blue-700 text-xs font-extrabold rounded-lg border border-blue-300 shadow-2xs active:scale-95 transition">លុយគ្រប់</button>' +
          '</div>' +
          '<div class="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border">' +
            '<button type="button" id="btnSettleCash" onclick="setSettlePayMode(\'Cash\')" class="py-1.5 rounded-lg text-xs font-bold bg-green-700 text-white shadow"><i class="fas fa-money-bill-wave mr-1"></i> លុយសុទ្ធ</button>' +
            '<button type="button" id="btnSettleAba" onclick="setSettlePayMode(\'ABA\')" class="py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fas fa-qrcode mr-1"></i> ស្កេន ABA</button>' +
            '<button type="button" id="btnSettleSplit" onclick="setSettlePayMode(\'Split\')" class="py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fas fa-layer-group mr-1"></i> ចម្រុះ</button>' +
          '</div>' +
          '<div id="settleSingleInputArea" class="space-y-0.5">' +
            '<label class="text-[9.5px] font-bold text-gray-500 uppercase">ប្រាក់បានបង់ជាក់ស្តែង (៛)</label>' +
            '<input type="number" id="settlePaidInput" oninput="calcSettleChange()" placeholder="0" class="w-full text-center text-base sm:text-lg font-black text-blue-900 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl p-1.5 outline-none">' +
          '</div>' +
          '<div id="settleSplitInputArea" class="hidden space-y-1.5 bg-white p-2.5 rounded-2xl border border-blue-200 shadow-2xs">' +
            '<div class="text-[10px] font-black text-blue-900 uppercase flex items-center justify-between">' +
              '<span><i class="fas fa-layer-group text-blue-600 mr-1"></i> បែងចែកចម្រុះ (៛)៖</span>' +
              '<span class="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">🧠 Auto-Balance</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-1.5">' +
              '<div><label class="text-[9px] font-bold text-gray-600 block mb-0.5">💵 លុយសុទ្ធ (៛)</label><input type="number" id="splitKhrCash" oninput="onSplitCashInput(this.value)" placeholder="0" class="w-full text-center font-black text-xs p-1.5 bg-gray-50 focus:bg-white rounded-xl border-2 border-gray-300 focus:border-green-600 outline-none"></div>' +
              '<div><label class="text-[9px] font-black text-blue-700 block mb-0.5">📱 ស្កេន ABA (៛)</label><input type="number" id="splitKhrScan" oninput="onSplitScanInput(this.value)" placeholder="0" class="w-full text-center font-black text-xs p-1.5 bg-white rounded-xl border-2 border-blue-400 text-blue-900 outline-none"></div>' +
            '</div>' +
            '<button type="button" onclick="openSplitAbaQrModal()" class="w-full py-1 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition"><i class="fas fa-qrcode text-[10px]"></i> 📱 ស្កេន ៛ <span id="splitAbaAmountLabel">0</span></button>' +
          '</div>' +
          '<div class="flex gap-1 pt-0.5 text-xs">' +
            '<button type="button" onclick="setQuickCashBill(10000)" class="flex-1 py-1 bg-white hover:bg-green-50 text-gray-800 font-black rounded-lg border shadow-2xs active:scale-95 transition">10k</button>' +
            '<button type="button" onclick="setQuickCashBill(20000)" class="flex-1 py-1 bg-white hover:bg-green-50 text-gray-800 font-black rounded-lg border shadow-2xs active:scale-95 transition">20k</button>' +
            '<button type="button" onclick="setQuickCashBill(50000)" class="flex-1 py-1 bg-white hover:bg-green-50 text-gray-800 font-black rounded-lg border shadow-2xs active:scale-95 transition">50k</button>' +
            '<button type="button" onclick="setQuickCashBill(100000)" class="flex-1 py-1 bg-white hover:bg-green-50 text-gray-800 font-black rounded-lg border shadow-2xs active:scale-95 transition">100k</button>' +
          '</div>' +
          '<div id="settleChangeArea" class="rounded-xl transition-all duration-200 hidden"></div>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-3 gap-2 pt-1 border-t">' +
        '<button type="button" onclick="closeSettlementModal()" class="col-span-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs active:scale-95 transition">បិទ</button>' +
        '<button type="button" onclick="submitSettlementPayment()" id="btnSubmitSettlement" class="col-span-2 btn-green shadow-xl py-3 text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition"><i class="fas fa-file-invoice-dollar text-base"></i> ទូទាត់ & ចេញវិក្កយបត្រ</button>' +
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
// 📊 ៣. គណនាទិន្នន័យសង្ខេប & តារាងអ្នកដកថ្ងៃនេះ (ប្រើប្រព័ន្ធម៉ោងកម្ពុជា UTC+7 ត្រឹមត្រូវ ១០០%)
// ==========================================
async function fetchSettlementOverviewData() {
  try {
    var todayStr = getCambodiaToday();
    // 🇰🇭 កំណត់ម៉ោងចាប់ផ្តើម 00:00 នៃប្រទេសកម្ពុជា (+07:00) មិនឱ្យកាត់ជើងទឹកព្រឹកព្រលឹមឡើយ
    var todayQueryStart = todayStr + 'T00:00:00+07:00';

    const { data: todayUnpaids } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('status', 'Unpaid')
      .gte('created_at', todayQueryStart)
      .order('created_at', { ascending: false });

    var countEl = document.getElementById('todayUnpaidCount');
    var totEl = document.getElementById('todayUnpaidTotal');
    var tbody = document.getElementById('todayUnpaidTbody');

    var custSet = new Set();
    var todayTotalSum = 0;
    var filteredTodayList = [];

    (todayUnpaids || []).forEach(function(u) {
      // 🛡️ ផ្ទៀងផ្ទាត់បន្ថែមដោយប្រើកូនសោរម៉ោងកម្ពុជា
      if (isTodayInCambodia(u.created_at)) {
        if (u.customer_name && u.customer_name !== "Walk-in") {
          custSet.add(u.customer_name);
        }
        todayTotalSum += parseFloat(u.total || 0);
        filteredTodayList.push(u);
      }
    });

    if (countEl) countEl.innerText = custSet.size + ' នាក់';
    if (totEl) totEl.innerText = '៛ ' + todayTotalSum.toLocaleString();

    if (tbody) {
      if (filteredTodayList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> គ្មានអ្នកដកទំនិញជំពាក់ថ្ងៃនេះទេ</td></tr>';
      } else {
        var html = '';
        filteredTodayList.forEach(function(item) {
          // 🇰🇭 បង្ហាញម៉ោងតាមម៉ោងកម្ពុជាពិតប្រាកដ
          var timeStr = new Date(item.created_at).toLocaleTimeString('km-KH', { 
            timeZone: 'Asia/Phnom_Penh', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          var safeName = String(item.customer_name || '').replace(/'/g, "\\'");

          var isWithdrawnByOther = (item.recorded_by && item.recorded_by !== item.customer_name && item.recorded_by !== 'Admin');
          var withdrawTag = isWithdrawnByOther ? 
            ('<br><span class="text-[9.5px] text-amber-950 font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[9px] text-amber-600"></i>ដកជំនួសដោយ៖ ' + item.recorded_by + '</span>') : 
            (item.recorded_by && item.recorded_by === 'Admin' ? '<br><small class="text-slate-400 font-normal text-[9px]">កត់ត្រាដោយ Admin</small>' : '');

          html += '<tr class="border-b hover:bg-gray-50">' +
            '<td class="p-2.5 text-gray-500 whitespace-nowrap text-[10px]">' + timeStr + '</td>' +
            '<td class="p-2.5 font-bold text-gray-800">' + item.customer_name + withdrawTag + '</td>' +
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
  } catch(e) {
    console.error("Settlement overview error:", e);
  }
}
// ==========================================
// 🔔 ៤. ឆែកមើលសំណើទូទាត់រង់ចាំពីម៉ូយ (កាតស្តង់ដារ មិនបែកអក្សរលើទូរស័ព្ទ ១០០%)
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
      var dateStr = new Date(item.created_at).toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh',
        dateStyle: 'short', 
        timeStyle: 'short' 
      });
      var safeName = String(item.customer_name || '').replace(/'/g, "\\'");

      // បង្រួម Badge វិធីបង់ប្រាក់ឱ្យខ្លីស្អាត មិនធ្លាក់ជា ២-៣ ជួរ
      var rawMethod = String(item.method || '');
      var methodBadge = '';
      if (rawMethod.includes('CASH') || rawMethod.includes('លុយសុទ្ធ')) {
        methodBadge = '<span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-black text-[10px] whitespace-nowrap">💵 លុយសុទ្ធ</span>';
      } else if (rawMethod.includes('ABA') || rawMethod.includes('ស្កេន')) {
        methodBadge = '<span class="px-2.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-full font-black text-[10px] whitespace-nowrap">📱 ស្កេន ABA</span>';
      } else {
        methodBadge = '<span class="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-[10px] whitespace-nowrap">🔀 ចម្រុះ</span>';
      }

      // 🎨 កាតរចនាបថទំនើប មិនកាត់ឈ្មោះ «លីគីម ស្រេង» និងមិនធ្លាក់អក្សរ
      html += '<div class="bg-white p-3 sm:p-3.5 rounded-2xl border-2 border-amber-300 shadow-sm space-y-2.5">' +
        // ជួរទី ១៖ ឈ្មោះពេញរបស់ម៉ូយ & ម៉ោងស្នើសុំ
        '<div class="flex justify-between items-center gap-2 border-b border-slate-100 pb-2">' +
          '<div class="flex items-center gap-2 min-w-0 flex-1">' +
            '<div class="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs shrink-0">' +
              '<i class="fas fa-user-circle"></i>' +
            '</div>' +
            '<b class="text-xs sm:text-sm font-black text-slate-900 truncate">' + item.customer_name + '</b>' +
          '</div>' +
          '<span class="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">' + dateStr + '</span>' +
        '</div>' +

        // ជួរទី ២៖ ទឹកប្រាក់ស្នើសុំ & វិធីទូទាត់
        '<div class="flex justify-between items-center text-xs px-0.5">' +
          '<div>' +
            '<span class="text-[9.5px] text-slate-400 font-bold uppercase block">ទឹកប្រាក់សុំទូទាត់</span>' +
            '<b class="text-sm sm:text-base font-black text-emerald-700">៛ ' + Number(item.khr_total || 0).toLocaleString() + '</b>' +
          '</div>' +
          '<div class="text-right">' +
            methodBadge +
            (item.ref_code ? '<span class="text-[9.5px] text-slate-500 font-mono block mt-0.5">Ref: ' + item.ref_code + '</span>' : '') +
          '</div>' +
        '</div>' +

        // ជួរទី ៣៖ ប៊ូតុង «យកមកទូទាត់» និងប៊ូតុង «បដិសេធ»
        '<div class="flex items-center gap-2 pt-1 border-t border-slate-100">' +
          '<button type="button" onclick="applyPendingPaymentToSettlement(\'' + item.id + '\', \'' + safeName + '\', ' + (item.khr_total || 0) + ', \'' + (item.method || '') + '\')" class="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition whitespace-nowrap">' +
            '<i class="fas fa-hand-holding-dollar text-xs"></i> យកមកទូទាត់' +
          '</button>' +
          '<button type="button" onclick="dismissPendingCard(\'' + item.id + '\')" title="បដិសេធសំណើ" class="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl text-xs font-bold border border-slate-200 active:scale-90 transition shrink-0">' +
            '<i class="fas fa-xmark text-sm"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
    });

    container.innerHTML = html;
  } catch(e) {}
}


// ==========================================
// ❌ មុខងារបិទផ្ទាំង POP-UP គិតលុយ (SETTLEMENT MODAL)
// ==========================================
function closeSettlementModal() {
  var modal = document.getElementById('settlementActionModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  var quickSel = document.getElementById('set_c_quick');
  if (quickSel) quickSel.value = "";
  currentSettlementCustomer = "";
  currentSettlementItems = [];
  currentActivePendingPaymentId = null;
}

// ==========================================
// 🔍 ៦. ជ្រើសរើសម៉ូយ & បើកផ្ទាំង POP-UP គិតលុយ (ចំកណ្តាលអេក្រង់ភ្លាមៗ ១០០%)
// ==========================================
async function selectCustomerForSettlement(custName) {
  var modal = document.getElementById('settlementActionModal');
  var nameLabel = document.getElementById('settleModalCustName');
  if (!custName) {
    closeSettlementModal();
    return;
  }

  currentSettlementCustomer = custName;
  if (nameLabel) nameLabel.innerText = custName;

  var quickSel = document.getElementById('set_c_quick');
  if (quickSel) quickSel.value = custName;

  // 🌟 បង្ខំឱ្យបើកផ្ទាំង Pop-up គិតលុយចំកណ្តាលអេក្រង់ភ្លាមៗ
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  var tbody = document.getElementById('settleItemsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400 italic"><i class="fas fa-spinner fa-spin mr-1 text-blue-600"></i> កំពុងទាញជើងទឹក...</td></tr>';
  }

  try {
    const { data: items, error: itemErr } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', custName)
      .eq('status', 'Unpaid')
      .order('id', { ascending: true });

    if (itemErr) throw itemErr;

    currentSettlementItems = items || [];

    const { data: lastSet } = await supabaseClient
      .from('settlements')
      .select('balance_khr')
      .eq('customer_name', custName)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    currentSettlementOldDebt = lastSet ? parseFloat(lastSet.balance_khr || 0) : 0;
    var oldDebtValEl = document.getElementById('settleOldDebtVal');
    if (oldDebtValEl) {
      oldDebtValEl.innerText = '៛ ' + currentSettlementOldDebt.toLocaleString();
    }

    var html = '';
    var isAdmin = (currentUser && currentUser.role === 'Admin');

    currentSettlementItems.forEach(function(item) {
      var dateStr = new Date(item.created_at).toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var isWithdrawnByOther = (item.recorded_by && item.recorded_by !== item.customer_name && item.recorded_by !== 'Admin');
      var recTag = isWithdrawnByOther ? 
        ('<br><span class="text-[9.5px] text-amber-950 font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[9px] text-amber-600"></i>ដកជំនួសដោយ៖ ' + item.recorded_by + '</span>') : 
        (item.recorded_by && item.recorded_by === 'Admin' ? '<br><small class="text-slate-400 font-normal text-[9px]">កត់ត្រាដោយ Admin</small>' : '');

      var actionBtnsHtml = isAdmin ?
        ('<td class="p-2 text-center whitespace-nowrap">' +
          '<div class="flex items-center justify-center gap-1">' +
            '<button type="button" onclick="openEditSettleItemModal(' + item.id + ')" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg active:scale-90 transition" title="កែប្រែចំនួន/តម្លៃ"><i class="fas fa-pen-to-square text-xs"></i></button>' +
            '<button type="button" onclick="deleteSettleItem(' + item.id + ', \'' + (item.product_name || '').replace(/'/g, "\\'") + '\', ' + (item.qty || 1) + ', ' + (item.total || 0) + ')" class="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg active:scale-90 transition" title="លុបជើងទឹកនេះ"><i class="fas fa-trash-can text-xs"></i></button>' +
          '</div>' +
        '</td>') : '<td class="p-2 text-center text-slate-300">-</td>';

      html += '<tr class="border-b hover:bg-blue-50/40 transition">' +
        '<td class="p-2 text-center">' +
          '<input type="checkbox" class="settle-item-cb w-4 h-4 accent-green-600 cursor-pointer" data-id="' + item.id + '" data-total="' + item.total + '" onchange="recalcSettlementCalculation()" checked>' +
        '</td>' +
        '<td class="p-2 text-gray-500 text-[10px] whitespace-nowrap text-center">' + dateStr + '</td>' +
        '<td class="p-2 font-bold text-gray-800">' + item.product_name + recTag + '</td>' +
        '<td class="p-2 text-center font-bold text-blue-700">' + item.qty + '</td>' +
        '<td class="p-2 text-right text-gray-600">' + Number(item.price).toLocaleString() + '</td>' +
        '<td class="p-2 text-right font-black text-green-700 whitespace-nowrap">៛ ' + Number(item.total).toLocaleString() + '</td>' +
        actionBtnsHtml +
      '</tr>';
    });

    if (tbody) {
      tbody.innerHTML = html || '<tr><td colspan="7" class="p-6 text-center text-emerald-700 font-bold bg-emerald-50/50"><i class="fas fa-check-circle mr-1 text-base text-emerald-600"></i> អតិថិជននេះគ្មានជើងទឹកជំពាក់ដែលមិនទាន់ទូទាត់ឡើយ</td></tr>';
    }

    recalcSettlementCalculation();
    fillExactSettlementPay();

  } catch(err) {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-red-500 font-bold">កំហុសទាញទិន្នន័យ៖ ' + err.message + '</td></tr>';
    }
  }
}

// ==========================================
// 📥 មុខងារចុចលើប៊ូតុង «យកមកទូទាត់» (បើក POP-UP ភ្លាមៗ)
// ==========================================
async function applyPendingPaymentToSettlement(pendingId, custName, amount, method) {
  try {
    const { data: item } = await supabaseClient
      .from('pending_payments')
      .select('*')
      .eq('id', pendingId)
      .maybeSingle();

    if (!item || item.status !== 'Pending') {
      await kcAlert({
        title: "សំណើបានទូទាត់រួចហើយ!",
        message: "សំណើបង់ប្រាក់របស់ [" + custName + "] នេះត្រូវបាន Admin ផ្សេងទូទាត់រួចរាល់ហើយ!",
        type: "info"
      });
      currentActivePendingPaymentId = null;
      checkAdminPendingPayments();
      return;
    }

    currentActivePendingPaymentId = pendingId;

    // 🌟 ១. បើក Pop-up គិតលុយរបស់ម៉ូយម្នាក់នេះភ្លាមៗ
    await selectCustomerForSettlement(custName);

    // ២. បំពេញចំនួនទឹកប្រាក់ដែលគាត់បានផ្ញើមកអូតូ
    var kCash = parseFloat(item.khr_cash || 0);
    var kScan = parseFloat(item.khr_scan || 0);

    if (kCash > 0 && kScan > 0) {
      setSettlePayMode('Split');
      var cashInp = document.getElementById('splitKhrCash');
      var scanInp = document.getElementById('splitKhrScan');
      var abaLabel = document.getElementById('splitAbaAmountLabel');

      if (cashInp) cashInp.value = kCash;
      if (scanInp) scanInp.value = kScan;
      if (abaLabel) abaLabel.innerText = kScan.toLocaleString();

    } else if (method && method.indexOf('ABA') !== -1) {
      setSettlePayMode('ABA');
      if (document.getElementById('settlePaidInput')) {
        document.getElementById('settlePaidInput').value = amount > 0 ? amount : "";
      }
    } else {
      setSettlePayMode('Cash');
      if (document.getElementById('settlePaidInput')) {
        document.getElementById('settlePaidInput').value = amount > 0 ? amount : "";
      }
    }

    calcSettleChange();
    showToast("បានបញ្ចូលទិន្នន័យទូទាត់របស់ [" + custName + "] រួចរាល់!", "success");

  } catch(e) {
    showToast("កំហុសបញ្ចូលសំណើ៖ " + e.message, "error");
  }
}

async function dismissPendingCard(pendingId) {
  var ok = await kcConfirm({
    title: "បដិសេធសំណើទូទាត់",
    message: "តើអ្នកពិតជាចង់បដិសេធសំណើទូទាត់ប្រាក់នេះមែនទេ?",
    type: "danger",
    confirmText: "យល់ព្រមបដិសេធ"
  });
  if (!ok) return;

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

// 🧮 មុខងារគណនាប្រាក់ និងសរុបបរិមាណតាមមុខទំនិញដែលបានធីក (Realtime)
function recalcSettlementCalculation() {
  var sub = getSelectedSettlementTotal();
  var checkedBoxes = document.querySelectorAll('.settle-item-cb:checked');
  var count = checkedBoxes.length;
  
  var cbOldDebt = document.getElementById('cbIncludeOldDebt');
  var includeOldDebt = cbOldDebt ? cbOldDebt.checked : true;
  var oldDebtAmount = includeOldDebt ? currentSettlementOldDebt : 0;
  var totalDue = sub + oldDebtAmount;

  document.getElementById('settleSelectedCountBadge').innerText = count + ' ជើងទឹក';
  document.getElementById('settleSelectedSubtotal').innerText = '៛ ' + sub.toLocaleString();
  document.getElementById('settleTotalDueText').innerText = '៛ ' + totalDue.toLocaleString();

  // 📦 គណនាសរុបបរិមាណតាមមុខទំនិញដែលបានធីក
  var summaryArea = document.getElementById('settleProductSummaryArea');
  if (summaryArea) {
    if (count === 0) {
      summaryArea.classList.add('hidden');
    } else {
      var prodQtyMap = {};
      checkedBoxes.forEach(function(cb) {
        var tr = cb.closest('tr');
        if (tr) {
          var tds = tr.querySelectorAll('td');
          // ជួរទី ៣ ជាឈ្មោះទំនិញ និងជួរទី ៤ ជាចំនួន
          if (tds.length >= 4) {
            var pName = tds[2].innerText.split('\n')[0].trim();
            var pQty = parseFloat(tds[3].innerText.trim() || 0);
            if (pName) {
              prodQtyMap[pName] = (prodQtyMap[pName] || 0) + pQty;
            }
          }
        }
      });

      var keys = Object.keys(prodQtyMap);
      if (keys.length > 0) {
        var html = '<div class="text-[11px] font-black text-blue-950 flex items-center gap-1 mb-1">' +
          '<i class="fas fa-cubes-stacked text-blue-600"></i> សរុបបរិមាណទំនិញដែលបានធីកគិតលុយ៖' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5">';

        keys.forEach(function(pKey) {
          var unit = (pKey.indexOf("ធុង") !== -1) ? "ធុង" : ((pKey.indexOf("យួរ") !== -1) ? "យួរ" : ((pKey.indexOf("កេស") !== -1) ? "កេស" : ((pKey.indexOf("បាវ") !== -1) ? "បាវ" : ((pKey.indexOf("កំប៉ុង") !== -1) ? "កំប៉ុង" : ((pKey.indexOf("ដប") !== -1) ? "ដប" : "ឯកតា")))));
          html += '<div class="bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs text-[11px] font-bold text-slate-800">' +
            '<span>' + pKey + '៖ </span>' +
            '<b class="text-blue-700">' + Number(prodQtyMap[pKey]).toLocaleString() + ' ' + unit + '</b>' +
          '</div>';
        });

        html += '</div>';
        summaryArea.innerHTML = html;
        summaryArea.classList.remove('hidden');
      } else {
        summaryArea.classList.add('hidden');
      }
    }
  }

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
// 💾 មុខងារបញ្ជាក់ការទូទាត់លុយ & ចេញវិក្កយបត្រ (ប្រើ kcAlert & បិទបញ្ចប់ Pending ស្អាត)
// ==========================================
async function submitSettlementPayment() {
  if (isSubmittingSettleLock) return;

  var checkedCbs = document.querySelectorAll('.settle-item-cb:checked');
  var selectedIds = [];
  checkedCbs.forEach(function(cb) { 
    selectedIds.push(parseInt(cb.getAttribute('data-id'))); 
  });

  var totalDue = getTotalDueAmount();
  var paid = getSettlementActualPaid();
  var cbOldDebt = document.getElementById('cbIncludeOldDebt');
  var includeOldDebt = cbOldDebt ? cbOldDebt.checked : true;

  if (selectedIds.length === 0 && (!includeOldDebt || currentSettlementOldDebt === 0)) {
    await kcAlert({
      title: "មិនទាន់បានជ្រើសរើស",
      message: "សូមធីកជ្រើសរើសយ៉ាងហោចណាស់ ១ ជើងទឹកដើម្បីទូទាត់ប្រាក់!",
      type: "warning"
    });
    return;
  }

  if (paid === 0) {
    await kcAlert({
      title: "ខ្វះចំនួនប្រាក់",
      message: "សូមបញ្ចូលចំនួនប្រាក់ដែលបានទទួលជាក់ស្តែងពីអតិថិជន!",
      type: "warning"
    });
    var paidInp = document.getElementById('settlePaidInput');
    if (paidInp) paidInp.focus();
    return;
  }

  var remainingBalance = Math.max(0, totalDue - paid);
  var actualSettledPaid = Math.min(paid, totalDue);
  var changeKhr = Math.max(0, paid - totalDue);
  var cashKhrRecorded = 0;
  var scanKhrRecorded = 0;

  if (currentSettlementPayMode === 'Split') {
    var rawCash = parseFloat(document.getElementById('splitKhrCash') ? document.getElementById('splitKhrCash').value || 0 : 0);
    var rawScan = parseFloat(document.getElementById('splitKhrScan') ? document.getElementById('splitKhrScan').value || 0 : 0);
    cashKhrRecorded = Math.max(0, rawCash - changeKhr);
    scanKhrRecorded = Math.min(rawScan, actualSettledPaid - cashKhrRecorded);
  } else if (currentSettlementPayMode === 'Cash') {
    cashKhrRecorded = actualSettledPaid;
    scanKhrRecorded = 0;
  } else {
    cashKhrRecorded = 0;
    scanKhrRecorded = actualSettledPaid;
  }

  var btn = document.getElementById('btnSubmitSettlement');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> កំពុងទូទាត់ប្រាក់...';
  }
  isSubmittingSettleLock = true;

  try {
    // ១. ប្តូរស្ថានភាពជើងទឹកដែលបានធីកទៅជា 'Paid' ក្នុង Transactions
    if (selectedIds.length > 0) {
      const { error: updErr } = await supabaseClient
        .from('transactions')
        .update({ status: 'Paid' })
        .in('id', selectedIds);
      if (updErr) throw updErr;
    }

    // ២. កត់ត្រាចូលតារាង Settlements ក្នុង Supabase
    const { error: setErr } = await supabaseClient.from('settlements').insert([{
      customer_name: currentSettlementCustomer,
      total_due_khr: totalDue,
      paid_khr: actualSettledPaid,
      balance_khr: remainingBalance,
      admin_name: currentUser.fullName || "Admin",
      pay_method: currentSettlementPayMode,
      cash_khr: cashKhrRecorded,
      scan_khr: scanKhrRecorded,
      settled_at: new Date().toISOString()
    }]);
    if (setErr) throw setErr;

    // ៣. បិទបញ្ចប់សំណើ Pending ទាំងអស់របស់ម៉ូយនេះទៅជា 'Approved'
    try {
      if (currentActivePendingPaymentId) {
        await supabaseClient
          .from('pending_payments')
          .update({ status: 'Approved' })
          .eq('id', currentActivePendingPaymentId);
      }
      if (currentSettlementCustomer) {
        await supabaseClient
          .from('pending_payments')
          .update({ status: 'Approved' })
          .eq('customer_name', currentSettlementCustomer)
          .eq('status', 'Pending');
      }
    } catch(penErr) {
      console.warn("Pending payment update warning:", penErr);
    }
    currentActivePendingPaymentId = null;

    // ៤. ផ្ញើសារដំណឹង Telegram ទៅកាន់រោងចក្រ
    try {
      var methodLabel = (currentSettlementPayMode === 'ABA') ? '📱 ស្កេន ABA' : 
                        (currentSettlementPayMode === 'Split' ? '🔀 ចម្រុះ (លុយសុទ្ធ: ៛ ' + cashKhrRecorded.toLocaleString() + ' + ABA: ៛ ' + scanKhrRecorded.toLocaleString() + ')' : '💵 លុយសុទ្ធ');

      var timeKhNow = new Date().toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var tgMsg = "🙏 <b>[KC WATER - ទូទាត់ប្រាក់ជោគជ័យ]</b>\n\n" +
                  "👤 <b>អតិថិជន៖</b> <b>" + currentSettlementCustomer + "</b>\n" +
                  "💳 <b>វិធីទូទាត់៖</b> " + methodLabel + "\n" +
                  "💰 <b>សរុបត្រូវបង់៖</b> <b>៛ " + totalDue.toLocaleString() + "</b>\n" +
                  "✅ <b>ប្រាក់បានបង់៖</b> <b>៛ " + paid.toLocaleString() + "</b>\n" +
                  "⚠️ <b>នៅជំពាក់សល់៖</b> <b>៛ " + remainingBalance.toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកទទួល៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + timeKhNow;

      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg);
      }
    } catch(e) {}

    // ៥. សំឡេង Chime & បាញ់កាំជ្រួច
    if (typeof playPaymentSuccessAudio === 'function') playPaymentSuccessAudio();
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    // ៦. បង្កើតវិក្កយបត្ររូបភាព (Receipt)
    var receiptItems = currentSettlementItems.filter(i => selectedIds.indexOf(i.id) !== -1);
    if (includeOldDebt && currentSettlementOldDebt > 0) {
      receiptItems.push({
        name: "បំណុលចាស់ពីមុន (Old Debt Balance)",
        qty: 1,
        price: currentSettlementOldDebt,
        currency: "KHR"
      });
    }

    if (typeof generateReceiptImage === 'function') {
      generateReceiptImage("SET-" + new Date().getTime(), currentSettlementCustomer, totalDue, paid, receiptItems, "វិក្កយបត្រទូទាត់ប្រាក់ (SETTLEMENT)");
    }

    await kcAlert({
      title: "ទូទាត់ជោគជ័យ! 🎉",
      message: "បានទូទាត់ប្រាក់ចំនួន ៛ " + paid.toLocaleString() + " សម្រាប់ [" + currentSettlementCustomer + "] រួចរាល់! វិក្កយបត្រត្រូវបានបង្កើតដោយជោគជ័យ។",
      type: "success"
    });

    // ៧. Refresh ផ្ទាំង Settlement ឡើងវិញ
    
    closeSettlementModal();
    checkAdminPendingPayments();
    fetchSettlementOverviewData();
    await loadSettlementDebtorsList();

  } catch(err) {
    await kcAlert({ title: "កំហុសទូទាត់ប្រាក់", message: err.message, type: "danger" });
  } finally {
    isSubmittingSettleLock = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-file-invoice-dollar text-base"></i> ទូទាត់ & ចេញវិក្កយបត្រ (Save Settlement)';
    }
  }
}

// ==========================================================================
// ✏️ មុខងារកែប្រែ & លុបជើងទឹកក្នុងផ្ទាំងទូទាត់ (SETTLEMENT EDIT & DELETE ENGINE)
// ==========================================================================

var activeEditingSettleItem = null;

// ១. បើកផ្ទាំង Pop-up កែប្រែចំនួន ឬតម្លៃរាយ
function openEditSettleItemModal(transId) {
  var item = currentSettlementItems.find(function(i) { return i.id === transId; });
  if (!item) return;

  activeEditingSettleItem = item;
  var existing = document.getElementById('editSettleItemModal');
  if (existing) existing.remove();

  var modalHtml = '<div id="editSettleItemModal" class="fixed inset-0 z-[7000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/65 backdrop-blur-xs" onclick="closeEditSettleItemModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3.5 text-center relative border border-slate-100 animate-in zoom-in-95 duration-200 my-auto">' +
      '<div class="flex justify-between items-center border-b pb-2">' +
        '<div class="text-left">' +
          '<h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-1.5">' +
            '<i class="fas fa-pen-to-square text-blue-600"></i> កែប្រែជើងទឹកដក' +
          '</h3>' +
          '<p class="text-[10px] text-slate-500 font-bold mt-0.5">អតិថិជន៖ ' + (currentSettlementCustomer || 'ម៉ូយ') + '</p>' +
        '</div>' +
        '<button type="button" onclick="closeEditSettleItemModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 text-lg font-bold flex items-center justify-center">&times;</button>' +
      '</div>' +

      '<div class="p-2.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-left space-y-0.5">' +
        '<span class="text-[10px] font-bold text-slate-500 block">មុខទំនិញ</span>' +
        '<b class="text-xs sm:text-sm font-black text-blue-950 block">' + item.product_name + '</b>' +
      '</div>' +

      '<div class="grid grid-cols-2 gap-2 text-left text-xs">' +
        '<div>' +
          '<label class="text-[9.5px] font-black text-slate-700 uppercase block mb-1">ចំនួនទំនិញ (Qty) *</label>' +
          '<input type="number" id="inpEditSettleQty" value="' + item.qty + '" min="1" oninput="updateEditSettleSubtotal()" class="w-full text-center font-black text-base p-2.5 bg-slate-50 border-2 border-blue-300 focus:border-blue-600 rounded-xl outline-none">' +
        '</div>' +
        '<div>' +
          '<label class="text-[9.5px] font-black text-slate-700 uppercase block mb-1">តម្លៃរាយ (Price ៛) *</label>' +
          '<input type="number" id="inpEditSettlePrice" value="' + item.price + '" min="0" oninput="updateEditSettleSubtotal()" class="w-full text-center font-black text-base p-2.5 bg-slate-50 border-2 border-blue-300 focus:border-blue-600 rounded-xl outline-none text-emerald-800">' +
        '</div>' +
      '</div>' +

      '<div class="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center text-xs font-bold text-emerald-950">' +
        '<span>សរុបទឹកប្រាក់ថ្មី៖</span>' +
        '<b id="editSettleNewTotalText" class="text-sm font-black text-emerald-800">៛ ' + Number(item.total).toLocaleString() + '</b>' +
      '</div>' +

      '<div class="grid grid-cols-2 gap-2 pt-1">' +
        '<button type="button" onclick="closeEditSettleItemModal()" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition">បោះបង់</button>' +
        '<button type="button" id="btnSaveEditedSettleAction" onclick="saveEditedSettleItem()" class="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1">' +
          '<i class="fas fa-check"></i> រក្សាទុកការកែ' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeEditSettleItemModal() {
  var modal = document.getElementById('editSettleItemModal');
  if (modal) modal.remove();
  activeEditingSettleItem = null;
}

function updateEditSettleSubtotal() {
  var q = parseFloat(document.getElementById('inpEditSettleQty') ? document.getElementById('inpEditSettleQty').value || 0 : 0);
  var pr = parseFloat(document.getElementById('inpEditSettlePrice') ? document.getElementById('inpEditSettlePrice').value || 0 : 0);
  var totEl = document.getElementById('editSettleNewTotalText');
  if (totEl) {
    totEl.innerText = '៛ ' + Math.max(0, Math.round(q * pr)).toLocaleString();
  }
}

// 💾 ២. រក្សាទុកការកែប្រែចំនួន/តម្លៃ និងកែតម្រូវស្តុកស្វ័យប្រវត្តិ
async function saveEditedSettleItem() {
  if (!activeEditingSettleItem) return;

  var item = activeEditingSettleItem;
  var newQty = parseFloat(document.getElementById('inpEditSettleQty') ? document.getElementById('inpEditSettleQty').value || 0 : 0);
  var newPrice = parseFloat(document.getElementById('inpEditSettlePrice') ? document.getElementById('inpEditSettlePrice').value || 0 : 0);

  if (newQty <= 0) {
    showToast("សូមបញ្ចូលចំនួនទំនិញធំជាង ០!", "error");
    return;
  }

  var btn = document.getElementById('btnSaveEditedSettleAction');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងរក្សាទុក...';
  }

  try {
    var oldQty = parseFloat(item.qty || 0);
    var oldPrice = parseFloat(item.price || 0);
    var oldTotal = parseFloat(item.total || 0);
    var newTotal = Math.round(newQty * newPrice);
    var qtyDiff = newQty - oldQty; // វិជ្ជមានបើដកថែម, អវិជ្ជមានបើកាត់បន្ថយ

    // ក. កែតម្រូវស្តុកឃ្លាំង (បើជាទំនិញទិញគេ)
    var prodObj = (allProducts || []).find(function(p) {
      return p.name.trim().toLowerCase() === item.product_name.trim().toLowerCase();
    });

    if (prodObj && prodObj.type === 'ទិញគេ' && qtyDiff !== 0) {
      var curStock = parseFloat(prodObj.stock || 0);
      var updatedStock = Math.max(0, curStock - qtyDiff);

      await supabaseClient
        .from('products')
        .update({ stock: updatedStock })
        .eq('id', prodObj.id);

      prodObj.stock = updatedStock; // អាប់ដេត Memory ភ្លាមៗ
    }

    // ខ. ធ្វើបច្ចុប្បន្នភាពក្នុងតារាង Transactions
    const { error: updErr } = await supabaseClient
      .from('transactions')
      .update({
        qty: newQty,
        price: newPrice,
        total: newTotal
      })
      .eq('id', item.id);

    if (updErr) throw updErr;

    closeEditSettleItemModal();

    // 🔔 ផ្ញើ Telegram Alert
    try {
      var timeKhNow = new Date().toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var tgMsg = "✏️ <b>[KC WATER - កែប្រែជើងទឹកដកជំពាក់]</b>\n\n" +
                  "👤 <b>អតិថិជន៖</b> <b>" + currentSettlementCustomer + "</b>\n" +
                  "📦 <b>ទំនិញ៖</b> " + item.product_name + "\n" +
                  "📝 <b>ចាស់៖</b> " + oldQty + " x ៛ " + oldPrice.toLocaleString() + " = ៛ " + oldTotal.toLocaleString() + "\n" +
                  "👉 <b>ថ្មី៖</b> <b>" + newQty + " x ៛ " + newPrice.toLocaleString() + " = ៛ " + newTotal.toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកកែ៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + timeKhNow;

      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg);
      }
    } catch(tgE) {}

    // 🌟 បង្ហាញផ្ទាំង kcAlert ជោគជ័យ
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "កែប្រែជោគជ័យ! 🎉",
        message: "ជើងទឹក [" + item.product_name + "] ត្រូវបានកែប្រែមកត្រឹម " + newQty + " x ៛ " + newPrice.toLocaleString() + " (សរុប ៛ " + newTotal.toLocaleString() + ") រួចរាល់!",
        type: "success"
      });
    } else {
      showToast("បានកែប្រែជោគជ័យ!", "success");
    }

    // 🔄 ទាញទិន្នន័យទូទាត់ និងគណនាប្រាក់ឡើងវិញភ្លាមៗ
    await selectCustomerForSettlement(currentSettlementCustomer);
    fetchSettlementOverviewData();
    loadSettlementDebtorsList();

  } catch(err) {
    if (typeof kcAlert === 'function') {
      await kcAlert({ title: "កំហុស", message: err.message, type: "danger" });
    } else {
      showToast("កំហុស៖ " + err.message, "error");
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 🗑️ ៣. មុខងារលុបជើងទឹកជំពាក់ & បង្វិលស្តុកសងចូលឃ្លាំងវិញ
async function deleteSettleItem(transId, prodName, qty, total) {
  var ok = await kcConfirm({
    title: "បញ្ជាក់ការលុបជើងទឹក",
    message: "តើអ្នកពិតជាចង់លុបជើងទឹក [" + prodName + " x " + qty + "] ចំនួន ៛ " + Number(total).toLocaleString() + " របស់ [" + currentSettlementCustomer + "] នេះមែនទេ? ស្តុកទំនិញនឹងត្រូវបង្វិលសងចូលឃ្លាំងវិញដោយស្វ័យប្រវត្តិ។",
    type: "danger",
    confirmText: "យល់ព្រមលុបជើងទឹក"
  });

  if (!ok) return;

  try {
    // ក. បង្វិលស្តុកសងចូលឃ្លាំងវិញ (បើជាទំនិញទិញគេ)
    var prodObj = (allProducts || []).find(function(p) {
      return p.name.trim().toLowerCase() === prodName.trim().toLowerCase();
    });

    if (prodObj && prodObj.type === 'ទិញគេ' && qty > 0) {
      var curStock = parseFloat(prodObj.stock || 0);
      var restoredStock = curStock + parseFloat(qty);

      await supabaseClient
        .from('products')
        .update({ stock: restoredStock })
        .eq('id', prodObj.id);

      prodObj.stock = restoredStock; // អាប់ដេត Memory
    }

    // ខ. លុបកំណត់ត្រាចេញពី Transactions
    const { error: delErr } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', transId);

    if (delErr) throw delErr;

    // 🔔 ផ្ញើ Telegram Alert
    try {
      var timeKhNow = new Date().toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var tgMsg = "🗑️ <b>[KC WATER - លុបជើងទឹកជំពាក់ (Void Item)]</b>\n\n" +
                  "👤 <b>អតិថិជន៖</b> <b>" + currentSettlementCustomer + "</b>\n" +
                  "📦 <b>ទំនិញលុប៖</b> " + prodName + " x " + qty + "\n" +
                  "💰 <b>ទឹកប្រាក់៖</b> <b>-៛ " + Number(total).toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកលុប៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + timeKhNow;

      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg);
      }
    } catch(tgE) {}

    // 🌟 ជូនដំណឹងជោគជ័យ
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "បានលុបជោគជ័យ! 🎉",
        message: "ជើងទឹក [" + prodName + "] ត្រូវបានលុប និងបង្វិលស្តុកសងវិញរួចរាល់!",
        type: "success"
      });
    } else {
      showToast("បានលុបជើងទឹកជោគជ័យ!", "success");
    }

    // 🔄 ទាញទិន្នន័យទូទាត់ និងគណនាប្រាក់ឡើងវិញភ្លាមៗ
    await selectCustomerForSettlement(currentSettlementCustomer);
    fetchSettlementOverviewData();
    loadSettlementDebtorsList();

  } catch(err) {
    if (typeof kcAlert === 'function') {
      await kcAlert({ title: "កំហុស", message: err.message, type: "danger" });
    } else {
      showToast("កំហុស៖ " + err.message, "error");
    }
  }
}
