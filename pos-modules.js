/** ==========================================================================
 *  KC WATER POS SYSTEM - COMPLETE MODULES ENGINE (pos-modules.js)
 *  (Stock, Bottle Loans, Expenses, Customers & Prices, Settings,
 *   Full Customer Portal, History, Bottles & Payment Request)
 *  ========================================================================== */

var editingProductId = null;
var custPortalDataCache = null;
var currentCustPayMode = "ABA";

// ==========================================
// 📦 ១. គ្រប់គ្រងស្តុក (STOCK MANAGEMENT & RESTOCK)
// ==========================================
function renderStockModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;
  var aid = "P-" + Math.floor(Math.random() * 9000 + 1000);
  editingProductId = null;

  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-green-700 shadow-xl">' +
      '<div class="flex justify-between items-center mb-4 border-b pb-2">' +
        '<h2 id="prodFormTitle" class="font-extrabold text-green-900 text-base sm:text-lg flex items-center gap-2">' +
          '<i class="fas fa-boxes-stacked text-green-600"></i>គ្រប់គ្រងទំនិញ (Products)' +
        '</h2>' +
        '<button type="button" id="btnCancelEditProd" onclick="cancelEditProduct()" class="text-xs font-bold text-gray-500 hover:text-red-600 hidden">' +
          '<i class="fas fa-times mr-1"></i>បោះបង់ការកែប្រែ' +
        '</button>' +
      '</div>' +
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input type="text" id="pI" value="' + aid + '" readonly class="bg-gray-100 font-bold text-blue-600 text-xs border p-2.5 rounded-xl">' +
          '<input type="text" id="pN" placeholder="*ឈ្មោះទំនិញ (ឧ៖ ទឹកធុង ២០L)" class="font-bold border p-2.5 rounded-xl text-xs">' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<select id="pTy" onchange="tCF()" class="border p-2.5 rounded-xl font-bold text-xs bg-white">' +
            '<option value="ផលិតឯង">ផលិតខ្លួនឯង (ទឹកធុង)</option>' +
            '<option value="ទិញគេ">ទិញគេមកលក់បន្ត (ទឹកយួរ/បរិក្ខារ)</option>' +
          '</select>' +
          '<select id="pCu" class="border p-2.5 rounded-xl font-bold text-xs bg-white">' +
            '<option value="KHR">KHR (៛)</option>' +
            '<option value="THB">THB (฿)</option>' +
            '<option value="USD">USD ($)</option>' +
          '</select>' +
        '</div>' +
        '<div id="cSec" style="display:none">' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ថ្លៃដើមទិញចូល (Cost)</label>' +
          '<input type="number" id="pCo" placeholder="ថ្លៃដើម (ឧ៖ ៤,០០០)" class="border p-2.5 rounded-xl font-bold w-full text-xs">' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">' +
          '<div>' +
            '<label class="text-[10px] font-extrabold text-amber-900 uppercase block mb-1">🚚 តម្លៃបោះដុំដេប៉ូ (POS) *</label>' +
            '<input type="number" id="pPr" placeholder="ឧ៖ ៦០០" class="font-black text-amber-900 bg-white border border-amber-300 rounded-xl p-2.5 w-full outline-none text-sm">' +
          '</div>' +
          '<div>' +
            '<label class="text-[10px] font-extrabold text-emerald-900 uppercase block mb-1">🌐 តម្លៃលក់លើ Web តាមផ្ទះ *</label>' +
            '<input type="number" id="pOnlinePr" placeholder="ឧ៖ ១៥០០" class="font-black text-emerald-800 bg-white border border-emerald-300 rounded-xl p-2.5 w-full outline-none text-sm">' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">កម្រិតដំណឹងស្តុកទាប</label>' +
            '<input type="number" id="pMin" placeholder="ឧ៖ 5" value="5" class="border p-2.5 rounded-xl font-bold w-full text-xs text-center">' +
          '</div>' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ប៉ុស្តិ៍លក់ (Channel)</label>' +
            '<select id="pChannel" class="border p-2.5 rounded-xl font-bold w-full text-xs bg-white">' +
              '<option value="ALL">🔄 លក់ទាំងសងខាង (POS + Web)</option>' +
              '<option value="ONLINE">🌐 លក់តែលើ Web</option>' +
              '<option value="POS">🚚 លក់តែលើ POS ដេប៉ូ</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="p-3 bg-gray-50 border-2 border-dashed border-green-300 rounded-2xl text-center space-y-2">' +
          '<div class="w-20 h-20 mx-auto rounded-xl bg-white border flex items-center justify-center overflow-hidden shadow-inner">' +
            '<img id="pImgPreview" src="https://cdn-icons-png.flaticon.com/512/3100/3100566.png" class="max-w-full max-h-full object-contain">' +
          '</div>' +
          '<div>' +
            '<label class="cursor-pointer px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center gap-1.5 active:scale-95 transition">' +
              '<i class="fas fa-camera"></i> 📷 ជ្រើសរើសរូបភាព / ថតរូប' +
              '<input type="file" id="pImgFileInput" accept="image/*" onchange="previewProductImageFile(this)" class="hidden">' +
            '</label>' +
            '<input type="hidden" id="pImgBase64" value="">' +
            '<p id="pImgNote" class="text-[10px] text-gray-400 mt-1">អាចថតរូប ឬជ្រើសរូបភាពពីទូរស័ព្ទ</p>' +
          '</div>' +
        '</div>' +
        '<button onclick="saveProductToSupabase()" id="btnSaveProdAction" class="btn-green py-3 text-sm font-bold shadow-md">' +
          'រក្សាទុកទំនិញ (Save Product)' +
        '</button>' +
      '</div>' +
    '</div>' +

    '<div class="card border-t-4 border-blue-500 shadow-lg">' +
      '<h3 class="font-bold text-blue-900 mb-3 text-sm flex items-center gap-1.5"><i class="fas fa-plus-square text-blue-600"></i>បញ្ចូលស្តុកថ្មី (Restock In)</h3>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ជ្រើសរើសទំនិញទិញចូល</label>' +
          '<select id="si_prod" onchange="onStockInProductSelected()" class="text-xs font-bold border p-2.5 rounded-xl w-full bg-white"><option value="">-- រើសទំនិញ --</option></select>' +
        '</div>' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ចំនួនទិញចូលបន្ថែម (*)</label>' +
          '<input type="number" id="si_qty" placeholder="ឧ៖ 50" class="border p-2.5 rounded-xl font-bold text-center w-full text-sm">' +
        '</div>' +
      '</div>' +
      '<div class="mt-2.5">' +
        '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ថ្លៃដើមទិញចូលលើកនេះ (បើតម្លៃប្រែប្រួល)</label>' +
        '<input type="number" id="si_cost" placeholder="ថ្លៃដើមថ្មី" class="border p-2.5 rounded-xl font-bold w-full text-xs bg-white">' +
        '<p id="si_cost_hint" class="text-[10px] text-blue-600 font-bold mt-1"></p>' +
      '</div>' +
      '<button onclick="saveStockInToSupabase()" id="btnSaveStockInAction" class="btn-green bg-blue-600 hover:bg-blue-700 mt-3 font-bold py-3 text-xs">យល់ព្រមបញ្ចូលស្តុក</button>' +
    '</div>' +

    '<div class="card p-0 overflow-x-auto shadow-lg rounded-2xl border">' +
      '<table class="w-full text-left text-xs border-collapse">' +
        '<thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-3">រូប</th><th class="p-3">ឈ្មោះទំនិញ</th><th class="p-3 text-center">ប៉ុស្តិ៍លក់</th><th class="p-3 text-center">តម្លៃដេប៉ូ / Web</th><th class="p-3 text-center">ស្តុក</th><th class="p-3 text-center">សកម្មភាព</th></tr></thead>' +
        '<tbody id="stockModuleTableBody"></tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  tCF();
  initStockModuleDropdowns();
  renderStockTableRows();
}

function tCF() {
  var pTy = document.getElementById('pTy');
  var c = document.getElementById('cSec');
  if (pTy && c) c.style.display = (pTy.value === 'ផលិតឯង' ? 'none' : 'block');
}

function initStockModuleDropdowns() {
  var siSel = document.getElementById('si_prod');
  if (!siSel) return;
  siSel.innerHTML = '<option value="">-- រើសទំនិញ --</option>';
  allProducts.forEach(function(p) {
    if (p.type === 'ទិញគេ') siSel.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
  });
}

function onStockInProductSelected() {
  var id = document.getElementById('si_prod') ? document.getElementById('si_prod').value : '';
  var costInp = document.getElementById('si_cost');
  var hint = document.getElementById('si_cost_hint');
  if (!id || !costInp) return;

  var prod = allProducts.find(p => p.id === id);
  if (prod) {
    costInp.value = prod.cost || '';
    if (hint) hint.innerText = '*ថ្លៃដើមបច្ចុប្បន្ន៖ ' + Number(prod.cost || 0).toLocaleString() + ' ៛ (អាចកែប្រែបានបើតម្លៃឡើង/ចុះ)';
  }
}

