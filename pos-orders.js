/** ==========================================================================
 *  KC WATER POS SYSTEM - ONLINE ORDERS & DELIVERY ENGINE (pos-orders.js)
 *  (Realtime Sync with Store_Preview.html, Driver Assignment & Google Maps)
 *  ========================================================================== */

var lastKnownPendingOrderCount = 0;
var ordersRealtimeChannel = null;
var adminOnlineOrdersCache = [];
var activeAdminOnlineTab = 'ACTIVE';
// 🖼️ ឃ្លាំងផ្ទុករូបថតផ្ទះភ្ញៀវសុវត្ថិភាព (ការពារកុំឱ្យ Crash ពេលភ្ញៀវភ្ជាប់រូបមុខផ្ទះ)
var safeOrderPhotoStore = {};

function storeOrderPhoto(orderId, photoUrl, custName) {
  if (!orderId || !photoUrl) return;
  safeOrderPhotoStore[orderId] = {
    url: photoUrl,
    name: custName || 'អតិថិជន'
  };
}

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

  // 👑 បង្ហាញ និងបន្លឺសំឡេងរោទ៍សម្រាប់តែ Admin ម្នាក់គត់ (លាក់ពី Seller/Driver ទាំងអស់)
  var isAdmin = (currentUser && currentUser.role === 'Admin');
  if (!isAdmin) {
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

// ⚡ REALTIME LISTENER (មានរំញ័រទូរស័ព្ទ Vibration & សំឡេងរោទ៍ ដាស់តឿនអ្នកដឹក)
function initOrdersRealtimeListener() {
  try {
    if (ordersRealtimeChannel) {
      supabaseClient.removeChannel(ordersRealtimeChannel);
      ordersRealtimeChannel = null;
    }

    ordersRealtimeChannel = supabaseClient
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function(payload) {
        checkPendingOnlineOrdersBadge();
        var modal = document.getElementById('onlineOrdersAdminModal');
        if (modal && !modal.classList.contains('hidden')) {
          openOnlineOrdersModal();
        }

        // 🛵 សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver)
        if (currentUser && currentUser.type === 'CompanyDriver') {
          var driverContainer = document.getElementById('driverOrdersContainer');
          if (driverContainer) {
            renderCompanyDeliveriesModule(true); // Silent update រលូន មិនកន្ត្រាក់
          }

          var newRecord = payload.new || {};
          if (newRecord.status === 'Assigned' && newRecord.driver_name === currentUser.fullName) {
            playOrderChime();
            // 📳 ញ័រទូរស័ព្ទដាស់តឿនអ្នកដឹកភ្លាមៗ
            if (navigator.vibrate) {
              navigator.vibrate([400, 200, 400, 200, 600]);
            }
            showToast("🛵 [ការងារថ្មី] Admin បានចាត់ចែងការដឹកទឹកថ្មីឱ្យអ្នក!", "success");
          }
        }
      })
      .subscribe();
  } catch(e) {}
}

// 🔄 Polling Auto-Sync ស្ងាត់ៗរៀងរាល់ ១៥ វិនាទីម្តង
setInterval(function() {
  checkPendingOnlineOrdersBadge();
  if (currentUser && currentUser.type === 'CompanyDriver') {
    var driverContainer = document.getElementById('driverOrdersContainer');
    if (driverContainer) {
      renderCompanyDeliveriesModule(true); // Silent update!
    }
  }
}, 15000);

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

// ==========================================
// 📦 ផ្ទាំង ADMIN ONLINE ORDERS (ប្រើម៉ោងកម្ពុជា UTC+7 មិនឱ្យបាត់ Order ដឹកដល់ថ្ងៃនេះឡើយ)
// ==========================================
async function openOnlineOrdersModal() {
  injectOnlineOrdersAdminModal();
  var modal = document.getElementById('onlineOrdersAdminModal');
  var container = document.getElementById('onlineOrdersAdminListContainer');
  if (modal) modal.classList.remove('hidden');
  if (container) container.innerHTML = '<div class="text-center py-8 text-gray-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1.5 text-amber-600"></i> កំពុងទាញយកបញ្ជីកុម្ម៉ង់...</div>';

  try {
    // ១. ធានាថាមានទិន្នន័យអ្នកដឹកជញ្ជូនក្នុង Dropdown
    if (!allCustomers || allCustomers.length === 0) {
      const { data: custs } = await supabaseClient
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });
      if (custs) allCustomers = custs;
    }

    // 🇰🇭 ប្រើប្រព័ន្ធម៉ោងកម្ពុជា UTC+7
    var todayStr = getCambodiaToday();
    var todayQueryStart = todayStr + 'T00:00:00+07:00';

    // ២. ទាញយកទាំង Order កំពុងដំណើរការ (Pending, Assigned) និង Order ដឹកដល់ថ្ងៃនេះ (Delivered Today)
    const { data: activeList, error: actErr } = await supabaseClient
      .from('orders')
      .select('*')
      .in('status', ['Pending', 'Assigned'])
      .order('created_at', { ascending: false });

    if (actErr) throw actErr;

    const { data: deliveredToday, error: delErr } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('status', 'Delivered')
      .gte('created_at', todayQueryStart)
      .order('created_at', { ascending: false });

    if (delErr) throw delErr;

    adminOnlineOrdersCache = (activeList || []).concat(deliveredToday || []);
    renderAdminOnlineOrdersUI();

  } catch(err) {
    if (container) container.innerHTML = '<div class="p-4 text-center text-red-500 font-bold text-xs">កំហុស៖ ' + err.message + '</div>';
  }
}

function switchAdminOnlineTab(tab) {
  activeAdminOnlineTab = tab;
  renderAdminOnlineOrdersUI();
}

