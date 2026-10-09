/** ==========================================================================
 *  KC WATER POS SYSTEM - ONLINE ORDERS & DELIVERY ENGINE (pos-orders.js)
 *  (Realtime Sync with Store_Preview.html, Driver Assignment & Google Maps)
 *  ========================================================================== */

var lastKnownPendingOrderCount = 0;
var ordersRealtimeChannel = null;

// ==========================================
// 🔔 ១. សំឡេងរោទ៍ & ឆែកមើលការកុម្ម៉ង់ ONLINE ថ្មី
// ==========================================
function playOrderChime() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      var ctx = new AudioContext();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // សំឡេង ដូ
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // សំឡេង មី
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // សំឡេង សូល
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch(e) {}
}

async function checkPendingOnlineOrdersBadge() {
  var btn = document.getElementById('navOnlineOrdersBtn');
  var badge = document.getElementById('navOnlineOrdersCount');
  if (!btn || !badge) return;

  // 🚫 បើមិនមែន Admin ឬ Seller ទេ ➔ លាក់ប៊ូតុងនេះចោលជាដាច់ខាត និងមិនឱ្យបន្លឺសំឡេងរោទ៍ឡើយ!
  var isAdminOrSeller = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Seller'));
  if (!isAdminOrSeller) {
    btn.classList.add('hidden');
    btn.style.setProperty('display', 'none', 'important');
    return;
  }

  try {
    const { count, error } = await supabaseClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (error) throw error;
    var c = count || 0;

    btn.classList.remove('hidden');
    btn.style.setProperty('display', 'inline-flex', 'important');

    badge.innerText = c;
    if (c > 0) {
      badge.className = "w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-black animate-pulse shadow-xs";
    } else {
      badge.className = "w-5 h-5 rounded-full bg-slate-400 text-white text-[10px] flex items-center justify-center font-bold";
    }

    if (c > lastKnownPendingOrderCount && lastKnownPendingOrderCount !== 0) {
      playOrderChime();
      showToast("🔔 [ដំណឹងថ្មី] មានការកុម្ម៉ង់ទឹក Online ថ្មីចូលមកដល់!", "info");
      if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60 });
    }
    lastKnownPendingOrderCount = c;
  } catch(e) {}
}
// ⚡ REALTIME LISTENER (ស្តាប់ការកុម្ម៉ង់ផ្ទាល់ពី SUPABASE)
function initOrdersRealtimeListener() {
  try {
    ordersRealtimeChannel = supabaseClient
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function(payload) {
        checkPendingOnlineOrdersBadge();
        var modal = document.getElementById('onlineOrdersAdminModal');
        if (modal && !modal.classList.contains('hidden')) {
          openOnlineOrdersModal();
        }
      })
      .subscribe();
  } catch(e) {}
}

