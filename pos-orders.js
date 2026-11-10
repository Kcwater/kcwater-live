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

// 🛡️ មុខងារការពារសុវត្ថិភាពពីមេរោគ XSS (Sanitize HTML Input)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// ⚡ REALTIME LISTENER ពេញលេញ (កណ្តឹង 🔔 & បេសកកម្មលោតភ្លាមក្នុង ០.១ វិនាទី Real-Time)
function initOrdersRealtimeListener() {
  try {
    if (ordersRealtimeChannel) {
      supabaseClient.removeChannel(ordersRealtimeChannel);
      ordersRealtimeChannel = null;
    }

    ordersRealtimeChannel = supabaseClient
      .channel('public:realtime_hub_channel')
      // ១. ស្ទាក់ចាប់ការកុម្ម៉ង់ Online ថ្មីៗ (orders) ➔ លោតកណ្តឹងភ្លាម
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function(payload) {
        if (typeof checkPendingOnlineOrdersBadge === 'function') checkPendingOnlineOrdersBadge();
        if (typeof updateNotificationCenterBadge === 'function') updateNotificationCenterBadge();

        var modal = document.getElementById('onlineOrdersAdminModal');
        if (modal && !modal.classList.contains('hidden')) {
          openOnlineOrdersModal();
        }

        // 🛵 សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver)
        if (currentUser && currentUser.type === 'CompanyDriver') {
          var driverContainer = document.getElementById('driverOrdersContainer');
          if (driverContainer) {
            renderCompanyDeliveriesModule(true);
          }

          var newRecord = payload.new || {};
          if (newRecord.status === 'Assigned' && newRecord.driver_name === currentUser.fullName) {
            playOrderChime();
            if (navigator.vibrate) {
              navigator.vibrate([400, 200, 400, 200, 600]);
            }
            showToast("🛵 [ការងារថ្មី] Admin បានចាត់ចែងការដឹកទឹកថ្មីឱ្យអ្នក!", "success");
          }
        }
      })
      // ២. ស្ទាក់ចាប់សំណើបង់ប្រាក់ពីម៉ូយ (pending_payments) ➔ លោតកណ្តឹងភ្លាម
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_payments' }, function(payload) {
        if (typeof updateNotificationCenterBadge === 'function') updateNotificationCenterBadge();
        if (typeof checkAdminPendingPayments === 'function') checkAdminPendingPayments();
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

// ==========================================================================
// 🧠 មុខងារជំនួយបំបែកព័ត៌មានទីតាំង (GPS, ម៉ោងដឹក, អគារ និងចំណាំផ្ទះ)
// ==========================================================================
function parseOrderLocationDetails(raw) {
  if (!raw) return { mapUrl: '', timeText: '', buildingText: '', noteText: '' };
  var str = String(raw).trim();

  // ១. ស្រង់យកតែ Link ផែនទី Google Maps សុទ្ធ
  var mapMatch = str.match(/https?:\/\/[^\s|\[\]]+/);
  var mapUrl = mapMatch ? mapMatch[0] : '';

  // លុប Link ចេញសិនដើម្បីងាយស្រួលញែកផ្នែកផ្សេងៗ
  var workingStr = mapUrl ? str.replace(mapUrl, '').trim() : str;
  if (workingStr.startsWith('|')) workingStr = workingStr.substring(1).trim();

  var timeText = '';
  var buildingText = '';

  // ២. ស្រង់យកទិន្នន័យក្នុងវង់ក្រចក [...] (ម៉ោង & ប្រភេទអគារ)
  var bracketMatches = workingStr.match(/\[(.*?)\]/g) || [];
  bracketMatches.forEach(function(b) {
    var content = b.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (content.includes('⚡') || content.includes('⏰') || content.includes('ដឹកភ្លាម') || content.includes('វេនដឹក') || content.includes('ម៉ោង')) {
      timeText = content;
    } else if (content.includes('🏠') || content.includes('🏢') || content.includes('ជាន់') || content.includes('ផ្ទាល់ដី')) {
      buildingText = content;
    }
  });

  // ៣. ស្រង់យកតែចំណាំផ្ទះសុទ្ធ (ដក Link និងវង់ក្រចកចេញទាំងអស់)
  var cleanStr = workingStr;
  bracketMatches.forEach(function(b) {
    cleanStr = cleanStr.replace(b, '');
  });
  cleanStr = cleanStr.replace(/\|\s*ចំណាំ:?/gi, '').replace(/^ចំណាំ:?/gi, '').trim();

  return {
    mapUrl: mapUrl,
    timeText: timeText,
    buildingText: buildingText,
    noteText: cleanStr
  };
}

// 🎨 បង្កើតប្លុក Badges ព័ត៌មានទីតាំងស្អាតៗ & ការពារសុវត្ថិភាព XSS
function formatOrderLocationBadgeHTML(rawLocation) {
  var loc = parseOrderLocationDetails(rawLocation);
  var html = '';

  // បង្ហាញផ្លាក Badges ម៉ោង និងអគារ
  if (loc.timeText || loc.buildingText) {
    html += '<div class="flex flex-wrap items-center gap-1.5 pt-1">';
    if (loc.timeText) {
      html += '<span class="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] flex items-center gap-1"><i class="fas fa-clock text-emerald-600"></i> ' + escapeHtml(loc.timeText) + '</span>';
    }
    if (loc.buildingText) {
      html += '<span class="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 font-black text-[10px] flex items-center gap-1"><i class="fas fa-building text-blue-600"></i> ' + escapeHtml(loc.buildingText) + '</span>';
    }
    html += '</div>';
  }

  // បង្ហាញចំណាំទីតាំងផ្ទះសុទ្ធ (មានការពារកូដអាក្រក់ escapeHtml)
  if (loc.noteText) {
    html += '<div class="flex items-start gap-1.5 pt-1 text-[11px] text-slate-800 font-bold">' +
      '<span class="text-slate-400 whitespace-nowrap"><i class="fas fa-location-dot text-rose-500 mr-1"></i>ចំណាំផ្ទះ៖</span>' +
      '<span class="leading-snug break-words">' + escapeHtml(loc.noteText) + '</span>' +
    '</div>';
  }

  return html;
}

// ==========================================================================
// 🖼️ មុខងារជំនួយ៖ បង្ហាញមុខទំនិញជាជួរឈរ (Vertical List) + មានរូបទំនិញ
// ==========================================================================
function formatOrderItemsVerticalListHTML(itemsText) {
  if (!itemsText) return '<span class="text-slate-400 italic text-xs">គ្មានទំនិញ</span>';

  var parts = String(itemsText).split(',');
  var html = '<div class="space-y-1.5 pt-1">';

  parts.forEach(function(partStr) {
    var str = partStr.trim();
    if (!str) return;

    var seg = str.split('x');
    var rawName = seg[0] ? seg[0].trim() : str;
    var qty = (seg.length >= 2) ? seg[1].trim() : '1';

    var isFreeGift = rawName.includes('[Free]') || rawName.includes('🎁') || rawName.includes('កាដូ');
    var isBarrel = rawName.includes('🛢️') || rawName.includes('សំបក');

    var cleanName = rawName
      .replace(/🎁\s*\[Free\]/gi, '')
      .replace(/\[Free\]/gi, '')
      .replace(/\[កាដូថែម Free\]/gi, '')
      .replace(/🛢️/gi, '')
      .trim();

    var matchedProd = (allProducts || []).find(function(p) {
      return p.name.trim().toLowerCase() === cleanName.toLowerCase();
    });

    var imgUrl = (matchedProd && matchedProd.img) ? matchedProd.img : 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png';

    var giftBadge = isFreeGift ? '<span class="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-black rounded border border-amber-300 ml-1 whitespace-nowrap">🎁 Free</span>' : '';
    var barrelBadge = isBarrel ? '<span class="px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[9px] font-black rounded border border-blue-200 ml-1 whitespace-nowrap">🛢️ សំបក</span>' : '';

    html += '<div class="flex items-center justify-between p-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs">' +
      '<div class="flex items-center gap-2 min-w-0 flex-1">' +
        '<div class="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">' +
          '<img src="' + imgUrl + '" class="max-w-full max-h-full object-contain" alt="' + cleanName + '">' +
        '</div>' +
        '<div class="min-w-0 flex-1">' +
          '<span class="text-xs font-bold text-slate-900 block truncate">' + cleanName + giftBadge + barrelBadge + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="text-right shrink-0 pl-2">' +
        '<span class="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 font-mono">x ' + qty + '</span>' +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  return html;
}

// 💬 មុខងារផ្ញើ Telegram ទី ១៖ បើកចូល Chat ម្ចាស់ដេប៉ូចំៗតាម «លេខទូរស័ព្ទ» ផ្ទាល់ ១០០%
function sendDepotAdvanceOrderTelegram(depotId, orderId) {
  // ១. ស្វែងរកទិន្នន័យដេប៉ូ
  var grp = (window.__currentManifestDepotGroups && window.__currentManifestDepotGroups[depotId]) ? window.__currentManifestDepotGroups[depotId] : null;
  var d = (grp && grp.depot) ? grp.depot : ((typeof activePartnerDepots !== 'undefined') ? activePartnerDepots.find(item => item.id === depotId) : null);

  if (!d) {
    showToast("រកមិនឃើញព័ត៌មានដេប៉ូឡើយ!", "error");
    return;
  }

  var depotName = d.name || "ដេប៉ូដៃគូ";
  var cleanPhone = String(d.phone || '').replace(/[^0-9]/g, '');

  if (!cleanPhone) {
    if (typeof kcAlert === 'function') {
      kcAlert({ title: "ខ្វះលេខទូរស័ព្ទ", message: "ដេប៉ូនេះមិនទាន់មានលេខទូរស័ព្ទឡើយ!", type: "warning" });
    } else {
      showToast("ដេប៉ូនេះមិនទាន់មានលេខទូរស័ព្ទឡើយ!", "error");
    }
    return;
  }

  // 🇰🇭 ២. បំប្លែងលេខទូរស័ព្ទដេប៉ូ ទៅជាទម្រង់អន្តរជាតិកម្ពុជា (+855...)
  var intlPhone = cleanPhone;
  if (intlPhone.startsWith('0')) {
    intlPhone = '855' + intlPhone.substring(1);
  } else if (!intlPhone.startsWith('855')) {
    intlPhone = '855' + intlPhone;
  }

  // ស្រង់យកតែមុខទំនិញដែលត្រូវយកពីដេប៉ូនោះ
  var itemsListStr = '';
  if (grp && grp.items && grp.items.length > 0) {
    grp.items.forEach(function(itm) {
      itemsListStr += "• " + itm.name + " x " + itm.qty + "\n";
    });
  }

  var termLabel = (d.payTerms === 'CASH') ? 'បង់លុយសុទ្ធពេលលើក' : 'កត់ជំពាក់ដេប៉ូ';
  var dateKhNow = new Date().toLocaleString('km-KH', { 
    timeZone: 'Asia/Phnom_Penh', 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });

  // 🔒 ៣. សារ Telegram ទី ១ (ភ្ជាប់លេខទូរស័ព្ទដេប៉ូ & គ្មានឈ្មោះភ្ញៀវយើងឡើយ)
  var tgMsg = "📦 [KC MART - បញ្ជាទិញទំនិញ / ត្រៀមទុកជាមុន]\n" +
              "🆔 កូដកុម្ម៉ង់៖ " + (orderId || "-") + "\n" +
              "🏪 ដេប៉ូ៖ " + depotName + "\n" +
              "📞 លេខទូរស័ព្ទ៖ " + d.phone + "\n" +
              "━━━━━━━━━━━━━━━━━━━━\n" +
              "🛒 មុខទំនិញត្រូវត្រៀមទុក៖\n" +
              (itemsListStr || "• សូមពិនិត្យតាមការកុម្ម៉ង់\n") +
              "📌 លក្ខខណ្ឌទូទាត់៖ " + termLabel + "\n" +
              "━━━━━━━━━━━━━━━━━━━━\n" +
              "🛵 អ្នកដឹក KC នឹងទៅលើកក្នុងពេលបន្តិចទៀតនេះ!\n" +
              "🕒 ម៉ោង៖ " + dateKhNow;

  // 📋 ចម្លងសារទុកក្នុងទូរស័ព្ទអូតូ (ការពារក្រែងលោខកខាន)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tgMsg);
    }
  } catch(cErr) {}

  // 🚀 ៤. បើកចូល Chat ម្ចាស់ដេប៉ូចំៗតាមលេខទូរស័ព្ទ (+855...) ផ្ទាល់
  var tgDirectUrl = "https://t.me/+" + intlPhone + "?text=" + encodeURIComponent(tgMsg);
  var tgAppScheme = "tg://resolve?phone=" + intlPhone + "&text=" + encodeURIComponent(tgMsg);

  var win = window.open(tgDirectUrl, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = tgAppScheme;
  }

  showToast("កំពុងបើក Telegram ទៅកាន់លេខ " + d.phone + "...", "info");
}

// ==========================================================================
// 📋 ១. ផ្ទាំង ADMIN ONLINE ORDERS (មុខទំនិញជាជួរឈរ + មានរូបភាព)
// ==========================================================================
function renderAdminOnlineOrdersUI() {
  var container = document.getElementById('onlineOrdersAdminListContainer');
  if (!container) return;

  var list = adminOnlineOrdersCache || [];

  var pendingCount = 0;
  var assignedCount = 0;
  var deliveredCount = 0;

  list.forEach(function(o) {
    if (o.status === 'Pending') pendingCount++;
    if (o.status === 'Assigned') assignedCount++;
    if (o.status === 'Delivered') deliveredCount++;
  });

  var tabsHtml = '<div class="flex flex-wrap gap-1 p-1 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs mb-3 font-bold">' +
    '<button type="button" onclick="switchAdminOnlineTab(\'ACTIVE\')" class="flex-1 py-1.5 px-2 rounded-xl transition ' + (activeAdminOnlineTab === 'ACTIVE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white') + '">🔥 កំពុងដំណើរការ (' + (pendingCount + assignedCount) + ')</button>' +
    '<button type="button" onclick="switchAdminOnlineTab(\'PENDING\')" class="py-1.5 px-2.5 rounded-xl transition ' + (activeAdminOnlineTab === 'PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white') + '">⏳ រង់ចាំ (' + pendingCount + ')</button>' +
    '<button type="button" onclick="switchAdminOnlineTab(\'ASSIGNED\')" class="py-1.5 px-2.5 rounded-xl transition ' + (activeAdminOnlineTab === 'ASSIGNED' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white') + '">🚚 កំពុងដឹក (' + assignedCount + ')</button>' +
    '<button type="button" onclick="switchAdminOnlineTab(\'DELIVERED\')" class="py-1.5 px-2.5 rounded-xl transition ' + (activeAdminOnlineTab === 'DELIVERED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-white') + '">✅ ដឹកដល់ថ្ងៃនេះ (' + deliveredCount + ')</button>' +
  '</div>';

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
    var rawLoc = (o.location_url || o.address || '').trim();

    var intlPhone = cleanPhone.startsWith('0') ? ('855' + cleanPhone.substring(1)) : ('855' + cleanPhone);
    var tgChatLink = "https://t.me/+" + intlPhone;
    var waChatLink = "https://wa.me/" + intlPhone;

    var driverOptions = '<option value="">-- រើសអ្នកដឹករបស់រោងចក្រ --</option>';
    companyDrivers.forEach(function(c) {
      var dPhone = c.phone ? (' (' + c.phone + ')') : '';
      var isSelected = (o.driver_name && o.driver_name.trim() === c.full_name.trim()) ? 'selected' : '';
      driverOptions += '<option value="' + c.full_name + '" data-phone="' + (c.phone || '') + '" ' + isSelected + '>' + c.full_name + dPhone + '</option>';
    });

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

      (rawLoc ? 
      '<button type="button" onclick="openOrderMap(\'' + rawLoc.replace(/'/g, "\\'") + '\')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold border border-blue-200 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
        '<i class="fas fa-map-location-dot text-xs text-blue-600"></i> ផែនទី' +
      '</button>' : '');

    if (o.photo_url) {
      storeOrderPhoto(o.order_id, o.photo_url, o.customer_name);
      actionButtonsHtml += '<button type="button" onclick="viewOrderHousePhotoById(\'' + o.order_id + '\')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold border border-amber-300 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
        '<i class="fas fa-camera text-xs text-amber-600"></i> រូបផ្ទះ' +
      '</button>';
    }

    actionButtonsHtml += '<button type="button" onclick="openOrderPickupManifestModal(\'' + o.order_id + '\')" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl font-bold border border-rose-300 shadow-2xs flex items-center gap-1 active:scale-95 transition">' +
      '<i class="fas fa-boxes-packing text-xs text-rose-600"></i> បញ្ជីដេប៉ូ' +
    '</button>';

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

      // 📦 ប្លុកព័ត៌មានទំនិញជាជួរឈរ (Vertical List) + រូបភាពទំនិញ
      '<div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs text-gray-700">' +
        '<div>' +
          '<span class="text-gray-500 font-bold text-[11px] block mb-1">📦 មុខទំនិញកុម្ម៉ង់៖</span>' +
          formatOrderItemsVerticalListHTML(o.items) +
        '</div>' +
        '<div class="flex items-center gap-1.5 text-[11px] pt-1 border-t border-slate-200/60">' +
          '<span class="text-gray-400 font-bold whitespace-nowrap">🛢️ សំបកធុង៖</span>' +
          '<span class="font-bold text-emerald-700">' + (o.barrel_swap || 'មានសំបកដូរ') + '</span>' +
        '</div>' +
        formatOrderLocationBadgeHTML(rawLoc) +
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
// 🛵 មុខងារចាត់ចែងអ្នកដឹកជញ្ជូនរោងចក្រ (ចាក់សោរសម្រាប់តែ Admin ១០០%)
// ==========================================================================
async function assignDriverToOnlineOrder(orderId, custName) {
  // 🔒 ១. ចាក់សោរសិទ្ធិ៖ មានតែ Admin ប៉ុណ្ណោះដែលអាចចាត់ចែងអ្នកដឹកបាន
  if (!currentUser || currentUser.role !== 'Admin') {
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "គ្មានសិទ្ធិចាត់ចែង!",
        message: "មានតែ Admin ប៉ុណ្ណោះដែលអាចចាត់ចែងការងារដឹកជញ្ជូនបាន!",
        type: "danger"
      });
    } else {
      showToast("មានតែ Admin ប៉ុណ្ណោះដែលអាចចាត់ចែងបាន!", "error");
    }
    return;
  }

  var sel = document.getElementById('driver_sel_' + orderId);
  var driverName = sel ? sel.value.trim() : "";
  
  if (!driverName) {
    await kcAlert({
      title: "មិនទាន់រើសអ្នកដឹក",
      message: "សូមជ្រើសរើសឈ្មោះអ្នកដឹកជញ្ជូនរោងចក្រជាមុនសិន!",
      type: "warning"
    });
    if (sel) sel.focus();
    return;
  }

  var selectedOpt = sel.options[sel.selectedIndex];
  var driverPhone = selectedOpt ? selectedOpt.getAttribute('data-phone') : '';

  try {
    // ២. ទាញព័ត៌មានកុម្ម៉ង់ចាស់មកឆែកមើល
    const { data: orderInfo, error: fetchErr } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (fetchErr || !orderInfo) {
      throw new Error("រកមិនឃើញទិន្នន័យនៃការកុម្ម៉ង់នេះក្នុងប្រព័ន្ធឡើយ!");
    }

    // ⚠️ ៣. ប្រសិនបើធ្លាប់ចាត់ចែងឱ្យអ្នកដឹកផ្សេងរួចហើយ ចេញផ្ទាំងសួរ Admin សិន
    if (orderInfo.driver_name && orderInfo.driver_name.trim() !== "" && orderInfo.driver_name.trim() !== driverName) {
      var okChange = await kcConfirm({
        title: "ប្តូរអ្នកដឹកជញ្ជូន",
        message: "ការកុម្ម៉ង់នេះបានចាត់ចែងឱ្យ [" + orderInfo.driver_name + "] រួចហើយ! តើអ្នកពិតជាចង់ប្តូរទៅឱ្យ [" + driverName + "] វិញមែនទេ?",
        type: "warning",
        confirmText: "យល់ព្រមប្តូរអ្នកដឹក"
      });
      if (!okChange) return;
    }

    // ៤. ធ្វើបច្ចុប្បន្នភាពទៅក្នុង Supabase (គាំទ្រទាំង PROD & TEST តាម active client)
    const { error: updErr } = await supabaseClient
      .from('orders')
      .update({
        status: 'Assigned',
        driver_name: driverName,
        driver_phone: driverPhone
      })
      .eq('order_id', orderId);

    if (updErr) throw updErr;

    await kcAlert({
      title: "ចាត់ចែងជោគជ័យ! 🎉",
      message: "ការកុម្ម៉ង់លេខកូដ [" + orderId + "] ត្រូវបានចាត់ចែងទៅឱ្យអ្នកដឹក [" + driverName + "] រួចរាល់!",
      type: "success"
    });

    openOnlineOrdersModal();

    // 🔔 ៥. ផ្ញើសារដំណឹងទៅ Telegram Group អ្នកដឹកជញ្ជូន
    try {
      var phoneText = orderInfo.phone ? orderInfo.phone : '-';
      var itemsText = orderInfo.items ? orderInfo.items : '-';
      var totalText = orderInfo.total ? Number(orderInfo.total).toLocaleString() : '0';
      var payText = orderInfo.payment_method ? orderInfo.payment_method : 'COD (លុយសុទ្ធ)';
      var barrelText = orderInfo.barrel_swap ? orderInfo.barrel_swap : 'មានសំបកដូរ';
      var rawLocation = orderInfo.location_url || orderInfo.address || '';

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

      var tgHeader = (orderInfo.driver_name && orderInfo.driver_name !== driverName) ? 
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
                  (orderInfo.address ? ("📝 <b>ចំណាំទីតាំង៖</b> " + orderInfo.address + "\n") : "") +
                  "🕒 <b>ម៉ោងចាត់ចែង៖</b> " + timeKhNow;

      var targetChatId = (telegramConfig && telegramConfig.driverChatId) ? telegramConfig.driverChatId : ((telegramConfig && telegramConfig.chatId) ? telegramConfig.chatId : '');
      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg, targetChatId);
      }
    } catch(tgErr) {}
    
  } catch(err) {
    await kcAlert({ title: "កំហុសចាត់ចែង", message: err.message, type: "danger" });
  }
}