// 📋 មុខងារបង្ហាញបញ្ជីកុម្ម៉ង់ Online លើផ្ទាំង Admin (បង្ហាញទីតាំង និងចំណាំពេញលេញ)
function renderAdminOnlineOrdersUI() {
  var container = document.getElementById('onlineOrdersAdminListContainer');
  if (!container) return;

  var list = adminOnlineOrdersCache || [];

  // ១. គណនាចំនួនតាមប្រភេទ
  var pendingCount = 0;
  var assignedCount = 0;
  var deliveredCount = 0;
  var totalAmountToCollect = 0;

  list.forEach(function(o) {
    if (o.status === 'Pending') { pendingCount++; totalAmountToCollect += parseFloat(o.total || 0); }
    if (o.status === 'Assigned') { assignedCount++; totalAmountToCollect += parseFloat(o.total || 0); }
    if (o.status === 'Delivered') { deliveredCount++; }
  });

  // ២. របារប៊ូតុងតម្រង (Filter Tabs)
  var tabsHtml = '<div class="flex flex-wrap gap-1 p-1 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs mb-3 font-bold">' +
    '<button type="button" onclick="switchAdminOnlineTab(\'ACTIVE\')" class="flex-1 py-1.5 px-2 rounded-xl transition ' + (activeAdminOnlineTab === 'ACTIVE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white') + '">🔥 កំពុងដំណើរការ (' + (pendingCount + assignedCount) + ')</button>' +
    '<button type="button" onclick="switchAdminOnlineTab(\'PENDING\')" class="py-1.5 px-2.5 rounded-xl transition ' + (activeAdminOnlineTab === 'PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white') + '">⏳ រង់ចាំ (' + pendingCount + ')</button>' +
    '<button type="button" onclick="switchAdminOnlineTab(\'ASSIGNED\')" class="py-1.5 px-2.5 rounded-xl transition ' + (activeAdminOnlineTab === 'ASSIGNED' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white') + '">🚚 កំពុងដឹក (' + assignedCount + ')</button>' +
    '<button type="button" onclick="switchAdminOnlineTab(\'DELIVERED\')" class="py-1.5 px-2.5 rounded-xl transition ' + (activeAdminOnlineTab === 'DELIVERED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-white') + '">✅ ដឹកដល់ថ្ងៃនេះ (' + deliveredCount + ')</button>' +
  '</div>';

  // ៣. ចម្រាញ់ទិន្នន័យតាម Tab
  var filteredList = list.filter(function(o) {
    if (activeAdminOnlineTab === 'ACTIVE') return o.status === 'Pending' || o.status === 'Assigned';
    if (activeAdminOnlineTab === 'PENDING') return o.status === 'Pending';
    if (activeAdminOnlineTab === 'ASSIGNED') return o.status === 'Assigned';
    if (activeAdminOnlineTab === 'DELIVERED') return o.status === 'Delivered';
    return true;
  });

  if (filteredList.length === 0) {
    container.innerHTML = tabsHtml + '<div class="p-8 text-center bg-white rounded-3xl border border-slate-100 space-y-2">' +
      '<div class="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl"><i class="fas fa-inbox"></i></div>' +
      '<b class="text-slate-700 text-xs sm:text-sm block">គ្មានការកុម្ម៉ង់ក្នុងផ្ទាំងនេះឡើយ!</b>' +
    '</div>';
    return;
  }

  // ៤. ស្រង់តែអ្នកដឹកជញ្ជូនរោងចក្រ KC WATER ប៉ុណ្ណោះ
  var companyDrivers = allCustomers.filter(function(c) {
    return (c.type === 'CompanyDriver' || c.linked_boss === 'KC WATER');
  });

  var html = tabsHtml;
  filteredList.forEach(function(o) {
    var isPending = (o.status === 'Pending');
    var isDelivered = (o.status === 'Delivered');

    var statusBadge = isPending ? 
      '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">⏳ រង់ចាំចាត់ចែង</span>' : 
      (isDelivered ? 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">✅ ដឹកដល់រួចរាល់</span>' : 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">🚚 កំពុងដឹក' + (o.driver_name ? ' (' + o.driver_name + ')' : '') + '</span>');

    var cleanPhone = String(o.phone || '').replace(/[^0-9]/g, '');
    var safeName = String(o.customer_name || '').replace(/'/g, "\\'");
    var dateStr = new Date(o.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
    var locationDisplay = (o.location_url || o.address || '').trim();

    var intlPhone = cleanPhone.startsWith('0') ? ('855' + cleanPhone.substring(1)) : ('855' + cleanPhone);
    var tgChatLink = "https://t.me/+" + intlPhone;
    var waChatLink = "https://wa.me/" + intlPhone;

    // បង្កើតបញ្ជីអ្នកដឹកសម្រាប់ Order នេះ (ជ្រើសរើសឈ្មោះដែលបានចាត់ចែងស្រាប់)
    var driverOptions = '<option value="">-- រើសអ្នកដឹករបស់រោងចក្រ --</option>';
    companyDrivers.forEach(function(c) {
      var dPhone = c.phone ? (' (' + c.phone + ')') : '';
      var isSelected = (o.driver_name && o.driver_name.trim() === c.full_name.trim()) ? 'selected' : '';
      driverOptions += '<option value="' + c.full_name + '" data-phone="' + (c.phone || '') + '" ' + isSelected + '>' + c.full_name + dPhone + '</option>';
    });

    // ប៊ូតុងចាត់ចែងអ្នកដឹក
    var assignDriverHtml = isDelivered ? 
      ('<div class="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex justify-between items-center text-emerald-950 font-bold">' +
        '<span>🛵 អ្នកដឹកជញ្ជូន៖ <b>' + (o.driver_name || 'KC WATER') + '</b></span>' +
        '<span class="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">ទូទាត់រួច</span>' +
      '</div>') : 
      ('<div class="p-2 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">' +
        '<div class="text-[10px] font-black text-blue-900 flex items-center gap-1"><i class="fas fa-motorcycle text-blue-600"></i> ចាត់ចែងអ្នកដឹកជញ្ជូនរោងចក្រ៖</div>' +
        '<div class="flex gap-1.5">' +
          '<select id="driver_sel_' + o.order_id + '" class="text-xs font-bold py-1.5 px-2 bg-white border border-blue-300 rounded-xl flex-1 outline-none">' +
            driverOptions +
          '</select>' +
          '<button type="button" onclick="assignDriverToOnlineOrder(\'' + o.order_id + '\', \'' + safeName + '\')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1 whitespace-nowrap">' +
            '<i class="fas fa-paper-plane text-[10px]"></i> ' + (o.driver_name ? 'ប្តូរអ្នកដឹក' : 'ចាត់ចែង') +
          '</button>' +
        '</div>' +
      '</div>');

    // ជួរប៊ូតុងសកម្មភាព (ខល, Telegram, WhatsApp, ផែនទី, រូបផ្ទះ, ដឹកដល់)
    var actionButtonsHtml = '<div class="flex flex-wrap items-center justify-end gap-1.5 pt-0.5 text-xs">' +
      (cleanPhone ? 
      '<a href="tel:' + cleanPhone + '" class="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 rounded-xl font-bold border border-green-200 shadow-2xs flex items-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
        '<i class="fas fa-phone text-xs text-green-600"></i> ខល' +
      '</a>' : '') +

      (cleanPhone ? 
      '<a href="' + tgChatLink + '" target="_blank" class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-xl font-bold border border-sky-300 shadow-2xs flex items-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
        '<i class="fab fa-telegram text-xs text-sky-600"></i> Telegram' +
      '</a>' : '') +
      
      (cleanPhone ? 
      '<a href="' + waChatLink + '" target="_blank" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl font-bold border border-emerald-300 shadow-2xs flex items-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
        '<i class="fab fa-whatsapp text-xs text-emerald-600"></i> WhatsApp' +
      '</a>' : '') +

      (locationDisplay ? 
      '<button type="button" onclick="openOrderMap(\'' + locationDisplay.replace(/'/g, "\\'") + '\')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold border border-blue-200 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
        '<i class="fas fa-map-location-dot text-xs text-blue-600"></i> ផែនទី' +
      '</button>' : '');

    if (o.photo_url) {
      storeOrderPhoto(o.order_id, o.photo_url, o.customer_name);
      actionButtonsHtml += '<button type="button" onclick="viewOrderHousePhotoById(\'' + o.order_id + '\')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold border border-amber-300 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
        '<i class="fas fa-camera text-xs text-amber-600"></i> រូបផ្ទះ' +
      '</button>';
    }

    if (!isDelivered) {
      actionButtonsHtml += '<button type="button" onclick="cancelOnlineOrder(\'' + o.order_id + '\', \'' + safeName + '\')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold border border-red-200 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
        '<i class="fas fa-trash-can text-xs text-red-500"></i> បោះបង់' +
      '</button>' +
      '<button type="button" onclick="completeOnlineOrder(\'' + o.order_id + '\', \'' + safeName + '\', ' + (o.total || 0) + ', \'' + (o.items || '').replace(/'/g, "\\'") + '\', \'' + (o.driver_name || '').replace(/'/g, "\\'") + '\', \'' + (o.payment_method || 'COD').replace(/'/g, "\\'") + '\')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs flex items-center gap-1 active:scale-95 transition">' +
        '<i class="fas fa-check text-xs"></i> ដឹកដល់' +
      '</button>';
    }

    actionButtonsHtml += '</div>';

    html += '<div class="bg-white p-3.5 rounded-2xl border ' + (isDelivered ? 'border-emerald-200 bg-emerald-50/20' : 'border-amber-200') + ' shadow-sm space-y-2.5 hover:shadow-md transition">' +
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

      '<div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs text-gray-700">' +
        '<div class="flex items-start gap-1.5">' +
          '<span class="text-gray-400 font-bold whitespace-nowrap">📦 ទំនិញ៖</span>' +
          '<b class="text-slate-900">' + o.items + '</b>' +
        '</div>' +
        '<div class="flex items-center gap-1.5 text-[11px]">' +
          '<span class="text-gray-400 font-bold whitespace-nowrap">🛢️ សំបកធុង៖</span>' +
          '<span class="font-bold text-emerald-700">' + (o.barrel_swap || 'មានសំបកដូរ') + '</span>' +
        '</div>' +
        (locationDisplay ? 
        '<div class="flex items-start gap-1.5 pt-0.5">' +
          '<span class="text-gray-400 font-bold whitespace-nowrap">📍 ទីតាំង & ចំណាំ៖</span>' +
          '<span class="text-slate-800 font-bold text-[11px] leading-snug break-words">' + locationDisplay + '</span>' +
        '</div>' : '') +
      '</div>' +

      assignDriverHtml +
      actionButtonsHtml +
    '</div>';
  });

  container.innerHTML = html;
}

function closeOnlineOrdersModal() {
  var modal = document.getElementById('onlineOrdersAdminModal');
  if (modal) modal.classList.add('hidden');
  checkPendingOnlineOrdersBadge();
}

// ==========================================================================
// 🛵 ១. មុខងារចាត់ចែងអ្នកដឹកជញ្ជូនរោងចក្រ (បង្ហាញតែអ្នកដឹកពិតប្រាកដ & មាន kcAlert ព្រមាន)
// ==========================================================================
async function assignDriverToOnlineOrder(orderId, custName) {
  var sel = document.getElementById('driver_sel_' + orderId);
  var driverName = sel ? sel.value.trim() : "";
  
  if (!driverName) {
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "មិនទាន់រើសអ្នកដឹក",
        message: "សូមជ្រើសរើសឈ្មោះអ្នកដឹកជញ្ជូនរោងចក្រជាមុនសិន!",
        type: "warning"
      });
    } else {
      showToast("សូមជ្រើសរើសឈ្មោះអ្នកដឹកជញ្ជូន!", "error");
    }
    if (sel) sel.focus();
    return;
  }

  var selectedOpt = sel.options[sel.selectedIndex];
  var driverPhone = selectedOpt ? selectedOpt.getAttribute('data-phone') : '';

  try {
    // ១. ទាញព័ត៌មានកុម្ម៉ង់ចាស់មកឆែកជាមុនសិន
    const { data: orderInfo } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    // ⚠️ បើការកុម្ម៉ង់នេះបានចាត់ចែងឱ្យអ្នកដឹកផ្សេងរួចហើយ ចេញផ្ទាំង kcConfirm សួរ Admin សិន!
    if (orderInfo && orderInfo.driver_name && orderInfo.driver_name.trim() !== "" && orderInfo.driver_name.trim() !== driverName) {
      var okChange = await kcConfirm({
        title: "ប្តូរអ្នកដឹកជញ្ជូន",
        message: "ការកុម្ម៉ង់នេះបានចាត់ចែងឱ្យ [" + orderInfo.driver_name + "] រួចហើយ! តើអ្នកពិតជាចង់ដកចេញ ឬប្តូរទៅឱ្យ [" + driverName + "] វិញមែនទេ?",
        type: "warning",
        confirmText: "យល់ព្រមប្តូរអ្នកដឹក"
      });
      if (!okChange) return;
    }

    // ២. Update ទៅក្នុង Supabase
    const { error } = await supabaseClient
      .from('orders')
      .update({
        status: 'Assigned',
        driver_name: driverName,
        driver_phone: driverPhone
      })
      .eq('order_id', orderId);

    if (error) throw error;

    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "ចាត់ចែងជោគជ័យ! 🎉",
        message: "ការកុម្ម៉ង់លេខកូដ [" + orderId + "] ត្រូវបានចាត់ចែងទៅឱ្យអ្នកដឹក [" + driverName + "] រួចរាល់!",
        type: "success"
      });
    } else {
      showToast("បានចាត់ចែងទៅឱ្យ " + driverName + " ជោគជ័យ!", "success");
    }

    openOnlineOrdersModal();

    // 🔔 ដំណឹង Telegram ផ្ញើទៅកាន់ Group អ្នកដឹកជញ្ជូន (Kc បេសកកម្មរបស់ខ្ញុំ)
    try {
      var phoneText = orderInfo && orderInfo.phone ? orderInfo.phone : '-';
      var itemsText = orderInfo && orderInfo.items ? orderInfo.items : '-';
      var totalText = orderInfo && orderInfo.total ? Number(orderInfo.total).toLocaleString() : '0';
      var payText = orderInfo && orderInfo.payment_method ? orderInfo.payment_method : 'COD (លុយសុទ្ធ)';
      var barrelText = orderInfo && orderInfo.barrel_swap ? orderInfo.barrel_swap : 'មានសំបកដូរ';
      var rawLocation = orderInfo ? (orderInfo.location_url || orderInfo.address || '') : '';

      var mapLine = '';
      if (rawLocation) {
        var matchLink = rawLocation.match(/https?:\/\/[^\s]+/);
        if (matchLink) {
          mapLine = "📍 <b>ផែនទីផ្ទះភ្ញៀវ៖</b> <a href='" + matchLink[0] + "'>👉 ចុចបើក Google Maps នាំផ្លូវ 🧭</a>\n";
        } else {
          var cleanAddr = rawLocation.replace(/\[.*?\]/g, '').replace(/\|\s*ចំណាំ:?/g, '').trim();
          var searchMap = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(cleanAddr + " ប៉ោយប៉ែត");
          mapLine = "📍 <b>ផែនទីផ្ទះភ្ញៀវ៖</b> <a href='" + searchMap + "'>👉 ចុចបើក Google Maps នាំផ្លូវ 🧭</a>\n";
        }
      }

      var tgHeader = (orderInfo && orderInfo.driver_name && orderInfo.driver_name !== driverName) ? 
        "⚠️ <b>[KC WATER - Admin បានប្តូរអ្នកដឹកជញ្ជូនថ្មី]</b>" : 
        "🛵 <b>[KC WATER - បេសកកម្មដឹកទឹកថ្មី]</b>";

      var timeKhNow = new Date().toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var tgMsg = tgHeader + "\n" +
                  "━━━━━━━━━━━━━━━━━━━━\n" +
                  "🛵 <b>អ្នកដឹកជញ្ជូន៖</b> <b>" + driverName + "</b>" + (driverPhone ? (" (📞 " + driverPhone + ")") : "") + "\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> <b>" + custName + "</b>\n" +
                  "📞 <b>លេខទូរស័ព្ទភ្ញៀវ៖</b> <b>" + phoneText + "</b>\n" +
                  "📦 <b>ទំនិញត្រូវដឹក៖</b> <b>" + itemsText + "</b>\n" +
                  "🛢️ <b>ការដូរសំបកធុង៖</b> " + barrelText + "\n" +
                  "💰 <b>ទឹកប្រាក់ត្រូវប្រមូល៖</b> <b>៛ " + totalText + "</b> (" + payText + ")\n" +
                  mapLine +
                  (orderInfo && orderInfo.address ? ("📝 <b>ចំណាំទីតាំង៖</b> " + orderInfo.address + "\n") : "") +
                  "🕒 <b>ម៉ោងចាត់ចែង៖</b> " + timeKhNow;

      var targetChatId = (telegramConfig && telegramConfig.driverChatId) ? telegramConfig.driverChatId : ((telegramConfig && telegramConfig.chatId) ? telegramConfig.chatId : '');
      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg, targetChatId);
      }
    } catch(tgErr) {}
    
  } catch(err) {
    if (typeof kcAlert === 'function') {
      await kcAlert({ title: "កំហុសចាត់ចែង", message: err.message, type: "danger" });
    } else {
      showToast("កំហុសចាត់ចែង៖ " + err.message, "error");
    }
  }
}