function previewProductImageFile(input) {
  if (input.files && input.files[0]) {
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxDim = 400;
        var w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
        } else {
          if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var base64 = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('pImgPreview').src = base64;
        document.getElementById('pImgBase64').value = base64;
        document.getElementById('pImgNote').innerHTML = '<span class="text-green-600 font-bold">✔️ រូបភាពបានរួចរាល់</span>';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function renderStockTableRows() {
  var tbody = document.getElementById('stockModuleTableBody');
  if (!tbody) return;
  var html = '';

  allProducts.forEach(function(p) {
    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var prWholesale = Number(p.price || 0).toLocaleString() + ' ៛';
    var prOnline = Number(p.online_price || p.price || 0).toLocaleString() + ' ៛';
    var ch = String(p.channel || 'ALL').toUpperCase();
    var chBadge = (ch === 'ONLINE') ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300">🌐 Web</span>' :
                  (ch === 'POS') ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">🚚 ដេប៉ូ</span>' :
                  '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">🔄 ទាំងពីរ</span>';

    var stockDisplay = (p.type === 'ផលិតឯង') ? '<span class="text-blue-700 font-bold text-xs">-</span>' : 
      ('<span class="font-black ' + (parseFloat(p.stock || 0) <= parseFloat(p.min_stock || 5) ? 'text-red-600' : 'text-blue-800') + '">' + p.stock + '</span>');

    html += '<tr class="border-b hover:bg-gray-50">' +
      '<td class="p-2.5"><img src="' + imgUrl + '" class="w-9 h-9 object-contain rounded border"></td>' +
      '<td class="p-2.5 font-bold text-gray-800">' + p.name + '<br><span class="text-[9px] text-gray-400 font-normal">' + p.type + '</span></td>' +
      '<td class="p-2.5 text-center">' + chBadge + '</td>' +
      '<td class="p-2.5 text-center text-[10px]">🚚 ' + prWholesale + '<br><span class="text-emerald-700 font-bold">🌐 ' + prOnline + '</span></td>' +
      '<td class="p-2.5 text-center">' + stockDisplay + '</td>' +
      '<td class="p-2.5 text-center"><div class="flex items-center justify-center gap-2">' +
        '<button onclick="prepareEditProduct(\'' + p.id + '\')" class="text-blue-600 hover:text-blue-800 p-1" title="កែប្រែ"><i class="fas fa-edit text-xs"></i></button>' +
        '<button onclick="delProductFromSupabase(\'' + p.id + '\')" class="text-red-500 hover:text-red-700 p-1" title="លុប"><i class="fas fa-trash-can text-xs"></i></button>' +
      '</div></td>' +
    '</tr>';
  });

  tbody.innerHTML = html || '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">គ្មានទំនិញ</td></tr>';
}

function prepareEditProduct(id) {
  var p = allProducts.find(item => item.id === id);
  if (!p) return;
  editingProductId = p.id;

  document.getElementById('prodFormTitle').innerHTML = '<i class="fas fa-edit text-blue-600"></i>កែសម្រួលទំនិញ៖ ' + p.name;
  document.getElementById('btnCancelEditProd').classList.remove('hidden');

  var btn = document.getElementById('btnSaveProdAction');
  btn.innerText = 'ធ្វើបច្ចុប្បន្នភាពទំនិញ (Update)';
  btn.className = 'btn-green bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold shadow-md';

  document.getElementById('pI').value = p.id;
  document.getElementById('pN').value = p.name;
  document.getElementById('pTy').value = p.type;
  document.getElementById('pCu').value = p.currency || 'KHR';
  if (document.getElementById('pCo')) document.getElementById('pCo').value = p.cost || 0;
  document.getElementById('pPr').value = p.price || 0;
  document.getElementById('pOnlinePr').value = p.online_price || p.price || 0;
  document.getElementById('pMin').value = p.min_stock || 5;
  document.getElementById('pChannel').value = p.channel || 'ALL';

  var preview = document.getElementById('pImgPreview');
  if (preview) preview.src = p.img || 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png';
  document.getElementById('pImgBase64').value = p.img || '';

  tCF();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditProduct() {
  editingProductId = null;
  document.getElementById('prodFormTitle').innerHTML = '<i class="fas fa-boxes-stacked text-green-600"></i>គ្រប់គ្រងទំនិញ (Products)';
  document.getElementById('btnCancelEditProd').classList.add('hidden');

  var btn = document.getElementById('btnSaveProdAction');
  btn.innerText = 'រក្សាទុកទំនិញ (Save Product)';
  btn.className = 'btn-green py-3 text-sm font-bold shadow-md';

  document.getElementById('pI').value = 'P-' + Math.floor(Math.random() * 9000 + 1000);
  document.getElementById('pN').value = '';
  document.getElementById('pPr').value = '';
  document.getElementById('pOnlinePr').value = '';
  document.getElementById('pImgPreview').src = 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png';
  document.getElementById('pImgBase64').value = '';
  document.getElementById('pImgNote').innerText = 'អាចថតរូប ឬជ្រើសរូបភាពពីទូរស័ព្ទ';
  tCF();
}

async function saveProductToSupabase() {
  var name = document.getElementById('pN').value.trim();
  if (!name) { showToast("សូមបញ្ចូលឈ្មោះទំនិញ!", "error"); return; }

  var imgData = document.getElementById('pImgBase64').value || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";

  var payload = {
    id: document.getElementById('pI').value,
    name: name,
    type: document.getElementById('pTy').value,
    currency: document.getElementById('pCu').value,
    cost: parseFloat(document.getElementById('pCo') ? document.getElementById('pCo').value || 0 : 0),
    price: parseFloat(document.getElementById('pPr').value || 0),
    online_price: parseFloat(document.getElementById('pOnlinePr').value || 0),
    min_stock: parseFloat(document.getElementById('pMin').value || 5),
    channel: document.getElementById('pChannel').value,
    img: imgData
  };

  if (!editingProductId) {
    payload.stock = (payload.type === 'ផលិតឯង') ? 500 : 50;
  }

  var btn = document.getElementById('btnSaveProdAction');
  btn.disabled = true;

  try {
    const { error } = await supabaseClient.from('products').upsert([payload]);
    if (error) throw error;

    showToast(editingProductId ? "បានកែប្រែទំនិញជោគជ័យ!" : "បានបន្ថែមទំនិញថ្មីជោគជ័យ!", "success");
    cancelEditProduct();
    await fetchInitialPOSData();
    renderStockTableRows();
    initStockModuleDropdowns();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function saveStockInToSupabase() {
  var id = document.getElementById('si_prod').value;
  var qty = parseFloat(document.getElementById('si_qty').value || 0);
  var cost = parseFloat(document.getElementById('si_cost').value || 0);

  if (!id || qty <= 0) { showToast("សូមជ្រើសរើសទំនិញ និងបញ្ចូលចំនួនទិញចូល!", "error"); return; }
  var prod = allProducts.find(p => p.id === id);

  var btn = document.getElementById('btnSaveStockInAction');
  btn.disabled = true;

  try {
    var newStock = parseFloat(prod.stock || 0) + qty;
    var updateObj = { stock: newStock };
    if (cost > 0) updateObj.cost = cost;

    await supabaseClient.from('products').update(updateObj).eq('id', id);
    await supabaseClient.from('stock_in').insert([{
      product_id: id,
      product_name: prod ? prod.name : "",
      qty: qty,
      cost: cost > 0 ? cost : (prod ? prod.cost : 0),
      admin_name: currentUser.fullName || "Admin"
    }]);

    try {
      var tgMsg = "📦 <b>[KC WATER - បញ្ចូលស្តុកថ្មី]</b>\n\n" +
                  "• ទំនិញ៖ <b>" + (prod ? prod.name : '') + "</b>\n" +
                  "• ចំនួនទិញចូល៖ <b>+" + qty + "</b>\n" +
                  (cost > 0 ? "• ថ្លៃដើមថ្មី៖ <b>៛ " + Number(cost).toLocaleString() + "</b>\n" : "") +
                  "• ស្តុកសរុបបច្ចុប្បន្ន៖ <b>" + newStock + "</b>\n" +
                  "• អ្នកកត់ត្រា៖ " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 ម៉ោង៖ " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}

    showToast("បានបញ្ចូលស្តុកចំនួន +" + qty + " រួចរាល់!", "success");
    document.getElementById('si_qty').value = '';
    document.getElementById('si_cost').value = '';
    document.getElementById('si_cost_hint').innerText = '';

    await fetchInitialPOSData();
    renderStockTableRows();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function delProductFromSupabase(id) {
  if (!confirm("តើអ្នកពិតជាចង់លុបទំនិញនេះមែនទេ?")) return;
  try {
    await supabaseClient.from('products').delete().eq('id', id);
    showToast("បានលុបទំនិញជោគជ័យ!", "success");
    await fetchInitialPOSData();
    renderStockTableRows();
    initStockModuleDropdowns();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

// ==========================================
// 🛢️ ២. ភ្ញៀវខ្ចីធុង / បរិក្ខារ (BOTTLE LOANS)
// ==========================================
function renderBottleLoanModule() {
  var area = document.getElementById('contentArea');
  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<h2 class="font-extrabold text-blue-900 text-base sm:text-lg flex items-center gap-2"><i class="fas fa-boxes-packing text-blue-600"></i>កត់ត្រាភ្ញៀវខ្ចីធុង / បរិក្ខារ</h2>' +
        '<button onclick="fetchBottleLoansData()" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border active:scale-95 transition flex items-center gap-1"><i class="fas fa-sync-alt"></i> Refresh</button>' +
      '</div>' +
      '<div class="space-y-3">' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
          '<input type="text" id="bl_cust_name" placeholder="*ឈ្មោះអ្នកខ្ចី (ឧ៖ មីង សុខា)" class="font-bold border p-2.5 rounded-xl">' +
          '<input type="text" id="bl_item_name" placeholder="*មុខអីវ៉ាន់ (ឧ៖ ធុង ២០L ពណ៌ស)" value="ធុង ២០L ពណ៌ស" class="font-bold border p-2.5 rounded-xl">' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input type="number" id="bl_qty" placeholder="ចំនួនខ្ចី (*)" class="font-black text-blue-900 border p-2.5 rounded-xl">' +
          '<input type="number" id="bl_deposit" placeholder="ប្រាក់កក់ (៛ បើមាន)" class="font-black text-green-700 border p-2.5 rounded-xl">' +
        '</div>' +
        '<button onclick="submitBottleLoanToSupabase()" class="btn-green bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold">កត់ត្រាការខ្ចី (Save Loan)</button>' +
      '</div>' +
    '</div>' +
    '<div class="card border-t-4 border-orange-500 shadow-xl p-5 mb-0">' +
      '<h3 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-clock-rotate-left text-orange-600"></i>បញ្ជីអ្នកកំពុងខ្ចីសំបកធុង</h3>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ថ្ងៃខ្ចី</th><th class="p-2.5">អ្នកខ្ចី</th><th class="p-2.5">អីវ៉ាន់ខ្ចី</th><th class="p-2.5 text-center">ខ្ចី</th><th class="p-2.5 text-center">បានសង</th><th class="p-2.5 text-center">នៅខ្វះ</th><th class="p-2.5 text-center">សង</th></tr></thead><tbody id="blTableBody"></tbody></table></div>' +
    '</div>' +
  '</div>';

  fetchBottleLoansData();
}

async function fetchBottleLoansData() {
  var tbody = document.getElementById('blTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr>';

  try {
    const { data: list } = await supabaseClient.from('bottle_loans').select('*').eq('status', 'Borrowing').order('created_at', { ascending: false });
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> គ្មានអ្នកជំពាក់សំបកធុងឡើយ</td></tr>';
      return;
    }

    var html = '';
    list.forEach(function(item) {
      var remaining = Math.max(0, parseFloat(item.borrowed_qty || 0) - parseFloat(item.returned_qty || 0));
      var dateStr = new Date(item.created_at).toLocaleDateString('km-KH');

      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 text-gray-500 text-[10px]">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + item.customer_name + '</td>' +
        '<td class="p-2.5">' + item.item_name + '</td>' +
        '<td class="p-2.5 text-center font-bold text-blue-700">' + item.borrowed_qty + '</td>' +
        '<td class="p-2.5 text-center font-bold text-green-700">' + item.returned_qty + '</td>' +
        '<td class="p-2.5 text-center font-black text-orange-700">' + remaining + '</td>' +
        '<td class="p-2.5 text-center"><button onclick="quickReturnBottleLoan(\'' + item.loan_id + '\', ' + remaining + ', ' + item.returned_qty + ', ' + item.borrowed_qty + ')" class="px-2.5 py-1 bg-green-600 text-white rounded-lg font-bold text-xs active:scale-95 transition">សង</button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

async function submitBottleLoanToSupabase() {
  var name = document.getElementById('bl_cust_name').value.trim();
  var item = document.getElementById('bl_item_name').value.trim();
  var qty = parseFloat(document.getElementById('bl_qty').value || 0);
  var deposit = parseFloat(document.getElementById('bl_deposit').value || 0);

  if (!name || !item || qty <= 0) { showToast("សូមបំពេញឈ្មោះ អីវ៉ាន់ និងចំនួនខ្ចី!", "error"); return; }

  try {
    await supabaseClient.from('bottle_loans').insert([{
      loan_id: "BL-" + new Date().getTime(),
      customer_name: name,
      item_name: item,
      borrowed_qty: qty,
      returned_qty: 0,
      deposit: deposit,
      status: 'Borrowing',
      admin_name: currentUser.fullName || "Admin"
    }]);

    showToast("បានកត់ត្រាការខ្ចីជោគជ័យ!", "success");
    document.getElementById('bl_cust_name').value = "";
    document.getElementById('bl_qty').value = "";
    document.getElementById('bl_deposit').value = "";
    fetchBottleLoansData();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

async function quickReturnBottleLoan(loanId, remaining, returned, borrowed) {
  var val = prompt("សងសំបកធុង (នៅជំពាក់ " + remaining + " ធុង)៖ សូមវាយចំនួនសង៖", remaining);
  var returnQty = parseFloat(val);
  if (isNaN(returnQty) || returnQty <= 0) return;

  var newReturned = returned + returnQty;
  var newStatus = (newReturned >= borrowed) ? 'Returned' : 'Borrowing';

  try {
    await supabaseClient.from('bottle_loans').update({
      returned_qty: newReturned,
      status: newStatus
    }).eq('loan_id', loanId);

    showToast("បានកត់ត្រាការសងជោគជ័យ!", "success");
    fetchBottleLoansData();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

// ==========================================
// 💸 ៣. កត់ត្រាការចំណាយ (EXPENSES)
// ==========================================
function renderExpensesModule() {
  var area = document.getElementById('contentArea');
  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-red-500 shadow-xl p-5 mb-0">' +
      '<h2 class="font-extrabold text-red-900 text-base mb-3 flex items-center gap-2"><i class="fas fa-money-bill-wave text-red-600"></i>កត់ត្រាការចំណាយប្រចាំថ្ងៃ</h2>' +
      '<div class="space-y-3">' +
        '<select id="exp_cat" class="font-bold border p-2.5 rounded-xl w-full">' +
          '<option value="ថ្លៃប្រេងសាំង (ឡាន/ម៉ូតូ)">⛽ ថ្លៃប្រេងសាំង (ឡាន/ម៉ូតូដឹកទឹក)</option>' +
          '<option value="ថ្លៃអគ្គិសនី & ទឹក">⚡ ថ្លៃអគ្គិសនី & ទឹក</option>' +
          '<option value="ថ្លៃជួសជុលម៉ាស៊ីន">🔧 ថ្លៃជួសជុលម៉ាស៊ីនចម្រោះ / បរិក្ខារ</option>' +
          '<option value="ថ្លៃគម្របធុង & ផ្លាកសញ្ញា">🏷️ ថ្លៃគម្របធុង, ផ្លាកសញ្ញា, ថង់</option>' +
          '<option value="ថ្លៃបាយទឹកបុគ្គលិក">🍚 ថ្លៃម្ហូបអាហារ / បាយទឹកបុគ្គលិក</option>' +
          '<option value="ចំណាយផ្សេងៗ">📦 ចំណាយផ្សេងៗ...</option>' +
        '</select>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input type="number" id="exp_amt" placeholder="ចំនួនទឹកប្រាក់ (*)" class="font-black text-red-700 border p-2.5 rounded-xl">' +
          '<select id="exp_curr" class="font-bold border p-2.5 rounded-xl"><option value="KHR">KHR (៛)</option><option value="THB">THB (฿)</option><option value="USD">USD ($)</option></select>' +
        '</div>' +
        '<input type="text" id="exp_note" placeholder="ចំណាំលម្អិត (បើមាន)..." class="border p-2.5 rounded-xl w-full text-xs">' +
        '<button onclick="submitExpenseToSupabase()" class="btn-green bg-red-600 hover:bg-red-700 py-3 text-sm font-bold">រក្សាទុកការចំណាយ</button>' +
      '</div>' +
    '</div>' +
    '<div class="card border-t-4 border-gray-700 shadow-xl p-5 mb-0">' +
      '<h3 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-history"></i>ប្រវត្តិការចំណាយ</h3>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">កាលបរិច្ឆេទ</th><th class="p-2.5">ប្រភេទចំណាយ</th><th class="p-2.5 text-right">ចំនួនទឹកប្រាក់</th><th class="p-2.5 text-center">លុប</th></tr></thead><tbody id="expTableBody"></tbody></table></div>' +
    '</div>' +
  '</div>';

  fetchExpensesHistory();
}

async function fetchExpensesHistory() {
  var tbody = document.getElementById('expTableBody');
  if (!tbody) return;

  try {
    const { data: list } = await supabaseClient.from('expenses').select('*').order('created_at', { ascending: false }).limit(20);
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 italic">គ្មានទិន្នន័យចំណាយ</td></tr>';
      return;
    }

    var html = '';
    list.forEach(function(item) {
      var dateStr = new Date(item.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 text-gray-500 text-[10px]">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + item.category + (item.note ? '<br><small class="text-gray-400 font-normal">' + item.note + '</small>' : '') + '</td>' +
        '<td class="p-2.5 text-right font-black text-red-700">' + Number(item.amount).toLocaleString() + ' ' + item.currency + '</td>' +
        '<td class="p-2.5 text-center"><button onclick="delExpenseFromSupabase(\'' + item.expense_id + '\')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash-can"></i></button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

async function submitExpenseToSupabase() {
  var cat = document.getElementById('exp_cat').value;
  var amt = parseFloat(document.getElementById('exp_amt').value || 0);
  var curr = document.getElementById('exp_curr').value;
  var note = document.getElementById('exp_note').value.trim();

  if (amt <= 0) { showToast("សូមបញ្ចូលចំនួនទឹកប្រាក់ធំជាង ០!", "error"); return; }

  try {
    await supabaseClient.from('expenses').insert([{
      expense_id: "EXP-" + new Date().getTime(),
      category: cat,
      amount: amt,
      currency: curr,
      note: note,
      admin_name: currentUser.fullName || "Admin"
    }]);

    showToast("បានកត់ត្រាការចំណាយជោគជ័យ!", "success");
    document.getElementById('exp_amt').value = "";
    document.getElementById('exp_note').value = "";
    fetchExpensesHistory();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

async function delExpenseFromSupabase(id) {
  if (!confirm("តើអ្នកពិតជាចង់លុបការចំណាយនេះមែនទេ?")) return;
  try {
    await supabaseClient.from('expenses').delete().eq('expense_id', id);
    showToast("បានលុបការចំណាយជោគជ័យ!", "success");
    fetchExpensesHistory();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

// ==========================================
// 👥 ៤. គ្រប់គ្រងគណនី & តម្លៃពិសេស (CUSTOMERS & MONTHLY PRICES)
// ==========================================
function getElVal(id) {
  var el = document.getElementById(id);
  return el ? (el.value || '').trim() : '';
}

function renderCustomersModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;
  
  var custOptions = '<option value="">-- រើសអតិថិជន / ម៉ូយ --</option>';
  (allCustomers || []).forEach(function(c) {
    if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
      var tag = (c.type === 'Monthly') ? ' [ប្រចាំខែ]' : ' [អ្នកលក់បន្ត]';
      custOptions += '<option value="' + c.full_name + '">' + c.full_name + tag + '</option>';
    }
  });

  var prodOptions = '<option value="">-- រើសទំនិញ --</option>';
  (allProducts || []).forEach(function(p) {
    prodOptions += '<option value="' + p.name + '">' + p.name + '</option>';
  });

  var bossOptions = '<option value="">-- ជ្រើសរើសពីបញ្ជីម៉ូយ ឬវាយខាងក្រោម --</option>';
  (allCustomers || []).forEach(function(c) {
    if (c.role === 'Customer' || c.type === 'Regular' || c.type === 'Monthly') {
      bossOptions += '<option value="' + c.full_name + '">' + c.full_name + '</option>';
    }
  });

  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0">' +
      '<h2 class="font-extrabold text-blue-900 text-base mb-3 flex items-center gap-2">' +
        '<i class="fas fa-user-plus text-blue-600"></i>បង្កើតគណនី Admin / អ្នកដឹក / អតិថិជន' +
      '</h2>' +
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ប្រភេទគណនីដែលត្រូវបង្កើត</label>' +
          '<select id="mem_role_type" onchange="toggleCustTypeFields()" class="font-bold border-2 border-blue-200 p-2.5 rounded-xl w-full bg-white">' +
            '<option value="MONTHLY">🏢 អតិថិជនប្រចាំខែ (Monthly - គ្មាន Login, Admin បញ្ចូលឱ្យ)</option>' +
            '<option value="RESELLER">🚚 អតិថិជនប្រចាំ - អ្នកលក់បន្ត (Reseller - មាន Login)</option>' +
            '<option value="DRIVER">🛵 កូនចៅ/អ្នកដឹក (Driver - ដកទឹកជំនួសមេ)</option>' +
            '<option value="COMPANY_DRIVER">🚚 អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver)</option>' +
            '<option value="SELLER">🛒 បុគ្គលិកលក់នៅកន្លែង (Seller / Cashier)</option>' +
            '<option value="ADMIN">👑 Admin អ្នកគ្រប់គ្រង (Admin)</option>' +
          '</select>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input type="text" id="mem_name" placeholder="*ឈ្មោះពេញ (ឧ៖ ក្រុមហ៊ុន A ឬ តារា)" class="font-bold border p-2.5 rounded-xl">' +
          '<input type="text" id="mem_phone" placeholder="លេខទូរស័ព្ទ (បើមាន)" class="border p-2.5 rounded-xl">' +
        '</div>' +
        '<div id="driverBossContainer" class="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-1.5 hidden">' +
          '<label class="text-[10px] font-black text-amber-950 uppercase block">ឈ្មោះមេ (អតិថិជនដែលកូនចៅនេះមកដកទឹកជំនួស) *</label>' +
          '<select id="mem_boss_select" onchange="document.getElementById(\'mem_boss_custom\').value=this.value" class="font-bold text-amber-950 border border-amber-300 bg-white rounded-xl p-2 w-full text-xs">' +
            bossOptions +
          '</select>' +
          '<input type="text" id="mem_boss_custom" placeholder="ឬវាយឈ្មោះមេនៅទីនេះ (បើមិនទាន់មានក្នុងបញ្ជី)..." class="font-bold border border-amber-300 bg-white rounded-xl p-2 w-full text-xs">' +
        '</div>' +
        '<div id="loginCredsContainer" class="grid grid-cols-2 gap-2 p-3 bg-blue-50/60 rounded-2xl border border-blue-200 hidden">' +
          '<div>' +
            '<label class="text-[9.5px] font-bold text-blue-900 uppercase block mb-1">Username ចូលប្រើ *</label>' +
            '<input type="text" id="mem_user" placeholder="ឧ៖ user123" class="font-bold border p-2 rounded-xl w-full bg-white text-xs">' +
          '</div>' +
          '<div>' +
            '<label class="text-[9.5px] font-bold text-blue-900 uppercase block mb-1">Password លេខសម្ងាត់ *</label>' +
            '<input type="text" id="mem_pass" placeholder="លេខសម្ងាត់" class="font-bold border p-2 rounded-xl w-full bg-white text-xs">' +
          '</div>' +
        '</div>' +
        '<button onclick="saveUserToSupabase()" id="btnSaveUserAction" class="btn-green shadow-lg py-3 text-sm font-bold">រក្សាទុកគណនី (Save Account)</button>' +
      '</div>' +
    '</div>' +

    '<div class="card border-t-4 border-orange-500 shadow-xl p-5 mb-0">' +
      '<h3 class="font-extrabold text-orange-900 text-base mb-1 flex items-center gap-2">' +
        '<i class="fas fa-tags text-orange-600"></i>កំណត់តម្លៃពិសេសសម្រាប់អតិថិជន (Contract Prices)' +
      '</h3>' +
      '<p class="text-[11px] text-gray-500 mb-3 leading-relaxed">' +
        '💡 <b>ចំណាំសម្រាប់អតិថិជន Monthly៖</b> កំណត់មុខទំនិញ និងតម្លៃនៅទីនេះ ដើម្បីឱ្យទំនិញនោះបង្ហាញលើផ្ទាំង POS ពេលលក់ឱ្យគាត់ (ទំនិញក្រៅពីនេះនឹងមិនបង្ហាញឡើយ)។' +
      '</p>' +
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">១. ជ្រើសរើសម៉ូយ</label>' +
          '<select id="spCustSelect" class="w-full font-bold border p-2.5 rounded-xl bg-white">' + custOptions + '</select>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">២. ជ្រើសរើសទំនិញ</label>' +
            '<select id="spProdSelect" class="font-bold border p-2.5 rounded-xl bg-white w-full">' + prodOptions + '</select>' +
          '</div>' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">៣. តម្លៃពិសេស (៛)</label>' +
            '<input type="number" id="spPriceInput" placeholder="ឧ៖ ៥០០" class="font-black text-orange-700 border p-2.5 rounded-xl text-center w-full">' +
          '</div>' +
        '</div>' +
        '<button onclick="saveSpecialPriceToSupabase()" class="btn-green bg-orange-600 hover:bg-orange-700 py-3 text-sm font-bold">រក្សាទុកតម្លៃពិសេស (Save Price)</button>' +
      '</div>' +
    '</div>' +

    '<div class="card border-t-4 border-orange-400 shadow-lg p-5 mb-0">' +
      '<h4 class="font-bold text-gray-800 text-sm mb-2"><i class="fas fa-list-check text-orange-600 mr-1.5"></i>បញ្ជីតម្លៃពិសេសដែលបានកំណត់</h4>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">អតិថិជន</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-right">តម្លៃពិសេស</th><th class="p-2.5 text-center">លុប</th></tr></thead><tbody id="specialPricesTableBody"></tbody></table></div>' +
    '</div>' +

    '<div class="card border-t-4 border-gray-700 shadow-xl p-5 mb-0">' +
      '<h3 class="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-users"></i>បញ្ជីគណនីទាំងអស់</h3>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ឈ្មោះ</th><th class="p-2.5">ព័ត៌មានគណនី</th><th class="p-2.5 text-center">តួនាទី / ប្រភេទ</th><th class="p-2.5 text-center">លុប</th></tr></thead><tbody id="usersModuleTableBody"></tbody></table></div>' +
    '</div>' +
  '</div>';

  toggleCustTypeFields();
  fetchUsersModuleTable();
  fetchSpecialPricesTable();
}

function toggleCustTypeFields() {
  var roleType = getElVal('mem_role_type') || 'MONTHLY';
  var bossBox = document.getElementById('driverBossContainer');
  var loginBox = document.getElementById('loginCredsContainer');

  if (bossBox) {
    if (roleType === 'DRIVER') bossBox.classList.remove('hidden');
    else bossBox.classList.add('hidden');
  }

  if (loginBox) {
    if (roleType === 'MONTHLY') loginBox.classList.add('hidden');
    else loginBox.classList.remove('hidden');
  }
}

async function saveUserToSupabase() {
  var name = getElVal('mem_name');
  var roleType = getElVal('mem_role_type') || 'MONTHLY';
  var phone = getElVal('mem_phone');
  
  if (!name) { 
    showToast("សូមបញ្ចូលឈ្មោះពេញ!", "error"); 
    var nameInp = document.getElementById('mem_name');
    if (nameInp) nameInp.focus();
    return; 
  }

  var role = "Customer";
  var type = "Regular";
  var linkedBoss = "";
  var user = null;
  var pass = null;

  if (roleType === 'MONTHLY') {
    role = 'Customer';
    type = 'Monthly';
    user = null;
    pass = null;
  } else if (roleType === 'RESELLER') {
    role = 'Customer';
    type = 'Regular';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { showToast("សូមវាយ Username និង Password សម្រាប់ម៉ូយ Login!", "error"); return; }
  } else if (roleType === 'DRIVER') {
    role = 'Driver';
    type = 'Driver';
    linkedBoss = getElVal('mem_boss_custom') || getElVal('mem_boss_select');
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { showToast("សូមវាយ Username និង Password សម្រាប់អ្នកដឹក Login!", "error"); return; }
  } else if (roleType === 'COMPANY_DRIVER') {
    role = 'Driver';
    type = 'CompanyDriver';
    linkedBoss = 'KC WATER';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { showToast("សូមវាយ Username និង Password សម្រាប់អ្នកដឹក!", "error"); return; }
  } else if (roleType === 'SELLER') {
    role = 'Seller';
    type = 'Retail';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { showToast("សូមវាយ Username និង Password សម្រាប់បុគ្គលិកលក់!", "error"); return; }
  } else if (roleType === 'ADMIN') {
    role = 'Admin';
    type = 'Admin';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { showToast("សូមវាយ Username និង Password សម្រាប់ Admin!", "error"); return; }
  }

  var btn = document.getElementById('btnSaveUserAction');
  if (btn) { btn.disabled = true; btn.innerText = "កំពុងរក្សាទុក..."; }

  try {
    var insertPayload = {
      full_name: name,
      role: role,
      type: type,
      phone: phone,
      linked_boss: linkedBoss
    };

    if (user !== null && user !== '') insertPayload.username = user;
    if (pass !== null && pass !== '') insertPayload.password = pass;

    const { error } = await supabaseClient.from('users').insert([insertPayload]);
    if (error) throw error;

    showToast("បានបង្កើត [" + name + "] ជោគជ័យ!", "success");
    var elName = document.getElementById('mem_name'); if (elName) elName.value = "";
    var elPhone = document.getElementById('mem_phone'); if (elPhone) elPhone.value = "";
    var elUser = document.getElementById('mem_user'); if (elUser) elUser.value = "";
    var elPass = document.getElementById('mem_pass'); if (elPass) elPass.value = "";
    var elBoss = document.getElementById('mem_boss_custom'); if (elBoss) elBoss.value = "";

    await fetchInitialPOSData();
    renderCustomersModule();
  } catch(err) {
    console.error("Save user error:", err);
    showToast("កំហុស៖ " + (err.message || err), "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "រក្សាទុកគណនី (Save Account)"; }
  }
}

async function fetchUsersModuleTable() {
  var tbody = document.getElementById('usersModuleTableBody');
  if (!tbody) return;

  try {
    const { data: users, error } = await supabaseClient.from('users').select('*').order('id', { ascending: false });
    if (error) throw error;
    if (!users) return;

    var html = '';
    users.forEach(function(u) {
      var badgeHtml = '';
      if (u.type === 'Monthly') {
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-orange-100 text-orange-800 border border-orange-300">🏢 ប្រចាំខែ</span>';
      } else if (u.type === 'CompanyDriver') {
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">🚚 អ្នកដឹក KC WATER</span>';
      } else if (u.type === 'Driver') {
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">🛵 កូនចៅដកទឹក (មេ: ' + (u.linked_boss || '-') + ')</span>';
      } else if (u.role === 'Admin') {
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-900">👑 Admin</span>';
      } else if (u.role === 'Seller') {
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-900">🛒 បុគ្គលិកលក់</span>';
      } else {
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-green-100 text-green-800">🚚 អ្នកលក់បន្ត</span>';
      }

      var credsText = (u.type === 'Monthly') ? 
        '<span class="text-gray-400 text-[11px] italic">ម៉ូយប្រចាំខែ (គ្មាន Login)</span>' : 
        ('<span class="font-mono text-xs"><b>' + (u.username || '-') + '</b> / ' + (u.password || '-') + '</span>');

      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 font-bold text-gray-800">' + u.full_name + '<br><small class="text-gray-400 font-normal">' + (u.phone || '-') + '</small></td>' +
        '<td class="p-2.5">' + credsText + '</td>' +
        '<td class="p-2.5 text-center">' + badgeHtml + '</td>' +
        '<td class="p-2.5 text-center"><button onclick="delUserFromSupabase(' + u.id + ')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash-can"></i></button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

async function fetchSpecialPricesTable() {
  var tbody = document.getElementById('specialPricesTableBody');
  if (!tbody) return;

  try {
    const { data: list } = await supabaseClient.from('customer_prices').select('*').order('id', { ascending: false });
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 italic">មិនទាន់មានតម្លៃពិសេសនៅឡើយ</td></tr>';
      return;
    }

    var html = '';
    list.forEach(function(sp) {
      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 font-bold text-gray-800">' + sp.customer_name + '</td>' +
        '<td class="p-2.5">' + sp.product_name + '</td>' +
        '<td class="p-2.5 text-right font-black text-orange-700">៛ ' + Number(sp.price).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-center"><button onclick="delSpecialPriceFromSupabase(' + sp.id + ')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash-can"></i></button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

async function saveSpecialPriceToSupabase() {
  var cust = document.getElementById('spCustSelect').value;
  var prod = document.getElementById('spProdSelect').value;
  var price = parseFloat(document.getElementById('spPriceInput').value || 0);

  if (!cust || !prod || price <= 0) { showToast("សូមជ្រើសរើសម៉ូយ ទំនិញ និងតម្លៃពិសេស!", "error"); return; }

  try {
    await supabaseClient.from('customer_prices').upsert([{
      customer_name: cust,
      product_name: prod,
      price: price,
      currency: "KHR"
    }]);

    showToast("បានរក្សាទុកតម្លៃពិសេសជោគជ័យ!", "success");
    document.getElementById('spPriceInput').value = "";
    fetchSpecialPricesTable();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

async function delSpecialPriceFromSupabase(id) {
  if (!confirm("តើអ្នកចង់លុបតម្លៃពិសេសនេះមែនទេ?")) return;
  try {
    await supabaseClient.from('customer_prices').delete().eq('id', id);
    showToast("បានលុបតម្លៃពិសេសជោគជ័យ!", "success");
    fetchSpecialPricesTable();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

async function delUserFromSupabase(id) {
  if (!confirm("តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?")) return;
  try {
    await supabaseClient.from('users').delete().eq('id', id);
    showToast("បានលុបគណនីជោគជ័យ!", "success");
    await fetchInitialPOSData();
    renderCustomersModule();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

// ==========================================
// ⚙️ ៥. ការកំណត់ប្រព័ន្ធ & TELEGRAM TOGGLE (SETTINGS)
// ==========================================
var currentTelegramAlertStatus = "ON";

function renderSettingsModule() {
  var area = document.getElementById('contentArea');
  var prodOptions = '<option value="ALL">🔄 គ្រប់មុខទំនិញទាំងអស់ (All Products)</option>';
  allProducts.forEach(function(p) {
    prodOptions += '<option value="' + p.name + '">📦 ' + p.name + '</option>';
  });

  area.innerHTML = '<div class="max-w-2xl mx-auto space-y-4">' +
    // ម៉ោងធ្វើការ & សេវាដឹក
    '<div class="card border-t-4 border-indigo-600 shadow-xl p-5 mb-0 space-y-3">' +
      '<h2 class="font-extrabold text-indigo-950 text-base flex items-center gap-2"><i class="fas fa-clock text-indigo-600"></i>ម៉ោងទទួលកុម្ម៉ង់ & សេវាដឹក (Store Rules)</h2>' +
      '<div class="grid grid-cols-2 gap-2 text-xs">' +
        '<div><label class="font-bold text-gray-500 uppercase block">ម៉ោងបើក (Open)</label><input type="time" id="set_open_time" class="font-black border p-2 rounded-xl w-full text-center"></div>' +
        '<div><label class="font-bold text-gray-500 uppercase block">ម៉ោងបិទ (Close)</label><input type="time" id="set_close_time" class="font-black border p-2 rounded-xl w-full text-center"></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 text-xs">' +
        '<div><label class="font-bold text-gray-500 uppercase block">ថ្លៃដឹកធម្មតា (៛)</label><input type="number" id="set_del_fee" class="font-black border p-2 rounded-xl w-full text-center"></div>' +
        '<div><label class="font-bold text-gray-500 uppercase block">កុម្ម៉ង់ចាប់ពី (X ធុង) ដឹក FREE</label><input type="number" id="set_del_min" class="font-black border p-2 rounded-xl w-full text-center"></div>' +
      '</div>' +
    '</div>' +

    // ប្រព័ន្ធ Promotion លើ Web
    '<div class="card border-t-4 border-amber-500 shadow-xl p-5 mb-0 space-y-3">' +
      '<div class="flex justify-between items-center">' +
        '<h3 class="font-extrabold text-amber-950 text-base flex items-center gap-2"><i class="fas fa-gift text-amber-600"></i>ប្រព័ន្ធ Promotion លើ Website</h3>' +
        '<select id="set_promo_status" class="text-xs font-bold border border-amber-300 rounded-xl p-1.5"><option value="OFF">🔕 បិទ (OFF)</option><option value="ON">🔔 បើក (ON)</option></select>' +
      '</div>' +
      '<div class="space-y-2 text-xs">' +
        '<select id="set_promo_product" class="w-full font-bold border border-amber-300 rounded-xl p-2 bg-white">' + prodOptions + '</select>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input type="number" id="set_promo_buy_qty" placeholder="ទិញគ្រប់ (X ធុង)" class="border border-amber-300 p-2 rounded-xl text-center font-bold">' +
          '<input type="number" id="set_promo_free_qty" placeholder="ថែម Free (Y ធុង)" class="border border-emerald-300 p-2 rounded-xl text-center font-bold text-emerald-800">' +
        '</div>' +
        '<input type="text" id="set_promo_banner" placeholder="ពាក្យផ្សាយ Promotion លើក្បាលទំព័រ..." class="border p-2 rounded-xl w-full font-bold">' +
      '</div>' +
    '</div>' +

    // 🔔 កាត TELEGRAM BOT ALERT (មានប៊ូតុង បិទ/បើក ភ្លាមៗ)
    '<div class="card border-t-4 border-green-600 shadow-xl p-5 mb-0 space-y-3">' +
      '<div class="flex justify-between items-center">' +
        '<h3 class="font-extrabold text-green-950 text-base flex items-center gap-2"><i class="fab fa-telegram text-blue-500"></i>Telegram Bot Alert</h3>' +
        '<div class="flex items-center gap-1.5">' +
          // 🔘 ប៊ូតុង Toggle បិទ / បើក Telegram
          '<button type="button" id="btnToggleTelegramStatus" onclick="toggleTelegramAlertStatusLive()" class="px-3 py-1.5 rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5"></button>' +
          '<button type="button" onclick="testTelegramAlertNow()" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">🔔 តេស្ត</button>' +
        '</div>' +
      '</div>' +
      '<p class="text-[11px] text-gray-500">*ចុចប៊ូតុងខាងលើដើម្បី <b>បិទ (OFF)</b> កុំឱ្យរំខានពេលកំពុងសាកល្បងកូដ ឬ <b>បើក (ON)</b> ពេលដំណើរការលក់ជាក់ស្តែង។</p>' +
      '<div class="space-y-2 text-xs">' +
        '<input type="text" id="set_tg_token" placeholder="Telegram Bot Token" class="border p-2 rounded-xl w-full font-mono">' +
        '<input type="text" id="set_tg_chatid" placeholder="Telegram Chat ID" class="border p-2 rounded-xl w-full font-mono">' +
      '</div>' +
      '<button onclick="saveSettingsToSupabase()" class="btn-green py-3 text-sm font-bold">រក្សាទុកការកំណត់ទាំងអស់</button>' +
    '</div>' +
  '</div>';

  loadSettingsForm();
}

// 🎨 មុខងារបង្ហាញប៊ូតុង បិទ/បើក Telegram (ក្រហម ឬ បៃតង)
function updateTelegramButtonUI(status) {
  currentTelegramAlertStatus = (String(status).trim().toUpperCase() === "OFF") ? "OFF" : "ON";
  // ✅ បញ្ជាបិទក្នុង Memory ភ្លាមៗកុំឱ្យនៅសល់
  telegramConfig.status = currentTelegramAlertStatus;
  localStorage.setItem('kc_telegram_status', currentTelegramAlertStatus);

  var btn = document.getElementById('btnToggleTelegramStatus');
  if (!btn) return;

  if (currentTelegramAlertStatus === "ON") {
    btn.className = "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5";
    btn.innerHTML = '<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> 🔔 បើក (ON)';
  } else {
    btn.className = "px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5";
    btn.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span> 🔕 បិទ (OFF)';
  }
}

// ⚡ ចុចប្តូរភ្លាម បិទសោរភ្លាមៗ និង Save ចូល Supabase
async function toggleTelegramAlertStatusLive() {
  var nextStatus = (currentTelegramAlertStatus === "ON") ? "OFF" : "ON";
  updateTelegramButtonUI(nextStatus);

  try {
    await supabaseClient.from('settings').upsert([{ key: 'Telegram_Alert_Status', value: nextStatus }]);
    telegramConfig.status = nextStatus;
    localStorage.setItem('kc_telegram_status', nextStatus);
    showToast("បានកំណត់ Telegram៖ " + (nextStatus === "ON" ? "🔔 បើកដំណើរការ (ON)" : "🔕 បិទសារដំណឹង (OFF)"), "info");
  } catch(e) {
    showToast("កំហុសប្តូរស្ថានភាព Telegram៖ " + e.message, "error");
    updateTelegramButtonUI(currentTelegramAlertStatus);
  }
}
async function loadSettingsForm() {
  try {
    const { data } = await supabaseClient.from('settings').select('*');
    if (!data) return;
    var tgStatus = "ON";

    data.forEach(function(r) {
      if (r.key === 'Store_Open_Time') document.getElementById('set_open_time').value = r.value;
      if (r.key === 'Store_Close_Time') document.getElementById('set_close_time').value = r.value;
      if (r.key === 'Delivery_Fee_Standard') document.getElementById('set_del_fee').value = r.value;
      if (r.key === 'Delivery_Free_Min_Qty') document.getElementById('set_del_min').value = r.value;
      if (r.key === 'Telegram_Token') document.getElementById('set_tg_token').value = r.value;
      if (r.key === 'Telegram_ChatID') document.getElementById('set_tg_chatid').value = r.value;
      if (r.key === 'Telegram_Alert_Status') tgStatus = r.value;
      if (r.key === 'Promo_Status') document.getElementById('set_promo_status').value = r.value;
      if (r.key === 'Promo_Target_Product') document.getElementById('set_promo_product').value = r.value;
      if (r.key === 'Promo_Buy_Qty') document.getElementById('set_promo_buy_qty').value = r.value;
      if (r.key === 'Promo_Free_Qty') document.getElementById('set_promo_free_qty').value = r.value;
      if (r.key === 'Promo_Banner_Text') document.getElementById('set_promo_banner').value = r.value;
    });

    updateTelegramButtonUI(tgStatus);
  } catch(e) {}
}

async function saveSettingsToSupabase() {
  var rows = [
    { key: 'Store_Open_Time', value: document.getElementById('set_open_time').value || "07:00" },
    { key: 'Store_Close_Time', value: document.getElementById('set_close_time').value || "18:00" },
    { key: 'Delivery_Fee_Standard', value: document.getElementById('set_del_fee').value || "2000" },
    { key: 'Delivery_Free_Min_Qty', value: document.getElementById('set_del_min').value || "2" },
    { key: 'Telegram_Token', value: document.getElementById('set_tg_token').value.trim() },
    { key: 'Telegram_ChatID', value: document.getElementById('set_tg_chatid').value.trim() },
    { key: 'Telegram_Alert_Status', value: currentTelegramAlertStatus },
    { key: 'Promo_Status', value: document.getElementById('set_promo_status').value },
    { key: 'Promo_Target_Product', value: document.getElementById('set_promo_product').value },
    { key: 'Promo_Buy_Qty', value: document.getElementById('set_promo_buy_qty').value || "5" },
    { key: 'Promo_Free_Qty', value: document.getElementById('set_promo_free_qty').value || "1" },
    { key: 'Promo_Banner_Text', value: document.getElementById('set_promo_banner').value.trim() }
  ];

  try {
    await supabaseClient.from('settings').upsert(rows);
    showToast("បានរក្សាទុកការកំណត់ជោគជ័យ!", "success");
    await loadSettingsAndTelegram();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

function testTelegramAlertNow() {
  if (currentTelegramAlertStatus === "OFF") {
    showToast("⚠️ ប្រព័ន្ធ Telegram កំពុងបិទ (OFF)! សូមចុចបើក (ON) ជាមុនសិន", "warning");
    return;
  }
  sendTelegramAlert("🔔 <b>[KC WATER - តេស្តប្រព័ន្ធ]</b>\n\nTelegram Bot បានតភ្ជាប់ជាមួយប្រព័ន្ធ Vercel + Supabase ជោគជ័យ ១០០% ហើយ!\n🕒 ម៉ោង៖ " + new Date().toLocaleTimeString('km-KH'));
  showToast("បានផ្ញើសារតេស្តទៅ Telegram!", "success");
}

// ==========================================
// 🏠 ៦. ទំព័រដើមគណនីម៉ូយប្រចាំ (CUSTOMER PORTAL - CUSTPORTAL)
// ==========================================
async function renderCustomerPortalHome() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  area.innerHTML = '<div class="max-w-2xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-green-600 bg-gradient-to-r from-green-800 to-green-700 text-white p-5 shadow-xl rounded-3xl">' +
      '<div class="flex justify-between items-start">' +
        '<div>' +
          '<span id="cpBadgeType" class="text-[10px] bg-green-900/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-400/40">គណនីម៉ូយប្រចាំ KC WATER</span>' +
          '<h2 class="text-xl sm:text-2xl font-black mt-1">👋 សួស្តី, ' + currentUser.fullName + '</h2>' +
          '<p class="text-[11px] text-green-100 mt-0.5">ប្រព័ន្ធត្រួតពិនិត្យការដកទឹក តម្លៃ និងទូទាត់ប្រាក់</p>' +
        '</div>' +
        '<div class="flex gap-1.5">' +
          '<button onclick="openChangePasswordModal()" title="ប្តូរលេខសម្ងាត់" class="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm active:scale-95 transition shadow-sm"><i class="fas fa-key"></i></button>' +
          '<button onclick="openContactEnterpriseModal()" title="ទាក់ទងរោងចក្រ" class="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm active:scale-95 transition shadow-sm"><i class="fas fa-phone"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-green-600/60">' +
        '<button onclick="openMyPricesModal()" class="py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fas fa-tags text-yellow-300"></i> តម្លៃទឹករបស់ខ្ញុំ</button>' +
        '<button onclick="viewMyMonthlyStatement()" class="py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fas fa-file-invoice text-emerald-300"></i> កាតគ្រីខែនេះ</button>' +
      '</div>' +
    '</div>' +

    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">' +
      '<div class="dash-card border-l-4 border-blue-500 shadow-md p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">ដកទឹកថ្ងៃនេះ</div><div id="cpTodayTotal" class="mt-2 text-base sm:text-lg font-black text-blue-900">0 ៛</div></div>' +
      '<div class="dash-card border-l-4 border-orange-500 shadow-md p-4 bg-white rounded-2xl"><div class="text-xs font-bold text-gray-500 uppercase">បំណុលចាស់ពីមុន</div><div id="cpOldDebt" class="mt-2 text-base sm:text-lg font-black text-orange-700">0 ៛</div></div>' +
      '<div onclick="loadModule(\'CustBottles\')" class="dash-card border-l-4 border-purple-500 shadow-md p-4 bg-white rounded-2xl cursor-pointer hover:bg-purple-50/50 transition active:scale-95"><div class="text-xs font-bold text-gray-500 uppercase flex justify-between items-center"><span>សំបកធុងកំពុងខ្ចី</span><i class="fas fa-chevron-right text-gray-400 text-xs"></i></div><div id="cpBorrowedBottles" class="mt-2 text-base sm:text-lg font-black text-purple-800">0 ធុង</div></div>' +
    '</div>' +

    '<div class="card border-t-4 border-emerald-600 bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200 text-center space-y-3 shadow-lg">' +
      '<div class="text-xs font-bold text-emerald-900 uppercase tracking-wider">សរុបទឹកប្រាក់ត្រូវទូទាត់ទាំងអស់</div>' +
      '<div id="cpGrandTotalDue" class="text-2xl sm:text-3xl font-black text-emerald-800">0 ៛</div>' +
      '<div class="grid grid-cols-2 gap-2.5 pt-1">' +
        '<button type="button" onclick="openCustomerPortalPayment(\'CASH\')" class="py-3 px-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition">' +
          '<i class="fas fa-money-bill-wave text-base"></i> 💵 បង់លុយសុទ្ធ (ជូនអ្នកដឹក)' +
        '</button>' +
        '<button type="button" onclick="openCustomerPortalPayment(\'ABA\')" class="py-3 px-2 bg-gradient-to-r from-red-600 via-pink-600 to-blue-700 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition">' +
          '<i class="fas fa-qrcode text-base"></i> 📱 ស្កេន ABA / ចម្រុះ' +
        '</button>' +
      '</div>' +
    '</div>' +

    '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<h3 class="font-extrabold text-gray-800 text-sm sm:text-base flex items-center gap-2"><i class="fas fa-boxes text-blue-600"></i>ទំនិញដកថ្ងៃនេះ (មិនទាន់ទូទាត់)</h3>' +
        '<button onclick="loadModule(\'CustHistory\')" class="text-xs font-bold text-blue-600 hover:underline">មើលប្រវត្តិដកទំនិញ ➔</button>' +
      '</div>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ម៉ោង</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">សរុប</th></tr></thead><tbody id="cpTodayItemsTbody"><tr><td colspan="4" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody></table></div>' +
    '</div>' +
  '</div>';

  await fetchCustomerPortalData();
}

async function fetchCustomerPortalData() {
  try {
    var todayStr = new Date().toISOString().split('T')[0];

    const { data: trans } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .eq('status', 'Unpaid')
      .order('created_at', { ascending: false });

    const { data: lastSet } = await supabaseClient
      .from('settlements')
      .select('balance_khr')
      .eq('customer_name', currentUser.fullName)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    var oldDebt = lastSet ? parseFloat(lastSet.balance_khr || 0) : 0;
    var todayTotal = 0;
    var prevUnpaid = 0;
    var todayItems = [];

    (trans || []).forEach(function(t) {
      var tot = parseFloat(t.total || 0);
      var isToday = String(t.created_at).startsWith(todayStr);
      if (isToday) {
        todayTotal += tot;
        todayItems.push(t);
      } else {
        prevUnpaid += tot;
      }
    });

    var grandOldDebt = oldDebt + prevUnpaid;
    var grandTotalDue = grandOldDebt + todayTotal;

    const { data: loans } = await supabaseClient
      .from('bottle_loans')
      .select('borrowed_qty, returned_qty')
      .eq('status', 'Borrowing')
      .ilike('customer_name', '%' + currentUser.fullName + '%');

    var totalBottles = 0;
    (loans || []).forEach(function(l) {
      totalBottles += Math.max(0, parseFloat(l.borrowed_qty || 0) - parseFloat(l.returned_qty || 0));
    });

    custPortalDataCache = {
      todayTotal: todayTotal,
      oldDebt: grandOldDebt,
      grandTotalDue: grandTotalDue,
      borrowedBottles: totalBottles,
      todayItems: todayItems
    };

    document.getElementById('cpTodayTotal').innerText = '៛ ' + todayTotal.toLocaleString();
    document.getElementById('cpOldDebt').innerText = '៛ ' + grandOldDebt.toLocaleString();
    document.getElementById('cpGrandTotalDue').innerText = '៛ ' + grandTotalDue.toLocaleString();
    document.getElementById('cpBorrowedBottles').innerText = totalBottles + ' ធុង';

    var tbody = document.getElementById('cpTodayItemsTbody');
    if (tbody) {
      if (todayItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 italic">មិនទាន់មានការដកទំនិញថ្ងៃនេះទេ</td></tr>';
      } else {
        var html = '';
        todayItems.forEach(function(i) {
          var timeStr = new Date(i.created_at).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
          html += '<tr class="border-b hover:bg-gray-50">' +
            '<td class="p-2.5 text-gray-500 text-[10px]">' + timeStr + '</td>' +
            '<td class="p-2.5 font-bold text-gray-800">' + i.product_name + '</td>' +
            '<td class="p-2.5 text-center font-bold text-blue-700">' + i.qty + '</td>' +
            '<td class="p-2.5 text-right font-black text-green-700">៛ ' + Number(i.total).toLocaleString() + '</td>' +
          '</tr>';
        });
        tbody.innerHTML = html;
      }
    }
  } catch(e) {
    console.error("Portal error:", e);
  }
}

// ==========================================
// 💳 ៧. ផ្ទាំងស្នើទូទាត់លុយរបស់ម៉ូយ (CUSTOMER PAYMENT REQUEST MODAL)
// ==========================================
function openCustomerPortalPayment(mode) {
  var due = custPortalDataCache ? custPortalDataCache.grandTotalDue : 0;
  if (due <= 0) {
    showToast("អ្នកមិនមានបំណុលត្រូវទូទាត់ឡើយ!", "info");
    return;
  }
  injectCustKhqrPaymentModal();
  switchCustPayMode(mode || "ABA");
  document.getElementById('custKhqrModal').classList.remove('hidden');
}

function injectCustKhqrPaymentModal() {
  var existing = document.getElementById('custKhqrModal');
  if (existing) existing.remove();

  var due = custPortalDataCache ? custPortalDataCache.grandTotalDue : 0;

  var modalHtml = '<div id="custKhqrModal" class="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-4 hidden">' +
    '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="closeCustKhqrModal()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 space-y-3 text-center relative border animate-in zoom-in duration-200">' +
      '<div class="flex justify-between items-center border-b pb-2.5">' +
        '<div class="text-left"><h4 class="font-black text-blue-950 text-base"><i class="fas fa-wallet text-blue-600"></i> សំណើទូទាត់ប្រាក់</h4><p class="text-[10px] text-gray-500 font-bold">KC WATER - សេវាទូទាត់ប្រាក់</p></div>' +
        '<button type="button" onclick="closeCustKhqrModal()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl font-bold">&times;</button>' +
      '</div>' +

      '<div class="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-2xl border">' +
        '<button type="button" id="btnPayModeCash" onclick="switchCustPayMode(\'CASH\')" class="py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"><i class="fas fa-money-bill-wave"></i> លុយសុទ្ធទាំងអស់</button>' +
        '<button type="button" id="btnPayModeAba" onclick="switchCustPayMode(\'ABA\')" class="py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"><i class="fas fa-qrcode"></i> ស្កេន ABA / ចម្រុះ</button>' +
      '</div>' +

      // ផ្នែក QR Code ផ្លូវការ
      '<div id="custQrSection" class="space-y-2 bg-gray-50 p-3 rounded-2xl border">' +
        '<div class="flex justify-between items-center">' +
          '<span class="text-xs font-black text-gray-700 flex items-center gap-1"><i class="fas fa-qrcode text-red-600"></i> ABA KHQR ផ្លូវការ</span>' +
          '<span class="text-xs font-black text-green-700">៛ ' + due.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="p-1.5 bg-white rounded-2xl border shadow-inner max-w-[180px] mx-auto">' +
          '<img src="https://i.postimg.cc/DzHPhnmQ/photo-2026-09-06-20-44-57.jpg" class="w-full rounded-xl shadow-xs">' +
        '</div>' +
        '<p class="text-[10px] text-gray-400 italic">ស្កេនទូទាត់ ឬ Save QR ទុកស្កេនក្នុង App ធនាគារ</p>' +
      '</div>' +

      // ផ្នែកបែងចែកលុយសុទ្ធ & ស្កេន ABA (Auto-Balance សម្រាប់ម៉ូយ)
      '<div id="custCurrencyBoxesArea" class="space-y-2 text-left"></div>' +

      // 🧾 ប្រអប់ ABA Reference Code / ចំណាំ
      '<div id="custRefSection">' +
        '<label class="text-[10px] font-bold text-gray-600 uppercase block mb-1">លេខកូដ ABA Ref / ចំណាំ (បើមាន) *</label>' +
        '<input type="text" id="custAbaRefInput" placeholder="ឧ៖ 123456789 ឬ កុងផ្ញើ..." class="text-xs bg-gray-50 p-3 rounded-xl border w-full font-bold outline-none focus:border-blue-500 focus:bg-white">' +
      '</div>' +

      '<div class="space-y-2 pt-1">' +
        '<button type="button" id="btnSubmitCustPayment" onclick="submitCustPaymentFinal()" class="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition"></button>' +
        '<button type="button" onclick="closeCustKhqrModal()" class="w-full py-2 text-gray-400 font-bold text-xs">បិទផ្ទាំងនេះ</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeCustKhqrModal() {
  var modal = document.getElementById('custKhqrModal');
  if (modal) modal.classList.add('hidden');
}

function switchCustPayMode(mode) {
  currentCustPayMode = mode;
  var btnCash = document.getElementById('btnPayModeCash');
  var btnAba = document.getElementById('btnPayModeAba');
  var qrSec = document.getElementById('custQrSection');
  var refSec = document.getElementById('custRefSection');
  var btnSubmit = document.getElementById('btnSubmitCustPayment');

  if (mode === "CASH") {
    btnCash.className = "py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-green-700 text-white shadow";
    btnAba.className = "py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-transparent text-gray-600";
    if (qrSec) qrSec.classList.add('hidden');
    if (refSec) refSec.classList.add('hidden');
    if (btnSubmit) {
      btnSubmit.className = "w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";
      btnSubmit.innerHTML = '<i class="fas fa-handshake"></i> ខ្ញុំបង់លុយសុទ្ធ (ជូនដំណឹងទៅរោងចក្រ)';
    }
  } else {
    btnAba.className = "py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-blue-700 text-white shadow";
    btnCash.className = "py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-transparent text-gray-600";
    if (qrSec) qrSec.classList.remove('hidden');
    if (refSec) refSec.classList.remove('hidden');
    if (btnSubmit) {
      btnSubmit.className = "w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition";
      btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ខ្ញុំបានបង់រួចរាល់ (ផ្ញើសំណើទៅរោងចក្រ)';
    }
  }

  renderCustCurrencyPaymentBoxes();
}

function renderCustCurrencyPaymentBoxes() {
  var area = document.getElementById('custCurrencyBoxesArea');
  if (!area) return;
  var due = custPortalDataCache ? custPortalDataCache.grandTotalDue : 0;

  if (currentCustPayMode === "CASH") {
    area.innerHTML = '<div class="bg-green-50 p-3.5 rounded-2xl border border-green-200 text-xs font-bold text-green-950 flex justify-between items-center">' +
      '<span>💵 ប្រាក់សុទ្ធដែលត្រូវជូនអ្នកដឹក៖</span><b class="text-sm font-black text-green-800">៛ ' + due.toLocaleString() + '</b>' +
    '</div>';
  } else {
    area.innerHTML = '<div class="bg-blue-50/80 p-3 rounded-2xl border border-blue-200 space-y-2">' +
      '<div class="flex justify-between items-center text-xs font-black text-blue-950">' +
        '<span>សរុបត្រូវបង់៖</span><span class="text-blue-800">៛ ' + due.toLocaleString() + '</span>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2">' +
        '<div>' +
          '<label class="text-[9.5px] font-bold text-gray-600 block mb-1">💵 លុយសុទ្ធ (៛)</label>' +
          '<input type="number" id="inpCustPayCash" oninput="recalcCustSplit(this.value)" placeholder="0" class="w-full text-center text-sm font-black text-gray-800 bg-white border border-gray-300 rounded-xl p-2 outline-none">' +
        '</div>' +
        '<div>' +
          '<label class="text-[9.5px] font-black text-red-600 block mb-1">📱 ស្កេន ABA (៛)</label>' +
          '<input type="number" id="inpCustPayScan" value="' + due + '" class="w-full text-center text-sm font-black text-red-600 bg-white border-2 border-red-300 rounded-xl p-2 outline-none">' +
        '</div>' +
      '</div>' +
    '</div>';
  }
}

function recalcCustSplit(cashVal) {
  var due = custPortalDataCache ? custPortalDataCache.grandTotalDue : 0;
  var cash = parseFloat(cashVal || 0);
  var scanInp = document.getElementById('inpCustPayScan');
  if (scanInp) {
    scanInp.value = Math.max(0, due - cash);
  }
}

async function submitCustPaymentFinal() {
  var due = custPortalDataCache ? custPortalDataCache.grandTotalDue : 0;
  var kCash = 0;
  var kScan = 0;
  var refCode = document.getElementById('custAbaRefInput') ? document.getElementById('custAbaRefInput').value.trim() : "";

  if (currentCustPayMode === "CASH") {
    kCash = due;
  } else {
    kCash = parseFloat(document.getElementById('inpCustPayCash') ? document.getElementById('inpCustPayCash').value || 0 : 0);
    kScan = parseFloat(document.getElementById('inpCustPayScan') ? document.getElementById('inpCustPayScan').value || 0 : due);
  }

  var btn = document.getElementById('btnSubmitCustPayment');
  if (btn) { btn.disabled = true; btn.innerText = "កំពុងផ្ញើសំណើ..."; }

  try {
    const { error } = await supabaseClient.from('pending_payments').insert([{
      id: "PAY-" + new Date().getTime(),
      customer_name: currentUser.fullName,
      method: currentCustPayMode === "CASH" ? "CASH (លុយសុទ្ធទាំងអស់)" : "ស្កេន ABA / ចម្រុះ",
      khr_total: due,
      khr_cash: kCash,
      khr_scan: kScan,
      ref_code: refCode,
      status: "Pending"
    }]);

    if (error) throw error;

    closeCustKhqrModal();
    showToast("បានផ្ញើសំណើទូទាត់ទៅកាន់រោងចក្ររួចរាល់!", "success");

    // 🔔 បាញ់ Telegram Alert ប្រាប់ Admin ភ្លាមៗ
    try {
      var payDetail = (currentCustPayMode === "CASH") ? "💵 លុយសុទ្ធទាំងអស់" : ("📱 ស្កេន ABA: ៛ " + kScan.toLocaleString() + (kCash > 0 ? " + 💵 សុទ្ធ: ៛ " + kCash.toLocaleString() : ""));
      var tgMsg = "🔔 <b>[KC WATER - សំណើទូទាត់ប្រាក់ថ្មីពីម៉ូយ]</b>\n\n" +
                  "👤 <b>អតិថិជន៖</b> " + currentUser.fullName + "\n" +
                  "💳 <b>វិធីបង់ប្រាក់៖</b> " + payDetail + "\n" +
                  "💰 <b>ទឹកប្រាក់សរុប៖</b> <b>៛ " + due.toLocaleString() + "</b>\n" +
                  (refCode ? "🧾 <b>ABA Ref / ចំណាំ៖</b> <code>" + refCode + "</code>\n" : "") +
                  "🕒 <b>ម៉ោង៖</b> " + new Date().toLocaleTimeString('km-KH') + "\n\n" +
                  "👉 <i>សូម Admin ចូលទៅផ្ទាំង Settlement ដើម្បីពិនិត្យ និងយល់ព្រម!</i>";
      sendTelegramAlert(tgMsg);
    } catch(e) {}

    await fetchCustomerPortalData();

  } catch(err) {
    showToast("កំហុសផ្ញើសំណើ៖ " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; }
  }
}

// ==========================================
// 📜 ៨. ផ្ទាំងប្រវត្តិដកទំនិញ (CUSTHISTORY)
// ==========================================
function renderCustomerHistoryModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  var now = new Date();
  var thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
  var today = now.toISOString().split('T')[0];

  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    '<div class="flex bg-white p-1.5 rounded-2xl border shadow-sm gap-1.5">' +
      '<button id="chTabBtnUnpaid" onclick="switchCustHistoryTab(\'unpaid\')" class="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-orange-600 text-white shadow flex items-center justify-center gap-1.5"><i class="fas fa-list-check"></i> ពិនិត្យទឹកជំពាក់ទាំងអស់</button>' +
      '<button id="chTabBtnItems" onclick="switchCustHistoryTab(\'items\')" class="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-1.5"><i class="fas fa-calendar-days"></i> ប្រវត្តិដកតាមថ្ងៃ</button>' +
      '<button id="chTabBtnPayments" onclick="switchCustHistoryTab(\'payments\')" class="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-1.5"><i class="fas fa-receipt"></i> ប្រវត្តិបង់ប្រាក់</button>' +
    '</div>' +

    '<div id="chSecUnpaid" class="space-y-3">' +
      '<div class="card border-t-4 border-orange-600 shadow-xl p-5 mb-0">' +
        '<h4 class="font-black text-orange-950 text-sm mb-3 flex items-center gap-1.5"><i class="fas fa-file-invoice-dollar text-orange-600"></i> បញ្ជីមុខទឹកជំពាក់ទាំងអស់ (មិនទាន់ទូទាត់)</h4>' +
        '<div class="overflow-x-auto max-h-[450px] overflow-y-auto rounded-2xl border"><table class="w-full text-left text-xs border-collapse"><thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b"><tr><th class="p-2.5 text-[10px]">ថ្ងៃ/ម៉ោងដក</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">តម្លៃរាយ</th><th class="p-2.5 text-right">តម្លៃសរុប</th><th class="p-2.5 text-center">ស្ថានភាព</th></tr></thead><tbody id="chAllUnpaidTbody"><tr><td colspan="6" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody></table></div>' +
      '</div>' +
    '</div>' +

    '<div id="chSecItems" class="space-y-3 hidden">' +
      '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0">' +
        '<div class="grid grid-cols-2 gap-2 mb-2"><div><label class="text-[10px] font-bold text-gray-500 uppercase">ចាប់ពីថ្ងៃ</label><input type="date" id="ch_sd" value="' + thirtyDaysAgo + '" class="font-bold border p-2 rounded-xl w-full text-xs"></div><div><label class="text-[10px] font-bold text-gray-500 uppercase">ដល់ថ្ងៃ</label><input type="date" id="ch_ed" value="' + today + '" class="font-bold border p-2 rounded-xl w-full text-xs"></div></div>' +
        '<button onclick="fetchCustomHistoryByDate()" class="btn-green bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold">ស្វែងរកតាមថ្ងៃ</button>' +
        '<div class="overflow-x-auto max-h-80 overflow-y-auto rounded-2xl border mt-3"><table class="w-full text-left text-xs border-collapse"><thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b"><tr><th class="p-2.5 text-[10px]">ថ្ងៃ/ម៉ោង</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-center">ចំនួន</th><th class="p-2.5 text-right">សរុប</th><th class="p-2.5 text-center">ស្ថានភាព</th></tr></thead><tbody id="chItemsByDateTbody"></tbody></table></div>' +
      '</div>' +
    '</div>' +

    '<div id="chSecPayments" class="space-y-3 hidden">' +
      '<div class="card border-t-4 border-green-600 shadow-xl p-5 mb-0">' +
        '<h4 class="font-black text-green-950 text-sm mb-3 flex items-center gap-1.5"><i class="fas fa-receipt text-green-600"></i> ប្រវត្តិប្រាក់បានបង់សងរោងចក្រ</h4>' +
        '<div class="overflow-x-auto max-h-80 overflow-y-auto rounded-2xl border"><table class="w-full text-left text-xs border-collapse"><thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b"><tr><th class="p-2.5 text-[10px]">កាលបរិច្ឆេទ</th><th class="p-2.5 text-right">ប្រាក់បានបង់</th><th class="p-2.5 text-center">វិធីបង់</th><th class="p-2.5 text-center">អ្នកទទួល</th></tr></thead><tbody id="chPaymentsHistoryTbody"></tbody></table></div>' +
      '</div>' +
    '</div>' +
  '</div>';

  loadAllUnpaidHistory();
}

function switchCustHistoryTab(tab) {
  document.getElementById('chSecUnpaid').classList.add('hidden');
  document.getElementById('chSecItems').classList.add('hidden');
  document.getElementById('chSecPayments').classList.add('hidden');

  document.getElementById('chTabBtnUnpaid').className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-1.5';
  document.getElementById('chTabBtnItems').className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-1.5';
  document.getElementById('chTabBtnPayments').className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-1.5';

  if (tab === 'unpaid') {
    document.getElementById('chSecUnpaid').classList.remove('hidden');
    document.getElementById('chTabBtnUnpaid').className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-orange-600 text-white shadow flex items-center justify-center gap-1.5';
    loadAllUnpaidHistory();
  } else if (tab === 'items') {
    document.getElementById('chSecItems').classList.remove('hidden');
    document.getElementById('chTabBtnItems').className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-blue-600 text-white shadow flex items-center justify-center gap-1.5';
    fetchCustomHistoryByDate();
  } else {
    document.getElementById('chSecPayments').classList.remove('hidden');
    document.getElementById('chTabBtnPayments').className = 'flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition bg-green-600 text-white shadow flex items-center justify-center gap-1.5';
    loadPaymentsHistory();
  }
}

async function loadAllUnpaidHistory() {
  var tbody = document.getElementById('chAllUnpaidTbody');
  if (!tbody) return;

  try {
    const { data: unpaids } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .eq('status', 'Unpaid')
      .order('created_at', { ascending: false });

    if (!unpaids || unpaids.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> អបអរសាទរ! អ្នកមិនមានទឹកជំពាក់ឡើយ</td></tr>';
      return;
    }

    var html = '';
    unpaids.forEach(function(i) {
      var dateStr = new Date(i.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      html += '<tr class="border-b hover:bg-orange-50/40">' +
        '<td class="p-2.5 text-gray-500 text-[10px] whitespace-nowrap">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + i.product_name + '</td>' +
        '<td class="p-2.5 text-center font-bold text-blue-700">' + i.qty + '</td>' +
        '<td class="p-2.5 text-right">' + Number(i.price).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-right font-black text-orange-700 whitespace-nowrap">៛ ' + Number(i.total).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-200">⚠️ ជំពាក់</span></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

async function fetchCustomHistoryByDate() {
  var sd = document.getElementById('ch_sd').value;
  var ed = document.getElementById('ch_ed').value;
  var tbody = document.getElementById('chItemsByDateTbody');
  if (!tbody) return;

  try {
    const { data: list } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .gte('created_at', sd + 'T00:00:00Z')
      .lte('created_at', ed + 'T23:59:59Z')
      .order('created_at', { ascending: false });

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">គ្មានទិន្នន័យដកក្នុងចន្លោះថ្ងៃនេះ</td></tr>';
      return;
    }

    var html = '';
    list.forEach(function(i) {
      var dateStr = new Date(i.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 text-gray-500 text-[10px]">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + i.product_name + '</td>' +
        '<td class="p-2.5 text-center font-bold text-blue-700">' + i.qty + '</td>' +
        '<td class="p-2.5 text-right font-black text-green-700">៛ ' + Number(i.total).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ' + (i.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800') + '">' + (i.status === 'Paid' ? 'បង់រួច' : 'ជំពាក់') + '</span></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

async function loadPaymentsHistory() {
  var tbody = document.getElementById('chPaymentsHistoryTbody');
  if (!tbody) return;

  try {
    const { data: payments } = await supabaseClient
      .from('settlements')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .order('settled_at', { ascending: false });

    if (!payments || payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 italic">មិនទាន់មានប្រវត្តិបង់ប្រាក់នៅឡើយ</td></tr>';
      return;
    }

    var html = '';
    payments.forEach(function(p) {
      var dateStr = new Date(p.settled_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 text-gray-500 text-[10px]">' + dateStr + '</td>' +
        '<td class="p-2.5 text-right font-black text-green-700">៛ ' + Number(p.paid_khr).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-center text-xs font-bold text-blue-800">' + p.pay_method + '</td>' +
        '<td class="p-2.5 text-center text-xs text-gray-600">' + p.admin_name + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

// ==========================================
// 🛢️ ៩. ផ្ទាំងសំបកធុងកំពុងខ្ចី (CUSTBOTTLES)
// ==========================================
async function renderCustomerBottlesModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  area.innerHTML = '<div class="max-w-2xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-purple-600 shadow-xl p-5 mb-0">' +
      '<h3 class="font-extrabold text-purple-900 text-base mb-3 flex items-center gap-2"><i class="fas fa-boxes-packing text-purple-600"></i>សំបកធុង និងឧបករណ៍ដែលខ្ញុំកំពុងខ្ចី</h3>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">ថ្ងៃខ្ចី</th><th class="p-2.5">មុខទំនិញ/ឧបករណ៍</th><th class="p-2.5 text-center">ខ្ចី</th><th class="p-2.5 text-center">បានសង</th><th class="p-2.5 text-center">នៅខ្វះ</th></tr></thead><tbody id="cbBottlesTbody"><tr><td colspan="5" class="p-4 text-center text-gray-400 italic">កំពុងទាញទិន្នន័យ...</td></tr></tbody></table></div>' +
    '</div>' +
  '</div>';

  try {
    const { data: list } = await supabaseClient
      .from('bottle_loans')
      .select('*')
      .eq('status', 'Borrowing')
      .ilike('customer_name', '%' + currentUser.fullName + '%');

    var tbody = document.getElementById('cbBottlesTbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> អ្នកមិនមានជំពាក់សំបកធុង ឬឧបករណ៍ណាមួយឡើយ</td></tr>';
      return;
    }

    var html = '';
    list.forEach(function(b) {
      var remaining = Math.max(0, parseFloat(b.borrowed_qty || 0) - parseFloat(b.returned_qty || 0));
      var dateStr = new Date(b.created_at).toLocaleDateString('km-KH');
      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 text-gray-500 text-[10px]">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + b.item_name + '</td>' +
        '<td class="p-2.5 text-center font-bold text-blue-700">' + b.borrowed_qty + '</td>' +
        '<td class="p-2.5 text-center font-bold text-green-700">' + b.returned_qty + '</td>' +
        '<td class="p-2.5 text-center font-black text-orange-700">' + remaining + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {}
}

// ==========================================
// 💡 ១០. MODALS ជំនួយសម្រាប់ម៉ូយ (PRICES, PASSWORD, CONTACT)
// ==========================================
async function openMyPricesModal() {
  try {
    const { data: list } = await supabaseClient.from('customer_prices').select('*').eq('customer_name', currentUser.fullName);
    var rows = '';
    if (!list || list.length === 0) {
      rows = '<tr><td colspan="2" class="p-4 text-center text-gray-400 italic">តម្លៃធម្មតាតាមតម្លៃបោះដុំរោងចក្រ</td></tr>';
    } else {
      list.forEach(function(item) {
        rows += '<tr class="border-b"><td class="p-2.5 font-bold text-gray-800">' + item.product_name + '</td><td class="p-2.5 text-right font-black text-green-700">៛ ' + Number(item.price).toLocaleString() + '</td></tr>';
      });
    }

    var html = '<div id="myPricesModal" class="fixed inset-0 z-[7500] flex items-center justify-center p-4">' +
      '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="document.getElementById(\'myPricesModal\').remove()"></div>' +
      '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3 relative border text-center">' +
        '<div class="flex justify-between items-center border-b pb-2"><h3 class="font-black text-blue-900 text-base"><i class="fas fa-tags text-yellow-500 mr-1"></i> តម្លៃទឹករបស់ខ្ញុំ</h3><button onclick="document.getElementById(\'myPricesModal\').remove()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button></div>' +
        '<div class="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead class="bg-gray-100 font-bold text-gray-600"><tr><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-right">តម្លៃព្រមព្រៀង</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<button onclick="document.getElementById(\'myPricesModal\').remove()" class="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs active:scale-95 transition">រួចរាល់</button>' +
      '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
  } catch(e) {}
}

function openChangePasswordModal() {
  var html = '<div id="changePassModal" class="fixed inset-0 z-[7500] flex items-center justify-center p-4">' +
    '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="document.getElementById(\'changePassModal\').remove()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3 relative border text-center">' +
      '<div class="flex justify-between items-center border-b pb-2"><h3 class="font-black text-gray-800 text-base"><i class="fas fa-key text-blue-600 mr-1"></i> ប្តូរលេខសម្ងាត់ផ្ទាល់ខ្លួន</h3><button onclick="document.getElementById(\'changePassModal\').remove()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button></div>' +
      '<div class="space-y-2 text-left">' +
        '<div><label class="text-[10px] font-bold text-gray-500 uppercase">លេខសម្ងាត់ចាស់</label><input type="password" id="cp_old_pass" placeholder="លេខសម្ងាត់បច្ចុប្បន្ន" class="text-xs border p-2 rounded-xl w-full font-bold"></div>' +
        '<div><label class="text-[10px] font-bold text-gray-500 uppercase">លេខសម្ងាត់ថ្មី</label><input type="password" id="cp_new_pass" placeholder="លេខសម្ងាត់ថ្មី" class="text-xs border p-2 rounded-xl w-full font-bold"></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 pt-2"><button onclick="document.getElementById(\'changePassModal\').remove()" class="py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs">បោះបង់</button><button onclick="submitChangePassword()" class="py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs shadow">យល់ព្រមប្តូរ</button></div>' +
    '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

async function submitChangePassword() {
  var oldP = document.getElementById('cp_old_pass').value.trim();
  var newP = document.getElementById('cp_new_pass').value.trim();
  if (!oldP || !newP) { showToast("សូមបំពេញលេខសម្ងាត់ចាស់ និងថ្មី!", "error"); return; }

  try {
    const { data: user } = await supabaseClient.from('users').select('password').eq('id', currentUser.id).single();
    if (!user || user.password !== oldP) {
      showToast("លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ!", "error");
      return;
    }

    await supabaseClient.from('users').update({ password: newP }).eq('id', currentUser.id);
    showToast("បានប្តូរលេខសម្ងាត់ថ្មីជោគជ័យ!", "success");
    document.getElementById('changePassModal').remove();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

function openContactEnterpriseModal() {
  var html = '<div id="contactEnterpriseModal" class="fixed inset-0 z-[7500] flex items-center justify-center p-4">' +
    '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="document.getElementById(\'contactEnterpriseModal\').remove()"></div>' +
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3.5 relative border text-center">' +
      '<div class="flex justify-between items-center border-b pb-2"><h3 class="font-black text-green-950 text-base"><i class="fas fa-headset text-green-600 mr-1"></i> ទំនាក់ទំនងរោងចក្រ KC WATER</h3><button onclick="document.getElementById(\'contactEnterpriseModal\').remove()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button></div>' +
      '<div class="p-3 bg-green-50 rounded-2xl border border-green-200 text-left space-y-2">' +
        '<div class="text-[10px] text-green-700 font-bold uppercase">លេខទូរស័ព្ទរោងចក្រ</div>' +
        '<div class="flex justify-between items-center"><b class="text-xs text-green-900">077 934 748, 066 934 748</b><a href="tel:077934748" class="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold shadow"><i class="fas fa-phone"></i> ខល</a></div>' +
      '</div>' +
      '<div class="p-3 bg-blue-50 rounded-2xl border border-blue-200 flex items-center justify-between">' +
        '<div><div class="text-[10px] text-blue-700 font-bold uppercase">Telegram ផ្លូវការ</div><b class="text-xs text-blue-950">@KcWater</b></div>' +
        '<a href="http://t.me/KcWater" target="_blank" class="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1"><i class="fab fa-telegram"></i> ឆាត</a>' +
      '</div>' +
      '<button onclick="document.getElementById(\'contactEnterpriseModal\').remove()" class="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs">បិទ</button>' +
    '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

function viewMyMonthlyStatement() {
  loadModule('MonthlyRep');
  setTimeout(function() {
    switchRepTab('customer');
    var drop = document.getElementById('custSelectDropdown');
    if (drop) { drop.value = currentUser.fullName; }
    var inp = document.getElementById('custSearchInp');
    if (inp) { inp.value = currentUser.fullName; }
    fetchFullStatementFromSupabase();
  }, 300);
}