// ==========================================================================
// 🚀 មុខងារអ្នកដឹកចុច "ចេញដំណើរទៅហើយ" (DEPARTED / EN ROUTE)
// ==========================================================================
async function markOrderAsDeparted(orderId, custName) {
  var ok = true;
  if (typeof kcConfirm === 'function') {
    ok = await kcConfirm({
      title: "ចេញដំណើរដឹកទឹក",
      message: "តើអ្នកពិតជាបានរៀបចំទឹកលើម៉ូតូរួចរាល់ ហើយចាប់ផ្តើមចេញដំណើរទៅផ្ទះរបស់ [" + custName + "] មែនទេ?",
      type: "info",
      confirmText: "🚀 ចេញដំណើរឥឡូវនេះ"
    });
  }

  if (!ok) return;

  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ status: 'Departed' })
      .eq('order_id', orderId);

    if (error) throw error;

    // សំឡេង Chime និងញ័រទូរស័ព្ទបញ្ជាក់
    if (typeof playOrderChime === 'function') playOrderChime();
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);

    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "ចេញដំណើរជោគជ័យ! 🛵💨",
        message: "ប្រព័ន្ធបានជូនដំណឹងទៅកាន់ភ្ញៀវ [" + custName + "] ថាអ្នកកំពុងធ្វើដំណើរទៅហើយ។ សូមបើកបរដោយសុវត្ថិភាព!",
        type: "success"
      });
    } else {
      showToast("🚀 កំពុងធ្វើដំណើរទៅផ្ទះភ្ញៀវ...", "success");
    }

    // 🔔 ផ្ញើ Telegram Alert ទៅកាន់ក្រុម
    try {
      var timeKhNow = new Date().toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var tgMsg = "🛵💨 <b>[KC WATER - អ្នកដឹកបានចេញដំណើរហើយ]</b>\n\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "🛵 <b>អ្នកដឹក៖</b> " + (currentUser.fullName || "អ្នកដឹក KC") + "\n" +
                  "🕒 <b>ម៉ោងចេញដំណើរ៖</b> " + timeKhNow;

      var targetChatId = (telegramConfig && telegramConfig.driverChatId) ? telegramConfig.driverChatId : ((telegramConfig && telegramConfig.chatId) ? telegramConfig.chatId : '');
      if (typeof sendTelegramAlert === 'function') {
        sendTelegramAlert(tgMsg, targetChatId);
      }
    } catch(tgE) {}

    // Refresh ផ្ទាំងអ្នកដឹកឡើងវិញភ្លាមៗ
    if (typeof renderCompanyDeliveriesModule === 'function') {
      renderCompanyDeliveriesModule(false);
    }
    var adminModal = document.getElementById('onlineOrdersAdminModal');
    if (adminModal && !adminModal.classList.contains('hidden')) {
      openOnlineOrdersModal();
    }

  } catch(err) {
    if (typeof kcAlert === 'function') {
      await kcAlert({ title: "កំហុស", message: err.message, type: "danger" });
    } else {
      showToast("កំហុស៖ " + err.message, "error");
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

// 📱 មុខងារបើក ABA QR សម្រាប់អ្នកដឹក (គាំទ្រទាំងទាញតម្លៃអូតូ និងបញ្ជូនតម្លៃផ្ទាល់ + កម្រិត z-index ត្រឹមត្រូវ)
function openDriverAbaQrModal(amount, custName) {
  var total = (amount !== undefined && amount !== null && amount !== '') ? 
              amount : (activeDeliveryTaskData ? (activeDeliveryTaskData.total || 0) : 0);
  
  var qrModal = document.getElementById('posKhqrModal');
  var amtText = document.getElementById('posKhqrAmountText');
  
  if (qrModal && amtText) {
    amtText.innerText = "៛ " + Number(total).toLocaleString();
    qrModal.style.zIndex = '9000'; // 👈 រុញឱ្យខ្ពស់ជាងផ្ទាំងបញ្ជាក់ការដឹកដល់
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

// 💾 មុខងារកត់ត្រាការដឹកដល់ បំបែកទំនិញ & កាត់ស្តុកសំបកធុង+ទំនិញជាក់លាក់ ១០០% (V2.0)
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
    // ១. Update ស្ថានភាពទៅជា Delivered ក្នុងតារាង Orders
    const { error: ordErr } = await supabaseClient
      .from('orders')
      .update({
        status: 'Delivered',
        payment_method: payTextLabel
      })
      .eq('order_id', orderId);

    if (ordErr) throw ordErr;

    // ២. ធានាថាមានទិន្នន័យទំនិញស្រស់ៗពី Database ដើម្បីពិនិត្យស្តុក
    if (!allProducts || allProducts.length === 0) {
      const { data: pList } = await supabaseClient.from('products').select('*');
      if (pList) allProducts = pList;
    }

    // ៣. បំបែកទំនិញបញ្ចូលក្នុង Transactions (ស្គាល់ទាំងទំនិញ Free និងសំបកធុងថ្មី)
    var tid = "TR-" + new Date().getTime();
    var rowsToInsert = [];
    var totalAllocated = 0;
    var stockDeductionQueue = [];

    var itemParts = String(itemsText).split(',');
    itemParts.forEach(function(partStr) {
      var rawPart = partStr.trim();
      if (!rawPart) return;

      var seg = rawPart.split('x');
      var rawName = seg[0] ? seg[0].trim() : rawPart;
      var qty = (seg.length >= 2) ? parseFloat(seg[1].trim() || 1) : 1;
      if (isNaN(qty) || qty <= 0) qty = 1;

      // 🎁 ឆែកមើលថាតើជាកាដូថែម Free ឬជាសំបកធុង
      var isFreeGift = rawName.includes('[Free]') || rawName.includes('🎁') || rawName.includes('កាដូ');
      
      // 🧹 សម្អាត Emoji និងពាក្យបន្ថែម ដើម្បីស្វែងរកឈ្មោះទំនិញពិតប្រាកដក្នុង Database
      var cleanName = rawName
        .replace(/🎁\s*\[Free\]/gi, '')
        .replace(/\[Free\]/gi, '')
        .replace(/\[កាដូថែម Free\]/gi, '')
        .replace(/🛢️/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // ស្វែងរកទំនិញក្នុងស្តុក (ស្វែងរកទាំងចំឈ្មោះ និងធៀបអក្សរតូចធំ)
      var matchedProd = allProducts.find(function(p) {
        var pNameClean = (p.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return pNameClean === cleanName.toLowerCase();
      });

      // បើជាសំបកធុង ហើយមិនទាន់រកឃើញ ស្វែងរកតាមពាក្យគន្លឹះ "សំបក"
      if (!matchedProd && (cleanName.includes('សំបក') || cleanName.includes('ធុង'))) {
        matchedProd = allProducts.find(function(p) {
          var pName = (p.name || '').toLowerCase();
          if (cleanName.includes('ខៀវ')) return pName.includes('សំបក') && pName.includes('ខៀវ');
          if (cleanName.includes('ស')) return pName.includes('សំបក') && pName.includes('ស');
          return false;
        });
      }

      var unitPrice = isFreeGift ? 0 : (matchedProd ? parseFloat(matchedProd.online_price || matchedProd.price || 0) : 0);
      var lineTotal = unitPrice * qty;
      totalAllocated += lineTotal;

      var finalDisplayName = isFreeGift ? 
        ("🎁 [Free] " + (matchedProd ? matchedProd.name : cleanName)) : 
        (matchedProd ? matchedProd.name : rawName);

      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName,
        product_name: finalDisplayName,
        qty: qty,
        price: unitPrice,
        currency: "KHR",
        total: lineTotal,
        paid_khr: lineTotal,
        recorded_by: driverName ? (driverName + " (អ្នកដឹក)") : "Admin",
        status: "Paid",
        payment_method: actualPayMethod
      });

      // កត់ត្រាចូលបញ្ជីកាត់ស្តុកផ្ទាល់ជាមួយ Product ID (ការពារកុំឱ្យច្រឡំ)
      if (matchedProd && matchedProd.type === 'ទិញគេ') {
        stockDeductionQueue.push({
          product: matchedProd,
          qty: qty
        });
      }
    });

    // 🛵 គណនាថ្លៃដឹកជញ្ជូនជាក់ស្តែង (បើមាននៅសល់ពីតម្លៃទំនិញ និងសំបកធុង)
    var diff = total - totalAllocated;
    if (diff > 0) {
      rowsToInsert.push({
        transaction_id: tid,
        customer_name: custName,
        product_name: "សេវាដឹកជញ្ជូនដល់ផ្ទះ (Delivery Fee)",
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

    // ៤. កត់ត្រាប្រតិបត្តិការលក់ចូលតារាង Transactions
    if (rowsToInsert.length > 0) {
      const { error: insErr } = await supabaseClient.from('transactions').insert(rowsToInsert);
      if (insErr) throw insErr;
    }

    // 📦 ៥. កាត់ស្តុកទំនិញទិញគេ និងសំបកធុងផ្ទាល់តាម ID ធានាត្រឹមត្រូវ ១០០%
    for (var k = 0; k < stockDeductionQueue.length; k++) {
      var itemToDeduct = stockDeductionQueue[k];
      var prod = itemToDeduct.product;
      var deductQty = itemToDeduct.qty;

      var currentStock = parseFloat(prod.stock || 0);
      var updatedStock = Math.max(0, currentStock - deductQty);

      await supabaseClient
        .from('products')
        .update({ stock: updatedStock })
        .eq('id', prod.id);

      prod.stock = updatedStock; // អាប់ដេត Memory ភ្លាមៗ
    }

    // ៦. បិទផ្ទាំងបញ្ជាក់ការដឹក
    closeCompleteDeliveryModal();
    showToast("បានកត់ត្រាការដឹកដល់ និងកាត់ស្តុកជោគជ័យ!", "success");

    // ៧. 🧾 បង្កើតវិក្កយបត្រឌីជីថល Pop-up
    if (typeof generateReceiptImage === 'function') {
      try {
        generateReceiptImage(tid, custName, total, total, rowsToInsert, "វិក្កយបត្រដឹកជញ្ជូន (DELIVERY RECEIPT)");
      } catch(rcpErr) {
        console.warn("Receipt generation warning:", rcpErr);
      }
    }

    // ៨. សំឡេង Chime & បាញ់កាំជ្រួច
    if (typeof playOrderChime === 'function') playOrderChime();
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80 });

    // ៩. 🔄 Refresh ផ្ទាំង Admin + អ្នកដឹកភ្លាមៗ
    if (currentUser && currentUser.type === 'CompanyDriver') {
      if (typeof renderCompanyDeliveriesModule === 'function') renderCompanyDeliveriesModule(false);
    }
    var adminModal = document.getElementById('onlineOrdersAdminModal');
    if (adminModal && !adminModal.classList.contains('hidden')) {
      openOnlineOrdersModal();
    }
    if (typeof checkPendingOnlineOrdersBadge === 'function') checkPendingOnlineOrdersBadge();
    if (typeof loadOnlineHubOrdersTab === 'function') loadOnlineHubOrdersTab();
    if (typeof fetchOnlineAuditOrders === 'function') fetchOnlineAuditOrders();

    // ១០. ផ្ញើ Telegram Alert ទៅថៅកែ
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

    // 🌟 បង្ហាញផ្ទាំង kcAlert ស្តង់ដារជូនដំណឹង
    if (typeof kcAlert === 'function') {
      kcAlert({
        title: "ដឹកជញ្ជូនជោគជ័យ! 🎉",
        message: "ការកុម្ម៉ង់ [" + orderId + "] របស់ " + custName + " ទឹកប្រាក់ ៛ " + Number(total).toLocaleString() + " ត្រូវបានកត់ត្រា និងកាត់ស្តុកជោគជ័យ!",
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

// ==========================================================================
// 🛵 ២. ផ្ទាំងបេសកកម្មរបស់អ្នកដឹក («បេសកកម្មដឹកទឹករបស់ខ្ញុំថ្ងៃនេះ»)
// ==========================================================================
async function renderCompanyDeliveriesModule(isSilentRefresh) {
  var area = document.getElementById('contentArea');
  if (!area) return;

  var driverName = (currentUser && currentUser.fullName) ? currentUser.fullName : '';
  var existingContainer = document.getElementById('driverOrdersContainer');

  if (!existingContainer || !isSilentRefresh) {
    area.innerHTML = '<div class="w-full max-w-2xl mx-auto space-y-3.5 px-1 sm:px-2">' +
      '<div class="flex justify-between items-center bg-white p-3.5 sm:p-4 rounded-2xl border shadow-sm">' +
        '<div>' +
          '<h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">' +
            '<i class="fas fa-motorcycle text-emerald-600"></i>' +
            '<span>បេសកកម្មដឹកទឹករបស់ខ្ញុំថ្ងៃនេះ</span>' +
          '</h2>' +
          '<p class="text-[11px] text-slate-500 mt-0.5">អ្នកដឹកជញ្ជូន៖ <b class="text-emerald-800">' + driverName + '</b></p>' +
        '</div>' +
        '<button onclick="renderCompanyDeliveriesModule(false)" class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 active:scale-95 transition flex items-center gap-1.5 shadow-2xs">' +
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

    const { data: list, error } = await supabaseClient
      .from('orders')
      .select('*')
      .in('status', ['Assigned', 'Departed'])
      .ilike('driver_name', driverName.trim())
      .order('created_at', { ascending: false });

    if (error) throw error;

    var deliveredCount = 0;
    var cashToHandover = 0;
    var abaCollected = 0;

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
          deliveredCount++;
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
      var isDeparted = (task.status === 'Departed');
      var cleanPhone = String(task.phone || '').replace(/[^0-9]/g, '');
      var safeName = String(task.customer_name || '').replace(/'/g, "\\'");
      var rawLoc = (task.location_url || task.address || '').trim();
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

      var departActionHtml = '';
      if (!isDeparted) {
        departActionHtml = '<button type="button" onclick="markOrderAsDeparted(\'' + task.order_id + '\', \'' + safeName + '\')" class="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition">' +
          '<i class="fas fa-motorcycle text-sm"></i> 🚀 ចុចចេញដំណើរ (Start Delivery)' +
        '</button>';
      } else {
        departActionHtml = '<div class="p-2 bg-blue-50 border border-blue-200 rounded-xl text-center text-blue-900 font-black text-xs flex items-center justify-center gap-1.5">' +
          '<i class="fas fa-route text-blue-600 animate-pulse"></i> 🛵💨 កំពុងធ្វើដំណើរទៅផ្ទះភ្ញៀវ...' +
        '</div>';
      }

      html += '<div class="bg-white p-4 rounded-3xl border-2 ' + (isDeparted ? 'border-blue-400 bg-blue-50/10' : 'border-emerald-400') + ' shadow-md space-y-3 animate-in zoom-in duration-200">' +
        '<div class="flex justify-between items-start border-b border-slate-100 pb-2.5">' +
          '<div>' +
            '<div class="flex items-center gap-1.5">' +
              '<b class="text-sm font-black text-slate-900"><i class="fas fa-user-circle text-emerald-600 mr-1"></i>' + task.customer_name + '</b>' +
              (isDeparted ? 
                '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200 animate-pulse">🛵 កំពុងធ្វើដំណើរ</span>' : 
                '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">📦 រៀបចំរួចរាល់</span>') +
            '</div>' +
            '<div class="text-[10px] text-slate-400 font-mono mt-0.5">កូដ៖ ' + task.order_id + ' | ម៉ោង៖ ' + timeStr + '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="text-sm font-black text-emerald-700">៛ ' + Number(task.total || 0).toLocaleString() + '</div>' +
            '<span class="text-[10px] font-bold text-slate-500">' + (task.payment_method || 'COD') + '</span>' +
          '</div>' +
        '</div>' +

        // 📦 មុខទំនិញជាជួរឈរ (Vertical List) + រូបភាពទំនិញ
        '<div class="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 space-y-1.5 text-xs text-slate-700">' +
          '<div>' +
            '<span class="text-emerald-900 font-bold text-[11px] block mb-1">📦 មុខទំនិញត្រូវដឹក៖</span>' +
            formatOrderItemsVerticalListHTML(task.items) +
          '</div>' +
          '<div class="flex items-center gap-1.5 text-[11px] pt-1 border-t border-emerald-200/60">' +
            '<span class="text-slate-400 font-bold whitespace-nowrap">🛢️ សំបកធុង៖</span>' +
            '<span class="font-bold text-emerald-700">' + (task.barrel_swap || 'មានសំបកដូរ') + '</span>' +
          '</div>' +
          formatOrderLocationBadgeHTML(rawLoc) +
        '</div>' +

        '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">' +
          '<button type="button" onclick="openOrderPickupManifestModal(\'' + task.order_id + '\')" class="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl font-black border border-rose-300 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-boxes-packing text-rose-600"></i> យកអីវ៉ាន់' +
          '</button>' +

          (cleanPhone ? 
          '<a href="tel:' + cleanPhone + '" class="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl font-bold border border-blue-200 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
            '<i class="fas fa-phone text-blue-600"></i> ខល' +
          '</a>' : '') +

          (cleanPhone ? 
          '<a href="' + tgChatLink + '" target="_blank" class="py-2 px-2 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-xl font-bold border border-sky-300 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition" style="text-decoration:none;">' +
            '<i class="fab fa-telegram text-sky-600"></i> Telegram' +
          '</a>' : '') +

          (rawLoc ? 
          '<button type="button" onclick="openOrderMap(\'' + rawLoc.replace(/'/g, "\\'") + '\')" class="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold border border-blue-200 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-map-location-dot text-blue-600"></i> ផែនទី' +
          '</button>' : '') +

          (task.photo_url ? 
          '<button type="button" onclick="viewOrderHousePhotoById(\'' + task.order_id + '\')" class="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold border border-amber-300 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition">' +
            '<i class="fas fa-camera text-amber-600"></i> រូបផ្ទះ' +
          '</button>' : '') +
        '</div>' +

        departActionHtml +

        '<button type="button" onclick="completeOnlineOrder(\'' + task.order_id + '\', \'' + safeName + '\', ' + (task.total || 0) + ', \'' + (task.items || '').replace(/'/g, "\\'") + '\', \'' + driverName.replace(/'/g, "\\'") + '\', \'' + (task.payment_method || 'COD').replace(/'/g, "\\'") + '\')" class="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition">' +
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

  // 🖥️ ប្រើ w-full max-w-[1600px] ដើម្បីឱ្យពេញអេក្រង់កុំព្យូទ័រស្មើស្អាត
  area.innerHTML = '<div class="w-full max-w-[1600px] mx-auto space-y-3.5 px-1 sm:px-2">' +
    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3.5 sm:p-4 rounded-3xl border shadow-sm gap-2">' +
      '<div>' +
        '<h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">' +
          '<i class="fas fa-globe text-emerald-600"></i>' +
          '<span>មជ្ឈមណ្ឌលគ្រប់គ្រង ONLINE (Online Hub)</span>' +
        '</h2>' +
        '<p class="text-[11px] text-slate-500 mt-0.5">តាមដានការកុម្ម៉ង់, ប្រវត្តិលក់, ដោះស្រាយវិវាទ និងទំនិញលើ Web</p>' +
      '</div>' +
      '<div class="flex items-center gap-2 self-end sm:self-auto">' +
        '<a href="https://kcwater-live.vercel.app" target="_blank" class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black border border-emerald-300 shadow-2xs flex items-center gap-1.5 active:scale-95 transition" style="text-decoration:none;">' +
          '<i class="fas fa-arrow-up-right-from-square text-xs"></i> 🌐 បើកមើល Web ភ្ញៀវ' +
        '</a>' +
        '<button onclick="renderOnlineHubModule()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition flex items-center gap-1">' +
          '<i class="fas fa-sync-alt"></i> Refresh' +
        '</button>' +
      '</div>' +
    '</div>' +

    // ២. របារប្តូរផ្ទាំង ៣ Tabs (Orders / Audit / Products)
    '<div class="flex bg-white p-1 rounded-2xl border shadow-xs gap-1.5 text-xs font-bold">' +
      '<button id="hubTabBtn_ORDERS" onclick="switchOnlineHubTab(\'ORDERS\')" class="flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 bg-emerald-700 text-white shadow">' +
        '<i class="fas fa-truck-fast"></i> ១. បញ្ជីកុម្ម៉ង់បច្ចុប្បន្ន' +
      '</button>' +
      '<button id="hubTabBtn_AUDIT" onclick="switchOnlineHubTab(\'AUDIT\')" class="flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200">' +
        '<i class="fas fa-receipt"></i> ២. ប្រវត្តិលក់ & ដោះស្រាយវិវាទ' +
      '</button>' +
      '<button id="hubTabBtn_PRODUCTS" onclick="switchOnlineHubTab(\'PRODUCTS\')" class="flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200">' +
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

// ==========================================
// 🔄 មុខងារប្តូរផ្ទាំង Tabs ក្នុង Online Hub (Orders / Audit / Products)
// ==========================================
function switchOnlineHubTab(tab) {
  activeOnlineHubTab = tab;

  // Reset ពណ៌ប៊ូតុង Tabs
  ['ORDERS', 'AUDIT', 'PRODUCTS'].forEach(function(t) {
    var btn = document.getElementById('hubTabBtn_' + t);
    var content = document.getElementById('hubTabContent_' + t);
    if (btn && content) {
      if (t === tab) {
        btn.className = "flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 bg-emerald-700 text-white shadow font-bold text-xs";
        content.classList.remove('hidden');
      } else {
        btn.className = "flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs";
        content.classList.add('hidden');
      }
    }
  });

  if (tab === 'ORDERS') loadOnlineHubOrdersTab();
  else if (tab === 'AUDIT') loadOnlineHubAuditTab();
  else if (tab === 'PRODUCTS') loadOnlineHubProductsTab();
}

// 🌐 TAB ៣៖ ទំនិញកំពុងបង្ហាញលើ WEB (ពង្រីក ៥-៦ ជួរលើ PC ធំ)
async function loadOnlineHubProductsTab() {
  var area = document.getElementById('hubTabContent_PRODUCTS');
  if (!area) return;

  var onlineProds = (allProducts || []).filter(function(p) {
    var ch = String(p.channel || 'ALL').toUpperCase();
    return ch === 'ALL' || ch === 'ONLINE';
  });

  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  var html = '<div class="card border-t-4 border-emerald-600 shadow-xl p-4 sm:p-5 mb-0 space-y-3 bg-white">' +
    '<div class="flex justify-between items-center">' +
      '<h3 class="font-black text-slate-900 text-xs sm:text-base flex items-center gap-2">' +
        '<i class="fas fa-boxes-stacked text-emerald-600"></i>ទំនិញកំពុងដាក់លក់លើ Web តាមផ្ទះ (' + onlineProds.length + ' មុខ)' +
      '</h3>' +
      '<button type="button" onclick="loadModule(\'Stock\')" class="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">' +
        '<i class="fas fa-pen-to-square"></i> កែប្រែក្នុងស្តុក ➔' +
      '</button>' +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 pt-1">';

  onlineProds.forEach(function(p) {
    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var rawCurr = (p.currency || 'KHR').toUpperCase();
    var onlinePrice = parseFloat(p.online_price || p.price || 0);

    var khrVal = 0, thbVal = 0, usdVal = 0;
    if (rawCurr === 'USD') {
      khrVal = Math.round(onlinePrice * rateUSD);
      usdVal = onlinePrice;
      thbVal = Math.round(khrVal / rateTHB);
    } else if (rawCurr === 'THB') {
      khrVal = Math.round(onlinePrice * rateTHB);
      thbVal = onlinePrice;
      usdVal = parseFloat((khrVal / rateUSD).toFixed(2));
    } else {
      khrVal = Math.round(onlinePrice);
      thbVal = Math.round(onlinePrice / rateTHB);
      usdVal = parseFloat((onlinePrice / rateUSD).toFixed(2));
    }

    var khrText = '៛ ' + Number(khrVal).toLocaleString();
    var thbText = '฿ ' + Number(thbVal).toLocaleString();
    var usdText = '$ ' + Number(usdVal).toFixed(2);

    var priceDisplay = '<div class="space-y-0.5 text-center my-1 leading-tight">' +
      '<div class="text-xs font-black text-emerald-700 leading-tight">' + khrText + '</div>' +
      '<div class="text-[10px] font-black text-amber-700 leading-tight">' + thbText + '</div>' +
      '<div class="text-[10px] font-black text-blue-700 leading-tight">' + usdText + '</div>' +
    '</div>';

    var isOutOfStock = (p.type === 'ទិញគេ' && parseFloat(p.stock || 0) <= 0);

    html += '<div class="bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center space-y-1 relative shadow-2xs hover:shadow-md transition">' +
      (isOutOfStock ? '<span class="absolute top-2 left-2 bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-red-300">អស់ស្តុក</span>' : '') +
      '<div class="w-16 h-16 mx-auto flex items-center justify-center p-1"><img src="' + imgUrl + '" class="max-w-full max-h-full object-contain"></div>' +
      '<b class="text-xs text-slate-800 line-clamp-1 block">' + p.name + '</b>' +
      priceDisplay +
      '<span class="text-[10px] text-slate-400 font-bold block">' + (p.type === 'ផលិតឯង' ? 'ផលិតឯង' : ('សល់ ' + p.stock)) + '</span>' +
    '</div>';
  });

  html += '</div></div>';
    area.innerHTML = html;
}
// ==========================================
// 📦 TAB ១៖ បញ្ជីកុម្ម៉ង់បច្ចុប្បន្ន (ស្រង់មកវិញពេញលេញ)
// ==========================================
async function loadOnlineHubOrdersTab() {
  var area = document.getElementById('hubTabContent_ORDERS');
  if (!area) return;

  area.innerHTML = '<div class="card p-4 text-center text-slate-400 italic text-xs bg-white">' +
    '<i class="fas fa-spinner fa-spin mr-1 text-amber-600 text-base"></i> កំពុងទាញទិន្នន័យការកុម្ម៉ង់...' +
  '</div>';

  try {
    const { data: activeList, error: actErr } = await supabaseClient
      .from('orders')
      .select('*')
      .in('status', ['Pending', 'Assigned', 'Departed'])
      .order('created_at', { ascending: false });

    if (actErr) throw actErr;

    var list = activeList || [];

    if (list.length === 0) {
      area.innerHTML = '<div class="card p-8 border-t-4 border-emerald-500 shadow-md mb-0 text-center space-y-2 bg-white rounded-2xl">' +
        '<div class="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shadow-inner"><i class="fas fa-check"></i></div>' +
        '<b class="text-slate-800 text-sm block">បច្ចុប្បន្នគ្មានការកុម្ម៉ង់ដែលរង់ចាំដឹកជញ្ជូនឡើយ!</b>' +
        '<p class="text-xs text-slate-400">រាល់ពេលភ្ញៀវកុម្ម៉ង់លើ Web វានឹងលោតមកទីនេះភ្លាមៗ។</p>' +
      '</div>';
      return;
    }

    var html = '<div class="space-y-3">';
    list.forEach(function(o) {
      var isPending = (o.status === 'Pending');
      var isDeparted = (o.status === 'Departed');

      var statusBadge = isPending ? 
        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">⏳ រង់ចាំចាត់ចែង</span>' : 
        (isDeparted ? 
          '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 animate-pulse whitespace-nowrap">🛵💨 កំពុងធ្វើដំណើរ (' + (o.driver_name || 'អ្នកដឹក') + ')</span>' : 
          '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap">📦 បានចាត់ចែង (' + (o.driver_name || 'អ្នកដឹក') + ')</span>');

      var rawLoc = (o.location_url || o.address || '').trim();
      var dateStr = new Date(o.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });

      html += '<div class="card p-4 border-l-4 ' + (isPending ? 'border-amber-500' : 'border-blue-500') + ' shadow-md mb-0 space-y-2.5 hover:shadow-lg transition bg-white rounded-2xl">' +
        '<div class="flex justify-between items-start border-b pb-2">' +
          '<div>' +
            '<b class="text-sm font-black text-slate-900">' + o.customer_name + '</b>' +
            '<div class="text-[10px] text-slate-400 mt-0.5 font-mono">កូដ៖ <code>' + o.order_id + '</code> | ម៉ោង៖ ' + dateStr + '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<b class="text-emerald-700 text-sm font-black">៛ ' + Number(o.total || 0).toLocaleString() + '</b>' +
            '<div class="mt-0.5">' + statusBadge + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">' +
          '<div><b>📞 ទូរស័ព្ទ៖</b> <span class="text-emerald-700 font-bold">' + (o.phone || '-') + '</span></div>' +
          '<div>' +
            '<span class="text-slate-500 font-bold text-[11px] block mb-1">📦 មុខទំនិញកុម្ម៉ង់៖</span>' +
            (typeof formatOrderItemsVerticalListHTML === 'function' ? formatOrderItemsVerticalListHTML(o.items) : o.items) +
          '</div>' +
          (typeof formatOrderLocationBadgeHTML === 'function' ? formatOrderLocationBadgeHTML(rawLoc) : (rawLoc ? '<div><b>📍 ទីតាំង៖</b> ' + rawLoc + '</div>' : '')) +
        '</div>' +
        '<div class="flex justify-end pt-1">' +
          '<button type="button" onclick="openOnlineOrdersModal()" class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5">' +
            '<i class="fas fa-sliders text-[10px]"></i> បើកផ្ទាំងចាត់ចែងអ្នកដឹក' +
          '</button>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    area.innerHTML = html;

  } catch(e) {
    area.innerHTML = '<div class="card p-4 text-center text-red-500 font-bold text-xs bg-white">កំហុស៖ ' + e.message + '</div>';
  }
}

// ==========================================
// 🔍 TAB ២៖ ប្រវត្តិលក់ & ដោះស្រាយវិវាទ (មាន Dropdown កំណត់ជួរដេក ២០ ដល់ ១,០០០ ជួរ)
// ==========================================
var currentAuditRowLimit = 50;
var cachedAuditOrders = [];

async function loadOnlineHubAuditTab() {
  var area = document.getElementById('hubTabContent_AUDIT');
  if (!area) return;

  area.innerHTML = '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0 space-y-3">' +
    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">' +
      '<div>' +
        '<h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">' +
          '<i class="fas fa-receipt text-blue-600"></i>ប្រវត្តិលក់ Online & ផ្ទៀងផ្ទាត់វិក្កយបត្រ' +
        '</h3>' +
        '<p class="text-[10.5px] text-slate-500 font-bold mt-0.5">ស្វែងរកភស្តុតាង និងដោះស្រាយវិវាទ / Refund</p>' +
      '</div>' +
      '<span id="auditRowsCountBadge" class="text-[10px] text-blue-900 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full font-black">កំពុងទាញទិន្នន័យ...</span>' +
    '</div>' +

    // 🔍 ប្រអប់ Search រកតាមលេខទូរស័ព្ទ & 🔢 Dropdown កំណត់ចំនួនជួរដេក
    '<div class="flex flex-col sm:flex-row gap-2">' +
      '<div class="relative flex-1">' +
        '<input type="text" id="inpOnlineAuditSearch" oninput="onOnlineAuditSearch(this.value)" placeholder="🔍 វាយលេខទូរស័ព្ទភ្ញៀវ, ឈ្មោះ ឬកូដកុម្ម៉ង់ (ORD-...) ដើម្បីឆែកមើលភស្តុតាង..." class="w-full border-2 border-blue-200 focus:border-blue-600 rounded-2xl p-2.5 pl-9 font-bold text-xs outline-none bg-slate-50 focus:bg-white">' +
        '<i class="fas fa-search absolute left-3 top-3.5 text-slate-400 text-xs pointer-events-none"></i>' +
      '</div>' +
      '<div class="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-2xl border border-slate-200">' +
        '<label for="selAuditRowLimit" class="text-[10px] font-black text-slate-600 uppercase pl-1.5 whitespace-nowrap">' +
          '<i class="fas fa-list-ol text-blue-600 mr-1"></i>កំណត់ជួរដេក៖' +
        '</label>' +
        '<select id="selAuditRowLimit" onchange="changeAuditRowLimit(this.value)" class="text-xs font-black bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-blue-950 outline-none focus:border-blue-500 cursor-pointer shadow-2xs">' +
          '<option value="20"' + (currentAuditRowLimit === 20 ? ' selected' : '') + '>20 ជួរ</option>' +
          '<option value="50"' + (currentAuditRowLimit === 50 ? ' selected' : '') + '>50 ជួរ</option>' +
          '<option value="100"' + (currentAuditRowLimit === 100 ? ' selected' : '') + '>100 ជួរ</option>' +
          '<option value="200"' + (currentAuditRowLimit === 200 ? ' selected' : '') + '>200 ជួរ</option>' +
          '<option value="500"' + (currentAuditRowLimit === 500 ? ' selected' : '') + '>500 ជួរ</option>' +
          '<option value="1000"' + (currentAuditRowLimit === 1000 ? ' selected' : '') + '>1,000 ជួរ</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    '<div id="onlineAuditResultsArea" class="space-y-3 pt-1">' +
      '<div class="text-center py-8 text-slate-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1"></i> កំពុងទាញប្រវត្តិលក់ Online...</div>' +
    '</div>' +
  '</div>';

  fetchOnlineAuditOrders();
}

function changeAuditRowLimit(val) {
  currentAuditRowLimit = parseInt(val) || 50;
  fetchOnlineAuditOrders();
}

// 🔍 មុខងារទាញប្រវត្តិលក់ Online តាមចំនួនជួរដេកដែលបានកំណត់ (២០ ដល់ ១,០០០ ជួរ)
async function fetchOnlineAuditOrders() {
  var resArea = document.getElementById('onlineAuditResultsArea');
  var badge = document.getElementById('auditRowsCountBadge');
  if (!resArea) return;

  var limitVal = parseInt(currentAuditRowLimit) || 50;

  try {
    const { data: list, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limitVal);

    if (error) throw error;
    cachedAuditOrders = list || [];

    if (badge) {
      badge.innerText = 'បង្ហាញ ' + cachedAuditOrders.length + ' ជួរ (កំណត់ ' + limitVal + ')';
    }

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
// ⚠️ មុខងារដោះស្រាយវិវាទ៖ បង្វិលសងលុយ & កាត់ស្តុកត្រឡប់មកវិញ (ស្គាល់ទាំងសំបកធុង 🛢️ និងកាដូថែម 🎁)
async function refundAndVoidOnlineOrder(orderId, custName, total, itemsText) {
  var ok = await kcConfirm({
    title: "ដោះស្រាយវិវាទ (Refund / Void Order)",
    message: "តើអ្នកពិតជាចង់បោះបង់ ឬបង្វិលសងប្រាក់ចំនួន ៛ " + Number(total).toLocaleString() + " ទៅកាន់ភ្ញៀវ [" + custName + "] វិញមែនទេ? ស្តុកទំនិញ (រួមទាំងសំបកធុង និងកាដូថែម) នឹងត្រូវបង្វិលសងចូលឃ្លាំងវិញដោយស្វ័យប្រវត្តិ។",
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

    // ធានាថាមានបញ្ជីទំនិញស្រស់ៗពី Database
    if (!allProducts || allProducts.length === 0) {
      const { data: pList } = await supabaseClient.from('products').select('*');
      if (pList) allProducts = pList;
    }

    // ២. បង្វិលស្តុកទំនិញសងចូលឃ្លាំងវិញ (ស្គាល់ទាំងទំនិញទូទៅ សំបកធុង 🛢️ និងកាដូថែម 🎁)
    try {
      var itemParts = String(itemsText).split(',');
      for (var i = 0; i < itemParts.length; i++) {
        var seg = itemParts[i].split('x');
        if (seg.length >= 2) {
          var rawName = seg[0].trim();
          var pQty = parseFloat(seg[1].trim() || 0);

          // 🧹 ជម្រះ Emoji និងស្លាក Free ដើម្បីស្វែងរកឈ្មោះទំនិញពិតប្រាកដក្នុងស្តុក
          var cleanName = rawName
            .replace(/🎁\s*\[Free\]/gi, '')
            .replace(/\[Free\]/gi, '')
            .replace(/\[កាដូថែម Free\]/gi, '')
            .replace(/🛢️/gi, '')
            .trim();

          var prodObj = allProducts.find(p => p.name.trim().toLowerCase() === cleanName.toLowerCase());
          if (prodObj && prodObj.type === 'ទិញគេ' && pQty > 0) {
            var restoredStock = parseFloat(prodObj.stock || 0) + pQty;
            await supabaseClient.from('products').update({ stock: restoredStock }).eq('id', prodObj.id);
            prodObj.stock = restoredStock; // ធ្វើបច្ចុប្បន្នភាពក្នុង Memory ភ្លាមៗ
          }
        }
      }
    } catch(stkErr) {
      console.warn("Restoring stock error on refund:", stkErr);
    }

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

    // 🎉 ប្រើ kcAlert ជូនដំណឹងជោគជ័យ
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "សងប្រាក់ជោគជ័យ! 🎉",
        message: "បានបោះបង់ការកុម្ម៉ង់ [" + orderId + "] និងបង្វិលស្តុកទំនិញ/សំបកធុងសងចូលឃ្លាំងវិញជោគជ័យ!",
        type: "success"
      });
    } else {
      showToast("បានបោះបង់ការកុម្ម៉ង់ និងកត់ត្រាសងប្រាក់ជូនភ្ញៀវជោគជ័យ!", "success");
    }

    // ៤. ផ្ញើ Telegram Alert ទៅថៅកែភ្លាមៗ
    try {
      var tgMsg = "⚠️ <b>[KC WATER - ដោះស្រាយវិវាទ & សងប្រាក់ភ្ញៀវ (Refund Online)]</b>\n\n" +
                  "🆔 <b>កូដកុម្ម៉ង់៖</b> <code>" + orderId + "</code>\n" +
                  "👤 <b>អតិថិជន៖</b> " + custName + "\n" +
                  "📦 <b>ទំនិញបង្វិលចូលស្តុកវិញ៖</b> " + itemsText + "\n" +
                  "💰 <b>ទឹកប្រាក់សងវិញ៖</b> <b>-៛ " + Number(total).toLocaleString() + "</b>\n" +
                  "✍️ <b>អ្នកដោះស្រាយ៖</b> " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(tgE) {}

    await fetchInitialPOSData();
    fetchOnlineAuditOrders();

  } catch(err) {
    if (typeof kcAlert === 'function') {
      await kcAlert({ title: "កំហុស", message: err.message, type: "danger" });
    } else {
      showToast("កំហុសដោះស្រាយវិវាទ៖ " + err.message, "error");
    }
  }
}


// ==========================================================================
// 📦 ៣. ផ្ទាំងប័ណ្ណដេប៉ូ (Pick-up Route) + ប៊ូតុង Telegram ទី ១ (ផ្ញើឱ្យដេប៉ូត្រៀមទុកមុន)
// ==========================================================================
async function openOrderPickupManifestModal(orderId) {
  if (!orderId) return;

  var existing = document.getElementById('orderPickupManifestModal');
  if (existing) existing.remove();

  var isAdmin = (currentUser && currentUser.role === 'Admin');

  var modalHtml = '<div id="orderPickupManifestModal" class="fixed inset-0 z-[8000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">' +
    '<div class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onclick="closeOrderPickupManifestModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-md p-4 sm:p-5 space-y-3 text-center relative border border-slate-100 animate-in zoom-in-95 duration-200 my-auto max-h-[92dvh] flex flex-col">' +
      '<div class="flex justify-between items-center border-b pb-2">' +
        '<div class="text-left">' +
          '<h3 class="font-black text-slate-900 text-xs sm:text-base flex items-center gap-1.5">' +
            '<i class="fas fa-boxes-packing text-rose-600"></i> បញ្ជីទីតាំងទៅយកអីវ៉ាន់ (Pick-up Route)' +
          '</h3>' +
          '<p class="text-[10px] text-slate-500 font-mono mt-0.5" id="pmOrderCodeLabel">កូដកុម្ម៉ង់៖ ' + orderId + '</p>' +
        '</div>' +
        '<button type="button" onclick="closeOrderPickupManifestModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 text-lg font-bold flex items-center justify-center">&times;</button>' +
      '</div>' +

      // 💵 ទឹកប្រាក់ត្រូវប្រមូលពីភ្ញៀវពេលដឹកដល់ (ធំៗច្បាស់ៗសម្រាប់អ្នកដឹក)
      '<div id="pmCustomerCollectionBox" class="p-2.5 sm:p-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl shadow-sm text-left flex justify-between items-center">' +
        '<div>' +
          '<span class="text-[10px] uppercase font-bold text-emerald-200 block">💵 ទឹកប្រាក់ត្រូវប្រមូលពីភ្ញៀវពេលដឹកដល់</span>' +
          '<b id="pmCustomerAmountText" class="text-base sm:text-xl font-black text-white">កំពុងគណនា...</b>' +
        '</div>' +
        '<span id="pmCustomerPayMethodBadge" class="px-2.5 py-1 bg-white/20 text-white border border-white/30 rounded-xl font-black text-xs"></span>' +
      '</div>' +

      '<div id="pickupManifestContentArea" class="flex-1 overflow-y-auto space-y-2.5 text-left text-xs pr-1">' +
        '<div class="text-center py-6 text-slate-400 italic text-xs"><i class="fas fa-spinner fa-spin mr-1 text-rose-600"></i> កំពុងរៀបចំផ្លូវទៅយកអីវ៉ាន់...</div>' +
      '</div>' +

      '<div id="pickupManifestSummaryFooter" class="pt-1.5 border-t text-left ' + (isAdmin ? '' : 'hidden') + '"></div>' +

      '<button type="button" onclick="closeOrderPickupManifestModal()" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition">' +
        'រួចរាល់ (បិទ)' +
      '</button>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  try {
    const { data: order, error: ordErr } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (ordErr || !order) throw new Error("រកមិនឃើញទិន្នន័យនៃការកុម្ម៉ង់នេះឡើយ");

    var custAmtEl = document.getElementById('pmCustomerAmountText');
    var custPayBadge = document.getElementById('pmCustomerPayMethodBadge');
    if (custAmtEl) custAmtEl.innerText = '៛ ' + Number(order.total || 0).toLocaleString();
    if (custPayBadge) custPayBadge.innerText = order.payment_method || 'COD (លុយសុទ្ធ)';

    if (typeof loadDepotsFromSupabase === 'function') {
      await loadDepotsFromSupabase();
    }
    const { data: depotSettings } = await supabaseClient
      .from('settings')
      .select('key, value')
      .like('key', 'DEPOT_%');

    var prodDepotMap = {};
    (depotSettings || []).forEach(function(r) {
      var pId = r.key.replace('DEPOT_', '');
      prodDepotMap[pId] = r.value;
    });

    if (!allProducts || allProducts.length === 0) {
      const { data: prods } = await supabaseClient.from('products').select('*');
      if (prods) allProducts = prods;
    }

    var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
    var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

    var depotGroups = {};
    var totalCashToPayDepots = 0;
    var totalCreditWithDepots = 0;

    var rawItemsText = order.items || '';
    var itemParts = rawItemsText.split(',');

    itemParts.forEach(function(partStr) {
      var str = partStr.trim();
      if (!str) return;

      var seg = str.split('x');
      var rawName = seg[0] ? seg[0].trim() : str;
      var qty = (seg.length >= 2) ? parseFloat(seg[1].trim() || 1) : 1;
      if (isNaN(qty) || qty <= 0) qty = 1;

      var cleanName = rawName.replace(/🎁\s*\[Free\]/gi, '').replace(/\[Free\]/gi, '').trim();

      var matchedProd = (allProducts || []).find(function(p) {
        return p.name.trim().toLowerCase() === cleanName.toLowerCase();
      });

      var depotId = 'DEPOT_KC';
      if (matchedProd && matchedProd.id && prodDepotMap[matchedProd.id]) {
        depotId = prodDepotMap[matchedProd.id];
      }

      var depotObj = (activePartnerDepots || []).find(d => d.id === depotId) || {
        id: depotId,
        name: (depotId === 'DEPOT_KC' ? 'រោងចក្រទឹក KC WATER (ឃ្លាំងផ្ទាល់)' : 'ដេប៉ូដៃគូ'),
        phone: '077 934 748',
        location: '',
        mapUrl: '',
        payTerms: 'CASH',
        isInternal: (depotId === 'DEPOT_KC')
      };

      var rawCost = matchedProd ? parseFloat(matchedProd.cost || 0) : 0;
      var costCurr = matchedProd ? (matchedProd.currency || 'KHR').toUpperCase() : 'KHR';
      var costKhr = rawCost;
      if (costCurr === 'USD') costKhr = Math.round(rawCost * rateUSD);
      else if (costCurr === 'THB') costKhr = Math.round(rawCost * rateTHB);

      var lineTotalCost = costKhr * qty;

      if (!depotGroups[depotId]) {
        depotGroups[depotId] = {
          depot: depotObj,
          items: [],
          totalCost: 0
        };
      }

      depotGroups[depotId].items.push({
        name: cleanName,
        qty: qty,
        unitCostKhr: costKhr,
        totalCostKhr: lineTotalCost,
        isFreeGift: rawName.includes('Free') || rawName.includes('🎁')
      });
      depotGroups[depotId].totalCost += lineTotalCost;

      if (!depotObj.isInternal) {
        if (depotObj.payTerms === 'CASH') {
          totalCashToPayDepots += lineTotalCost;
        } else {
          totalCreditWithDepots += lineTotalCost;
        }
      }
    });

    window.__currentManifestDepotGroups = depotGroups;

    var contentArea = document.getElementById('pickupManifestContentArea');
    var footerArea = document.getElementById('pickupManifestSummaryFooter');
    if (!contentArea) return;

    var html = '';
    var groupKeys = Object.keys(depotGroups);

    if (groupKeys.length === 0) {
      contentArea.innerHTML = '<div class="text-center py-6 text-slate-400 italic">មិនមានទំនិញក្នុង Order នេះឡើយ</div>';
      return;
    }

    var stepIndex = 1;
    groupKeys.forEach(function(dId) {
      var grp = depotGroups[dId];
      var d = grp.depot;
      var isInternal = (d.isInternal === true || d.id === 'DEPOT_KC');
      var cleanPhone = String(d.phone || '').replace(/[^0-9]/g, '');

      var payTermsBadge = '';
      if (isAdmin) {
        payTermsBadge = isInternal ? 
          '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200">💧 លើកពីរោងចក្រ</span>' : 
          (d.payTerms === 'CASH' ? 
            '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">💵 សុទ្ធ ៛ ' + grp.totalCost.toLocaleString() + '</span>' : 
            '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">📝 ជំពាក់ ៛ ' + grp.totalCost.toLocaleString() + '</span>');
      } else {
        payTermsBadge = isInternal ? 
          '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200">💧 រោងចក្រ KC</span>' : 
          '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-900 border border-rose-300">🏬 ដេប៉ូដៃគូ (កត់ជំពាក់)</span>';
      }

      var itemsListHtml = '';
      grp.items.forEach(function(itm) {
        var costDisplay = (isAdmin && !isInternal && itm.totalCostKhr > 0) ? 
          ('<span class="text-[10px] text-slate-400 block font-normal">ដើម: ៛ ' + itm.totalCostKhr.toLocaleString() + '</span>') : '';

        // 🖼️ ស្វែងរករូបភាពទំនិញ
        var matchedItmProd = (allProducts || []).find(p => p.name.trim().toLowerCase() === itm.name.toLowerCase());
        var itmImg = (matchedItmProd && matchedItmProd.img) ? matchedItmProd.img : 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png';

        itemsListHtml += '<div class="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-none">' +
          '<div class="flex items-center gap-2 min-w-0 flex-1">' +
            '<div class="w-7 h-7 rounded-lg bg-slate-50 border p-0.5 flex items-center justify-center shrink-0 overflow-hidden">' +
              '<img src="' + itmImg + '" class="max-w-full max-h-full object-contain">' +
            '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<b class="text-slate-800 truncate block">' + itm.name + '</b>' +
              (itm.isFreeGift ? '<span class="text-[9px] font-black bg-amber-100 text-amber-900 px-1 rounded">Free</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="text-right shrink-0 pl-2">' +
            '<b class="text-blue-700 font-mono text-sm font-black bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">x ' + itm.qty + '</b>' +
            costDisplay +
          '</div>' +
        '</div>';
      });

      // 💬 ប៊ូតុង Telegram ទី ១ (ផ្ញើឱ្យដេប៉ូត្រៀមទុកមុន)
      var advanceOrderTgBtn = (!isInternal && cleanPhone) ? 
        ('<button type="button" onclick="sendDepotAdvanceOrderTelegram(\'' + dId + '\', \'' + order.order_id + '\')" class="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-lg font-bold text-[10px] flex items-center gap-1 active:scale-95 transition" title="ផ្ញើទៅ Telegram ដេប៉ូឱ្យត្រៀមអីវ៉ាន់ទុកមុន">' +
          '<i class="fab fa-telegram text-sky-600"></i> ផ្ញើឱ្យត្រៀមទុក' +
        '</button>') : '';

      html += '<div class="p-3 bg-slate-50 rounded-2xl border-2 ' + (isInternal ? 'border-blue-200 bg-blue-50/20' : 'border-rose-200 bg-rose-50/20') + ' space-y-2">' +
        '<div class="flex justify-between items-start gap-1">' +
          '<div class="flex items-center gap-2 min-w-0 flex-1">' +
            '<div class="w-6 h-6 rounded-lg ' + (isInternal ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white') + ' flex items-center justify-center font-black text-xs shrink-0">' +
              stepIndex +
            '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<b class="text-slate-900 block truncate text-xs">' + d.name + '</b>' +
              (d.phone ? '<span class="text-[10px] text-emerald-800 font-bold font-mono">📞 ' + d.phone + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="shrink-0">' + payTermsBadge + '</div>' +
        '</div>' +

        (d.location ? '<div class="text-[10.5px] text-slate-600 font-medium truncate"><i class="fas fa-location-dot text-rose-500 mr-1"></i>' + d.location + '</div>' : '') +

        '<div class="bg-white p-2 rounded-xl border border-slate-200 space-y-0.5">' +
          itemsListHtml +
        '</div>' +

        (!isInternal ? 
        ('<div class="flex items-center justify-end gap-1.5 pt-0.5">' +
          advanceOrderTgBtn +
          (cleanPhone ? '<a href="tel:' + cleanPhone + '" class="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-lg font-bold text-[10px] flex items-center gap-1 active:scale-95 transition" style="text-decoration:none;"><i class="fas fa-phone text-green-600"></i> ខលដេប៉ូ</a>' : '') +
          (d.mapUrl ? '<a href="' + d.mapUrl + '" target="_blank" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-bold text-[10px] flex items-center gap-1 active:scale-95 transition" style="text-decoration:none;"><i class="fas fa-map-location-dot text-blue-600"></i> ផែនទី</a>' : '') +
        '</div>') : '') +
      '</div>';

      stepIndex++;
    });

    contentArea.innerHTML = html;

    if (isAdmin && footerArea) {
      footerArea.innerHTML = '<div class="p-2.5 bg-slate-100 rounded-2xl border border-slate-200 space-y-1 text-xs font-bold">' +
        (totalCashToPayDepots > 0 ? 
        '<div class="flex justify-between text-rose-900"><span>💵 លុយសុទ្ធត្រូវបើកអីវ៉ាន់៖</span><b class="font-black text-rose-700">៛ ' + totalCashToPayDepots.toLocaleString() + '</b></div>' : '') +
        (totalCreditWithDepots > 0 ? 
        '<div class="flex justify-between text-amber-900"><span>📝 កត់ជំពាក់ដេប៉ូដៃគូសរុប៖</span><b class="font-black text-amber-700">៛ ' + totalCreditWithDepots.toLocaleString() + '</b></div>' : '') +
      '</div>';
    }

  } catch(err) {
    var contentArea = document.getElementById('pickupManifestContentArea');
    if (contentArea) {
      contentArea.innerHTML = '<div class="p-4 text-center text-red-500 font-bold text-xs">កំហុសទាញទិន្នន័យ៖ ' + err.message + '</div>';
    }
  }
}

function closeOrderPickupManifestModal() {
  var modal = document.getElementById('orderPickupManifestModal');
  if (modal) modal.remove();
}