// ==========================================================================
// 🗺️ ២. មុខងារបើកផែនទី GOOGLE MAPS នាំផ្លូវ (មាន kcAlert ត្រឹមត្រូវ ១០០%)
// ==========================================================================
function openOrderMap(mapUrl) {
  if (!mapUrl || String(mapUrl).trim() === "") {
    if (typeof kcAlert === 'function') {
      kcAlert({
        title: "មិនមានទីតាំង!",
        message: "ការកុម្ម៉ង់នេះមិនមានភ្ជាប់ GPS ឬអាសយដ្ឋានឡើយ!",
        type: "warning"
      });
    } else {
      showToast("មិនមានទីតាំង ឬអាសយដ្ឋានឡើយ!", "warning");
    }
    return;
  }

  var raw = String(mapUrl).trim();

  // ១. បើមាន Link ផែនទី Google Maps ស្រាប់ (បើក Link នោះនាំផ្លូវភ្លាម)
  var match = raw.match(/https?:\/\/[^\s]+/);
  if (match) {
    window.open(match[0], '_blank');
    return;
  }

  // ២. បើជាអក្សរចំណាំ (ជម្រះអក្សរជាន់ផ្ទះ និងម៉ោងក្នុងវង់ក្រចក [...] ចេញសិន ដើម្បីកុំឱ្យវង្វេងលើ Google Maps)
  var cleanAddress = raw.replace(/\[.*?\]/g, '').replace(/\|\s*ចំណាំ:?/g, '').trim();
  if (!cleanAddress) cleanAddress = "ក្រុងប៉ោយប៉ែត";

  var searchUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(cleanAddress + " ប៉ោយប៉ែត");
  window.open(searchUrl, '_blank');
}
async function cancelOnlineOrder(orderId, custName) {
  // 🌟 ប្រើ Pop-up ថ្មីរបស់ KC POS ពណ៌ក្រហមច្បាស់ៗ
  var ok = await kcConfirm({
    title: "បោះបង់ការកុម្ម៉ង់ទឹក",
    message: "តើអ្នកពិតជាចង់បោះបង់ការកុម្ម៉ង់របស់ [" + custName + "] លេខកូដ [" + orderId + "] នេះមែនទេ?",
    type: "danger",
    confirmText: "យល់ព្រមបោះបង់"
  });
  if (!ok) return;

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
// ==========================================
// 🛵 ផ្ទាំងបញ្ជាក់ការដឹកដល់ & ជ្រើសរើសវិធីបង់ប្រាក់ (CASH vs ABA)
// ==========================================
var activeDeliveryTaskData = null;

function injectCompleteDeliveryModal() {
  if (document.getElementById('completeDeliveryModal')) return;
  var html = '<div id="completeDeliveryModal" class="fixed inset-0 z-[7500] flex items-center justify-center p-4 hidden overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/65 backdrop-blur-xs" onclick="closeCompleteDeliveryModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3.5 text-center relative border border-slate-100 animate-in zoom-in-95 duration-200 my-auto">' +
      '<div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shadow-inner">' +
        '<i class="fas fa-hand-holding-dollar"></i>' +
      '</div>' +
      '<div>' +
        '<h3 class="font-black text-slate-900 text-base leading-snug">បញ្ជាក់ការដឹកដល់ & ប្រមូលប្រាក់</h3>' +
        '<p id="cdmCustHint" class="text-xs text-slate-500 font-bold mt-0.5"></p>' +
      '</div>' +

      // ប្រអប់ទឹកប្រាក់សរុប
      '<div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">' +
        '<span class="text-[10px] font-bold text-emerald-800 uppercase block">ទឹកប្រាក់ដែលត្រូវប្រមូល</span>' +
        '<div id="cdmTotalText" class="text-xl font-black text-emerald-800 mt-0.5">0 ៛</div>' +
      '</div>' +

      // ជ្រើសរើសវិធីទូទាត់ជាក់ស្តែង (លុយសុទ្ធ vs ABA)
      '<div class="space-y-1.5 text-left">' +
        '<label class="text-[10px] font-bold text-slate-600 uppercase block">វិធីទូទាត់ប្រាក់ជាក់ស្តែង (Payment Method) *</label>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<label id="lblCdmPayCash" class="p-2.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 transition">' +
            '<input type="radio" name="cdm_pay" value="Cash" checked onchange="onCdmPayMethodChange(\'Cash\')" class="accent-emerald-600">' +
            '<span>💵 លុយសុទ្ធ</span>' +
          '</label>' +
          '<label id="lblCdmPayAba" class="p-2.5 rounded-xl border-2 border-slate-200 bg-white flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 hover:border-blue-300 transition">' +
            '<input type="radio" name="cdm_pay" value="ABA" onchange="onCdmPayMethodChange(\'ABA\')" class="accent-blue-600">' +
            '<span>📱 ស្កេន ABA</span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      // ប៊ូតុងបើក QR ឱ្យភ្ញៀវស្កេន
      '<div id="cdmAbaQrRow" class="hidden pt-1">' +
        '<button type="button" onclick="openDriverAbaQrModal()" class="w-full py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition">' +
          '<i class="fas fa-qrcode text-sm"></i> 📱 បង្ហាញ ABA KHQR ឱ្យភ្ញៀវស្កេន' +
        '</button>' +
      '</div>' +

      // ប៊ូតុងបញ្ជាក់ និងបោះបង់
      '<div class="grid grid-cols-2 gap-2 pt-2">' +
        '<button type="button" onclick="closeCompleteDeliveryModal()" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition">បោះបង់</button>' +
        '<button type="button" id="btnConfirmCompleteDelivery" onclick="executeFinalCompleteDelivery()" class="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1">' +
          '<i class="fas fa-check-circle"></i> ដឹកដល់រួចរាល់' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

function onCdmPayMethodChange(mode) {
  var lblCash = document.getElementById('lblCdmPayCash');
  var lblAba = document.getElementById('lblCdmPayAba');
  var qrRow = document.getElementById('cdmAbaQrRow');

  if (mode === 'ABA') {
    lblAba.className = "p-2.5 rounded-xl border-2 border-blue-600 bg-blue-50 flex items-center gap-2 cursor-pointer font-bold text-xs text-blue-950 transition";
    lblCash.className = "p-2.5 rounded-xl border-2 border-slate-200 bg-white flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 transition";
    if (qrRow) qrRow.classList.remove('hidden');
  } else {
    lblCash.className = "p-2.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 transition";
    lblAba.className = "p-2.5 rounded-xl border-2 border-slate-200 bg-white flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 transition";
    if (qrRow) qrRow.classList.add('hidden');
  }
}

// 📱 មុខងារបើក ABA QR សម្រាប់អ្នកដឹក (កំណត់ z-index ឱ្យលោតមកលើបង្អស់ ១០០%)
function openDriverAbaQrModal() {
  if (!activeDeliveryTaskData) return;
  var total = activeDeliveryTaskData.total || 0;
  var qrModal = document.getElementById('posKhqrModal');
  var amtText = document.getElementById('posKhqrAmountText');
  
  if (qrModal && amtText) {
    amtText.innerText = "៛ " + Number(total).toLocaleString();
    qrModal.style.zIndex = '9000'; // 👈 រុញឱ្យខ្ពស់ជាងផ្ទាំងបញ្ជាក់ការដឹកដល់ (z-[7500]) ដាច់ខាត
    qrModal.classList.remove('hidden');
  }
}

function closeCompleteDeliveryModal() {
  var modal = document.getElementById('completeDeliveryModal');
  if (modal) modal.classList.add('hidden');
  activeDeliveryTaskData = null;
}

// 🚀 មុខងារបើកផ្ទាំងបញ្ជាក់ការដឹកដល់
async function completeOnlineOrder(orderId, custName, total, itemsText, driverName, payMethod) {
  injectCompleteDeliveryModal();
  activeDeliveryTaskData = {
    orderId: orderId,
    custName: custName,
    total: total,
    itemsText: itemsText,
    driverName: driverName,
    payMethod: payMethod
  };

  document.getElementById('cdmCustHint').innerText = "អតិថិជន៖ [" + custName + "] | កូដ៖ " + orderId;
  document.getElementById('cdmTotalText').innerText = "៛ " + Number(total).toLocaleString();

  var isDefaultAba = (String(payMethod || '').indexOf('ABA') !== -1);
  var radioCash = document.querySelector('input[name="cdm_pay"][value="Cash"]');
  var radioAba = document.querySelector('input[name="cdm_pay"][value="ABA"]');

  if (isDefaultAba && radioAba) {
    radioAba.checked = true;
    onCdmPayMethodChange('ABA');
  } else if (radioCash) {
    radioCash.checked = true;
    onCdmPayMethodChange('Cash');
  }

  document.getElementById('completeDeliveryModal').classList.remove('hidden');
}

// 💾 មុខងារកត់ត្រាការដឹកដល់ បំបែកទំនិញ ចេញវិក្កយបត្រ & កាត់ស្តុក (កែសម្រួលរួចរាល់)
async function executeFinalCompleteDelivery() {
  if (!activeDeliveryTaskData) return;

  var task = activeDeliveryTaskData;
  var orderId = task.orderId;
  var custName = task.custName;
  var total = parseFloat(task.total || 0);
  var itemsText = task.itemsText || '';
  var driverName = task.driverName || (currentUser.fullName || 'KC WATER');

  var checkedRadio = document.querySelector('input[name="cdm_pay"]:checked');
  var actualPayMethod = checkedRadio ? checkedRadio.value : 'Cash';
  var payTextLabel = (actualPayMethod === 'ABA') ? 'ស្កេន ABA KHQR' : 'លុយសុទ្ធ (Cash)';

  var btn = document.getElementById('btnConfirmCompleteDelivery');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងកត់ត្រា...';
  }

  try {
    // ១. Update ស្ថានភាពទៅ Delivered ក្នុងតារាង Orders
    const { error: ordErr } = await supabaseClient
      .from('orders')
      .update({
        status: 'Delivered',
        payment_method: payTextLabel
      })
      .eq('order_id', orderId);

    if (ordErr) throw ordErr;

    // ២. ធានាថាមានទិន្នន័យទំនិញក្នុងស្តុកដើម្បីផ្ទៀងផ្ទាត់
    if (!allProducts || allProducts.length === 0) {
      const { data: pList } = await supabaseClient.from('products').select('*');
      if (pList) allProducts = pList;
    }

    // ៣. បំបែកទំនិញបញ្ចូលក្នុង Transactions (ស្គាល់ទំនិញ Promotion Free និងកាត់ស្តុកស្វ័យប្រវត្តិ)
    var tid = "TR-" + new Date().getTime();
    var rowsToInsert = [];
    var totalAllocated = 0;

    var itemParts = String(itemsText).split(',');
    itemParts.forEach(function(partStr) {
      if (!partStr.trim()) return;
      var seg = partStr.split('x');
      var rawName = seg[0] ? seg[0].trim() : partStr.trim();
      var qty = (seg.length >= 2) ? parseFloat(seg[1].trim() || 1) : 1;
      if (isNaN(qty) || qty <= 0) qty = 1;

      // 🎁 ឆែកមើលថាតើជាទំនិញថែម Promotion Free ដែរឬទេ
      var isFreeGift = rawName.includes('[Free]') || rawName.includes('🎁') || rawName.includes('កាដូ');
      // សម្អាតស្លាក [Free] ចេញ ដើម្បីយកឈ្មោះទំនិញសុទ្ធទៅកាត់ស្តុក
      var cleanName = rawName.replace(/🎁\s*\[Free\]/gi, '').replace(/\[Free\]/gi, '').replace(/\[កាដូថែម Free\]/gi, '').trim();

      var matchedProd = allProducts.find(function(p) {
        return p.name.trim().toLowerCase() === cleanName.toLowerCase();
      });

      // បើជាទំនិញ Free គឺតម្លៃ = 0៛ បើជាទំនិញទិញធម្មតា គឺយកតម្លៃលក់
      var unitPrice = isFreeGift ? 0 : (matchedProd ? parseFloat(matchedProd.online_price || matchedProd.price || 0) : 0);
      var lineTotal = unitPrice * qty;
      totalAllocated += lineTotal;

      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName,
        product_name: isFreeGift ? ("🎁 [Free] " + (matchedProd ? matchedProd.name : cleanName)) : (matchedProd ? matchedProd.name : rawName),
        clean_product_name: matchedProd ? matchedProd.name : cleanName, // សម្រាប់កាត់ស្តុក
        qty: qty,
        price: unitPrice,
        currency: "KHR",
        total: lineTotal,
        paid_khr: lineTotal,
        recorded_by: driverName ? (driverName + " (អ្នកដឹក)") : "Admin",
        status: "Paid",
        payment_method: actualPayMethod
      });
    });

    // បើនៅសល់ប្រាក់ថ្លៃដឹក ឬទំនិញដទៃ ផ្គុំចូលជាជួរថ្លៃដឹកជញ្ជូន
    var diff = total - totalAllocated;
    if (diff > 0) {
      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName,
        product_name: "សេវាដឹកជញ្ជូន / សំបកធុង",
        clean_product_name: "",
        qty: 1,
        price: diff,
        currency: "KHR",
        total: diff,
        paid_khr: diff,
        recorded_by: driverName ? (driverName + " (អ្នកដឹក)") : "Admin",
        status: "Paid",
        payment_method: actualPayMethod
      });
    }

    // កត់ត្រាចូល Transactions Table
    if (rowsToInsert.length > 0) {
      var rowsForDb = rowsToInsert.map(function(r) {
        var copy = Object.assign({}, r);
        delete copy.clean_product_name; // ដក Field បណ្តោះអាសន្នចេញមុន Save
        return copy;
      });
      await supabaseClient.from('transactions').insert(rowsForDb);
    }

    // ៤. កាត់ស្តុកទំនិញទិញគេ (កាត់ទាំងទំនិញលក់ធម្មតា និងទំនិញ Promotion Free ត្រឹមត្រូវ ១០០%)
    for (var i = 0; i < rowsToInsert.length; i++) {
      var row = rowsToInsert[i];
      var targetSearchName = (row.clean_product_name || row.product_name).toLowerCase();
      var prodToDeduct = allProducts.find(function(p) {
        return p.name.trim().toLowerCase() === targetSearchName;
      });

      if (prodToDeduct && prodToDeduct.type === 'ទិញគេ' && row.qty > 0) {
        var newStock = Math.max(0, parseFloat(prodToDeduct.stock || 0) - row.qty);
        await supabaseClient.from('products').update({ stock: newStock }).eq('id', prodToDeduct.id);
        prodToDeduct.stock = newStock;
      }
    }
    
    // ៥. បិទផ្ទាំងបញ្ជាក់ការដឹក
    closeCompleteDeliveryModal();
    showToast("បានកត់ត្រាការដឹកដល់ និងប្រមូលប្រាក់ជោគជ័យ!", "success");

    // ៦. 🧾 បង្កើតវិក្កយបត្រឌីជីថល Pop-up ភ្លាមៗ (Digital Receipt)
    if (typeof generateReceiptImage === 'function') {
      try {
        generateReceiptImage(tid, custName, total, total, rowsToInsert, "វិក្កយបត្រដឹកជញ្ជូន (DELIVERY RECEIPT)");
      } catch(rcpErr) {
        console.warn("Receipt canvas warning:", rcpErr);
      }
    }

    // ៧. សំឡេង Chime & បាញ់កាំជ្រួច
    if (typeof playOrderChime === 'function') playOrderChime();
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80 });

    // ៨. 🔄 បញ្ជា Refresh ផ្ទាំង Admin + អ្នកដឹកភ្លាមៗ ដោយមិនបាច់ចុច Refresh លើ Browser
    if (currentUser && currentUser.type === 'CompanyDriver') {
      if (typeof renderCompanyDeliveriesModule === 'function') renderCompanyDeliveriesModule();
    }
    var adminModal = document.getElementById('onlineOrdersAdminModal');
    if (adminModal && !adminModal.classList.contains('hidden')) {
      openOnlineOrdersModal();
    }
    if (typeof checkPendingOnlineOrdersBadge === 'function') checkPendingOnlineOrdersBadge();
    if (typeof loadOnlineHubOrdersTab === 'function') loadOnlineHubOrdersTab();
    if (typeof fetchOnlineAuditOrders === 'function') fetchOnlineAuditOrders();

    // ៩. ផ្ញើ Telegram Alert ទៅថៅកែ
    try {
      var tgMsg = "✅ <b>[KC WATER - ដឹកជញ្ជូនដល់ & ប្រមូលប្រាក់ជោគជ័យ!]</b>\n\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "🛵 <b>អ្នកដឹក៖</b> " + driverName + "\n" +
                  "📦 <b>ទំនិញ៖</b> " + itemsText + "\n" +
                  "💵 <b>វិធីទូទាត់ជាក់ស្តែង៖</b> <b>" + payTextLabel + "</b>\n" +
                  "💰 <b>ប្រាក់ទទួលបាន៖</b> <b>៛ " + Number(total).toLocaleString() + "</b>\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(tgE) {}

    // 🌟 បង្ហាញផ្ទាំងជូនដំណឹងស្តង់ដារ KC POS ជូនដំណឹងដល់អ្នកដឹក
    if (typeof kcAlert === 'function') {
      kcAlert({
        title: "ដឹកជញ្ជូនជោគជ័យ! 🎉",
        message: "ការកុម្ម៉ង់ [" + orderId + "] របស់ " + custName + " ទឹកប្រាក់ ៛ " + Number(total).toLocaleString() + " ត្រូវបានកត់ត្រាចូលបញ្ជីលក់រួចរាល់!",
        type: "success",
        confirmText: "យល់ព្រម"
      });
    }

  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> ដឹកដល់រួចរាល់';
    }
  }
}