// ==========================================
// 📦 ២. ផ្ទាំង POPUP ពិនិត្យការកុម្ម៉ង់របស់ ADMIN
// ==========================================
function injectOnlineOrdersAdminModal() {
  if (document.getElementById('onlineOrdersAdminModal')) return;
  var html = '<div id="onlineOrdersAdminModal" class="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-4 hidden">' +
    '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="closeOnlineOrdersModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden relative">' +
      '<div class="p-4 border-b flex justify-between items-center bg-amber-50/80">' +
        '<div class="flex items-center gap-2">' +
          '<div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-base shadow-xs">' +
            '<i class="fas fa-truck-fast"></i>' +
          '</div>' +
          '<div>' +
            '<h3 class="font-black text-amber-950 text-sm sm:text-base leading-none">បញ្ជីការកុម្ម៉ង់ទឹក Online តាមផ្ទះ</h3>' +
            '<p class="text-[10px] text-amber-800 font-bold mt-0.5">ក្រុងប៉ោយប៉ែត (Poipet Delivery - Supabase)</p>' +
          '</div>' +
        '</div>' +
        '<button type="button" onclick="closeOnlineOrdersModal()" class="w-8 h-8 rounded-full bg-white text-gray-400 hover:text-gray-700 text-lg font-bold flex items-center justify-center shadow-xs">&times;</button>' +
      '</div>' +
      '<div id="onlineOrdersAdminListContainer" class="p-4 overflow-y-auto space-y-3 flex-1">' +
        '<div class="text-center py-8 text-gray-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1.5 text-amber-600"></i> កំពុងទាញយកបញ្ជីកុម្ម៉ង់...</div>' +
      '</div>' +
      '<div class="p-3 bg-gray-50 border-t flex justify-between items-center text-xs">' +
        '<button type="button" onclick="openOnlineOrdersModal()" class="px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 shadow-2xs flex items-center gap-1 active:scale-95 transition"><i class="fas fa-sync-alt text-xs"></i> Refresh</button>' +
        '<button type="button" onclick="closeOnlineOrdersModal()" class="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-700 active:scale-95 transition">បិទ</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

async function openOnlineOrdersModal() {
  injectOnlineOrdersAdminModal();
  var modal = document.getElementById('onlineOrdersAdminModal');
  var container = document.getElementById('onlineOrdersAdminListContainer');
  if (modal) modal.classList.remove('hidden');
  if (container) container.innerHTML = '<div class="text-center py-8 text-gray-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1.5 text-amber-600"></i> កំពុងទាញយកបញ្ជីកុម្ម៉ង់...</div>';

  try {
    const { data: list, error } = await supabaseClient
      .from('orders')
      .select('*')
      .in('status', ['Pending', 'Assigned'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="p-8 text-center space-y-2">' +
        '<div class="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xl"><i class="fas fa-check"></i></div>' +
        '<b class="text-gray-700 text-xs sm:text-sm block">បច្ចុប្បន្នគ្មានការកុម្ម៉ង់ទឹកដែលរង់ចាំដឹកជញ្ជូនឡើយ!</b>' +
        '<p class="text-[10px] text-gray-400">រាល់ពេលភ្ញៀវកុម្ម៉ង់លើ Website វានឹងលោតមកទីនេះភ្លាមៗ</p>' +
      '</div>';
      return;
    }

    // ស្រង់ឈ្មោះអ្នកដឹកជញ្ជូនរោងចក្រ (Company Drivers)
    var driverOptions = '<option value="">-- រើសអ្នកដឹករបស់រោងចក្រ --</option>';
    allCustomers.forEach(function(c) {
      if (c.role === 'Driver' || c.type === 'CompanyDriver' || c.linked_boss === 'KC WATER') {
        var dPhone = c.phone ? (' (' + c.phone + ')') : '';
        driverOptions += '<option value="' + c.full_name + '" data-phone="' + (c.phone || '') + '">' + c.full_name + dPhone + '</option>';
      }
    });

    var html = '';
    list.forEach(function(o) {
      var isPending = (o.status === 'Pending');
      var statusBadge = isPending ? 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">⏳ រង់ចាំចាត់ចែង</span>' : 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">🚚 កំពុងដឹក' + (o.driver_name ? ' (ដោយ: ' + o.driver_name + ')' : '') + '</span>';

      var cleanPhone = String(o.phone || '').replace(/[^0-9]/g, '');
      var safeName = String(o.customer_name || '').replace(/'/g, "\\'");
      var dateStr = new Date(o.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });

      html += '<div class="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm space-y-2.5 hover:shadow-md transition">' +
        '<div class="flex justify-between items-start border-b border-gray-100 pb-2">' +
          '<div>' +
            '<div class="flex items-center gap-1.5">' +
              '<b class="text-xs sm:text-sm text-gray-900 font-black"><i class="fas fa-user-circle text-amber-600 mr-1"></i>' + o.customer_name + '</b>' +
              statusBadge +
            '</div>' +
            '<div class="text-[10px] text-gray-400 mt-0.5">កូដ៖ <code>' + o.order_id + '</code> | ម៉ោង៖ ' + dateStr + '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="text-xs sm:text-sm font-black text-emerald-700">៛ ' + Number(o.total || 0).toLocaleString() + '</div>' +
            '<span class="text-[10px] font-bold text-gray-500">' + (o.payment_method || 'COD') + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 space-y-1 text-xs text-gray-700">' +
          '<div class="flex items-start gap-1.5">' +
            '<span class="text-gray-400 font-bold whitespace-nowrap">📦 ទំនិញ៖</span>' +
            '<b class="text-slate-900">' + o.items + '</b>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 text-[11px]">' +
            '<span class="text-gray-400 font-bold whitespace-nowrap">🛢️ សំបកធុង៖</span>' +
            '<span class="font-bold text-emerald-700">' + (o.barrel_swap || 'មានសំបកដូរ') + '</span>' +
          '</div>' +
          (o.location_url ? 
          '<div class="flex items-start gap-1.5 pt-0.5">' +
            '<span class="text-gray-400 font-bold whitespace-nowrap">📍 ទីតាំង៖</span>' +
            '<span class="text-gray-600 text-[11px] line-clamp-2">' + o.location_url + '</span>' +
          '</div>' : '') +
        '</div>' +

        // ផ្នែកចាត់ចែងអ្នកដឹក
        '<div class="p-2 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">' +
          '<div class="text-[10px] font-black text-blue-900 flex items-center gap-1"><i class="fas fa-motorcycle text-blue-600"></i> ចាត់ចែងអ្នកដឹកជញ្ជូនរោងចក្រ៖</div>' +
          '<div class="flex gap-1.5">' +
            '<select id="driver_sel_' + o.order_id + '" class="text-xs font-bold py-1.5 px-2 bg-white border border-blue-300 rounded-xl flex-1 outline-none">' +
              driverOptions +
            '</select>' +
            '<button type="button" onclick="assignDriverToOnlineOrder(\'' + o.order_id + '\', \'' + safeName + '\')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1 whitespace-nowrap">' +
              '<i class="fas fa-paper-plane text-[10px]"></i> ចាត់ចែង' +
            '</button>' +
          '</div>' +
        '</div>' +

        // ជួរប៊ូតុងសកម្មភាព (ខល, ផែនទី, បោះបង់, ដឹកដល់)
        '<div class="flex flex-wrap items-center justify-end gap-2 pt-0.5">' +
          (cleanPhone ? 
          '<a href="tel:' + cleanPhone + '" class="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 rounded-xl text-xs font-bold border border-green-200 shadow-2xs flex items-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
            '<i class="fas fa-phone text-xs text-green-600"></i> ខល ' + o.phone +
          '</a>' : '') +

          (o.location_url ? 
          '<button type="button" onclick="openOrderMap(\'' + o.location_url.replace(/'/g, "\\'") + '\')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-map-location-dot text-xs text-blue-600"></i> បើកផែនទី' +
          '</button>' : '') +

          '<button type="button" onclick="cancelOnlineOrder(\'' + o.order_id + '\', \'' + safeName + '\')" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-trash-can text-xs text-red-500"></i> បោះបង់' +
          '</button>' +

          '<button type="button" onclick="completeOnlineOrder(\'' + o.order_id + '\', \'' + safeName + '\', ' + (o.total || 0) + ', \'' + (o.items || '').replace(/'/g, "\\'") + '\', \'' + (o.driver_name || '').replace(/'/g, "\\'") + '\', \'' + (o.payment_method || 'COD').replace(/'/g, "\\'") + '\')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-check text-xs"></i> ដឹកជញ្ជូនរួចរាល់' +
          '</button>' +
        '</div>' +
      '</div>';
    });

    container.innerHTML = html;
  } catch(err) {
    container.innerHTML = '<div class="p-4 text-center text-red-500 font-bold text-xs">កំហុស៖ ' + err.message + '</div>';
  }
}

function closeOnlineOrdersModal() {
  var modal = document.getElementById('onlineOrdersAdminModal');
  if (modal) modal.classList.add('hidden');
  checkPendingOnlineOrdersBadge();
}

// ==========================================
// 🚀 ៣. សកម្មភាពចាត់ចែងអ្នកដឹក, បោះបង់ & ដឹកដល់
// ==========================================
async function assignDriverToOnlineOrder(orderId, custName) {
  var sel = document.getElementById('driver_sel_' + orderId);
  var driverName = sel ? sel.value.trim() : "";
  if (!driverName) {
    showToast("សូមជ្រើសរើសឈ្មោះអ្នកដឹកជញ្ជូន!", "error");
    if (sel) sel.focus();
    return;
  }

  var selectedOpt = sel.options[sel.selectedIndex];
  var driverPhone = selectedOpt ? selectedOpt.getAttribute('data-phone') : '';

  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({
        status: 'Assigned',
        driver_name: driverName,
        driver_phone: driverPhone
      })
      .eq('order_id', orderId);

    if (error) throw error;

    showToast("បានចាត់ចែងទៅឱ្យ " + driverName + " ជោគជ័យ!", "success");
    openOnlineOrdersModal();

    // ផ្ញើសារដំណឹង Telegram
    try {
      var tgMsg = "🚚 <b>[KC WATER - បានចាត់ចែងអ្នកដឹកជញ្ជូន]</b>\n\n" +
                  "🛵 <b>អ្នកដឹក៖</b> " + driverName + (driverPhone ? " (📞 " + driverPhone + ")" : "") + "\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}
  } catch(err) {
    showToast("កំហុសចាត់ចែង៖ " + err.message, "error");
  }
}

async function cancelOnlineOrder(orderId, custName) {
  if (!confirm("តើអ្នកពិតជាចង់បោះបង់ការកុម្ម៉ង់កូដ [" + orderId + "] នេះមែនទេ?")) return;

  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ status: 'Cancelled' })
      .eq('order_id', orderId);

    if (error) throw error;

    showToast("បានបោះបង់ការកុម្ម៉ង់ជោគជ័យ!", "success");
    openOnlineOrdersModal();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

async function completeOnlineOrder(orderId, custName, total, itemsText, driverName, payMethod) {
  if (!confirm("តើការកុម្ម៉ង់កូដ [" + orderId + "] ត្រូវបានដឹកដល់ និងប្រមូលប្រាក់រួចរាល់ហើយមែនទេ?")) return;

  try {
    // ១. ប្តូរ Status ក្នុង Orders ទៅ Delivered
    const { error: ordErr } = await supabaseClient
      .from('orders')
      .update({ status: 'Delivered' })
      .eq('order_id', orderId);
    if (ordErr) throw ordErr;

    // ២. កត់ត្រាចំណូលចូល Transactions
    var tid = "TR-" + new Date().getTime();
    var isABA = (payMethod.indexOf("ABA") !== -1);
    await supabaseClient.from('transactions').insert([{
      transaction_id: tid,
      customer_name: custName,
      product_name: itemsText,
      qty: 1,
      price: total,
      currency: "KHR",
      total: total,
      paid_khr: isABA ? 0 : total,
      recorded_by: driverName ? (driverName + " (អ្នកដឹក)") : "Admin",
      status: "Paid",
      payment_method: isABA ? "ABA" : "Cash"
    }]);

    showToast("បានកត់ត្រាការដឹកដល់ និងប្រមូលប្រាក់ជោគជ័យ!", "success");
    openOnlineOrdersModal();

    // ផ្ញើសារដំណឹង Telegram
    try {
      var tgMsg = "✅ <b>[KC WATER - ដឹកជញ្ជូនរួចរាល់ & ប្រមូលប្រាក់ជោគជ័យ!]</b>\n\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "🛵 <b>អ្នកដឹក៖</b> " + (driverName || "អ្នកដឹក KC WATER") + "\n" +
                  "📦 <b>ទំនិញ៖</b> " + itemsText + "\n" +
                  "💵 <b>ប្រាក់ទទួលបាន៖</b> <b>៛ " + Number(total).toLocaleString() + "</b> (" + payMethod + ")\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

function openOrderMap(mapUrl) {
  if (!mapUrl || String(mapUrl).trim() === "") {
    showToast("មិនមានទីតាំង ឬអាសយដ្ឋានឡើយ!", "warning");
    return;
  }
  var raw = String(mapUrl).trim();
  var match = raw.match(/https?:\/\/[^\s]+/);
  if (match) {
    window.open(match[0], '_blank');
  } else {
    var searchAddress = encodeURIComponent(raw + " ប៉ោយប៉ែត");
    window.open("https://www.google.com/maps/search/?api=1&query=" + searchAddress, '_blank');
  }
}

// 🔄 ចាប់ផ្តើមដំណើរការស្កេន Realtime ពេលបើកទំព័រ
window.addEventListener('load', function() {
  var navBtn = document.getElementById('navOnlineOrdersBtn');
  if (navBtn) {
    navBtn.onclick = openOnlineOrdersModal;
  }
  checkPendingOnlineOrdersBadge();
  initOrdersRealtimeListener();
  setInterval(checkPendingOnlineOrdersBadge, 15000); // Polling រៀងរាល់ ១៥ វិនាទីម្តង
});