// 🖼️ មុខងារបើកមើលរូបថតមុខផ្ទះភ្ញៀវប្រកបដោយសុវត្ថិភាព ១០០% (លែងបាត់ប៊ូតុងទៀតហើយ)
function viewOrderHousePhotoById(orderId) {
  var item = safeOrderPhotoStore[orderId];
  if (!item || !item.url) {
    showToast("ការកុម្ម៉ង់នេះមិនមានភ្ជាប់រូបថតមុខផ្ទះឡើយ!", "info");
    return;
  }
  var existing = document.getElementById('orderHousePhotoModal');
  if (existing) existing.remove();

  var html = '<div id="orderHousePhotoModal" class="fixed inset-0 z-[8000] flex items-center justify-center p-4 overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/75 backdrop-blur-xs" onclick="document.getElementById(\'orderHousePhotoModal\').remove()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm overflow-hidden p-4 space-y-3 relative border text-center animate-in zoom-in-95 duration-200 my-auto max-h-[90dvh] flex flex-col">' +
      '<div class="flex justify-between items-center border-b pb-2">' +
        '<div class="text-left">' +
          '<b class="text-xs sm:text-sm text-slate-900 flex items-center gap-1.5"><i class="fas fa-house-chimney text-emerald-600"></i> រូបថតមុខផ្ទះ / ច្រកចូល</b>' +
          '<p class="text-[10px] text-slate-500 font-bold mt-0.5">អតិថិជន៖ ' + item.name + ' (កូដ: ' + orderId + ')</p>' +
        '</div>' +
        '<button type="button" onclick="document.getElementById(\'orderHousePhotoModal\').remove()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 text-lg font-bold flex items-center justify-center">&times;</button>' +
      '</div>' +
      '<div class="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-[58vh]">' +
        '<img src="' + item.url + '" class="w-full h-auto object-contain max-h-[58vh] rounded-xl shadow-xs" alt="House Photo">' +
      '</div>' +
      '<button type="button" onclick="document.getElementById(\'orderHousePhotoModal\').remove()" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition">បិទផ្ទាំងរូបភាព</button>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

// 🔄 ចាប់ផ្តើមដំណើរការស្កេន Realtime ពេលបើកទំព័រ (កូដស្តង់ដារ គ្មានស្ទួន)
window.addEventListener('load', function() {
  var navBtn = document.getElementById('navOnlineOrdersBtn');
  if (navBtn) {
    navBtn.onclick = openOnlineOrdersModal;
  }
  checkPendingOnlineOrdersBadge();
  initOrdersRealtimeListener();
});

// 📱 មុខងារបើក ABA QR ផ្ទាល់សម្រាប់អ្នកដឹក
function openDriverDirectQr(amount, custName) {
  var qrModal = document.getElementById('posKhqrModal');
  var amtText = document.getElementById('posKhqrAmountText');
  if (qrModal && amtText) {
    amtText.innerText = "៛ " + Number(amount || 0).toLocaleString();
    qrModal.classList.remove('hidden');
  }
}

// 🚚 មុខងារបង្ហាញបេសកកម្មដឹកទឹករបស់អ្នកដឹកជញ្ជូនរោងចក្រ (Refresh ស្ងាត់ៗ មិនលោតកន្ត្រាក់ឡើយ)
async function renderCompanyDeliveriesModule(isSilentRefresh) {
  var area = document.getElementById('contentArea');
  if (!area) return;

  var driverName = (currentUser && currentUser.fullName) ? currentUser.fullName : '';
  var existingContainer = document.getElementById('driverOrdersContainer');

  if (!existingContainer || !isSilentRefresh) {
    area.innerHTML = '<div class="max-w-2xl mx-auto space-y-3.5">' +
      '<div class="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">' +
        '<div>' +
          '<h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">' +
            '<i class="fas fa-motorcycle text-emerald-600"></i>' +
            '<span>បេសកកម្មដឹកទឹករបស់ខ្ញុំថ្ងៃនេះ</span>' +
          '</h2>' +
          '<p class="text-[11px] text-slate-500 mt-0.5">អ្នកដឹកជញ្ជូន៖ <b class="text-emerald-800">' + driverName + '</b></p>' +
        '</div>' +
        '<button onclick="renderCompanyDeliveriesModule(false)" class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 active:scale-95 transition flex items-center gap-1.5 shadow-2xs">' +
          '<i class="fas fa-sync-alt"></i> Refresh' +
        '</button>' +
      '</div>' +
      '<div id="driverDailySummaryBox" class="grid grid-cols-3 gap-2 text-center text-xs"></div>' +
      '<div id="driverOrdersContainer" class="space-y-3">' +
        '<div class="text-center py-10 text-slate-400 italic text-xs">' +
          '<i class="fas fa-spinner fa-spin mr-1.5 text-emerald-600 text-base"></i> កំពុងទាញយកការងារដឹកជញ្ជូន...' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var container = document.getElementById('driverOrdersContainer');
  var summaryBox = document.getElementById('driverDailySummaryBox');

  try {
    var todayStr = getCambodiaToday();
    var todayQueryStart = todayStr + 'T00:00:00+07:00';

    // ១. ទាញការងារកំពុងដឹក (Assigned) របស់អ្នកដឹកនេះ
    const { data: list, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('status', 'Assigned')
      .ilike('driver_name', driverName.trim())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // ២. ទាញការងារដែលបានដឹកជោគជ័យថ្ងៃនេះ
    var deliveredCount = 0;
    var cashToHandover = 0;
    var abaCollected = 0;

    // ទាញយកប្រតិបត្តិការលក់ដែលអ្នកដឹកបានប្រគល់ទឹកថ្ងៃនេះពីតារាង transactions
    const { data: driverTransToday } = await supabaseClient
      .from('transactions')
      .select('*')
      .ilike('recorded_by', driverName.trim() + '%')
      .gte('created_at', todayQueryStart);

    var countedTransIds = new Set();
    (driverTransToday || []).forEach(function(t) {
      if (isTodayInCambodia(t.created_at)) {
        var tid = t.transaction_id || t.id;
        if (!countedTransIds.has(tid)) {
          countedTransIds.add(tid);
          deliveredCount++; // រាប់ចំនួនជើងដែលបានដឹកជោគជ័យថ្ងៃនេះ
        }
        var amt = parseFloat(t.paid_khr || t.total || 0);
        if (t.payment_method === 'ABA') {
          abaCollected += amt;
        } else {
          cashToHandover += amt;
        }
      }
    });
    if (summaryBox) {
      summaryBox.innerHTML = '<div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-2xs">' +
        '<span class="text-[10px] text-emerald-700 font-bold block">💵 លុយសុទ្ធក្នុងដៃ</span>' +
        '<b class="text-xs sm:text-sm font-black text-emerald-950">៛ ' + cashToHandover.toLocaleString() + '</b>' +
      '</div>' +
      '<div class="p-2.5 bg-blue-50 border border-blue-200 rounded-2xl shadow-2xs">' +
        '<span class="text-[10px] text-blue-700 font-bold block">📱 ស្កេន ABA</span>' +
        '<b class="text-xs sm:text-sm font-black text-blue-950">៛ ' + abaCollected.toLocaleString() + '</b>' +
      '</div>' +
      '<div class="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl shadow-2xs">' +
        '<span class="text-[10px] text-amber-800 font-bold block">🎉 ជោគជ័យថ្ងៃនេះ</span>' +
        '<b class="text-xs sm:text-sm font-black text-amber-950">' + deliveredCount + ' ជើង</b>' +
      '</div>';
    }

    if (!list || list.length === 0) {
      if (container) {
        container.innerHTML = '<div class="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">' +
          '<div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shadow-inner">' +
            '<i class="fas fa-circle-check"></i>' +
          '</div>' +
          '<b class="text-slate-800 text-sm block">គ្មានការងារដឹកទឹកដែលនៅសល់ឡើយ!</b>' +
          '<p class="text-xs text-slate-400">រាល់ការកុម្ម៉ង់ដែល Admin ចាត់ចែងឱ្យអ្នក នឹងបង្ហាញនៅទីនេះភ្លាមៗ។</p>' +
        '</div>';
      }
      return;
    }

    var html = '';
    list.forEach(function(task) {
      var cleanPhone = String(task.phone || '').replace(/[^0-9]/g, '');
      var safeName = String(task.customer_name || '').replace(/'/g, "\\'");
      var mapTarget = task.location_url || task.address || '';
      var timeStr = new Date(task.created_at).toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      if (task.photo_url) {
        storeOrderPhoto(task.order_id, task.photo_url, task.customer_name);
      }

      var intlPhone = cleanPhone.startsWith('0') ? ('855' + cleanPhone.substring(1)) : ('855' + cleanPhone);
      var tgChatLink = "https://t.me/+" + intlPhone;
      var waChatLink = "https://wa.me/" + intlPhone;

      html += '<div class="bg-white p-4 rounded-3xl border-2 border-emerald-400 shadow-md space-y-3 animate-in zoom-in duration-200">' +
        '<div class="flex justify-between items-start border-b border-slate-100 pb-2.5">' +
          '<div>' +
            '<div class="flex items-center gap-1.5">' +
              '<b class="text-sm font-black text-slate-900"><i class="fas fa-user-circle text-emerald-600 mr-1"></i>' + task.customer_name + '</b>' +
              '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200">🚚 កំពុងដឹក</span>' +
            '</div>' +
            '<div class="text-[10px] text-slate-400 font-mono mt-0.5">កូដ៖ ' + task.order_id + ' | ម៉ោង៖ ' + timeStr + '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="text-sm font-black text-emerald-700">៛ ' + Number(task.total || 0).toLocaleString() + '</div>' +
            '<span class="text-[10px] font-bold text-slate-500">' + (task.payment_method || 'COD') + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 space-y-1.5 text-xs text-slate-700">' +
          '<div class="flex items-start gap-1.5">' +
            '<span class="text-slate-400 font-bold whitespace-nowrap">📦 ទឹកត្រូវដឹក៖</span>' +
            '<b class="text-slate-900">' + task.items + '</b>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 text-[11px]">' +
            '<span class="text-slate-400 font-bold whitespace-nowrap">🛢️ សំបកធុង៖</span>' +
            '<span class="font-bold text-emerald-700">' + (task.barrel_swap || 'មានសំបកដូរ') + '</span>' +
          '</div>' +
          (task.location_url ? 
          '<div class="flex items-start gap-1.5 pt-0.5">' +
            '<span class="text-slate-400 font-bold whitespace-nowrap">📍 ទីតាំង & ចំណាំ៖</span>' +
            '<span class="text-slate-800 font-bold text-[11px] leading-snug break-words">' + task.location_url + '</span>' +
          '</div>' : '') +
        '</div>' +

        '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">' +
          (cleanPhone ? 
          '<a href="tel:' + cleanPhone + '" class="py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl font-bold border border-blue-200 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
            '<i class="fas fa-phone text-blue-600"></i> ខល ' + task.phone +
          '</a>' : '') +

          (cleanPhone ? 
          '<a href="' + tgChatLink + '" target="_blank" class="py-2 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-xl font-bold border border-sky-300 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
            '<i class="fab fa-telegram text-sky-600"></i> Telegram' +
          '</a>' : '') +

          (mapTarget ? 
          '<button type="button" onclick="openOrderMap(\'' + mapTarget.replace(/'/g, "\\'") + '\')" class="py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold border border-blue-200 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-map-location-dot text-blue-600"></i> ផែនទី' +
          '</button>' : '') +

          (task.photo_url ? 
          '<button type="button" onclick="viewOrderHousePhotoById(\'' + task.order_id + '\')" class="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold border border-amber-300 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-camera text-amber-600"></i> រូបមុខផ្ទះ' +
          '</button>' : '') +

          '<button type="button" onclick="openDriverDirectQr(' + (task.total || 0) + ', \'' + safeName + '\')" class="col-span-2 sm:col-span-1 py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-black border border-red-200 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-qrcode text-red-600"></i> ស្កេន ABA' +
          '</button>' +
        '</div>' +

        '<button type="button" onclick="completeOnlineOrder(\'' + task.order_id + '\', \'' + safeName + '\', ' + (task.total || 0) + ', \'' + (task.items || '').replace(/'/g, "\\'") + '\', \'' + driverName.replace(/'/g, "\\'") + '\', \'' + (task.payment_method || 'COD').replace(/'/g, "\\'") + '\')" class="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition">' +
          '<i class="fas fa-check-circle text-base"></i> ដឹកដល់ហើយ & ប្រមូលលុយរួច' +
        '</button>' +
      '</div>';
    });

    if (container) container.innerHTML = html;
  } catch(e) {
    if (container) container.innerHTML = '<div class="p-4 text-center text-red-500 font-bold text-xs">កំហុស៖ ' + e.message + '</div>';
  }
}

// ==========================================
// 🌐 ផ្ទាំងមជ្ឈមណ្ឌលលក់ ONLINE ពេញលេញ (ONLINE HUB - 3 IN 1)
// ==========================================
var activeOnlineHubTab = 'ORDERS';
var onlineAuditSearchKeyword = '';

function renderOnlineHubModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  area.innerHTML = '<div class="max-w-4xl mx-auto space-y-4">' +
    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-3xl border shadow-sm gap-3">' +
      '<div>' +
        '<h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">' +
          '<i class="fas fa-globe text-emerald-600"></i>' +
          '<span>មជ្ឈមណ្ឌលគ្រប់គ្រង ONLINE (Online Hub)</span>' +
        '</h2>' +
        '<p class="text-xs text-slate-500 mt-0.5">តាមដានការកុម្ម៉ង់, ប្រវត្តិលក់, ដោះស្រាយវិវាទ និងទំនិញលើ Web</p>' +
      '</div>' +
      '<div class="flex items-center gap-2">' +
        '<a href="https://kcwater-live.vercel.app" target="_blank" class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black border border-emerald-300 shadow-2xs flex items-center gap-1.5 active:scale-95 transition" style="text-decoration:none;">' +
          '<i class="fas fa-arrow-up-right-from-square text-xs"></i> 🌐 បើកមើល Web ភ្ញៀវ' +
        '</a>' +
        '<button onclick="renderOnlineHubModule()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition flex items-center gap-1">' +
          '<i class="fas fa-sync-alt"></i> Refresh' +
        '</button>' +
      '</div>' +
    '</div>' +

    // ២. របារប្តូរផ្ទាំង ៣ Tabs (Orders / Audit / Products)
    '<div class="flex bg-white p-1.5 rounded-2xl border shadow-xs gap-1.5 text-xs font-bold">' +
      '<button id="hubTabBtn_ORDERS" onclick="switchOnlineHubTab(\'ORDERS\')" class="flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 bg-emerald-700 text-white shadow">' +
        '<i class="fas fa-truck-fast"></i> ១. បញ្ជីកុម្ម៉ង់បច្ចុប្បន្ន' +
      '</button>' +
      '<button id="hubTabBtn_AUDIT" onclick="switchOnlineHubTab(\'AUDIT\')" class="flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200">' +
        '<i class="fas fa-receipt"></i> ២. ប្រវត្តិលក់ & ដោះស្រាយវិវាទ' +
      '</button>' +
      '<button id="hubTabBtn_PRODUCTS" onclick="switchOnlineHubTab(\'PRODUCTS\')" class="flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200">' +
        '<i class="fas fa-boxes-stacked"></i> ៣. ទំនិញកំពុងបង្ហាញលើ Web' +
      '</button>' +
    '</div>' +

    // ៣. តួខ្លួនផ្ទាំងនីមួយៗ
    '<div id="hubTabContent_ORDERS" class="space-y-3"></div>' +
    '<div id="hubTabContent_AUDIT" class="space-y-3 hidden"></div>' +
    '<div id="hubTabContent_PRODUCTS" class="space-y-3 hidden"></div>' +
  '</div>';

  loadOnlineHubOrdersTab();
}

function switchOnlineHubTab(tab) {
  activeOnlineHubTab = tab;

  // Reset ពណ៌ប៊ូតុង Tabs
  ['ORDERS', 'AUDIT', 'PRODUCTS'].forEach(function(t) {
    var btn = document.getElementById('hubTabBtn_' + t);
    var content = document.getElementById('hubTabContent_' + t);
    if (btn && content) {
      if (t === tab) {
        btn.className = "flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 bg-emerald-700 text-white shadow";
        content.classList.remove('hidden');
      } else {
        btn.className = "flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200";
        content.classList.add('hidden');
      }
    }
  });

  if (tab === 'ORDERS') loadOnlineHubOrdersTab();
  else if (tab === 'AUDIT') loadOnlineHubAuditTab();
  else if (tab === 'PRODUCTS') loadOnlineHubProductsTab();
}

// ==========================================
// 📦 TAB ១៖ បញ្ជីកុម្ម៉ង់បច្ចុប្បន្ន
// ==========================================
async function loadOnlineHubOrdersTab() {
  var area = document.getElementById('hubTabContent_ORDERS');
  if (!area) return;

  area.innerHTML = '<div class="card p-5 border-t-4 border-amber-500 shadow-md mb-0 text-center text-slate-400 italic text-xs">' +
    '<i class="fas fa-spinner fa-spin mr-1 text-amber-600 text-base"></i> កំពុងទាញទិន្នន័យការកុម្ម៉ង់...' +
  '</div>';

  try {
    const { data: list, error } = await supabaseClient
      .from('orders')
      .select('*')
      .in('status', ['Pending', 'Assigned'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!list || list.length === 0) {
      area.innerHTML = '<div class="card p-8 border-t-4 border-emerald-500 shadow-md mb-0 text-center space-y-2 bg-white">' +
        '<div class="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl"><i class="fas fa-check"></i></div>' +
        '<b class="text-slate-800 text-sm block">បច្ចុប្បន្នគ្មានការកុម្ម៉ង់ដែលរង់ចាំដឹកជញ្ជូនឡើយ!</b>' +
        '<p class="text-xs text-slate-400">រាល់ពេលភ្ញៀវកុម្ម៉ង់លើ Web វានឹងលោតមកទីនេះភ្លាមៗ។</p>' +
      '</div>';
      return;
    }

    var html = '<div class="space-y-3">';
    list.forEach(function(o) {
      var isPending = (o.status === 'Pending');
      var statusBadge = isPending ? 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">⏳ រង់ចាំចាត់ចែង</span>' : 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">🚚 កំពុងដឹក (' + (o.driver_name || 'អ្នកដឹក') + ')</span>';

      html += '<div class="card p-4 border-l-4 ' + (isPending ? 'border-amber-500' : 'border-blue-500') + ' shadow-md mb-0 space-y-2 hover:shadow-lg transition">' +
        '<div class="flex justify-between items-start border-b pb-2">' +
          '<div>' +
            '<b class="text-sm font-black text-slate-900">' + o.customer_name + '</b>' +
            '<div class="text-[10px] text-slate-400 mt-0.5">កូដ៖ <code>' + o.order_id + '</code> | ទូរស័ព្ទ៖ ' + (o.phone || '-') + '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<b class="text-emerald-700 text-sm font-black">៛ ' + Number(o.total || 0).toLocaleString() + '</b>' +
            '<div class="mt-0.5">' + statusBadge + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="text-xs text-slate-700 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">' +
          '<div><b>📦 ទំនិញ៖</b> ' + o.items + '</div>' +
          (o.address ? '<div><b>📍 ទីតាំង៖</b> ' + o.address + '</div>' : '') +
        '</div>' +
        '<div class="flex justify-end pt-1">' +
          '<button type="button" onclick="openOnlineOrdersModal()" class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1">' +
            '<i class="fas fa-sliders text-[10px]"></i> បើកផ្ទាំងចាត់ចែងអ្នកដឹក' +
          '</button>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    area.innerHTML = html;

  } catch(e) {
    area.innerHTML = '<div class="card p-4 text-center text-red-500 font-bold text-xs">កំហុស៖ ' + e.message + '</div>';
  }
}

// ==========================================
// 🔍 TAB ២៖ ប្រវត្តិលក់ & ដោះស្រាយវិវាទ (ពេលគិតលុយខុស)
// ==========================================
async function loadOnlineHubAuditTab() {
  var area = document.getElementById('hubTabContent_AUDIT');
  if (!area) return;

  area.innerHTML = '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0 space-y-3">' +
    '<div class="flex justify-between items-center">' +
      '<h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">' +
        '<i class="fas fa-receipt text-blue-600"></i>ប្រវត្តិលក់ Online & ផ្ទៀងផ្ទាត់វិក្កយបត្រ' +
      '</h3>' +
      '<span class="text-[10px] text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full font-bold">ដោះស្រាយវិវាទ / Refund</span>' +
    '</div>' +
    // ប្រអប់ Search រកតាមលេខទូរស័ព្ទ ឬកូដកុម្ម៉ង់ភ្លាមៗ
    '<div class="relative">' +
      '<input type="text" id="inpOnlineAuditSearch" oninput="onOnlineAuditSearch(this.value)" placeholder="🔍 វាយលេខទូរស័ព្ទភ្ញៀវ, ឈ្មោះ ឬកូដកុម្ម៉ង់ (ORD-...) ដើម្បីឆែកមើលភស្តុតាង..." class="w-full border-2 border-blue-200 focus:border-blue-600 rounded-2xl p-3 pl-10 font-bold text-xs outline-none bg-slate-50 focus:bg-white">' +
      '<i class="fas fa-search absolute left-3.5 top-3.5 text-slate-400 text-xs pointer-events-none"></i>' +
    '</div>' +
    '<div id="onlineAuditResultsArea" class="space-y-3 pt-1">' +
      '<div class="text-center py-8 text-slate-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1"></i> កំពុងទាញប្រវត្តិលក់ Online...</div>' +
    '</div>' +
  '</div>';

  fetchOnlineAuditOrders();
}

var cachedAuditOrders = [];

// 🔍 មុខងារទាញប្រវត្តិលក់ Online (កែសម្រួលតម្រៀបតាម created_at ធានាដំណើរការ Search ឃើញ ១០០%)
async function fetchOnlineAuditOrders() {
  var resArea = document.getElementById('onlineAuditResultsArea');
  if (!resArea) return;

  try {
    const { data: list, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false }) // ✅ ប្រើ created_at (គ្មាន Error ទៀតឡើយ)
      .limit(80);

    if (error) throw error;
    cachedAuditOrders = list || [];
    renderOnlineAuditResultsList();
  } catch(e) {
    if (resArea) resArea.innerHTML = '<div class="text-center py-4 text-red-500 font-bold text-xs">កំហុសទាញទិន្នន័យ៖ ' + e.message + '</div>';
  }
}

function onOnlineAuditSearch(val) {
  onlineAuditSearchKeyword = (val || '').toLowerCase().trim();
  renderOnlineAuditResultsList();
}

// 🔍 មុខងារស្វែងរកក្នុង Online Hub (ដំណើរការ ១០០% ទាំងឈ្មោះខ្មែរ លេខទូរស័ព្ទ និងកូដកុម្ម៉ង់)
function renderOnlineAuditResultsList() {
  var resArea = document.getElementById('onlineAuditResultsArea');
  if (!resArea) return;

  var q = (onlineAuditSearchKeyword || '').toLowerCase().trim();
  var searchDigits = q.replace(/[^0-9]/g, '');

  var filtered = cachedAuditOrders.filter(function(o) {
    if (!q) return true;
    var nameStr = String(o.customer_name || '').toLowerCase();
    var idStr = String(o.order_id || '').toLowerCase();
    var driverStr = String(o.driver_name || '').toLowerCase();
    var addrStr = String(o.address || '').toLowerCase();
    var rawPhone = String(o.phone || '').replace(/[^0-9]/g, '');

    var matchName = nameStr.indexOf(q) !== -1;
    var matchId = idStr.indexOf(q) !== -1;
    var matchDriver = driverStr.indexOf(q) !== -1;
    var matchAddr = addrStr.indexOf(q) !== -1;
    var matchPhone = searchDigits ? (rawPhone.indexOf(searchDigits) !== -1) : false;

    return matchName || matchId || matchPhone || matchDriver || matchAddr;
  });

  if (filtered.length === 0) {
    resArea.innerHTML = '<div class="p-8 text-center text-slate-400 italic text-xs">រកមិនឃើញការកុម្ម៉ង់ត្រូវនឹងពាក្យស្វែងរកឡើយ</div>';
    return;
  }

  var html = '';
  filtered.forEach(function(o) {
    var isDelivered = (o.status === 'Delivered');
    var isCancelled = (o.status === 'Cancelled');
    var dateStr = new Date(o.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });

    if (o.photo_url) {
      storeOrderPhoto(o.order_id, o.photo_url, o.customer_name);
    }

    var statusBadge = isDelivered ? 
      '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">✅ ដឹកដល់ (ទូទាត់រួច)</span>' : 
      (isCancelled ? 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-300">❌ បានបោះបង់ / សងលុយ</span>' : 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">⏳ ' + o.status + '</span>');

    html += '<div class="bg-white p-3.5 rounded-2xl border ' + (isCancelled ? 'border-red-200 bg-red-50/20' : 'border-slate-200') + ' shadow-xs space-y-2.5 hover:shadow-md transition">' +
      '<div class="flex justify-between items-start border-b pb-2">' +
        '<div>' +
          '<b class="text-xs sm:text-sm text-slate-900 font-black"><i class="fas fa-user-circle text-blue-600 mr-1"></i>' + o.customer_name + '</b>' +
          '<div class="text-[10px] text-slate-400 mt-0.5 font-mono">កូដ៖ ' + o.order_id + ' | ម៉ោង៖ ' + dateStr + '</div>' +
        '</div>' +
        '<div class="text-right">' +
          '<b class="text-emerald-700 text-xs sm:text-sm font-black">៛ ' + Number(o.total || 0).toLocaleString() + '</b>' +
          '<div class="mt-0.5">' + statusBadge + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 text-slate-700">' +
        '<div><b>📞 ទូរស័ព្ទភ្ញៀវ៖</b> <span class="text-emerald-700 font-bold">' + (o.phone || '-') + '</span></div>' +
        '<div><b>📦 មុខទំនិញ៖</b> ' + o.items + '</div>' +
        '<div><b>🛵 អ្នកដឹកជញ្ជូន៖</b> ' + (o.driver_name ? (o.driver_name + ' (📞 ' + (o.driver_phone || '-') + ')') : 'មិនទាន់ចាត់ចែង') + '</div>' +
        '<div><b>💳 វិធីបង់ប្រាក់៖</b> ' + (o.payment_method || 'COD') + '</div>' +
        (o.address ? '<div><b>📍 អាសយដ្ឋាន/ចំណាំ៖</b> ' + o.address + '</div>' : '') +
      '</div>' +

      '<div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">' +
        '<div class="flex items-center gap-1.5">' +
          (o.photo_url ? 
          '<button type="button" onclick="viewOrderHousePhotoById(\'' + o.order_id + '\')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-camera text-amber-600"></i> មើលរូបផ្ទះ' +
          '</button>' : '') +
          (o.location_url || o.address ? 
          '<button type="button" onclick="openOrderMap(\'' + (o.location_url || o.address).replace(/'/g, "\\'") + '\')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-map-location-dot text-blue-600"></i> ផែនទី' +
          '</button>' : '') +
        '</div>' +

        (isDelivered ? 
        '<button type="button" onclick="refundAndVoidOnlineOrder(\'' + o.order_id + '\', \'' + o.customer_name.replace(/'/g, "\\'") + '\', ' + (o.total || 0) + ', \'' + (o.items || '').replace(/'/g, "\\'") + '\')" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition">' +
          '<i class="fas fa-rotate-left text-xs"></i> សងលុយវិញ / បោះបង់ (Refund)' +
        '</button>' : '') +
      '</div>' +
    '</div>';
  });

  resArea.innerHTML = html;
}
// ⚠️ មុខងារដោះស្រាយវិវាទ៖ បង្វិលសងលុយ & កាត់ស្តុកត្រឡប់មកវិញ (Refund / Dispute Handler)
async function refundAndVoidOnlineOrder(orderId, custName, total, itemsText) {
  var ok = await kcConfirm({
    title: "ដោះស្រាយវិវាទ (Refund / Void Order)",
    message: "តើអ្នកពិតជាចង់បោះបង់ ឬបង្វិលសងប្រាក់ចំនួន ៛ " + Number(total).toLocaleString() + " ទៅកាន់ភ្ញៀវ [" + custName + "] វិញមែនទេ? ស្តុកទំនិញនឹងត្រូវបង្វិលសងចូលឃ្លាំងវិញដោយស្វ័យប្រវត្តិ។",
    type: "danger",
    confirmText: "យល់ព្រមសងលុយ & បោះបង់"
  });

  if (!ok) return;

  try {
    // ១. ប្តូរ Status ក្នុង Orders ទៅ Cancelled
    const { error: ordErr } = await supabaseClient
      .from('orders')
      .update({ status: 'Cancelled' })
      .eq('order_id', orderId);

    if (ordErr) throw ordErr;

    // ២. បង្វិលស្តុកទំនិញសងចូលឃ្លាំងវិញ (បើជាទំនិញទិញគេ)
    try {
      var itemParts = String(itemsText).split(',');
      for (var i = 0; i < itemParts.length; i++) {
        var seg = itemParts[i].split('x');
        if (seg.length === 2) {
          var pName = seg[0].trim();
          var pQty = parseFloat(seg[1].trim() || 0);

          var prodObj = allProducts.find(p => p.name.trim().toLowerCase() === pName.toLowerCase());
          if (prodObj && prodObj.type === 'ទិញគេ' && pQty > 0) {
            var restoredStock = parseFloat(prodObj.stock || 0) + pQty;
            await supabaseClient.from('products').update({ stock: restoredStock }).eq('id', prodObj.id);
            prodObj.stock = restoredStock;
          }
        }
      }
    } catch(stkErr) {}

    // ៣. កត់ត្រាប្រតិបត្តិការដកប្រាក់ចេញ (Negative Transaction / Refund Log)
    var tid = "REFUND-" + new Date().getTime();
    await supabaseClient.from('transactions').insert([{
      transaction_id: tid,
      customer_name: custName,
      product_name: "សងប្រាក់អតិថិជនវិញ (Refund Online: " + orderId + ")",
      qty: 1,
      price: -total,
      currency: "KHR",
      total: -total,
      paid_khr: -total,
      recorded_by: (currentUser.fullName || "Admin") + " (ដោះស្រាយវិវាទ)",
      status: "Paid",
      payment_method: "Cash"
    }]);

    showToast("បានបោះបង់ការកុម្ម៉ង់ និងកត់ត្រាសងប្រាក់ជូនភ្ញៀវជោគជ័យ!", "success");

    // ៤. ផ្ញើ Telegram Alert ទៅថៅកែភ្លាមៗ
    try {
      var tgMsg = "⚠️ <b>[KC WATER - ដោះស្រាយវិវាទ & សងប្រាក់ភ្ញៀវ (Refund Online)]</b>\n\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "💰 <b>ទឹកប្រាក់សងវិញ៖</b> <b>-៛ " + Number(total).toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកដោះស្រាយ៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(tgE) {}

    await fetchInitialPOSData();
    fetchOnlineAuditOrders();

  } catch(err) {
    showToast("កំហុសដោះស្រាយវិវាទ៖ " + err.message, "error");
  }
}

// ==========================================
// 🌐 TAB ៣៖ ទំនិញកំពុងបង្ហាញលើ WEB (ONLINE SHOWCASE)
// ==========================================
async function loadOnlineHubProductsTab() {
  var area = document.getElementById('hubTabContent_PRODUCTS');
  if (!area) return;

  var onlineProds = (allProducts || []).filter(function(p) {
    var ch = String(p.channel || 'ALL').toUpperCase();
    return ch === 'ALL' || ch === 'ONLINE';
  });

  var html = '<div class="card border-t-4 border-emerald-600 shadow-xl p-5 mb-0 space-y-3">' +
    '<div class="flex justify-between items-center">' +
      '<h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">' +
        '<i class="fas fa-boxes-stacked text-emerald-600"></i>ទំនិញកំពុងដាក់លក់លើ Web តាមផ្ទះ (' + onlineProds.length + ' មុខ)' +
      '</h3>' +
      '<button type="button" onclick="loadModule(\'Stock\')" class="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">' +
        '<i class="fas fa-pen-to-square"></i> កែប្រែក្នុងស្តុក ➔' +
      '</button>' +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">';

  onlineProds.forEach(function(p) {
    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var onlinePr = Number(p.online_price || p.price || 0).toLocaleString() + ' ៛';
    var isOutOfStock = (p.type === 'ទិញគេ' && parseFloat(p.stock || 0) <= 0);

    html += '<div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center space-y-1 relative shadow-2xs">' +
      (isOutOfStock ? '<span class="absolute top-2 left-2 bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-red-300">អស់ស្តុក</span>' : '') +
      '<div class="w-16 h-16 mx-auto flex items-center justify-center p-1"><img src="' + imgUrl + '" class="max-w-full max-h-full object-contain"></div>' +
      '<b class="text-xs text-slate-800 line-clamp-1 block">' + p.name + '</b>' +
      '<div class="text-xs font-black text-emerald-700">🌐 ' + onlinePr + '</div>' +
      '<span class="text-[10px] text-slate-400 font-bold block">' + (p.type === 'ផលិតឯង' ? 'ផលិតឯង' : ('សល់ ' + p.stock)) + '</span>' +
    '</div>';
  });

  html += '</div></div>';
  area.innerHTML = html;
}
