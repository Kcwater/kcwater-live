/** ==========================================================================
 *  KC WATER POS SYSTEM - COMPLETE MODULES ENGINE (pos-modules.js)
 *  (Stock, Bottle Loans, Expenses, Customers & Prices, Settings,
 *   Full Customer Portal, History, Bottles & Statement Modal)
 *  ========================================================================== */

var editingProductId = null;
var custPortalDataCache = null;
var currentCustPayMode = "ABA";

// 📦 ១. គ្រប់គ្រងស្តុក & បង្កើតទំនិញ (មានប្រព័ន្ធ Live KHR Converter បង្ហាញលុយខ្មែរអូតូពេលវាយ ฿ ឬ $)
function renderStockModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;
  var aid = "P-" + Math.floor(Math.random() * 9000 + 1000);
  editingProductId = null;

  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    '<div class="card border-t-4 border-green-700 shadow-xl">' +
      '<div class="flex justify-between items-center mb-4 border-b pb-2">' +
        '<h2 id="prodFormTitle" class="font-extrabold text-green-900 text-base sm:text-lg flex items-center gap-2">' +
          '<i class="fas fa-boxes-stacked text-green-600"></i>គ្រប់គ្រងទំនិញ (KC MART Products)' +
        '</h2>' +
        '<button type="button" id="btnCancelEditProd" onclick="cancelEditProduct()" class="text-xs font-bold text-gray-500 hover:text-red-600 hidden">' +
          '<i class="fas fa-times mr-1"></i>បោះបង់ការកែប្រែ' +
        '</button>' +
      '</div>' +
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input type="text" id="pI" value="' + aid + '" readonly class="bg-gray-100 font-bold text-blue-600 text-xs border p-2.5 rounded-xl">' +
          '<input type="text" id="pN" placeholder="*ឈ្មោះទំនិញ (ឧ៖ ក្រដាស ត្រាដំរី ឬ អង្ករផ្កាម្លិះ)" class="font-bold border p-2.5 rounded-xl text-xs outline-none focus:border-green-600">' +
        '</div>' +

        '<div class="grid grid-cols-2 gap-2">' +
          '<select id="pTy" onchange="tCF()" class="border p-2.5 rounded-xl font-bold text-xs bg-white">' +
            '<option value="ផលិតឯង">ផលិតខ្លួនឯង (ទឹកធុង)</option>' +
            '<option value="ទិញគេ" selected>ទិញគេមកលក់បន្ត (គ្រឿងទេស/ក្រដាស/អង្ករ/បរិក្ខារ)</option>' +
          '</select>' +
          '<select id="pCu" onchange="updateProductCostPreviewLive()" class="border-2 border-blue-300 p-2.5 rounded-xl font-black text-xs bg-blue-50/50 text-blue-950">' +
            '<option value="KHR">KHR (៛) - លុយខ្មែរ</option>' +
            '<option value="THB">THB (฿) - លុយថៃ</option>' +
            '<option value="USD">USD ($) - ដុល្លារ</option>' +
          '</select>' +
        '</div>' +

        '<div id="cSec" style="display:block">' +
          '<div class="flex justify-between items-center mb-1">' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase">ថ្លៃដើមទិញចូល (Cost)</label>' +
            '<span id="pCoPreviewHint" class="text-[10px] font-black text-emerald-700"></span>' +
          '</div>' +
          '<input type="number" id="pCo" oninput="updateProductCostPreviewLive()" placeholder="ថ្លៃដើម (ឧ៖ ៤,០០០ ឬ 35฿ ឬ $1.5)" class="border p-2.5 rounded-xl font-bold w-full text-xs outline-none focus:border-green-600">' +
        '</div>' +

        // 🏷️ ប៉ុស្តិ៍លក់, ប្រភេទទំនិញ, និង ផ្លាកសម្គាល់
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ប៉ុស្តិ៍លក់ (Channel) *</label>' +
            '<select id="pChannel" onchange="toggleChannelPrices()" class="border-2 border-emerald-400 p-2.5 rounded-xl font-bold w-full text-xs bg-white">' +
              '<option value="ALL">🔄 ទាំងពីរ (POS + Web)</option>' +
              '<option value="POS">🚚 លក់តែលើ POS ដេប៉ូ</option>' +
              '<option value="ONLINE">🌐 លក់តែលើ Web</option>' +
            '</select>' +
          '</div>' +

          '<div>' +
            '<label class="text-[10px] font-black text-blue-900 uppercase block mb-1">📂 ប្រភេទទំនិញ (Category) *</label>' +
            '<select id="pCategory" class="border-2 border-blue-400 p-2.5 rounded-xl font-black w-full text-xs bg-blue-50/50 text-blue-950 outline-none">' +
              '<option value="GROCERY">🍚 ស្បៀង & គ្រឿងទេស</option>' +
              '<option value="HOUSEHOLD">🧻 របស់ប្រើប្រាស់ & អនាម័យ</option>' +
              '<option value="BARREL">💧 ទឹកធុង ២០L</option>' +
              '<option value="PACK">📦 ទឹកយួរ / ដប</option>' +
              '<option value="EQUIP">🛢️ បរិក្ខារ & ជើងទម្រ</option>' +
            '</select>' +
          '</div>' +

          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">🏷️ ផ្លាកលើ Web (Badge)</label>' +
            '<select id="pBadge" class="border p-2.5 rounded-xl font-bold w-full text-xs bg-white">' +
              '<option value="គុណភាពខ្ពស់">🏆 គុណភាពខ្ពស់</option>' +
              '<option value="ពេញនិយម">⭐ ពេញនិយម (Popular)</option>' +
              '<option value="លក់ដាច់">🔥 លក់ដាច់ (Best Seller)</option>' +
              '<option value="ទំនិញថ្មី">✨ ទំនិញថ្មី (New Arrival)</option>' +
              '<option value="NONE">❌ គ្មានផ្លាក</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        // 💵 ប្រអប់តម្លៃ (POS vs Online) មានភ្ជាប់ Live KHR Hint
        '<div id="priceInputsContainer" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">' +
          '<div id="secPosPrice">' +
            '<div class="flex justify-between items-center mb-1">' +
              '<label class="text-[10px] font-extrabold text-amber-900 uppercase">🚚 តម្លៃបោះដុំដេប៉ូ (POS) *</label>' +
              '<span id="pPrPreviewHint" class="text-[10px] font-black text-amber-700"></span>' +
            '</div>' +
            '<input type="number" id="pPr" oninput="updateProductCostPreviewLive()" placeholder="ឧ៖ ៦០០" class="font-black text-amber-900 bg-white border border-amber-300 rounded-xl p-2.5 w-full outline-none text-sm">' +
          '</div>' +
          '<div id="secOnlinePrice">' +
            '<div class="flex justify-between items-center mb-1">' +
              '<label class="text-[10px] font-extrabold text-emerald-900 uppercase">🌐 តម្លៃលក់លើ Web តាមផ្ទះ *</label>' +
              '<span id="pOnlinePrPreviewHint" class="text-[10px] font-black text-emerald-700"></span>' +
            '</div>' +
            '<input type="number" id="pOnlinePr" oninput="updateProductCostPreviewLive()" placeholder="ឧ៖ ១៥០០" class="font-black text-emerald-800 bg-white border border-emerald-300 rounded-xl p-2.5 w-full outline-none text-sm">' +
          '</div>' +
        '</div>' +

        // ការពិពណ៌នា
        '<div>' +
          '<label class="text-[10px] font-bold text-emerald-900 uppercase block mb-1"><i class="fas fa-file-lines text-emerald-600 mr-1"></i> ការរៀបរាប់ពីមុខទំនិញ (Description បង្ហាញលើ Web)</label>' +
          '<textarea id="pDesc" rows="2" placeholder="ឧទាហរណ៍៖ អង្ករផ្កាម្លិះគុណភាពលេខ១ ក្រអូប ស្រទន់ ឆ្ងាញ់..." class="border-2 border-emerald-200 focus:border-emerald-600 p-2.5 rounded-xl font-bold w-full text-xs outline-none bg-white"></textarea>' +
        '</div>' +

        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">' +
          '<div>' +
            '<label class="text-[10px] font-black text-blue-900 uppercase block mb-1">🔢 លេខ POS</label>' +
            '<input type="number" id="pSortPos" placeholder="ឧ៖ 1" value="1" class="border-2 border-blue-300 focus:border-blue-600 p-2.5 rounded-xl font-black w-full text-xs text-center text-blue-900 bg-blue-50/50 outline-none">' +
          '</div>' +
          '<div>' +
            '<label class="text-[10px] font-black text-emerald-900 uppercase block mb-1">🌐 លេខ Web</label>' +
            '<input type="number" id="pSortOnline" placeholder="ឧ៖ 1" value="1" class="border-2 border-emerald-300 focus:border-emerald-600 p-2.5 rounded-xl font-black w-full text-xs text-center text-emerald-900 bg-emerald-50/50 outline-none">' +
          '</div>' +
          '<div>' +
            '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">កម្រិតដំណឹងស្តុកទាប</label>' +
            '<input type="number" id="pMin" placeholder="ឧ៖ 5" value="5" class="border p-2.5 rounded-xl font-bold w-full text-xs text-center outline-none">' +
          '</div>' +
        '</div>' +

        // រូបភាព
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

    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 px-1">' +
      '<div class="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">' +
        '<button type="button" onclick="switchStockSortView(\'WEB\')" id="btnSortViewWEB" class="px-3 py-1.5 rounded-lg transition bg-white text-emerald-800 shadow-xs font-black">🌐 មើលតាមលំដាប់ Web</button>' +
        '<button type="button" onclick="switchStockSortView(\'POS\')" id="btnSortViewPOS" class="px-3 py-1.5 rounded-lg transition text-gray-500 hover:text-gray-800 font-bold">🚚 មើលតាមលំដាប់ POS</button>' +
      '</div>' +
      '<button type="button" onclick="autoFixAllSortDuplicates()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5">' +
        '<i class="fas fa-wand-magic-sparkles text-yellow-300"></i> ⚡ រៀបលេខរៀងឡើងវិញកុំឱ្យស្ទួន (Auto-Fix)' +
      '</button>' +
    '</div>' +

    '<div class="card p-0 overflow-x-auto max-h-[500px] overflow-y-auto shadow-lg rounded-2xl border border-gray-200">' +
      '<table class="w-full text-left text-xs border-collapse">' +
        '<thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-xs"><tr><th class="p-3 text-center w-16">🔢 លេខរៀង</th><th class="p-3">រូប</th><th class="p-3">ឈ្មោះទំនិញ</th><th class="p-3 text-center">ប៉ុស្តិ៍ / ប្រភេទ</th><th class="p-3 text-center">តម្លៃដេប៉ូ / Web</th><th class="p-3 text-center">ស្តុក</th><th class="p-3 text-center">សកម្មភាព</th></tr></thead>' +
        '<tbody id="stockModuleTableBody"></tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  tCF();
  toggleChannelPrices();
  initStockModuleDropdowns();

  if (!allProducts || allProducts.length === 0) {
    fetchInitialPOSData().then(function() {
      if (typeof syncOnlineSortsFromDatabase === 'function') {
        syncOnlineSortsFromDatabase().then(renderStockTableRows);
      } else {
        renderStockTableRows();
      }
      initStockModuleDropdowns();
    });
  } else {
    if (typeof syncOnlineSortsFromDatabase === 'function') {
      syncOnlineSortsFromDatabase().then(renderStockTableRows);
    } else {
      renderStockTableRows();
    }
  }
}

// 🪙 មុខងារជំនួយគណនាបំប្លែងលុយថៃ ฿ និងដុល្លារ $ ចេញជាលុយខ្មែរ ៛ ភ្លាមៗ (Live Preview)
function updateProductCostPreviewLive() {
  var cuEl = document.getElementById('pCu');
  var coEl = document.getElementById('pCo');
  var prEl = document.getElementById('pPr');
  var opEl = document.getElementById('pOnlinePr');

  var coHint = document.getElementById('pCoPreviewHint');
  var prHint = document.getElementById('pPrPreviewHint');
  var opHint = document.getElementById('pOnlinePrPreviewHint');

  if (!cuEl) return;
  var curr = cuEl.value.toUpperCase();
  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  function formatKhrHint(val) {
    var num = parseFloat(val || 0);
    if (num <= 0) return '';
    if (curr === 'USD') {
      return '≈ ៛ ' + Math.round(num * rateUSD).toLocaleString();
    } else if (curr === 'THB') {
      return '≈ ៛ ' + Math.round(num * rateTHB).toLocaleString();
    } else {
      return '';
    }
  }

  if (coHint && coEl) coHint.innerText = formatKhrHint(coEl.value);
  if (prHint && prEl) prHint.innerText = formatKhrHint(prEl.value);
  if (opHint && opEl) opHint.innerText = formatKhrHint(opEl.value);
}

function tCF() {
  var pTy = document.getElementById('pTy');
  var c = document.getElementById('cSec');
  if (pTy && c) c.style.display = (pTy.value === 'ផលិតឯង' ? 'none' : 'block');
}

function toggleChannelPrices() {
  var ch = document.getElementById('pChannel') ? document.getElementById('pChannel').value : 'ALL';
  var posSec = document.getElementById('secPosPrice');
  var onlineSec = document.getElementById('secOnlinePrice');
  var cont = document.getElementById('priceInputsContainer');

  if (ch === 'POS') {
    if (posSec) posSec.style.display = 'block';
    if (onlineSec) onlineSec.style.display = 'none';
    if (cont) cont.className = 'grid grid-cols-1 gap-2.5 bg-amber-50/60 p-3 rounded-2xl border border-amber-200';
  } else if (ch === 'ONLINE') {
    if (posSec) posSec.style.display = 'none';
    if (onlineSec) onlineSec.style.display = 'block';
    if (cont) cont.className = 'grid grid-cols-1 gap-2.5 bg-sky-50/60 p-3 rounded-2xl border border-sky-200';
  } else {
    if (posSec) posSec.style.display = 'block';
    if (onlineSec) onlineSec.style.display = 'block';
    if (cont) cont.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200';
  }
}

function initStockModuleDropdowns() {
  var siSel = document.getElementById('si_prod');
  if (!siSel) return;
  siSel.innerHTML = '<option value="">-- រើសទំនិញ --</option>';
  allProducts.forEach(function(p) {
    if (p.type === 'ទិញគេ') siSel.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
  });
}

// 📦 មុខងារបង្ហាញថ្លៃដើមពេលរើសទំនិញបញ្ចូលស្តុក (គណនាបំប្លែងលុយថៃ ฿ និងដុល្លារ $ ចេញជាលុយខ្មែរ ៛ ភ្លាមៗ)
function onStockInProductSelected() {
  var id = document.getElementById('si_prod') ? document.getElementById('si_prod').value : '';
  var costInp = document.getElementById('si_cost');
  var hint = document.getElementById('si_cost_hint');
  if (!id || !costInp) return;

  var prod = allProducts.find(p => p.id === id);
  if (!prod) {
    if (hint) hint.innerHTML = '';
    return;
  }

  var rawCost = parseFloat(prod.cost || 0);
  costInp.value = rawCost > 0 ? rawCost : '';

  var curr = (prod.currency || 'KHR').toUpperCase();
  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  // 🪙 មុខងារជំនួយបង្ហាញតម្លៃដើម និងលុយខ្មែរស្វ័យប្រវត្តិ
  function formatCostWithKhr(costVal) {
    if (costVal <= 0) return '-';
    if (curr === 'USD') {
      var khrUsd = Math.round(costVal * rateUSD);
      return '$ ' + costVal.toFixed(2) + ' <b class="text-emerald-700">(≈ ៛ ' + khrUsd.toLocaleString() + ')</b>';
    } else if (curr === 'THB') {
      var khrThb = Math.round(costVal * rateTHB);
      return '฿ ' + costVal.toLocaleString() + ' <b class="text-amber-800">(≈ ៛ ' + khrThb.toLocaleString() + ')</b>';
    } else {
      return '៛ ' + costVal.toLocaleString();
    }
  }

  // បង្ហាញដំណឹងថ្លៃដើមបច្ចុប្បន្ន
  if (hint) {
    hint.innerHTML = '*ថ្លៃដើមបច្ចុប្បន្ន៖ ' + formatCostWithKhr(rawCost) + ' <span class="text-slate-400 font-normal">[' + curr + ']</span>';
  }

  // 🔄 ភ្ជាប់ Event ពេល Admin វាយកែប្រែថ្លៃដើមថ្មី ឱ្យគណនាបំប្លែងជាលុយខ្មែរលើអេក្រង់ភ្លាមៗ!
  costInp.oninput = function() {
    var inputVal = parseFloat(this.value || 0);
    if (inputVal > 0) {
      if (hint) hint.innerHTML = '<span class="text-blue-800 font-black">👉 ថ្លៃដើមថ្មីលើកនេះ៖ ' + formatCostWithKhr(inputVal) + '</span>';
    } else {
      if (hint) hint.innerHTML = '*ថ្លៃដើមបច្ចុប្បន្ន៖ ' + formatCostWithKhr(rawCost) + ' <span class="text-slate-400 font-normal">[' + curr + ']</span>';
    }
  };
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

// ==========================================
// 📋 ប្រព័ន្ធគ្រប់គ្រងលេខរៀង POS & WEB (ស៊ីសង្វាក់គ្នា ១០០% គ្មានលេខស្ទួន)
// ==========================================
var currentStockViewTab = 'WEB'; // 'WEB' ឬ 'POS'

// 🔄 ប្តូរទិដ្ឋភាពមើលតាម POS ឬ Web
function switchStockSortView(tab) {
  currentStockViewTab = tab;
  var btnPos = document.getElementById('btnSortViewPOS');
  var btnWeb = document.getElementById('btnSortViewWEB');
  if (btnPos && btnWeb) {
    if (tab === 'POS') {
      btnPos.className = "px-3 py-1 rounded-lg transition bg-white text-blue-900 shadow-xs font-black";
      btnWeb.className = "px-3 py-1 rounded-lg transition text-gray-500 hover:text-gray-800 font-bold";
    } else {
      btnWeb.className = "px-3 py-1 rounded-lg transition bg-white text-emerald-800 shadow-xs font-black";
      btnPos.className = "px-3 py-1 rounded-lg transition text-gray-500 hover:text-gray-800 font-bold";
    }
  }
  renderStockTableRows();
}

// 📋 មុខងារបង្ហាញតារាងទំនិញ (មានប៊ូតុងព្រួញ ⬆️ ⬇️ រៀបលំដាប់ងាយស្រួលបំផុត ១ ឃ្លីក & ពហុរូបិយប័ណ្ណ)
function renderStockTableRows() {
  var tbody = document.getElementById('stockModuleTableBody');
  if (!tbody) return;
  var html = '';

  var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;
  var isWebTab = (currentStockViewTab === 'WEB');

  // 🔢 តម្រៀបទំនិញតាម Tab Web ឬ POS
  var sortedList = allProducts.slice().sort(function(a, b) {
    var chA = String(a.channel || 'ALL').toUpperCase();
    var chB = String(b.channel || 'ALL').toUpperCase();

    if (isWebTab) {
      var isWebA = (chA === 'ALL' || chA === 'ONLINE');
      var isWebB = (chB === 'ALL' || chB === 'ONLINE');
      if (isWebA && !isWebB) return -1;
      if (!isWebA && isWebB) return 1;
      var numA = (a.online_sort_order !== null && a.online_sort_order !== undefined) ? parseInt(a.online_sort_order) : parseInt(a.sort_order || 99);
      var numB = (b.online_sort_order !== null && b.online_sort_order !== undefined) ? parseInt(b.online_sort_order) : parseInt(b.sort_order || 99);
      return numA - numB;
    } else {
      var isPosA = (chA === 'ALL' || chA === 'POS');
      var isPosB = (chB === 'ALL' || chB === 'POS');
      if (isPosA && !isPosB) return -1;
      if (!isPosA && isPosB) return 1;
      var pNumA = parseInt(a.sort_order || 99);
      var pNumB = parseInt(b.sort_order || 99);
      return pNumA - pNumB;
    }
  });

  sortedList.forEach(function(p) {
    var imgUrl = p.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
    var curr = (p.currency || 'KHR').toUpperCase();
    var rawWholesale = parseFloat(p.price || 0);
    var rawOnline = parseFloat(p.online_price || p.price || 0);
    var rawCost = parseFloat(p.cost || 0);

    // 🪙 គណនាបំប្លែងលុយខ្មែរ (៛) ស្វ័យប្រវត្តិតាមរូបិយប័ណ្ណ
    var wholesaleKhr = rawWholesale;
    var onlineKhr = rawOnline;
    var costKhr = rawCost;

    var prWholesaleText = '';
    var prOnlineText = '';
    var costText = '';

    if (curr === 'USD') {
      wholesaleKhr = Math.round(rawWholesale * rateUSD);
      onlineKhr = Math.round(rawOnline * rateUSD);
      costKhr = Math.round(rawCost * rateUSD);
      prWholesaleText = '$ ' + rawWholesale.toFixed(2) + ' <span class="text-emerald-700 font-bold">(≈ ៛ ' + wholesaleKhr.toLocaleString() + ')</span>';
      prOnlineText = '$ ' + rawOnline.toFixed(2) + ' <span class="text-emerald-700 font-bold">(≈ ៛ ' + onlineKhr.toLocaleString() + ')</span>';
      costText = rawCost > 0 ? ('$ ' + rawCost.toFixed(2) + ' <small class="text-slate-500 font-normal block">(≈ ៛ ' + costKhr.toLocaleString() + ')</small>') : '-';
    } else if (curr === 'THB') {
      wholesaleKhr = Math.round(rawWholesale * rateTHB);
      onlineKhr = Math.round(rawOnline * rateTHB);
      costKhr = Math.round(rawCost * rateTHB);
      prWholesaleText = '฿ ' + rawWholesale.toLocaleString() + ' <span class="text-amber-800 font-bold">(≈ ៛ ' + wholesaleKhr.toLocaleString() + ')</span>';
      prOnlineText = '฿ ' + rawOnline.toLocaleString() + ' <span class="text-amber-800 font-bold">(≈ ៛ ' + onlineKhr.toLocaleString() + ')</span>';
      costText = rawCost > 0 ? ('฿ ' + rawCost.toLocaleString() + ' <small class="text-slate-500 font-normal block">(≈ ៛ ' + costKhr.toLocaleString() + ')</small>') : '-';
    } else {
      prWholesaleText = '៛ ' + wholesaleKhr.toLocaleString();
      prOnlineText = '៛ ' + onlineKhr.toLocaleString();
      costText = rawCost > 0 ? ('៛ ' + costKhr.toLocaleString()) : '-';
    }

    var ch = String(p.channel || 'ALL').toUpperCase();
    var chBadge = (ch === 'ONLINE') ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300">🌐 Web</span>' :
                  (ch === 'POS') ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">🚚 ដេប៉ូ</span>' :
                  '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">🔄 ទាំងពីរ</span>';

    var stockDisplay = (p.type === 'ផលិតឯង') ? '<span class="text-blue-700 font-bold text-xs">-</span>' : 
      ('<span class="font-black ' + (parseFloat(p.stock || 0) <= parseFloat(p.min_stock || 5) ? 'text-red-600' : 'text-blue-800') + '">' + p.stock + '</span>');

    var isForPos = (ch === 'ALL' || ch === 'POS');
    var isForWeb = (ch === 'ALL' || ch === 'ONLINE');

    var sortPosNum = (p.sort_order !== null && p.sort_order !== undefined && p.sort_order !== '') ? parseInt(p.sort_order) : 99;
    var sortWebNum = (p.online_sort_order !== null && p.online_sort_order !== undefined && p.online_sort_order !== '') ? parseInt(p.online_sort_order) : sortPosNum;

    // ⚡ រចនាបថប៊ូតុង ⬆️ ⬇️ រៀបលំដាប់រហ័សតាម Tab ដែលកំពុងបើក
    var sortControlHtml = '';

    if (isWebTab) {
      if (isForWeb) {
        sortControlHtml = '<div class="flex items-center justify-center gap-1">' +
          '<button type="button" onclick="moveProductSort(\'' + p.id + '\', \'UP\')" class="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 flex items-center justify-center text-[10px] active:scale-90 transition shadow-2xs font-bold" title="រុញឡើងលើ"><i class="fas fa-chevron-up"></i></button>' +
          '<input type="number" value="' + sortWebNum + '" onchange="quickUpdateSortWeb(\'' + p.id + '\', this.value)" class="w-10 text-center font-black text-emerald-900 border-2 border-emerald-300 focus:border-emerald-600 rounded-lg py-0.5 text-xs outline-none bg-white shadow-2xs" title="វាយលេខរៀង Web ផ្ទាល់">' +
          '<button type="button" onclick="moveProductSort(\'' + p.id + '\', \'DOWN\')" class="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 flex items-center justify-center text-[10px] active:scale-90 transition shadow-2xs font-bold" title="រុញចុះក្រោម"><i class="fas fa-chevron-down"></i></button>' +
        '</div>' +
        '<span class="text-[9px] text-slate-400 block mt-0.5">POS: #' + sortPosNum + '</span>';
      } else {
        sortControlHtml = '<span class="text-[9.5px] text-slate-400 italic bg-slate-100 px-1.5 py-0.5 rounded">មិនដាក់លើ Web</span>';
      }
    } else {
      if (isForPos) {
        sortControlHtml = '<div class="flex items-center justify-center gap-1">' +
          '<button type="button" onclick="moveProductSort(\'' + p.id + '\', \'UP\')" class="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-200 text-blue-800 border border-blue-300 flex items-center justify-center text-[10px] active:scale-90 transition shadow-2xs font-bold" title="រុញឡើងលើ"><i class="fas fa-chevron-up"></i></button>' +
          '<input type="number" value="' + sortPosNum + '" onchange="quickUpdateSortPos(\'' + p.id + '\', this.value)" class="w-10 text-center font-black text-blue-900 border-2 border-blue-300 focus:border-blue-600 rounded-lg py-0.5 text-xs outline-none bg-white shadow-2xs" title="វាយលេខរៀង POS ផ្ទាល់">' +
          '<button type="button" onclick="moveProductSort(\'' + p.id + '\', \'DOWN\')" class="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-200 text-blue-800 border border-blue-300 flex items-center justify-center text-[10px] active:scale-90 transition shadow-2xs font-bold" title="រុញចុះក្រោម"><i class="fas fa-chevron-down"></i></button>' +
        '</div>' +
        '<span class="text-[9px] text-slate-400 block mt-0.5">Web: #' + sortWebNum + '</span>';
      } else {
        sortControlHtml = '<span class="text-[9.5px] text-slate-400 italic bg-slate-100 px-1.5 py-0.5 rounded">មិនដាក់លើ POS</span>';
      }
    }

    html += '<tr class="border-b hover:bg-gray-50">' +
      '<td class="p-2 text-center ' + (isWebTab ? 'bg-emerald-50/30' : 'bg-blue-50/30') + ' whitespace-nowrap">' +
        sortControlHtml +
      '</td>' +
      '<td class="p-2.5"><img src="' + imgUrl + '" class="w-9 h-9 object-contain rounded border"></td>' +
      '<td class="p-2.5 font-bold text-gray-800">' + 
        p.name + 
        '<br><span class="text-[9px] text-gray-400 font-normal">' + p.type + ' | ' + curr + '</span>' +
      '</td>' +
      '<td class="p-2.5 text-center">' + chBadge + '</td>' +
      '<td class="p-2.5 text-center text-[10.5px] leading-tight">' + 
        '<div>🚚 ' + prWholesaleText + '</div>' + 
        '<div class="mt-0.5">🌐 ' + prOnlineText + '</div>' + 
      '</td>' +
      '<td class="p-2.5 text-center">' + stockDisplay + '</td>' +
      '<td class="p-2.5 text-center"><div class="flex items-center justify-center gap-2">' +
        '<button onclick="prepareEditProduct(\'' + p.id + '\')" class="text-blue-600 hover:text-blue-800 p-1" title="កែប្រែ"><i class="fas fa-edit text-xs"></i></button>' +
        '<button onclick="delProductFromSupabase(\'' + p.id + '\')" class="text-red-500 hover:text-red-700 p-1" title="លុប"><i class="fas fa-trash-can text-xs"></i></button>' +
      '</div></td>' +
    '</tr>';
  });

  tbody.innerHTML = html || '<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">គ្មានទំនិញក្នុងស្តុកឡើយ</td></tr>';
}

// ⚡ មុខងារចុចរុញទំនិញឡើងលើ ⬆️ ឬចុះក្រោម ⬇️ (ដោះដូរលេខរៀងអូតូ ១ ឃ្លីក គ្មានថ្ងៃស្ទួនលេខឡើយ)
async function moveProductSort(prodId, direction) {
  var isWeb = (currentStockViewTab === 'WEB');
  
  // ១. ស្រង់ទំនិញដែលត្រូវនឹងប៉ុស្តិ៍ (Web ឬ POS)
  var list = allProducts.filter(function(p) {
    var ch = String(p.channel || 'ALL').toUpperCase();
    return isWeb ? (ch === 'ALL' || ch === 'ONLINE') : (ch === 'ALL' || ch === 'POS');
  });

  // ២. តម្រៀបតាមលេខរៀងបច្ចុប្បន្ន
  list.sort(function(a, b) {
    var numA = isWeb ? ((a.online_sort_order !== null && a.online_sort_order !== undefined) ? parseInt(a.online_sort_order) : parseInt(a.sort_order || 99)) : parseInt(a.sort_order || 99);
    var numB = isWeb ? ((b.online_sort_order !== null && b.online_sort_order !== undefined) ? parseInt(b.online_sort_order) : parseInt(b.sort_order || 99)) : parseInt(b.sort_order || 99);
    return numA - numB;
  });

  var curIndex = list.findIndex(p => p.id === prodId);
  if (curIndex === -1) return;

  var targetIndex = (direction === 'UP') ? curIndex - 1 : curIndex + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return; // ដល់កំពូល ឬដល់បាតហើយ

  // ៣. ដោះដូរលេខរៀងរវាងទំនិញទាំងពីរ (Swap Sort Numbers)
  var itemA = list[curIndex];
  var itemB = list[targetIndex];

  var sortA = isWeb ? parseInt(itemA.online_sort_order || itemA.sort_order || curIndex + 1) : parseInt(itemA.sort_order || curIndex + 1);
  var sortB = isWeb ? parseInt(itemB.online_sort_order || itemB.sort_order || targetIndex + 1) : parseInt(itemB.sort_order || targetIndex + 1);

  // បើលេខចាស់ស្មើគ្នា ឱ្យយកតាម Index + 1
  if (sortA === sortB) {
    sortA = curIndex + 1;
    sortB = targetIndex + 1;
  }

  showToast((direction === 'UP' ? '⬆️ រុញឡើងលើ...' : '⬇️ រុញចុះក្រោម...'), 'info');

  try {
    if (isWeb) {
      itemA.online_sort_order = sortB;
      itemB.online_sort_order = sortA;
      await supabaseClient.from('settings').upsert([
        { key: 'ONLINE_SORT_' + itemA.id, value: String(sortB) },
        { key: 'ONLINE_SORT_' + itemB.id, value: String(sortA) }
      ]);
    } else {
      itemA.sort_order = sortB;
      itemB.sort_order = sortA;
      await supabaseClient.from('products').update({ sort_order: sortB }).eq('id', itemA.id);
      await supabaseClient.from('products').update({ sort_order: sortA }).eq('id', itemB.id);
    }

    renderStockTableRows();
    showToast("បានប្តូរលំដាប់ជោគជ័យ!", "success");

  } catch(e) {
    showToast("កំហុសប្តូរលេខរៀង៖ " + e.message, "error");
  }
}

// ⚡ ២. មុខងារ Update លេខ Web (រុញលេខស្ទួនអូតូ)
async function quickUpdateSortWeb(prodId, val) {
  var s = parseInt(val) || 1;
  try {
    var cur = allProducts.find(i => i.id === prodId);
    if (cur) cur.online_sort_order = s;
    await supabaseClient.from('settings').upsert([{ key: 'ONLINE_SORT_' + prodId, value: String(s) }]);

    var webItems = allProducts.filter(p => {
      var ch = String(p.channel || 'ALL').toUpperCase();
      return (ch === 'ALL' || ch === 'ONLINE') && p.id !== prodId;
    });

    var conflicts = webItems.filter(p => parseInt(p.online_sort_order || p.sort_order) === s);
    for (var j = 0; j < conflicts.length; j++) {
      var nextWebS = s + j + 1;
      conflicts[j].online_sort_order = nextWebS;
      await supabaseClient.from('settings').upsert([{ key: 'ONLINE_SORT_' + conflicts[j].id, value: String(nextWebS) }]);
    }

    showToast("បានប្តូរលេខ Web ទៅ #" + s + " ជោគជ័យ!", "success");
    renderStockTableRows();
  } catch(e) {
    showToast("កំហុស៖ " + e.message, "error");
  }
}

// ⚡ ៣. ប៊ូតុងវេទមន្ត៖ រៀបចំលេខរៀងឡើងវិញទាំងអស់ (1, 2, 3, 4, 5...) គ្មានលេខស្ទួន & លឿនដូចផ្លេកបន្ទោរ
async function autoFixAllSortDuplicates() {
  // 🛡️ សួរបញ្ជាក់ Admin តាមផ្ទាំង Pop-up KC POS
  var ok = true;
  if (typeof kcConfirm === 'function') {
    ok = await kcConfirm({
      title: "រៀបចំលេខរៀងស្វ័យប្រវត្តិ",
      message: "តើអ្នកចង់ឱ្យប្រព័ន្ធរៀបចំលេខរៀងទំនិញទាំង POS និង Web ឡើងវិញពី 1, 2, 3... ដោយស្វ័យប្រវត្តិមែនទេ?",
      type: "info",
      confirmText: "យល់ព្រមរៀបចំ"
    });
  } else {
    ok = confirm("តើអ្នកចង់ឱ្យប្រព័ន្ធរៀបចំលេខរៀងឡើងវិញដោយស្វ័យប្រវត្តិមែនទេ?");
  }

  if (!ok) return;

  showToast("កំពុងរៀបចំលេខរៀងកុំឱ្យស្ទួន...", "info");

  try {
    // ក. រៀបចំលេខ POS ឡើងវិញ (1, 2, 3...)
    var posItems = allProducts.filter(p => {
      var ch = String(p.channel || 'ALL').toUpperCase();
      return ch === 'ALL' || ch === 'POS';
    }).sort((a, b) => (parseInt(a.sort_order) || 99) - (parseInt(b.sort_order) || 99));

    for (var i = 0; i < posItems.length; i++) {
      var nPos = i + 1;
      posItems[i].sort_order = nPos;
      await supabaseClient.from('products').update({ sort_order: nPos }).eq('id', posItems[i].id);
    }

    // ខ. រៀបចំលេខ Web ឡើងវិញ (1, 2, 3...) ដោយបាញ់ចូល Database តែម្តងគត់ (Batch Upsert 10x Faster)
    var webItems = allProducts.filter(p => {
      var ch = String(p.channel || 'ALL').toUpperCase();
      return ch === 'ALL' || ch === 'ONLINE';
    }).sort((a, b) => (parseInt(a.online_sort_order || a.sort_order) || 99) - (parseInt(b.online_sort_order || b.sort_order) || 99));

    var webSettingBatch = [];
    for (var j = 0; j < webItems.length; j++) {
      var nWeb = j + 1;
      webItems[j].online_sort_order = nWeb;
      webSettingBatch.push({ key: 'ONLINE_SORT_' + webItems[j].id, value: String(nWeb) });
    }

    if (webSettingBatch.length > 0) {
      await supabaseClient.from('settings').upsert(webSettingBatch);
    }

    renderStockTableRows();

    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "រៀបចំលេខរៀងជោគជ័យ! 🎉",
        message: "លេខរៀងទំនិញទាំង POS និង Web ត្រូវបានរៀបចំឡើងវិញតាមលំដាប់លំដោយ 1, 2, 3, 4... យ៉ាងស្អាត គ្មានលេខស្ទួនទៀតឡើយ!",
        type: "success",
        confirmText: "យល់ព្រម"
      });
    } else {
      showToast("🎉 បានតម្រៀបលេខរៀងទាំង POS និង Web ឡើងវិញរលូន ១០០%!", "success");
    }

  } catch(e) {
    showToast("កំហុស៖ " + e.message, "error");
  }
}

// 🔄 ទាញលេខ Web ពី Database មកបញ្ចូលលើ allProducts ជានិច្ច
async function syncOnlineSortsFromDatabase() {
  try {
    const { data: setList } = await supabaseClient.from('settings').select('key, value').like('key', 'ONLINE_SORT_%');
    var map = {};
    (setList || []).forEach(r => { map[r.key.replace('ONLINE_SORT_', '')] = parseInt(r.value); });
    allProducts.forEach(p => {
      if (map[p.id] !== undefined) p.online_sort_order = map[p.id];
    });
  } catch(e) {}
}
// 🧹 មុខងារជម្រះប្រអប់បញ្ចូលទិន្នន័យទំនិញឱ្យនៅទទេស្អាត ១០០% ត្រៀមបញ្ចូលទំនិញថ្មី (ជួសជុល bug រួចរាល់)
function cancelEditProduct() {
  editingProductId = null;
  
  var titleEl = document.getElementById('prodFormTitle');
  if (titleEl) {
    titleEl.innerHTML = '<i class="fas fa-boxes-stacked text-green-600"></i>គ្រប់គ្រងទំនិញ (Products)';
  }
  
  var btnCancel = document.getElementById('btnCancelEditProd');
  if (btnCancel) btnCancel.classList.add('hidden');

  var btn = document.getElementById('btnSaveProdAction');
  if (btn) {
    btn.innerText = 'រក្សាទុកទំនិញ (Save Product)';
    btn.className = 'btn-green py-3 text-sm font-bold shadow-md';
    btn.disabled = false;
  }

  // 🔢 គណនាលេខរៀងបន្ទាប់សម្រាប់ទំនិញថ្មី
  var nextSortNum = (allProducts && allProducts.length > 0) ? (allProducts.length + 1) : 1;

  // 🧼 ជម្រះគ្រប់ប្រអប់ឱ្យទទេស្អាតទាំងអស់
  if (document.getElementById('pI')) document.getElementById('pI').value = 'P-' + Math.floor(Math.random() * 9000 + 1000);
  if (document.getElementById('pN')) document.getElementById('pN').value = '';
  if (document.getElementById('pTy')) document.getElementById('pTy').value = 'ទិញគេ';
  if (document.getElementById('pCu')) document.getElementById('pCu').value = 'KHR';
  if (document.getElementById('pCo')) document.getElementById('pCo').value = '';
  if (document.getElementById('pChannel')) document.getElementById('pChannel').value = 'ALL';
  if (document.getElementById('pCategory')) document.getElementById('pCategory').value = 'GROCERY';
  if (document.getElementById('pBadge')) document.getElementById('pBadge').value = 'គុណភាពខ្ពស់';
  if (document.getElementById('pPr')) document.getElementById('pPr').value = '';
  if (document.getElementById('pOnlinePr')) document.getElementById('pOnlinePr').value = '';
  if (document.getElementById('pSortPos')) document.getElementById('pSortPos').value = nextSortNum;
  if (document.getElementById('pSortOnline')) document.getElementById('pSortOnline').value = nextSortNum;
  if (document.getElementById('pDesc')) document.getElementById('pDesc').value = '';
  if (document.getElementById('pMin')) document.getElementById('pMin').value = 5;

  // 🖼️ សម្អាតប្រអប់រូបភាព
  if (document.getElementById('pImgPreview')) {
    document.getElementById('pImgPreview').src = 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png';
  }
  if (document.getElementById('pImgBase64')) document.getElementById('pImgBase64').value = '';
  if (document.getElementById('pImgFileInput')) document.getElementById('pImgFileInput').value = '';
  if (document.getElementById('pImgNote')) document.getElementById('pImgNote').innerText = 'អាចថតរូប ឬជ្រើសរូបភាពពីទូរស័ព្ទ';

  if (typeof tCF === 'function') tCF();
  if (typeof toggleChannelPrices === 'function') toggleChannelPrices();

  // 🎯 ដាក់ Cursor ឱ្យមកចាំនៅប្រអប់ឈ្មោះទំនិញអូតូ ងាយស្រួលវាយទំនិញបន្ទាប់ភ្លាមៗ
  var nameInp = document.getElementById('pN');
  if (nameInp) setTimeout(function() { nameInp.focus(); }, 150);
}

// 📋 មុខងាររៀបចំកែប្រែទំនិញ (ទាញ Category, Description & បង្ហាញការបំប្លែងលុយខ្មែរភ្លាមៗ)
async function prepareEditProduct(id) {
  var p = allProducts.find(item => item.id === id);
  if (!p) return;
  editingProductId = p.id;

  var titleEl = document.getElementById('prodFormTitle');
  var cancelBtn = document.getElementById('btnCancelEditProd');
  var btn = document.getElementById('btnSaveProdAction');

  if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit text-blue-600"></i>កែសម្រួលទំនិញ៖ ' + p.name;
  if (cancelBtn) cancelBtn.classList.remove('hidden');

  if (btn) {
    btn.innerText = 'ធ្វើបច្ចុប្បន្នភាពទំនិញ (Update)';
    btn.className = 'btn-green bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold shadow-md';
  }

  document.getElementById('pI').value = p.id;
  document.getElementById('pN').value = p.name;
  document.getElementById('pTy').value = p.type;
  document.getElementById('pCu').value = p.currency || 'KHR';
  if (document.getElementById('pCo')) document.getElementById('pCo').value = p.cost || '';
  document.getElementById('pPr').value = p.price || 0;
  document.getElementById('pOnlinePr').value = p.online_price || p.price || 0;
  document.getElementById('pMin').value = p.min_stock || 5;
  document.getElementById('pChannel').value = p.channel || 'ALL';

  // 🔢 កំណត់លេខរៀង POS និង Web
  var sortPosVal = (p.sort_order !== undefined && p.sort_order !== null && p.sort_order !== '') ? parseInt(p.sort_order) : 1;
  var sortOnlineVal = (p.online_sort_order !== undefined && p.online_sort_order !== null && p.online_sort_order !== '') ? parseInt(p.online_sort_order) : sortPosVal;
  
  if (document.getElementById('pSortPos')) document.getElementById('pSortPos').value = sortPosVal;
  if (document.getElementById('pSortOnline')) document.getElementById('pSortOnline').value = sortOnlineVal;

  // 📂 ទាញយក Category, Badge និង Description
  var catInp = document.getElementById('pCategory');
  var badgeInp = document.getElementById('pBadge');
  var descInp = document.getElementById('pDesc');
  if (badgeInp) badgeInp.value = p.badge || 'គុណភាពខ្ពស់';
  if (descInp) descInp.value = p.description || p.desc || '';
  if (catInp) catInp.value = p.category || 'GROCERY';

  try {
    const { data: setDesc } = await supabaseClient.from('settings').select('value').eq('key', 'DESC_' + p.id).maybeSingle();
    if (setDesc && setDesc.value && descInp) descInp.value = setDesc.value;

    const { data: setBadge } = await supabaseClient.from('settings').select('value').eq('key', 'BADGE_' + p.id).maybeSingle();
    if (setBadge && setBadge.value && badgeInp) badgeInp.value = setBadge.value;

    const { data: setCat } = await supabaseClient.from('settings').select('value').eq('key', 'CAT_' + p.id).maybeSingle();
    if (setCat && setCat.value && catInp) catInp.value = setCat.value;

    const { data: setWebSort } = await supabaseClient.from('settings').select('value').eq('key', 'ONLINE_SORT_' + p.id).maybeSingle();
    if (setWebSort && setWebSort.value && document.getElementById('pSortOnline')) {
      document.getElementById('pSortOnline').value = setWebSort.value;
      p.online_sort_order = parseInt(setWebSort.value);
    }
  } catch(e) {}

  var preview = document.getElementById('pImgPreview');
  if (preview) preview.src = p.img || 'https://cdn-icons-png.flaticon.com/512/3100/3100566.png';
  document.getElementById('pImgBase64').value = p.img || '';

  tCF();
  toggleChannelPrices();

  // 🪙 ដំណើរការគណនាបំប្លែងលុយខ្មែរភ្លាមៗលើអេក្រង់កែប្រែ
  if (typeof updateProductCostPreviewLive === 'function') {
    updateProductCostPreviewLive();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 💾 រក្សាទុកទំនិញ (ដោះស្រាយបញ្ហាលេខរៀង POS & Web ឱ្យត្រឹមត្រូវ ១០០%)
async function saveProductToSupabase() {
  var name = document.getElementById('pN').value.trim();
  if (!name) { showToast("សូមបញ្ចូលឈ្មោះទំនិញ!", "error"); return; }

  var prodId = document.getElementById('pI').value;
  var imgData = document.getElementById('pImgBase64').value || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
  var descVal = document.getElementById('pDesc') ? document.getElementById('pDesc').value.trim() : '';
  var badgeVal = document.getElementById('pBadge') ? document.getElementById('pBadge').value : 'គុណភាពខ្ពស់';
  var catVal = document.getElementById('pCategory') ? document.getElementById('pCategory').value : 'GROCERY';
  
  // 🔢 ទាញយកលេខរៀងពិតប្រាកដពីប្រអប់លើអេក្រង់
  var sortPosNum = parseInt(document.getElementById('pSortPos') ? document.getElementById('pSortPos').value || 1 : 1);
  var sortOnlineNum = parseInt(document.getElementById('pSortOnline') ? document.getElementById('pSortOnline').value || sortPosNum : sortPosNum);

  var payload = {
    id: prodId,
    name: name,
    type: document.getElementById('pTy').value,
    currency: document.getElementById('pCu').value,
    cost: parseFloat(document.getElementById('pCo') ? document.getElementById('pCo').value || 0 : 0),
    price: parseFloat(document.getElementById('pPr').value || 0),
    online_price: parseFloat(document.getElementById('pOnlinePr').value || 0),
    min_stock: parseFloat(document.getElementById('pMin').value || 5),
    channel: document.getElementById('pChannel').value,
    sort_order: sortPosNum, // 🚚 លេខរៀងសម្រាប់ POS
    img: imgData
  };

  var btn = document.getElementById('btnSaveProdAction');
  btn.disabled = true;

  try {
    // 🔄 ការពារកុំឱ្យស្ទួនលេខរៀង POS៖ បើមានទំនិញចាស់ផ្សេងទៀតជាប់លេខរៀងនេះ រំកិលវាចុះក្រោមអូតូ
    var targetId = editingProductId || prodId;
    var conflictingItems = allProducts.filter(function(item) {
      return item.id !== targetId && parseInt(item.sort_order) === sortPosNum;
    });

    if (conflictingItems.length > 0) {
      for (var c = 0; c < conflictingItems.length; c++) {
        var shiftedSort = sortPosNum + c + 1;
        await supabaseClient.from('products').update({ sort_order: shiftedSort }).eq('id', conflictingItems[c].id);
        conflictingItems[c].sort_order = shiftedSort;
      }
    }

    if (editingProductId) {
      await supabaseClient.from('products').update(payload).eq('id', editingProductId);
    } else {
      payload.stock = 0;
      await supabaseClient.from('products').insert([payload]);
    }

    // 🌐 រក្សាទុក Description, Badge, Category និងលេខរៀង Web ចូលតារាង Settings
    var settingRows = [
      { key: 'DESC_' + prodId, value: descVal },
      { key: 'BADGE_' + prodId, value: badgeVal },
      { key: 'CAT_' + prodId, value: catVal },
      { key: 'ONLINE_SORT_' + prodId, value: String(sortOnlineNum) }
    ];
    await supabaseClient.from('settings').upsert(settingRows);

    showToast(editingProductId ? "បានធ្វើបច្ចុប្បន្នភាពទំនិញជោគជ័យ!" : "បានបង្កើតទំនិញថ្មីជោគជ័យ!", "success");
    cancelEditProduct();
    await fetchInitialPOSData();
    if (typeof syncOnlineSortsFromDatabase === 'function') {
      await syncOnlineSortsFromDatabase();
    }
    renderStockTableRows();
    initStockModuleDropdowns();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// 💾 មុខងារបញ្ចូលស្តុកទំនិញថ្មី (គណនាបំប្លែងលុយថៃ ฿ និងដុល្លារ $ ចេញជាលុយខ្មែរ ៛ ក្នុងសារ Telegram)
async function saveStockInToSupabase() {
  var id = document.getElementById('si_prod') ? document.getElementById('si_prod').value : '';
  var qtyInp = document.getElementById('si_qty');
  var costInp = document.getElementById('si_cost');
  var hint = document.getElementById('si_cost_hint');

  var qty = parseFloat(qtyInp ? qtyInp.value || 0 : 0);
  var cost = parseFloat(costInp ? costInp.value || 0 : 0);

  if (!id || qty <= 0) { 
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "ខ្វះព័ត៌មាន",
        message: "សូមជ្រើសរើសទំនិញ និងបញ្ចូលចំនួនទិញចូលធំជាង ០!",
        type: "warning"
      });
    } else {
      showToast("សូមជ្រើសរើសទំនិញ និងបញ្ចូលចំនួនទិញចូល!", "error"); 
    }
    return; 
  }

  var prod = allProducts.find(p => p.id === id);
  if (!prod) return;

  var btn = document.getElementById('btnSaveStockInAction');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងបញ្ចូលស្តុក...';
  }

  try {
    var newStock = parseFloat(prod.stock || 0) + qty;
    var updateObj = { stock: newStock };
    if (cost > 0) updateObj.cost = cost;

    await supabaseClient.from('products').update(updateObj).eq('id', id);
    await supabaseClient.from('stock_in').insert([{
      product_id: id,
      product_name: prod.name,
      qty: qty,
      cost: cost > 0 ? cost : (prod.cost || 0),
      admin_name: currentUser.fullName || "Admin"
    }]);

    // អាប់ដេតទិន្នន័យក្នុង Memory ភ្លាមៗ
    prod.stock = newStock;
    if (cost > 0) prod.cost = cost;

    // 🔔 រៀបចំសារ Telegram ដោយបំប្លែងលុយថៃ ฿ ឬដុល្លារ $ ចេញជាលុយខ្មែរ ៛ ស្វ័យប្រវត្តិ
    try {
      var curr = (prod.currency || 'KHR').toUpperCase();
      var rateUSD = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
      var rateTHB = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;
      
      var actualCost = cost > 0 ? cost : (prod.cost || 0);
      var costTgDisplay = '';

      if (actualCost > 0) {
        if (curr === 'USD') {
          var khrUsd = Math.round(actualCost * rateUSD);
          costTgDisplay = "$ " + actualCost.toFixed(2) + " (≈ ៛ " + khrUsd.toLocaleString() + ")";
        } else if (curr === 'THB') {
          var khrThb = Math.round(actualCost * rateTHB);
          costTgDisplay = "฿ " + actualCost.toLocaleString() + " (≈ ៛ " + khrThb.toLocaleString() + ")";
        } else {
          costTgDisplay = "៛ " + actualCost.toLocaleString();
        }
      }

      var tgMsg = "📦 <b>[KC WATER - បញ្ចូលស្តុកថ្មី]</b>\n\n" +
                  "• ទំនិញ៖ <b>" + prod.name + "</b>\n" +
                  "• ចំនួនទិញចូល៖ <b>+" + qty + "</b>\n" +
                  (costTgDisplay ? ("• ថ្លៃដើមទិញចូល៖ <b>" + costTgDisplay + "</b>\n") : "") +
                  "• ស្តុកសរុបបច្ចុប្បន្ន៖ <b>" + newStock + "</b>\n" +
                  "• អ្នកកត់ត្រា៖ " + (currentUser.fullName || "Admin") + "\n" +
                  "🕒 ម៉ោង៖ " + new Date().toLocaleTimeString('km-KH');
      sendTelegramAlert(tgMsg);
    } catch(e) {}

    showToast("បានបញ្ចូលស្តុក [" + prod.name + "] ចំនួន +" + qty + " ជោគជ័យ!", "success");
    if (qtyInp) qtyInp.value = '';
    if (costInp) costInp.value = '';
    if (hint) hint.innerText = '';

    await fetchInitialPOSData();
    renderStockTableRows();

  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'យល់ព្រមបញ្ចូលស្តុក';
    }
  }
}

async function delProductFromSupabase(id) {
  // 🌟 ប្រើ Pop-up បញ្ជាក់ការលុបបែប Danger ពណ៌ក្រហមរបស់ KC POS
  var ok = await kcConfirm({
    title: "បញ្ជាក់ការលុបទំនិញ",
    message: "តើអ្នកពិតជាចង់លុបទំនិញនេះចេញពីស្តុកមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។",
    type: "danger",
    confirmText: "យល់ព្រមលុប"
  });
  if (!ok) return;

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
  // 🌟 ប្រើ Pop-up ថ្មីរបស់ KC POS មានប្រអប់វាយលេខធំៗ ស្រួលចុចលើទូរស័ព្ទ
  var val = await kcPrompt({
    title: "សងសំបកធុងទឹក",
    message: "អតិថិជននៅជំពាក់ " + remaining + " ធុង។ សូមវាយចំនួនសងខាងក្រោម៖",
    defaultValue: remaining,
    confirmText: "យល់ព្រមសង",
    inputType: "number"
  });

  if (val === null || val === "") return;
  var returnQty = parseFloat(val);
  if (isNaN(returnQty) || returnQty <= 0) return;

  var newReturned = returned + returnQty;
  var newStatus = (newReturned >= borrowed) ? 'Returned' : 'Borrowing';

  try {
    await supabaseClient.from('bottle_loans').update({
      returned_qty: newReturned,
      status: newStatus
    }).eq('loan_id', loanId);

    showToast("បានកត់ត្រាការសងសំបកធុងជោគជ័យ!", "success");
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
  // 🌟 ប្រើ Pop-up បញ្ជាក់ការលុបបែប Danger ពណ៌ក្រហមរបស់ KC POS
  var ok = await kcConfirm({
    title: "បញ្ជាក់ការលុបចំណាយ",
    message: "តើអ្នកពិតជាចង់លុបកំណត់ត្រាចំណាយនេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។",
    type: "danger",
    confirmText: "យល់ព្រមលុប"
  });
  if (!ok) return;

  try {
    await supabaseClient.from('expenses').delete().eq('expense_id', id);
    showToast("បានលុបការចំណាយជោគជ័យ!", "success");
    fetchExpensesHistory();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}
// ==========================================
// 👥 ៤. គ្រប់គ្រងគណនី & តម្លៃពិសេស (ពេញលេញ ១០០%)
// ==========================================
var editingCustomerId = null;

function renderCustomersModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;
  editingCustomerId = null;
  
  // ១. បញ្ជីឈ្មោះម៉ូយទាំងអស់
  var custOptions = '<option value="">-- រើសអតិថិជន / ម៉ូយ --</option>';
  (allCustomers || []).forEach(function(c) {
    if (c.role !== 'Admin' && c.full_name !== 'Walk-in') {
      var tag = (c.type === 'Monthly') ? ' [ប្រចាំខែ]' : (c.type === 'Retail' ? ' [Online តាមផ្ទះ]' : ' [អ្នកលក់បន្ត]');
      custOptions += '<option value="' + c.full_name + '">' + c.full_name + tag + '</option>';
    }
  });

  // ២. បញ្ជីទំនិញ
  var prodOptions = '<option value="">-- រើសទំនិញ --</option>';
  (allProducts || []).forEach(function(p) {
    prodOptions += '<option value="' + p.name + '">' + p.name + '</option>';
  });

  // ៣. បញ្ជីឈ្មោះមេ (បង្ហាញតែអ្នកលក់បន្ត Reseller សម្រាប់កូនចៅដកទឹកជំនួសមេ)
  var bossOptions = '<option value="">-- ជ្រើសរើសពីបញ្ជីអ្នកលក់បន្ត (Reseller) ឬវាយខាងក្រោម --</option>';
  (allCustomers || []).forEach(function(c) {
    var isReseller = (c.type === 'Regular' || c.role === 'Customer') && c.type !== 'Monthly' && c.type !== 'Retail' && c.role !== 'Admin' && c.full_name !== 'Walk-in';
    if (isReseller) {
      bossOptions += '<option value="' + c.full_name + '">' + c.full_name + ' [អ្នកលក់បន្ត]</option>';
    }
  });

  // ៤. បញ្ជីអតិថិជនប្រចាំខែ Monthly (សម្រាប់កំណត់តម្លៃកុងត្រាពិសេស)
  var monthlyCustOptions = '<option value="">-- រើសអតិថិជនប្រចាំខែ (Monthly) --</option>';
  var monthlyCount = 0;
  (allCustomers || []).forEach(function(c) {
    if (c.type === 'Monthly' && c.role !== 'Admin') {
      monthlyCustOptions += '<option value="' + c.full_name + '">' + c.full_name + ' [ប្រចាំខែ]</option>';
      monthlyCount++;
    }
  });
  if (monthlyCount === 0) {
    monthlyCustOptions = '<option value="">-- មិនទាន់មានអតិថិជន Monthly ទេ (សូមបង្កើតខាងលើ) --</option>';
  }

  area.innerHTML = '<div class="max-w-3xl mx-auto space-y-4">' +
    // កាត ១៖ បង្កើត/កែប្រែគណនី
    '<div class="card border-t-4 border-blue-600 shadow-xl p-5 mb-0">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<h2 id="custFormTitle" class="font-extrabold text-blue-900 text-base flex items-center gap-2">' +
          '<i class="fas fa-user-plus text-blue-600"></i>បង្កើតគណនី Admin / អ្នកដឹក / អតិថិជន' +
        '</h2>' +
        '<button type="button" id="btnCancelEditCust" onclick="cancelEditCustomer()" class="text-xs font-bold text-gray-500 hover:text-red-600 hidden">' +
          '<i class="fas fa-times mr-1"></i>បោះបង់ការកែប្រែ' +
        '</button>' +
      '</div>' +
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
          '<label class="text-[10px] font-black text-amber-950 uppercase block">ឈ្មោះមេ (អ្នកលក់បន្តដែលកូនចៅនេះមកដកទឹកជំនួស) *</label>' +
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

    // កាត ២៖ កំណត់តម្លៃពិសេស (សម្រាប់តែអតិថិជន Monthly)
    '<div class="card border-t-4 border-orange-500 shadow-xl p-5 mb-0">' +
      '<h3 class="font-extrabold text-orange-900 text-base mb-1 flex items-center gap-2">' +
        '<i class="fas fa-tags text-orange-600"></i>កំណត់តម្លៃពិសេសសម្រាប់អតិថិជនប្រចាំខែ (Contract Prices)' +
      '</h3>' +
      '<p class="text-[11px] text-gray-500 mb-3 leading-relaxed">' +
        '💡 <b>ចំណាំ៖</b> កំណត់មុខទំនិញ និងតម្លៃនៅទីនេះ ដើម្បីឱ្យទំនិញនោះបង្ហាញ និងចាក់សោរតម្លៃពេលលក់ឱ្យគាត់។' +
      '</p>' +
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">១. ជ្រើសរើសម៉ូយប្រចាំខែ (Monthly)</label>' +
          '<select id="spCustSelect" class="w-full font-bold border p-2.5 rounded-xl bg-white text-blue-950">' + monthlyCustOptions + '</select>' +
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

    // កាត ៣៖ តារាងតម្លៃពិសេស
    '<div class="card border-t-4 border-orange-400 shadow-lg p-5 mb-0">' +
      '<h4 class="font-bold text-gray-800 text-sm mb-2"><i class="fas fa-list-check text-orange-600 mr-1.5"></i>បញ្ជីតម្លៃពិសេសដែលបានកំណត់</h4>' +
      '<div class="overflow-x-auto rounded-xl border"><table class="w-full text-left text-xs border-collapse"><thead><tr class="bg-gray-100 text-gray-700 font-bold border-b"><th class="p-2.5">អតិថិជន</th><th class="p-2.5">មុខទំនិញ</th><th class="p-2.5 text-right">តម្លៃពិសេស</th><th class="p-2.5 text-center">លុប</th></tr></thead><tbody id="specialPricesTableBody"></tbody></table></div>' +
    '</div>' +

    // កាត ៤៖ 🔍 បញ្ជីគណនីទាំងអស់ (តារាងធំខាងក្រោមបង្អស់)
    '<div class="card border-t-4 border-gray-700 shadow-xl p-5 mb-0 space-y-3">' +
      '<div class="flex justify-between items-center">' +
        '<h3 class="font-bold text-gray-800 text-sm flex items-center gap-2"><i class="fas fa-users text-blue-600"></i>បញ្ជីគណនីទាំងអស់</h3>' +
        '<span id="userTotalCountBadge" class="text-xs font-black bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">0 នាក់</span>' +
      '</div>' +
      '<div class="relative">' +
        '<input type="text" id="custModuleSearchInp" oninput="filterUsersModuleTable()" placeholder="🔍 វាយឈ្មោះ, លេខទូរស័ព្ទ ឬ Username ដើម្បីស្វែងរកភ្លាមៗ..." class="w-full border-2 border-gray-200 rounded-xl p-2.5 pl-9 outline-none focus:border-blue-500 font-bold text-xs bg-slate-50 focus:bg-white">' +
        '<i class="fas fa-search absolute left-3 top-3.5 text-gray-400 text-xs pointer-events-none"></i>' +
      '</div>' +
      '<div class="flex flex-wrap gap-1.5 text-xs">' +
        '<button type="button" onclick="switchUserTab(\'ALL\')" id="uTab_ALL" class="px-2.5 py-1.5 rounded-xl font-bold bg-blue-700 text-white shadow-2xs active:scale-95 transition">ទាំងអស់</button>' +
        '<button type="button" onclick="switchUserTab(\'RESELLER\')" id="uTab_RESELLER" class="px-2.5 py-1.5 rounded-xl font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition">🚚 អ្នកលក់បន្ត</button>' +
        '<button type="button" onclick="switchUserTab(\'MONTHLY\')" id="uTab_MONTHLY" class="px-2.5 py-1.5 rounded-xl font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition">🏢 ប្រចាំខែ</button>' +
        '<button type="button" onclick="switchUserTab(\'RETAIL\')" id="uTab_RETAIL" class="px-2.5 py-1.5 rounded-xl font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 active:scale-95 transition">🌐 ភ្ញៀវ Online</button>' +
        '<button type="button" onclick="switchUserTab(\'DRIVER\')" id="uTab_DRIVER" class="px-2.5 py-1.5 rounded-xl font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition">🛵 អ្នកដឹក</button>' +
        '<button type="button" onclick="switchUserTab(\'STAFF\')" id="uTab_STAFF" class="px-2.5 py-1.5 rounded-xl font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition">👑 Staff/Admin</button>' +
      '</div>' +
      '<div class="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-gray-200 shadow-inner">' +
        '<table class="w-full text-left text-xs border-collapse">' +
          '<thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b z-10 shadow-2xs">' +
            '<tr><th class="p-2.5">ឈ្មោះ / ទូរស័ព្ទ</th><th class="p-2.5">ព័ត៌មានគណនី (Login)</th><th class="p-2.5 text-center">តួនាទី / ប្រភេទ</th><th class="p-2.5 text-center">សកម្មភាព</th></tr>' +
          '</thead>' +
          '<tbody id="usersModuleTableBody"></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
  '</div>';

  toggleCustTypeFields();
  fetchUsersModuleTable();
  fetchSpecialPricesTable();
}

// ✏️ មុខងាររៀបចំកែប្រែគណនី (ទាញទិន្នន័យឡើងប្រអប់ខាងលើ)
function prepareEditCustomer(id) {
  var u = cachedUsersModuleList.find(item => item.id == id);
  if (!u) return;
  editingCustomerId = u.id;

  var titleEl = document.getElementById('custFormTitle');
  var btnCancel = document.getElementById('btnCancelEditCust');
  var btnSave = document.getElementById('btnSaveUserAction');

  if (titleEl) titleEl.innerHTML = '<i class="fas fa-user-pen text-amber-600"></i>កែប្រែគណនី៖ ' + u.full_name;
  if (btnCancel) btnCancel.classList.remove('hidden');
  if (btnSave) {
    btnSave.innerText = 'ធ្វើបច្ចុប្បន្នភាពគណនី (Update Account)';
    btnSave.className = 'btn-green bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold shadow-md';
  }

  // បំពេញឈ្មោះ & លេខទូរស័ព្ទ
  document.getElementById('mem_name').value = u.full_name || '';
  document.getElementById('mem_phone').value = u.phone || '';

  // កំណត់ប្រភេទគណនី
  var roleSel = document.getElementById('mem_role_type');
  if (u.type === 'Monthly') roleSel.value = 'MONTHLY';
  else if (u.type === 'CompanyDriver') roleSel.value = 'COMPANY_DRIVER';
  else if (u.role === 'Driver') roleSel.value = 'DRIVER';
  else if (u.role === 'Seller') roleSel.value = 'SELLER';
  else if (u.role === 'Admin') roleSel.value = 'ADMIN';
  else roleSel.value = 'RESELLER';

  toggleCustTypeFields();

  // បំពេញកូនចៅមេ & ព័ត៌មាន Login
  if (u.role === 'Driver') {
    var bossInp = document.getElementById('mem_boss_custom');
    if (bossInp) bossInp.value = u.linked_boss || '';
  }

  var userInp = document.getElementById('mem_user');
  var passInp = document.getElementById('mem_pass');
  if (userInp) userInp.value = u.username || '';
  if (passInp) passInp.value = u.password || '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ❌ មុខងារបោះបង់ការកែប្រែគណនី
function cancelEditCustomer() {
  editingCustomerId = null;
  var titleEl = document.getElementById('custFormTitle');
  var btnCancel = document.getElementById('btnCancelEditCust');
  var btnSave = document.getElementById('btnSaveUserAction');

  if (titleEl) titleEl.innerHTML = '<i class="fas fa-user-plus text-blue-600"></i>បង្កើតគណនី Admin / អ្នកដឹក / អតិថិជន';
  if (btnCancel) btnCancel.classList.add('hidden');
  if (btnSave) {
    btnSave.innerText = 'រក្សាទុកគណនី (Save Account)';
    btnSave.className = 'btn-green shadow-lg py-3 text-sm font-bold';
  }

  document.getElementById('mem_name').value = '';
  document.getElementById('mem_phone').value = '';
  document.getElementById('mem_role_type').value = 'MONTHLY';
  toggleCustTypeFields();
  if (document.getElementById('mem_boss_custom')) document.getElementById('mem_boss_custom').value = '';
  if (document.getElementById('mem_user')) document.getElementById('mem_user').value = '';
  if (document.getElementById('mem_pass')) document.getElementById('mem_pass').value = '';
}
// 🛠️ មុខងារជំនួយទាញយកតម្លៃពី Input
function getElVal(id) {
  var el = document.getElementById(id);
  return el ? (el.value || '').trim() : '';
}

// ==========================================================================
// 👥 មុខងារគ្រប់គ្រងសិទ្ធិ & រក្សាទុកគណនី (ចាក់សោរ MONTHLY & COMPANY DRIVER ច្បាស់លាស់ ១០០%)
// ==========================================================================

function toggleCustTypeFields() {
  var roleType = getElVal('mem_role_type') || 'MONTHLY';
  var bossBox = document.getElementById('driverBossContainer');
  var loginBox = document.getElementById('loginCredsContainer');
  var userInp = document.getElementById('mem_user');
  var passInp = document.getElementById('mem_pass');

  // ១. បង្ហាញប្រអប់រើសឈ្មោះមេ តែចំពោះកូនចៅដកជំនួសមេ (DRIVER) ប៉ុណ្ណោះ
  if (bossBox) {
    if (roleType === 'DRIVER') {
      bossBox.classList.remove('hidden');
    } else {
      bossBox.classList.add('hidden');
      if (document.getElementById('mem_boss_custom')) document.getElementById('mem_boss_custom').value = '';
    }
  }

  // ២. អតិថិជនប្រចាំខែ (MONTHLY) គ្មានសិទ្ធិ Login ឡើយ -> លាក់ប្រអប់ និងសម្អាត Username/Password ចោល
  if (loginBox) {
    if (roleType === 'MONTHLY') {
      loginBox.classList.add('hidden');
      if (userInp) userInp.value = '';
      if (passInp) passInp.value = '';
    } else {
      loginBox.classList.remove('hidden');
    }
  }
}

// 💾 មុខងាររក្សាទុក ឬកែប្រែគណនី (ការពារកុំឱ្យច្រឡំ Role និងប្រើ kcAlert ស្តង់ដារ)
async function saveUserToSupabase() {
  var name = getElVal('mem_name');
  var roleType = getElVal('mem_role_type') || 'MONTHLY';
  var phone = getElVal('mem_phone');
  
  if (!name) { 
    if (typeof kcAlert === 'function') {
      await kcAlert({ 
        title: "ខ្វះទិន្នន័យ", 
        message: "សូមបញ្ចូលឈ្មោះពេញរបស់គណនី!", 
        type: "warning" 
      });
    } else {
      showToast("សូមបញ្ចូលឈ្មោះពេញ!", "error");
    }
    var nameInp = document.getElementById('mem_name');
    if (nameInp) nameInp.focus();
    return; 
  }

  var role = "Customer";
  var type = "Regular";
  var linkedBoss = "";
  var user = null;
  var pass = null;

  // 🏢 ១. អតិថិជនប្រចាំខែ (Monthly)៖ គ្មាន Username និង Password ដាច់ខាត (Admin ជាអ្នកដកជំនួស)
  if (roleType === 'MONTHLY') {
    role = 'Customer';
    type = 'Monthly';
    user = null;
    pass = null;
    linkedBoss = '';

  // 🚚 ២. អតិថិជនប្រចាំ - អ្នកលក់បន្ត (Reseller)៖ មាន Login ចូលមើលប្រវត្តិ និងដកទឹកខ្លួនឯង
  } else if (roleType === 'RESELLER') {
    role = 'Customer';
    type = 'Regular';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { 
      if (typeof kcAlert === 'function') {
        await kcAlert({ title: "ខ្វះគណនី Login", message: "សូមវាយ Username និង Password សម្រាប់ម៉ូយ Login!", type: "warning" });
      } else {
        showToast("សូមវាយ Username និង Password!", "error");
      }
      return; 
    }

  // 🛵 ៣. កូនចៅ/អ្នកដឹក (Driver ធម្មតា)៖ ដកទឹកជំនួសមេ
  } else if (roleType === 'DRIVER') {
    role = 'Driver';
    type = 'Driver';
    linkedBoss = getElVal('mem_boss_custom') || getElVal('mem_boss_select');
    if (!linkedBoss) {
      if (typeof kcAlert === 'function') {
        await kcAlert({ title: "ខ្វះឈ្មោះមេ", message: "សូមជ្រើសរើស ឬវាយឈ្មោះមេដែលកូនចៅនេះត្រូវមកដកទឹកជំនួស!", type: "warning" });
      } else {
        showToast("សូមជ្រើសរើសឈ្មោះមេ!", "error");
      }
      return;
    }
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { 
      if (typeof kcAlert === 'function') {
        await kcAlert({ title: "ខ្វះគណនី Login", message: "សូមវាយ Username និង Password សម្រាប់អ្នកដឹក Login!", type: "warning" });
      } else {
        showToast("សូមវាយ Username និង Password!", "error");
      }
      return; 
    }

  // 🚚 ៤. អ្នកដឹកជញ្ជូនរោងចក្រ (Company Driver)៖ មានតែដឹកទំនិញដែល Admin ផ្តល់ឱ្យ គ្មានសិទ្ធិដក POS
  } else if (roleType === 'COMPANY_DRIVER') {
    role = 'Driver';
    type = 'CompanyDriver';
    linkedBoss = 'KC WATER';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { 
      if (typeof kcAlert === 'function') {
        await kcAlert({ title: "ខ្វះគណនី Login", message: "សូមវាយ Username និង Password សម្រាប់អ្នកដឹកជញ្ជូនរោងចក្រ!", type: "warning" });
      } else {
        showToast("សូមវាយ Username និង Password!", "error");
      }
      return; 
    }

  // 🛒 ៥. បុគ្គលិកលក់នៅកន្លែង (Seller)
  } else if (roleType === 'SELLER') {
    role = 'Seller';
    type = 'Retail';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { 
      if (typeof kcAlert === 'function') {
        await kcAlert({ title: "ខ្វះគណនី Login", message: "សូមវាយ Username និង Password សម្រាប់បុគ្គលិកលក់!", type: "warning" });
      } else {
        showToast("សូមវាយ Username និង Password!", "error");
      }
      return; 
    }

  // 👑 ៦. Admin អ្នកគ្រប់គ្រង
  } else if (roleType === 'ADMIN') {
    role = 'Admin';
    type = 'Admin';
    user = getElVal('mem_user');
    pass = getElVal('mem_pass');
    if (!user || !pass) { 
      if (typeof kcAlert === 'function') {
        await kcAlert({ title: "ខ្វះគណនី Login", message: "សូមវាយ Username និង Password សម្រាប់ Admin!", type: "warning" });
      } else {
        showToast("សូមវាយ Username និង Password!", "error");
      }
      return; 
    }
  }

  var btn = document.getElementById('btnSaveUserAction');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងរក្សាទុក...'; }

  try {
    var payload = {
      full_name: name,
      role: role,
      type: type,
      phone: phone,
      linked_boss: linkedBoss,
      username: user,
      password: pass
    };

    if (editingCustomerId) {
      const { error } = await supabaseClient
        .from('users')
        .update(payload)
        .eq('id', editingCustomerId);
      if (error) throw error;
      
      if (typeof kcAlert === 'function') {
        await kcAlert({
          title: "ជោគជ័យ! 🎉",
          message: "បានធ្វើបច្ចុប្បន្នភាពគណនី [" + name + "] រួចរាល់!",
          type: "success"
        });
      } else {
        showToast("បានកែប្រែគណនី [" + name + "] ជោគជ័យ!", "success");
      }
    } else {
      const { error } = await supabaseClient
        .from('users')
        .insert([payload]);
      if (error) throw error;

      if (typeof kcAlert === 'function') {
        await kcAlert({
          title: "បង្កើតជោគជ័យ! 🎉",
          message: "បានបង្កើតគណនីថ្មី [" + name + "] ដោយជោគជ័យ!",
          type: "success"
        });
      } else {
        showToast("បានបង្កើតគណនី [" + name + "] ជោគជ័យ!", "success");
      }
    }

    cancelEditCustomer();
    await fetchInitialPOSData();
    fetchUsersModuleTable();
  } catch(err) {
    if (typeof kcAlert === 'function') {
      await kcAlert({ title: "កំហុសរក្សាទុក", message: err.message || String(err), type: "danger" });
    } else {
      showToast("កំហុស៖ " + (err.message || err), "error");
    }
  } finally {
    if (btn) { 
      btn.disabled = false; 
      btn.innerText = editingCustomerId ? "ធ្វើបច្ចុប្បន្នភាពគណនី (Update Account)" : "រក្សាទុកគណនី (Save Account)";
    }
  }
}

// 🔍 មុខងារទាញយក និងចម្រាញ់តារាងគណនី (Search តាមឈ្មោះ/លេខ & Tabs បែងចែកដាច់ពីគ្នា)
var cachedUsersModuleList = [];
var activeUserModuleTab = 'ALL';

async function fetchUsersModuleTable() {
  var tbody = document.getElementById('usersModuleTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 italic"><i class="fas fa-spinner fa-spin text-blue-600 mr-1"></i> កំពុងទាញបញ្ជីគណនី...</td></tr>';

  try {
    const { data: users, error } = await supabaseClient.from('users').select('*').order('id', { ascending: false });
    if (error) throw error;
    cachedUsersModuleList = users || [];
    filterUsersModuleTable();
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500 font-bold">កំហុស៖ ' + e.message + '</td></tr>';
  }
}

function switchUserTab(tab) {
  activeUserModuleTab = tab;
  var tabs = ['ALL', 'RESELLER', 'MONTHLY', 'RETAIL', 'DRIVER', 'STAFF'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('uTab_' + t);
    if (!btn) return;
    if (t === tab) {
      btn.className = (t === 'RETAIL') ? 
        "px-2.5 py-1.5 rounded-xl font-bold bg-emerald-700 text-white shadow-2xs active:scale-95 transition" :
        "px-2.5 py-1.5 rounded-xl font-bold bg-blue-700 text-white shadow-2xs active:scale-95 transition";
    } else {
      btn.className = (t === 'RETAIL') ?
        "px-2.5 py-1.5 rounded-xl font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 active:scale-95 transition" :
        "px-2.5 py-1.5 rounded-xl font-bold bg-white text-gray-700 border hover:bg-gray-50 active:scale-95 transition";
    }
  });
  filterUsersModuleTable();
}

// 📋 បង្ហាញតារាងបញ្ជីគណនី (មានប៊ូតុង [✏️ កែប្រែ] ច្បាស់ៗ & [🗑️ លុប])
function filterUsersModuleTable() {
  var tbody = document.getElementById('usersModuleTableBody');
  var searchInp = document.getElementById('custModuleSearchInp');
  var badgeCount = document.getElementById('userTotalCountBadge');
  if (!tbody) return;

  var q = searchInp ? searchInp.value.toLowerCase().trim() : '';

  var filtered = cachedUsersModuleList.filter(function(u) {
    if (!u.full_name || u.full_name === 'Walk-in') return false;

    if (activeUserModuleTab === 'RESELLER' && (u.role === 'Admin' || u.role === 'Seller' || u.role === 'Driver' || u.type === 'CompanyDriver' || u.type === 'Monthly' || u.type === 'Retail')) return false;
    if (activeUserModuleTab === 'MONTHLY' && u.type !== 'Monthly') return false;
    if (activeUserModuleTab === 'RETAIL' && u.type !== 'Retail' && u.role !== 'Retail' && !String(u.username || '').startsWith('online_')) return false;
    if (activeUserModuleTab === 'DRIVER' && (u.role !== 'Driver' && u.type !== 'Driver' && u.type !== 'CompanyDriver')) return false;
    if (activeUserModuleTab === 'STAFF' && (u.role !== 'Admin' && u.role !== 'Seller')) return false;

    if (q) {
      var matchName = String(u.full_name || '').toLowerCase().indexOf(q) !== -1;
      var matchPhone = String(u.phone || '').toLowerCase().indexOf(q) !== -1;
      var matchUser = String(u.username || '').toLowerCase().indexOf(q) !== -1;
      var matchLoc = String(u.linked_boss || '').toLowerCase().indexOf(q) !== -1;
      if (!matchName && !matchPhone && !matchUser && !matchLoc) return false;
    }

    return true;
  });

  if (badgeCount) badgeCount.innerText = filtered.length + " នាក់";

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400 italic">រកមិនឃើញគណនីត្រូវតាមការស្វែងរកឡើយ</td></tr>';
    return;
  }

  var html = '';
  filtered.forEach(function(u) {
    var isOnlineRetail = (u.type === 'Retail' || u.role === 'Retail' || String(u.username || '').startsWith('online_'));
    var badgeHtml = '';

    if (u.type === 'Monthly') {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-orange-100 text-orange-800 border border-orange-300">🏢 ប្រចាំខែ</span>';
    } else if (isOnlineRetail) {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">🌐 ភ្ញៀវ Online</span>';
    } else if (u.type === 'CompanyDriver') {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">🚚 អ្នកដឹក KC WATER</span>';
    } else if (u.type === 'Driver' || u.role === 'Driver') {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">🛵 កូនចៅដកទឹក (មេ: ' + (u.linked_boss || '-') + ')</span>';
    } else if (u.role === 'Admin') {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-900">👑 Admin</span>';
    } else if (u.role === 'Seller') {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-900">🛒 បុគ្គលិកលក់</span>';
    } else {
      badgeHtml = '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-green-100 text-green-800">🚚 អ្នកលក់បន្ត</span>';
    }

    var credsText = '';
    if (isOnlineRetail) {
      var locInfo = u.linked_boss ? String(u.linked_boss).trim() : '';
      var mapDisplay = '';
      if (locInfo.indexOf('http') !== -1) {
        mapDisplay = '<a href="' + locInfo + '" target="_blank" class="text-blue-600 hover:underline font-bold text-[10px] flex items-center gap-1"><i class="fas fa-map-location-dot text-emerald-600"></i> បើកផែនទី Google Maps</a>';
      } else if (locInfo) {
        mapDisplay = '<span class="text-gray-700 font-bold text-[10px] flex items-center gap-1"><i class="fas fa-location-dot text-red-500"></i> ' + locInfo + '</span>';
      } else {
        mapDisplay = '<span class="text-gray-400 text-[10px] italic">មិនមានទីតាំង</span>';
      }
      credsText = '<div class="space-y-1 text-left"><div class="text-[10px] text-emerald-800 font-black flex items-center gap-1"><i class="fas fa-bag-shopping text-emerald-600"></i> ភ្ញៀវកុម្ម៉ង់លើ Web</div>' + mapDisplay + '</div>';
    } else if (u.type === 'Monthly') {
      credsText = '<span class="text-gray-400 text-[11px] italic">ម៉ូយប្រចាំខែ (គ្មាន Login)</span>';
    } else {
      credsText = '<span class="font-mono text-xs"><b>' + (u.username || '-') + '</b> / ' + (u.password || '-') + '</span>';
    }

    var phoneDisplay = u.phone ? ('<span class="text-emerald-700 font-bold text-xs"><i class="fas fa-phone text-[10px] mr-1"></i>' + u.phone + '</span>') : '<span class="text-gray-400 text-[10px]">-</span>';

    // 🌟 ប៊ូតុង [✏️ កែប្រែ] ធំៗច្បាស់ៗ & [🗑️ លុប]
    html += '<tr class="border-b hover:bg-gray-50 transition">' +
      '<td class="p-2.5"><b class="text-gray-800 text-xs">' + u.full_name + '</b><br>' + phoneDisplay + '</td>' +
      '<td class="p-2.5">' + credsText + '</td>' +
      '<td class="p-2.5 text-center">' + badgeHtml + '</td>' +
      '<td class="p-2.5 text-center whitespace-nowrap">' +
        '<div class="flex items-center justify-center gap-1.5">' +
          '<button type="button" onclick="prepareEditCustomer(' + u.id + ')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition flex items-center gap-1" title="ចុចដើម្បីកែប្រែគណនី">' +
            '<i class="fas fa-pen-to-square text-amber-600"></i> កែប្រែ' +
          '</button>' +
          '<button type="button" onclick="delUserFromSupabase(' + u.id + ')" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs active:scale-90 transition" title="លុបគណនី">' +
            '<i class="fas fa-trash-can"></i>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  });

 tbody.innerHTML = html;
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

// 🏷️ មុខងាររក្សាទុក ឬកែប្រែតម្លៃកុងត្រាពិសេស (ការពារមិនឱ្យស្ទួនជួរទំនិញដាច់ខាត)
async function saveSpecialPriceToSupabase() {
  var cust = document.getElementById('spCustSelect') ? document.getElementById('spCustSelect').value : '';
  var prod = document.getElementById('spProdSelect') ? document.getElementById('spProdSelect').value : '';
  var priceInp = document.getElementById('spPriceInput');
  var price = parseFloat(priceInp ? priceInp.value || 0 : 0);

  if (!cust || !prod || price <= 0) { 
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "ខ្វះទិន្នន័យ",
        message: "សូមជ្រើសរើសអតិថិជនប្រចាំខែ មុខទំនិញ និងបញ្ចូលតម្លៃពិសេសធំជាង ០!",
        type: "warning"
      });
    } else {
      showToast("សូមជ្រើសរើសអតិថិជនប្រចាំខែ ទំនិញ និងតម្លៃពិសេស!", "error");
    }
    return; 
  }

  // 🔒 ធានាថាតម្លៃពិសេសត្រូវបានកំណត់តែចំពោះអតិថិជនប្រចាំខែ (Monthly) ប៉ុណ្ណោះ
  var custObj = (allCustomers || []).find(c => c.full_name === cust);
  if (!custObj || custObj.type !== 'Monthly') {
    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "មិនមែនម៉ូយប្រចាំខែ",
        message: "តម្លៃពិសេសអាចកំណត់បានតែចំពោះអតិថិជនប្រភេទ «ប្រចាំខែ (Monthly)» ប៉ុណ្ណោះ!",
        type: "warning"
      });
    } else {
      showToast("តម្លៃពិសេសអាចកំណត់បានតែចំពោះអតិថិជនប្រចាំខែ (Monthly) ប៉ុណ្ណោះ!", "error");
    }
    return;
  }

  var btn = event ? event.target : null;
  if (btn && btn.tagName === 'BUTTON') {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងរក្សាទុក...';
  }

  try {
    // 🔍 ឆែកមើលថាតើធ្លាប់មានតម្លៃចាស់សម្រាប់មុខទំនិញនេះហើយឬនៅ (ការពារកុំឱ្យស្ទួន)
    var existing = (specialPrices || []).find(s => s.customer_name === cust && s.product_name === prod);

    if (existing && existing.id) {
      // ក. បើមានស្រាប់ ធ្វើបច្ចុប្បន្នភាព (Update) តម្លៃថ្មី
      const { error: updErr } = await supabaseClient
        .from('customer_prices')
        .update({
          price: price,
          currency: "KHR"
        })
        .eq('id', existing.id);

      if (updErr) throw updErr;
      showToast("បានកែប្រែតម្លៃកុងត្រា [" + prod + "] មកត្រឹម ៛ " + Number(price).toLocaleString() + " ជោគជ័យ!", "success");

    } else {
      // ខ. បើមិនទាន់មាន បញ្ចូលថ្មី (Insert)
      const { error: insErr } = await supabaseClient
        .from('customer_prices')
        .insert([{
          customer_name: cust,
          product_name: prod,
          price: price,
          currency: "KHR"
        }]);

      if (insErr) throw insErr;
      showToast("បានកំណត់តម្លៃកុងត្រាថ្មី [" + prod + "] ៛ " + Number(price).toLocaleString() + " ជោគជ័យ!", "success");
    }

    if (priceInp) priceInp.value = "";
    await fetchInitialPOSData();
    fetchSpecialPricesTable();

  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    if (btn && btn.tagName === 'BUTTON') {
      btn.disabled = false;
      btn.innerHTML = 'រក្សាទុកតម្លៃពិសេស (Save Price)';
    }
  }
}

async function delSpecialPriceFromSupabase(id) {
  // 🌟 ប្រើ Pop-up បញ្ជាក់ការលុបបែប Danger ពណ៌ក្រហមរបស់ KC POS
  var ok = await kcConfirm({
    title: "បញ្ជាក់ការលុបតម្លៃពិសេស",
    message: "តើអ្នកពិតជាចង់លុបការកំណត់តម្លៃពិសេសនេះមែនទេ?",
    type: "danger",
    confirmText: "យល់ព្រមលុប"
  });
  if (!ok) return;

  try {
    await supabaseClient.from('customer_prices').delete().eq('id', id);
    showToast("បានលុបតម្លៃពិសេសជោគជ័យ!", "success");
    await fetchInitialPOSData();
    fetchSpecialPricesTable();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  }
}

async function delUserFromSupabase(id) {
  // 🌟 ប្រើ Pop-up បញ្ជាក់ការលុបបែប Danger ពណ៌ក្រហមរបស់ KC POS
  var ok = await kcConfirm({
    title: "បញ្ជាក់ការលុបគណនី",
    message: "តើអ្នកពិតជាចង់លុបគណនីនេះចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។",
    type: "danger",
    confirmText: "យល់ព្រមលុប"
  });
  if (!ok) return;

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
// ⚙️ ៥. ការកំណត់ប្រព័ន្ធ (SETTINGS: SMART DELIVERY & MULTI-PROMO CHECKBOX)
// ==========================================
var currentTelegramAlertStatus = "ON";
var currentPromoRules = []; // បញ្ជីលក្ខខណ្ឌថែមទំនិញ (Buy A -> Free B)

function renderSettingsModule() {
  var area = document.getElementById('contentArea');
  if (!area) return;

  var curUsd = (typeof exchangeRateUSD !== 'undefined') ? exchangeRateUSD : 4100;
  var curThb = (typeof exchangeRateTHB !== 'undefined') ? exchangeRateTHB : 115;

  // បញ្ជីទំនិញសម្រាប់រើសទំនិញថែម (Free Gift)
  var freeProdOptions = '<option value="">-- រើសមុខទំនិញដែលត្រូវថែម Free --</option>';
  (allProducts || []).forEach(function(p) {
    freeProdOptions += '<option value="' + p.name + '">' + p.name + '</option>';
  });

  // បង្កើតប្រអប់ធីក (Checkboxes) សម្រាប់រើសទំនិញច្រើនមុខព្រមគ្នា (ឧ៖ អង្ករ ៣ ប្រភេទ)
  var buyCheckboxesHtml = '';
  (allProducts || []).forEach(function(p) {
    buyCheckboxesHtml += '<label class="flex items-center gap-2 p-1.5 hover:bg-amber-100/60 rounded-xl cursor-pointer transition select-none border border-slate-100 bg-white">' +
      '<input type="checkbox" name="promo_buy_prod_cb" value="' + p.name + '" class="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0">' +
      '<span class="text-slate-800 text-xs font-bold leading-tight truncate">' + p.name + '</span>' +
    '</label>';
  });

  area.innerHTML = '<div class="max-w-2xl mx-auto space-y-4">' +
    // 💵 ១. កាតកំណត់អត្រាប្តូរប្រាក់ (Exchange Rates)
    '<div class="card border-t-4 border-emerald-600 shadow-xl p-5 mb-0 space-y-3.5 bg-white">' +
      '<div class="flex justify-between items-center">' +
        '<div>' +
          '<h3 class="font-extrabold text-emerald-950 text-base flex items-center gap-2">' +
            '<i class="fas fa-money-bill-transfer text-emerald-600"></i>គ្រប់គ្រងអត្រាប្តូរប្រាក់ (Exchange Rates)' +
          '</h3>' +
          '<p class="text-[11px] text-gray-500 font-bold mt-0.5">*កំណត់អត្រាប្រាក់រៀល (៛), បាតថៃ (฿), និងដុល្លារ ($) សម្រាប់ POS & Store Web</p>' +
        '</div>' +
        '<span class="text-[10px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-black border border-emerald-300">Auto-Sync</span>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3 text-xs">' +
        '<div class="p-3 bg-blue-50/60 rounded-2xl border-2 border-blue-200 space-y-1.5">' +
          '<label class="font-black text-blue-900 uppercase block">💵 $1 ដុល្លារ = (... ៛)</label>' +
          '<input type="number" id="set_rate_usd" oninput="updateRatePreviewLive()" value="' + curUsd + '" class="font-black border-2 border-blue-300 focus:border-blue-600 p-2.5 rounded-xl w-full text-center text-base outline-none text-blue-950 bg-white">' +
        '</div>' +
        '<div class="p-3 bg-amber-50/60 rounded-2xl border-2 border-amber-200 space-y-1.5">' +
          '<label class="font-black text-amber-950 uppercase block">🪙 1฿ បាត = (... ៛)</label>' +
          '<input type="number" id="set_rate_thb" oninput="updateRatePreviewLive()" value="' + curThb + '" class="font-black border-2 border-amber-300 focus:border-amber-600 p-2.5 rounded-xl w-full text-center text-base outline-none text-amber-950 bg-white">' +
        '</div>' +
      '</div>' +
      '<button type="button" onclick="saveQuickExchangeRates()" id="btnSaveQuickRates" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition">' +
        '<i class="fas fa-floppy-disk mr-1"></i> រក្សាទុកអត្រាប្តូរប្រាក់' +
      '</button>' +
    '</div>' +

    // 🛵 ២. កាតម៉ោងបើក/បិទ & សេវាដឹកឆ្លាតវៃ (ការពារហាងមិនឱ្យខាតថ្លៃដឹក)
    '<div class="card border-t-4 border-indigo-600 shadow-xl p-5 mb-0 space-y-3.5 bg-white">' +
      '<div>' +
        '<h2 class="font-extrabold text-indigo-950 text-base flex items-center gap-2"><i class="fas fa-truck-fast text-indigo-600"></i>សេវាដឹកជញ្ជូន & ម៉ោងធ្វើការ (Delivery Rules)</h2>' +
        '<p class="text-[10px] text-gray-500 font-bold mt-0.5">បែងចែកលក្ខខណ្ឌ Free រវាងទឹកធុង ២០L និងទំនិញទូទៅ/គ្រឿងទេស</p>' +
      '</div>' +

      '<div class="grid grid-cols-2 gap-2 text-xs">' +
        '<div><label class="font-bold text-gray-500 uppercase block mb-1">ម៉ោងបើក (Open)</label><input type="time" id="set_open_time" class="font-black border p-2 rounded-xl w-full text-center bg-slate-50"></div>' +
        '<div><label class="font-bold text-gray-500 uppercase block mb-1">ម៉ោងបិទ (Close)</label><input type="time" id="set_close_time" class="font-black border p-2 rounded-xl w-full text-center bg-slate-50"></div>' +
      '</div>' +

      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">' +
        '<div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-200">' +
          '<label class="font-bold text-slate-700 uppercase block mb-1">ថ្លៃដឹកធម្មតា (៛)</label>' +
          '<input type="number" id="set_del_fee" placeholder="ឧ៖ 2000" class="font-black border border-slate-300 p-2 rounded-xl w-full text-center text-slate-900 bg-white">' +
          '<span class="text-[9px] text-slate-400 block mt-1">*គិតពេលទិញតិចតួច</span>' +
        '</div>' +
        '<div class="p-2.5 bg-blue-50/70 rounded-2xl border border-blue-200">' +
          '<label class="font-black text-blue-900 uppercase block mb-1">💧 ទឹកធុង ២០L ដឹក FREE</label>' +
          '<input type="number" id="set_del_min" placeholder="ឧ៖ 2" class="font-black border-2 border-blue-300 p-2 rounded-xl w-full text-center text-blue-900 bg-white">' +
          '<span class="text-[9px] text-blue-700 font-bold block mt-1">*កុម្ម៉ង់ចាប់ពី ២ ធុងឡើង Free</span>' +
        '</div>' +
        '<div class="p-2.5 bg-emerald-50 rounded-2xl border-2 border-emerald-300">' +
          '<label class="font-black text-emerald-950 uppercase block mb-1">🍚 ទំនិញទូទៅដឹក FREE</label>' +
          '<input type="number" id="set_del_free_amount" placeholder="ឧ៖ 50000" class="font-black border-2 border-emerald-400 bg-white text-emerald-900 p-2 rounded-xl w-full text-center">' +
          '<span class="text-[9px] text-emerald-800 font-bold block mt-1">*ទិញអស់ចាប់ពី ៥០,០០០៛ ឡើង Free</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // 🎁 ៣. កាត PROMOTION កម្រិតខ្ពស់ (មាន Checkbox រើសទំនិញច្រើនមុខព្រមគ្នា A ថែម B)
    '<div class="card border-t-4 border-amber-500 shadow-xl p-5 mb-0 space-y-3.5 bg-white">' +
      '<div class="flex justify-between items-center border-b pb-2">' +
        '<div>' +
          '<h3 class="font-extrabold text-amber-950 text-base flex items-center gap-2">' +
            '<i class="fas fa-gift text-amber-500"></i>ប្រព័ន្ធ Promotion លើ Website' +
          '</h3>' +
          '<p class="text-[10px] text-gray-400 font-bold mt-0.5">រូបភាព Banner, កាលបរិច្ឆេទ & ថែមទំនិញច្រើនមុខព្រមគ្នា</p>' +
        '</div>' +
        '<select id="set_promo_status" class="text-xs font-black border-2 border-amber-400 bg-amber-50 rounded-xl p-2">' +
          '<option value="OFF">🔕 បិទ (OFF)</option>' +
          '<option value="ON">🔔 បើក (ON)</option>' +
        '</select>' +
      '</div>' +

      // កាលបរិច្ឆេទ ចាប់ផ្តើម & បញ្ចប់
      '<div class="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1.5">' +
        '<label class="text-[10px] font-black text-amber-950 uppercase block"><i class="fas fa-calendar-days text-amber-600 mr-1"></i> កំណត់ពេលចាប់ផ្តើម និងបញ្ចប់ Promotion (Auto-Timer)</label>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">' +
          '<div><span class="text-[9.5px] text-gray-500 block mb-0.5">ថ្ងៃ & ម៉ោងចាប់ផ្តើម៖</span><input type="datetime-local" id="set_promo_start" class="border border-amber-300 p-2 rounded-xl w-full bg-white"></div>' +
          '<div><span class="text-[9.5px] text-gray-500 block mb-0.5">ថ្ងៃ & ម៉ោងបញ្ចប់៖</span><input type="datetime-local" id="set_promo_end" class="border border-amber-300 p-2 rounded-xl w-full bg-white"></div>' +
        '</div>' +
      '</div>' +

      // ពាក្យផ្សាយ & រូបថត Banner Promotion
      '<div class="space-y-2 text-xs">' +
        '<div>' +
          '<label class="text-[10px] font-black text-gray-600 uppercase block mb-1">ពាក្យផ្សាយ Promotion លើក្បាលទំព័រ</label>' +
          '<input type="text" id="set_promo_banner" placeholder="ឧ៖ 🎁 ប្រូម៉ូសិនពិសេស! ទិញអង្ករ ១បាវ ថែមទឹកធុងខៀវ ២ធុង Free!" class="border-2 border-amber-200 focus:border-amber-500 p-2.5 rounded-xl w-full font-bold bg-white">' +
        '</div>' +

        // ប្រអប់រូបភាព Banner Promotion
        '<div class="p-3 bg-slate-50 border-2 border-dashed border-amber-300 rounded-2xl flex items-center justify-between gap-3">' +
          '<div class="flex items-center gap-2.5">' +
            '<div class="w-16 h-12 rounded-xl bg-white border flex items-center justify-center overflow-hidden shadow-xs shrink-0">' +
              '<img id="promoBannerImgPreview" src="https://cdn-icons-png.flaticon.com/512/3100/3100566.png" class="max-w-full max-h-full object-cover">' +
            '</div>' +
            '<div>' +
              '<b class="text-xs text-slate-800 block">រូបភាព Banner Promotion</b>' +
              '<span class="text-[9.5px] text-slate-400 block" id="promoImgStatusNote">អាច Upload រូបផ្សាយពាណិជ្ជកម្មផ្ទាល់</span>' +
              '<input type="hidden" id="set_promo_img_base64" value="">' +
            '</div>' +
          '</div>' +
          '<label class="cursor-pointer px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs active:scale-95 transition whitespace-nowrap">' +
            '<i class="fas fa-image mr-1"></i> រើសរូប Banner' +
            '<input type="file" accept="image/*" onchange="previewPromoBannerFile(this)" class="hidden">' +
          '</label>' +
        '</div>' +
      '</div>' +

      // 🛒 បង្កើតលក្ខខណ្ឌថែមទំនិញ (Checkboxes រើសច្រើនមុខព្រមគ្នា)
      '<div class="p-3.5 bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-2xl border-2 border-amber-300 space-y-2.5">' +
        '<div class="flex justify-between items-center">' +
          '<b class="text-xs text-amber-950 font-black flex items-center gap-1"><i class="fas fa-boxes-packing text-amber-600"></i> លក្ខខណ្ឌថែមទំនិញ (ធីកជ្រើសរើសទំនិញច្រើនមុខព្រមគ្នា)</b>' +
          '<span class="text-[9px] text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full font-bold">Multi-Select</span>' +
        '</div>' +

        '<div class="bg-white p-3 rounded-xl border border-amber-200 space-y-2.5 text-xs shadow-2xs">' +
          '<div>' +
            '<div class="flex justify-between items-center mb-1">' +
              '<span class="text-[10px] font-black text-amber-950 uppercase">១. ធីកជ្រើសរើសមុខទំនិញដែលត្រូវទិញ (អាចរើសលើសពី ១មុខ)៖</span>' +
              '<button type="button" onclick="toggleAllPromoCheckboxes(true)" class="text-[10px] text-blue-600 font-bold hover:underline">រើសទាំងអស់</button>' +
            '</div>' +
            '<div class="max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1">' +
              buyCheckboxesHtml +
            '</div>' +
          '</div>' +

          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">' +
            '<div>' +
              '<span class="text-[9.5px] font-bold text-gray-600 block mb-0.5">ចំនួនទិញ (Buy Qty)៖</span>' +
              '<input type="number" id="pr_buy_qty" placeholder="ឧ៖ 1" value="1" class="font-black border p-2 rounded-xl w-full text-center bg-slate-50">' +
            '</div>' +
            '<div>' +
              '<span class="text-[9.5px] font-bold text-emerald-900 block mb-0.5">២. ថែមជូន Free (Gift)៖</span>' +
              '<select id="pr_free_prod" class="font-bold border-2 border-emerald-300 p-2 rounded-xl w-full bg-emerald-50 text-emerald-950 text-xs">' + freeProdOptions + '</select>' +
            '</div>' +
            '<div>' +
              '<span class="text-[9.5px] font-bold text-emerald-900 block mb-0.5">ចំនួនថែម (Free Qty)៖</span>' +
              '<input type="number" id="pr_free_qty" placeholder="ឧ៖ 2" value="2" class="font-black border-2 border-emerald-300 p-2 rounded-xl w-full text-center text-emerald-950 bg-emerald-50">' +
            '</div>' +
          '</div>' +

          '<button type="button" onclick="addNewPromoRule()" class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5">' +
            '<i class="fas fa-plus"></i> + បញ្ចូលលក្ខខណ្ឌ Promotion សម្រាប់ទំនិញដែលបានធីក' +
          '</button>' +
        '</div>' +

        // បញ្ជីលក្ខខណ្ឌកំពុងដំណើរការ
        '<div id="activePromoRulesContainer" class="space-y-1.5 pt-1"></div>' +
      '</div>' +
    '</div>' +

    // 🖼️ ៥. កាតគ្រប់គ្រងផ្ទាំងស្លាយ Web (Banner & Slide Manager)
    '<div class="card border-t-4 border-teal-600 shadow-xl p-5 mb-0 space-y-3.5 bg-white">' +
      '<div class="flex justify-between items-center border-b pb-2">' +
        '<div>' +
          '<h3 class="font-extrabold text-teal-950 text-base flex items-center gap-2">' +
            '<i class="fas fa-images text-teal-600"></i>គ្រប់គ្រងផ្ទាំងស្លាយលើ Web (Slides & Banners)' +
          '</h3>' +
          '<p class="text-[10px] text-gray-500 font-bold mt-0.5">ដាក់រូបភាពទំនិញពិត និងកែអក្សរលើស្លាយទាំង ៤</p>' +
        '</div>' +
        '<span class="text-[10px] font-black text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">Web Slides</span>' +
      '</div>' +

      // ប៊ូតុងរើសស្លាយ ១ ដល់ ៤
      '<div class="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border text-xs font-bold">' +
        '<button type="button" id="tabSlide_0" onclick="switchSlideEditTab(0)" class="py-2 rounded-xl bg-teal-700 text-white shadow-xs">ស្លាយ ១ (ទឹក)</button>' +
        '<button type="button" id="tabSlide_1" onclick="switchSlideEditTab(1)" class="py-2 rounded-xl text-slate-600 hover:bg-white">ស្លាយ ២ (ស្បៀង)</button>' +
        '<button type="button" id="tabSlide_2" onclick="switchSlideEditTab(2)" class="py-2 rounded-xl text-slate-600 hover:bg-white">ស្លាយ ៣ (ប្រើប្រាស់)</button>' +
        '<button type="button" id="tabSlide_3" onclick="switchSlideEditTab(3)" class="py-2 rounded-xl text-slate-600 hover:bg-white">ស្លាយ ៤ (ដឹកជញ្ជូន)</button>' +
      '</div>' +

      // ប្រអប់បញ្ចូលរូបភាព
      '<div class="p-3 bg-slate-50 border-2 border-dashed border-teal-300 rounded-2xl flex items-center justify-between gap-3">' +
        '<div class="flex items-center gap-2.5">' +
          '<div class="w-20 h-14 rounded-xl bg-white border flex items-center justify-center overflow-hidden shadow-xs shrink-0">' +
            '<img id="slideImgPreview" src="https://cdn-icons-png.flaticon.com/512/3100/3100566.png" class="w-full h-full object-cover">' +
          '</div>' +
          '<div>' +
            '<b class="text-xs text-slate-800 block" id="slideImgTitleHint">រូបភាពស្លាយ</b>' +
            '<span class="text-[9.5px] text-slate-400 block" id="slideImgNote">អាច Upload រូបទំនិញជាក់ស្តែង</span>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-1.5">' +
          '<label class="cursor-pointer px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs active:scale-95 transition whitespace-nowrap">' +
            '<i class="fas fa-camera mr-1"></i> រើសរូបភាព' +
            '<input type="file" accept="image/*" onchange="previewSlideImageFile(this)" class="hidden">' +
          '</label>' +
          '<button type="button" onclick="removeSlideImage()" class="p-2 text-red-500 hover:bg-red-50 rounded-xl active:scale-90" title="លុបរូប">' +
            '<i class="fas fa-trash-can text-xs"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +

      // ប្រអប់កែប្រែអក្សរ
      '<div class="space-y-2 text-xs text-left">' +
        // 🔘 ប៊ូតុងបិទ/បើកស្លាយ (ON / OFF)
        '<div>' +
          '<label class="text-[10px] font-black text-slate-700 uppercase block mb-1">ស្ថានភាពស្លាយនេះ (Status) *</label>' +
          '<select id="inp_slide_status" onchange="onSlideFieldChanged()" class="font-black border-2 border-teal-400 bg-teal-50 text-teal-950 p-2 rounded-xl w-full text-xs outline-none">' +
            '<option value="ON">🔔 បើកបង្ហាញលើ Web (ON)</option>' +
            '<option value="OFF">🔕 បិទមិនបង្ហាញ (OFF)</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ផ្លាកសម្គាល់ខាងលើ (Tag)</label>' +
          '<input type="text" id="inp_slide_tag" oninput="onSlideFieldChanged()" class="font-bold border p-2 rounded-xl w-full bg-white">' +
        '</div>' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ចំណងជើងធំ (Title) *</label>' +
          '<input type="text" id="inp_slide_title" oninput="onSlideFieldChanged()" class="font-black border-2 border-teal-300 focus:border-teal-600 p-2 rounded-xl w-full text-slate-900 bg-white text-sm">' +
        '</div>' +
        '<div>' +
          '<label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">ការពិពណ៌នាសង្ខេប (Description)</label>' +
          '<textarea id="inp_slide_desc" oninput="onSlideFieldChanged()" rows="2" class="font-bold border p-2 rounded-xl w-full bg-white text-xs"></textarea>' +
        '</div>' +
      '</div>' +

      '<button type="button" onclick="saveSlidesConfigToSupabase()" id="btnSaveSlidesAction" class="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md active:scale-95 transition flex items-center justify-center gap-1.5">' +
        '<i class="fas fa-floppy-disk"></i> រក្សាទុកផ្ទាំងស្លាយទាំងអស់ (Save Slides)' +
      '</button>' +
    '</div>' +

// 🔔 ៤. Telegram Bot Alert (គាំទ្រទាំង Group ថៅកែ និង Group អ្នកដឹក)
    '<div class="card border-t-4 border-green-600 shadow-xl p-5 mb-0 space-y-3">' +
      '<div class="flex justify-between items-center">' +
        '<h3 class="font-extrabold text-green-950 text-base flex items-center gap-2"><i class="fab fa-telegram text-blue-500"></i>Telegram Bot Alert</h3>' +
        '<div class="flex items-center gap-1.5">' +
          '<button type="button" id="btnToggleTelegramStatus" onclick="toggleTelegramAlertStatusLive()" class="px-3 py-1.5 rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5"></button>' +
          '<button type="button" onclick="testTelegramAlertNow()" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">🔔 តេស្ត</button>' +
        '</div>' +
      '</div>' +
      '<div class="space-y-2 text-xs">' +
        '<div><span class="text-[9.5px] font-bold text-gray-500 block mb-0.5">🔑 Telegram Bot Token៖</span><input type="password" id="set_tg_token" placeholder="Bot Token (ឧ៖ 123456:ABC-DEF...)" class="border p-2 rounded-xl w-full font-mono bg-white"></div>' +
        '<div><span class="text-[9.5px] font-bold text-gray-500 block mb-0.5">🏢 Chat ID ក្រុមថៅកែ (ដំណឹងទី១៖ ភ្ញៀវដកទឹក, លក់, ចំណាយ, ស្តុក)៖</span><input type="text" id="set_tg_chatid" placeholder="Chat ID ថៅកែ (ឧ៖ -100xxxxxxxxxx)" class="border p-2 rounded-xl w-full font-mono bg-white"></div>' +
        '<div><span class="text-[9.5px] font-black text-blue-900 block mb-0.5">🛵 Chat ID ក្រុមអ្នកដឹកជញ្ជូន (ដំណឹងទី២៖ ចាត់ចែងការងារដឹកទឹក)៖</span><input type="text" id="set_tg_driver_chatid" placeholder="Chat ID ក្រុមអ្នកដឹក (ឧ៖ -100yyyyyyyyyy)" class="border-2 border-blue-300 p-2 rounded-xl w-full font-mono bg-blue-50/50 text-blue-950"></div>' +
      '</div>' +
      '<button onclick="saveSettingsToSupabase()" id="btnSaveAllSettings" class="btn-green py-3.5 text-sm font-black shadow-md flex items-center justify-center gap-2">' +
        '<i class="fas fa-floppy-disk"></i> រក្សាទុកការកំណត់ទាំងអស់ (Save All Settings)' +
      '</button>' +
    '</div>' +
  '</div>';

  loadSettingsForm();
  switchSlideEditTab(0); // 👈 បង្ហាញស្លាយទី ១ ដំបូងគេ
  if (typeof updateRatePreviewLive === 'function') updateRatePreviewLive();
}

// 🔘 មុខងារប្តូរស្ថានភាព Telegram ON/OFF
function toggleTelegramAlertStatusLive() {
  currentTelegramAlertStatus = (currentTelegramAlertStatus === 'ON') ? 'OFF' : 'ON';
  updateTelegramButtonUI(currentTelegramAlertStatus);
}

function updateTelegramButtonUI(status) {
  currentTelegramAlertStatus = (status || 'ON').toUpperCase();
  var btn = document.getElementById('btnToggleTelegramStatus');
  if (!btn) return;
  if (currentTelegramAlertStatus === 'ON') {
    btn.className = "px-3 py-1.5 rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5 bg-emerald-600 text-white";
    btn.innerHTML = '<i class="fas fa-bell"></i> បើក (ON)';
  } else {
    btn.className = "px-3 py-1.5 rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5 bg-slate-200 text-slate-600";
    btn.innerHTML = '<i class="fas fa-bell-slash"></i> បិទ (OFF)';
  }
}

// 🖼️ មុខងារ Preview រូប Banner Promotion
function previewPromoBannerFile(input) {
  if (input.files && input.files[0]) {
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxDim = 800;
        var w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
        } else {
          if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var base64 = canvas.toDataURL('image/jpeg', 0.85);

        var preview = document.getElementById('promoBannerImgPreview');
        var hiddenInp = document.getElementById('set_promo_img_base64');
        var note = document.getElementById('promoImgStatusNote');
        if (preview) preview.src = base64;
        if (hiddenInp) hiddenInp.value = base64;
        if (note) note.innerHTML = '<span class="text-emerald-700 font-black">✔️ បានភ្ជាប់រូប Banner រួចរាល់</span>';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// 🔘 មុខងារជំនួយរើស ឬដោះធីក Checkboxes ក្នុង Promotion
function toggleAllPromoCheckboxes(check) {
  document.querySelectorAll('input[name="promo_buy_prod_cb"]').forEach(function(cb) {
    cb.checked = check;
  });
}

// ➕ មុខងារបន្ថែមលក្ខខណ្ឌ Promotion ថ្មី (គាំទ្រធីកទំនិញច្រើនមុខព្រមគ្នា)
function addNewPromoRule() {
  var checkedBoxes = document.querySelectorAll('input[name="promo_buy_prod_cb"]:checked');
  var buyQ = parseFloat(document.getElementById('pr_buy_qty') ? document.getElementById('pr_buy_qty').value || 1 : 1);
  var freeP = document.getElementById('pr_free_prod') ? document.getElementById('pr_free_prod').value : '';
  var freeQ = parseFloat(document.getElementById('pr_free_qty') ? document.getElementById('pr_free_qty').value || 1 : 1);

  if (checkedBoxes.length === 0) {
    showToast("សូមធីកជ្រើសរើសមុខទំនិញដែលត្រូវទិញយ៉ាងហោចណាស់ ១ មុខ!", "error");
    return;
  }
  if (!freeP) {
    showToast("សូមជ្រើសរើសមុខទំនិញដែលត្រូវថែម Free!", "error");
    return;
  }

  var addedCount = 0;
  checkedBoxes.forEach(function(cb) {
    var buyP = cb.value;
    var exists = currentPromoRules.some(function(r) {
      return r.buyProduct.trim().toLowerCase() === buyP.trim().toLowerCase() && r.freeProduct.trim().toLowerCase() === freeP.trim().toLowerCase();
    });

    if (!exists) {
      currentPromoRules.push({
        buyProduct: buyP,
        buyQty: buyQ,
        freeProduct: freeP,
        freeQty: freeQ
      });
      addedCount++;
    }
  });

  renderPromoRulesList();
  toggleAllPromoCheckboxes(false);
  showToast("បានបញ្ចូល Promotion ចំនួន " + addedCount + " មុខទំនិញជោគជ័យ!", "success");
}

// 🗑️ លុបលក្ខខណ្ឌ Promotion
function deletePromoRule(idx) {
  currentPromoRules.splice(idx, 1);
  renderPromoRulesList();
}

// 📋 បង្ហាញបញ្ជីលក្ខខណ្ឌ Promotion កំពុងមាន
function renderPromoRulesList() {
  var container = document.getElementById('activePromoRulesContainer');
  if (!container) return;

  if (currentPromoRules.length === 0) {
    container.innerHTML = '<div class="text-center py-2.5 text-gray-400 italic text-[11px] bg-white rounded-xl border border-dashed border-amber-200">មិនទាន់មានលក្ខខណ្ឌថែមទំនិញនៅឡើយទេ</div>';
    return;
  }

  var html = '';
  currentPromoRules.forEach(function(r, idx) {
    html += '<div class="bg-white p-2.5 rounded-xl border border-amber-300 flex items-center justify-between text-xs shadow-2xs">' +
      '<div class="space-y-0.5">' +
        '<div class="text-slate-800 font-black">ទិញ <b>' + r.buyProduct + '</b> x ' + r.buyQty + '</div>' +
        '<div class="text-emerald-700 font-bold flex items-center gap-1 text-[11px]"><i class="fas fa-gift text-amber-500"></i> ថែម Free <b>' + r.freeProduct + '</b> x ' + r.freeQty + '</div>' +
      '</div>' +
      '<button type="button" onclick="deletePromoRule(' + idx + ')" class="p-1.5 text-red-400 hover:text-red-600 active:scale-90 transition" title="លុប"><i class="fas fa-trash-can"></i></button>' +
    '</div>';
  });
  container.innerHTML = html;
}

// 📥 ទាញយកទិន្នន័យការកំណត់ពី Supabase
async function loadSettingsForm() {
  try {
    const { data } = await supabaseClient.from('settings').select('*');
    if (!data) return;
    var tgStatus = "ON";

    data.forEach(function(r) {
      if (r.key === 'Store_Open_Time') { var el = document.getElementById('set_open_time'); if (el) el.value = r.value; }
      if (r.key === 'Store_Close_Time') { var el = document.getElementById('set_close_time'); if (el) el.value = r.value; }
      if (r.key === 'Delivery_Fee_Standard') { var el = document.getElementById('set_del_fee'); if (el) el.value = r.value; }
      if (r.key === 'Delivery_Free_Min_Qty') { var el = document.getElementById('set_del_min'); if (el) el.value = r.value; }
      if (r.key === 'Delivery_Free_Min_Amount') { var el = document.getElementById('set_del_free_amount'); if (el) el.value = r.value; }
      if (r.key === 'Store_Slides_Config' && r.value) {
        try {
          currentSlidesData = JSON.parse(r.value);
        } catch(e) {}
      }
      
      // Promo
      if (r.key === 'Promo_Status') { var el = document.getElementById('set_promo_status'); if (el) el.value = r.value; }
      if (r.key === 'Promo_Start_Time') { var el = document.getElementById('set_promo_start'); if (el) el.value = r.value; }
      if (r.key === 'Promo_End_Time') { var el = document.getElementById('set_promo_end'); if (el) el.value = r.value; }
      if (r.key === 'Promo_Banner_Text') { var el = document.getElementById('set_promo_banner'); if (el) el.value = r.value; }
      if (r.key === 'Promo_Banner_Img') {
        var pi = document.getElementById('promoBannerImgPreview');
        var ph = document.getElementById('set_promo_img_base64');
        if (pi && r.value) pi.src = r.value;
        if (ph) ph.value = r.value || '';
      }
      if (r.key === 'Promo_Rules') {
        try { currentPromoRules = JSON.parse(r.value || '[]'); } catch(e) { currentPromoRules = []; }
      }

      // Telegram & Exchange Rates (ពិនិត្យសុវត្ថិភាពមិនឱ្យ Error null)
      if (r.key === 'Telegram_Token') { var el = document.getElementById('set_tg_token'); if (el) el.value = r.value; }
      if (r.key === 'Telegram_ChatID') { var el = document.getElementById('set_tg_chatid'); if (el) el.value = r.value; }
      if (r.key === 'Telegram_Driver_ChatID') { var el = document.getElementById('set_tg_driver_chatid'); if (el) el.value = r.value; }
      if (r.key === 'Telegram_Alert_Status') tgStatus = r.value;
      if (r.key === 'Exchange_Rate_USD') { var el = document.getElementById('set_rate_usd'); if (el) el.value = r.value; }
      if (r.key === 'Exchange_Rate_THB') { var el = document.getElementById('set_rate_thb'); if (el) el.value = r.value; }
    });

    renderPromoRulesList();
    updateTelegramButtonUI(tgStatus);
  } catch(e) {}
}

// 💾 រក្សាទុកការកំណត់ទាំងអស់ចូល Supabase (ធានា Save ទាំង Token, Chat ID ថៅកែ និង Chat ID អ្នកដឹក)
async function saveSettingsToSupabase() {
  var btn = document.getElementById('btnSaveAllSettings');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងរក្សាទុក...'; }

  var tokenVal = document.getElementById('set_tg_token') ? document.getElementById('set_tg_token').value.trim() : '';
  var chatIdVal = document.getElementById('set_tg_chatid') ? document.getElementById('set_tg_chatid').value.trim() : '';
  var driverChatIdVal = document.getElementById('set_tg_driver_chatid') ? document.getElementById('set_tg_driver_chatid').value.trim() : '';

  var rows = [
    { key: 'Store_Open_Time', value: document.getElementById('set_open_time') ? document.getElementById('set_open_time').value : "07:00" },
    { key: 'Store_Close_Time', value: document.getElementById('set_close_time') ? document.getElementById('set_close_time').value : "18:00" },
    { key: 'Delivery_Fee_Standard', value: document.getElementById('set_del_fee') ? document.getElementById('set_del_fee').value : "2000" },
    { key: 'Delivery_Free_Min_Qty', value: document.getElementById('set_del_min') ? document.getElementById('set_del_min').value : "2" },
    { key: 'Delivery_Free_Min_Amount', value: document.getElementById('set_del_free_amount') ? document.getElementById('set_del_free_amount').value : "50000" },

    // Promotion
    { key: 'Promo_Status', value: document.getElementById('set_promo_status') ? document.getElementById('set_promo_status').value : 'OFF' },
    { key: 'Promo_Start_Time', value: document.getElementById('set_promo_start') ? document.getElementById('set_promo_start').value : '' },
    { key: 'Promo_End_Time', value: document.getElementById('set_promo_end') ? document.getElementById('set_promo_end').value : '' },
    { key: 'Promo_Banner_Text', value: document.getElementById('set_promo_banner') ? document.getElementById('set_promo_banner').value.trim() : '' },
    { key: 'Promo_Banner_Img', value: document.getElementById('set_promo_img_base64') ? document.getElementById('set_promo_img_base64').value : '' },
    { key: 'Promo_Rules', value: JSON.stringify(currentPromoRules || []) },

    // Telegram Settings (រក្សាទុកទាំង ២ Group ត្រឹមត្រូវ ១០០%)
    { key: 'Telegram_Token', value: tokenVal },
    { key: 'Telegram_ChatID', value: chatIdVal },
    { key: 'Telegram_Driver_ChatID', value: driverChatIdVal },
    { key: 'Telegram_Alert_Status', value: currentTelegramAlertStatus },

    // Exchange Rates
    { key: 'Exchange_Rate_USD', value: document.getElementById('set_rate_usd') ? document.getElementById('set_rate_usd').value : "4100" },
    { key: 'Exchange_Rate_THB', value: document.getElementById('set_rate_thb') ? document.getElementById('set_rate_thb').value : "115" }
  ];

  try {
    const { error } = await supabaseClient.from('settings').upsert(rows);
    if (error) throw error;

    showToast("បានរក្សាទុកការកំណត់ Telegram & ដឹកជញ្ជូនជោគជ័យ!", "success");
    await loadSettingsAndTelegram();
  } catch(err) {
    showToast("កំហុស៖ " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk mr-1"></i> រក្សាទុកការកំណត់ទាំងអស់ (Save All Settings)';
    }
  }
}

// 🔔 មុខងារតេស្ត Telegram បាញ់សារទៅកាន់ Group ទាំង ២ (Group ថៅកែ និង Group អ្នកដឹក)
async function testTelegramAlertNow() {
  if (currentTelegramAlertStatus === "OFF") {
    showToast("⚠️ ប្រព័ន្ធ Telegram កំពុងបិទ (OFF)! សូមចុចបើក (ON) ជាមុនសិន", "warning");
    return;
  }

  var token = document.getElementById('set_tg_token') ? document.getElementById('set_tg_token').value.trim() : (telegramConfig.token || '');
  var bossId = document.getElementById('set_tg_chatid') ? document.getElementById('set_tg_chatid').value.trim() : (telegramConfig.chatId || '');
  var driverId = document.getElementById('set_tg_driver_chatid') ? document.getElementById('set_tg_driver_chatid').value.trim() : (telegramConfig.driverChatId || '');

  if (!token) {
    showToast("សូមបញ្ចូល Telegram Bot Token ជាមុនសិន!", "error");
    return;
  }

  var timeKhNow = new Date().toLocaleString('km-KH', { 
    timeZone: 'Asia/Phnom_Penh', 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });

  // ១. ផ្ញើសារតេស្តទៅ Group ទី ១ (Group ថៅកែ)
  if (bossId) {
    sendTelegramAlert("🏢 <b>[KC WATER - តេស្ត Group ថៅកែ / រោងចក្រ]</b>\n\n✅ Group នេះត្រៀមទទួលដំណឹង៖\n• ភ្ញៀវដកទឹក / លក់នៅកន្លែង (POS)\n• ការទូទាត់លុយ, ចំណាយ និងស្តុក\n🕒 ម៉ោង៖ " + timeKhNow, bossId);
  }

  // ២. ផ្ញើសារតេស្តទៅ Group ទី ២ (Group អ្នកដឹក «Kc បេសកកម្មរបស់ខ្ញុំ»)
  if (driverId) {
    sendTelegramAlert("🛵 <b>[KC WATER - តេស្ត Group អ្នកដឹកជញ្ជូន]</b>\n\n✅ Group នេះត្រៀមទទួលដំណឹង៖\n• បេសកកម្មដឹកទឹក Online ថ្មីៗ\n• ឈ្មោះភ្ញៀវ លេខទូរស័ព្ទ និងចំនួនទឹក\n• Link ផែនទី Google Maps នាំផ្លូវ\n🕒 ម៉ោង៖ " + timeKhNow, driverId);
  }

  showToast("បានផ្ញើសារតេស្តទៅកាន់ Group ទាំង ២!", "success");
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

// ==========================================
// 🏠 ទាញទិន្នន័យគណនីម៉ូយប្រចាំ (ប្រើម៉ោងកម្ពុជា UTC+7 មិនឱ្យច្រឡំជើងទឹកថ្ងៃនេះ និងបំណុលចាស់)
// ==========================================
async function fetchCustomerPortalData() {
  try {
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
      // 🇰🇭 ឆែកម៉ោងកម្ពុជាស្តង់ដារ UTC+7 មិនឱ្យច្រឡំជាបំណុលចាស់ឡើយ
      var isToday = isTodayInCambodia(t.created_at);
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

    if (document.getElementById('cpTodayTotal')) document.getElementById('cpTodayTotal').innerText = '៛ ' + todayTotal.toLocaleString();
    if (document.getElementById('cpOldDebt')) document.getElementById('cpOldDebt').innerText = '៛ ' + grandOldDebt.toLocaleString();
    if (document.getElementById('cpGrandTotalDue')) document.getElementById('cpGrandTotalDue').innerText = '៛ ' + grandTotalDue.toLocaleString();
    if (document.getElementById('cpBorrowedBottles')) document.getElementById('cpBorrowedBottles').innerText = totalBottles + ' ធុង';

    var tbody = document.getElementById('cpTodayItemsTbody');
    if (tbody) {
      if (todayItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 italic">មិនទាន់មានការដកទំនិញថ្ងៃនេះទេ</td></tr>';
      } else {
        var html = '';
        todayItems.forEach(function(i) {
          // 🇰🇭 កំណត់ម៉ោងកម្ពុជា
          var timeStr = new Date(i.created_at).toLocaleTimeString('km-KH', { 
            timeZone: 'Asia/Phnom_Penh', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          var recTag = (i.recorded_by && i.recorded_by !== currentUser.fullName && i.recorded_by !== 'Admin') ? 
            ('<br><span class="text-[9.5px] text-amber-950 font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[9px] text-amber-600"></i>ដកដោយ៖ ' + i.recorded_by + '</span>') : '';

          html += '<tr class="border-b hover:bg-gray-50">' +
            '<td class="p-2.5 text-gray-500 text-[10px]">' + timeStr + '</td>' +
            '<td class="p-2.5 font-bold text-gray-800">' + i.product_name + recTag + '</td>' +
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

      '<div id="custCurrencyBoxesArea" class="space-y-2 text-left"></div>' +

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

    // លុបប្រអប់សង្ខេបចាស់ចេញសិនបើមាន
    var oldSumBox = document.getElementById('custUnpaidSummaryBox');
    if (oldSumBox) oldSumBox.remove();

    if (!unpaids || unpaids.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> អបអរសាទរ! អ្នកមិនមានទឹកជំពាក់ឡើយ</td></tr>';
      return;
    }

    var html = '';
    var prodQtyMap = {};

    unpaids.forEach(function(i) {
      var dateStr = new Date(i.created_at).toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var isWithdrawnByOther = (i.recorded_by && i.recorded_by !== currentUser.fullName);
      var recTag = isWithdrawnByOther ? 
        ('<br><span class="text-[9.5px] text-blue-950 font-black bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[9px] text-blue-600"></i>ដកដោយ៖ ' + i.recorded_by + '</span>') : '';

      // 📦 បូកសរុបបរិមាណតាមមុខទំនិញ
      var pName = (i.product_name || "ទំនិញ").replace(/🎁\s*\[Free\]/gi, '').replace(/\[Free\]/gi, '').trim();
      if (pName.indexOf("Discount") === -1 && pName.indexOf("បញ្ចុះតម្លៃ") === -1 && pName.indexOf("សេវាដឹក") === -1 && parseFloat(i.total || 0) >= 0) {
        prodQtyMap[pName] = (prodQtyMap[pName] || 0) + parseFloat(i.qty || 0);
      }

      html += '<tr class="border-b hover:bg-orange-50/40">' +
        '<td class="p-2.5 text-gray-500 text-[10px] whitespace-nowrap">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + i.product_name + recTag + '</td>' +
        '<td class="p-2.5 text-center font-bold text-blue-700">' + i.qty + '</td>' +
        '<td class="p-2.5 text-right">' + Number(i.price).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-right font-black text-orange-700 whitespace-nowrap">៛ ' + Number(i.total).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-200">⚠️ ជំពាក់</span></td>' +
      '</tr>';
    });

    tbody.innerHTML = html;

    // 📦 បង្ហាញប្រអប់សរុបបរិមាណតាមមុខទំនិញនៅពីលើតារាង
    var summaryKeys = Object.keys(prodQtyMap);
    if (summaryKeys.length > 0) {
      var sumHtml = '<div id="custUnpaidSummaryBox" class="p-3 bg-orange-50/90 rounded-2xl border-2 border-orange-200 text-xs space-y-1.5 mb-3">' +
        '<b class="text-orange-950 flex items-center gap-1.5 text-[11px]"><i class="fas fa-boxes-stacked text-orange-600"></i> សរុបបរិមាណទឹកដែលកំពុងជំពាក់៖</b>' +
        '<div class="flex flex-wrap gap-1.5">';
      
      summaryKeys.forEach(function(k) {
        var unit = (k.indexOf("ធុង") !== -1) ? "ធុង" : ((k.indexOf("យួរ") !== -1) ? "យួរ" : ((k.indexOf("កេស") !== -1) ? "កេស" : ((k.indexOf("បាវ") !== -1) ? "បាវ" : ((k.indexOf("កំប៉ុង") !== -1) ? "កំប៉ុង" : ((k.indexOf("ដប") !== -1) ? "ដប" : "ឯកតា")))));
        sumHtml += '<div class="bg-white px-2.5 py-1 rounded-xl border border-orange-200 shadow-2xs font-bold text-[11px] text-slate-800">' +
          '<span>' + k + '៖ </span><b class="text-orange-700">' + Number(prodQtyMap[k]).toLocaleString() + ' ' + unit + '</b>' +
        '</div>';
      });

      sumHtml += '</div></div>';
      var tableContainer = tbody.closest('.card');
      if (tableContainer) {
        tableContainer.insertAdjacentHTML('afterbegin', sumHtml);
      }
    }

  } catch(e) {
    console.error("Unpaid history error:", e);
  }
}

async function fetchCustomHistoryByDate() {
  var sd = document.getElementById('ch_sd').value;
  var ed = document.getElementById('ch_ed').value;
  var tbody = document.getElementById('chItemsByDateTbody');
  if (!tbody || !sd || !ed) return;

  try {
    const { data: list } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .gte('created_at', sd + 'T00:00:00+07:00')
      .lte('created_at', ed + 'T23:59:59+07:00')
      .order('created_at', { ascending: false });

    // លុបប្រអប់សង្ខេបចាស់ចេញសិនបើមាន
    var oldSumBox = document.getElementById('custByDateSummaryBox');
    if (oldSumBox) oldSumBox.remove();

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">គ្មានទិន្នន័យដកក្នុងចន្លោះថ្ងៃនេះ</td></tr>';
      return;
    }

    var html = '';
    var prodQtyMap = {};

    list.forEach(function(i) {
      var dateStr = new Date(i.created_at).toLocaleString('km-KH', { 
        timeZone: 'Asia/Phnom_Penh', 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });

      var recTag = (i.recorded_by && i.recorded_by !== currentUser.fullName && i.recorded_by !== 'Admin') ? 
        ('<br><span class="text-[9.5px] text-amber-950 font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"><i class="fas fa-truck text-[9px] text-amber-600"></i>ដកដោយ៖ ' + i.recorded_by + '</span>') : '';

      // 📦 បូកសរុបបរិមាណតាមមុខទំនិញ
      var pName = (i.product_name || "ទំនិញ").replace(/🎁\s*\[Free\]/gi, '').replace(/\[Free\]/gi, '').trim();
      if (pName.indexOf("Discount") === -1 && pName.indexOf("បញ្ចុះតម្លៃ") === -1 && pName.indexOf("សេវាដឹក") === -1 && parseFloat(i.total || 0) >= 0) {
        prodQtyMap[pName] = (prodQtyMap[pName] || 0) + parseFloat(i.qty || 0);
      }

      html += '<tr class="border-b hover:bg-gray-50">' +
        '<td class="p-2.5 text-gray-500 text-[10px]">' + dateStr + '</td>' +
        '<td class="p-2.5 font-bold text-gray-800">' + i.product_name + recTag + '</td>' +
        '<td class="p-2.5 text-center font-bold text-blue-700">' + i.qty + '</td>' +
        '<td class="p-2.5 text-right font-black text-green-700">៛ ' + Number(i.total).toLocaleString() + '</td>' +
        '<td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ' + (i.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800') + '">' + (i.status === 'Paid' ? 'បង់រួច' : 'ជំពាក់') + '</span></td>' +
      '</tr>';
    });

    tbody.innerHTML = html;

    // 📦 បង្ហាញប្រអប់សរុបបរិមាណតាមមុខទំនិញនៅពីលើតារាង
    var summaryKeys = Object.keys(prodQtyMap);
    if (summaryKeys.length > 0) {
      var sumHtml = '<div id="custByDateSummaryBox" class="p-3 bg-blue-50/90 rounded-2xl border-2 border-blue-200 text-xs space-y-1.5 mb-3">' +
        '<b class="text-blue-950 flex items-center gap-1.5 text-[11px]"><i class="fas fa-boxes-stacked text-blue-600"></i> សរុបបរិមាណទឹកដែលបានដកក្នុងចន្លោះថ្ងៃនេះ៖</b>' +
        '<div class="flex flex-wrap gap-1.5">';
      
      summaryKeys.forEach(function(k) {
        var unit = (k.indexOf("ធុង") !== -1) ? "ធុង" : ((k.indexOf("យួរ") !== -1) ? "យួរ" : ((k.indexOf("កេស") !== -1) ? "កេស" : ((k.indexOf("បាវ") !== -1) ? "បាវ" : ((k.indexOf("កំប៉ុង") !== -1) ? "កំប៉ុង" : ((k.indexOf("ដប") !== -1) ? "ដប" : "ឯកតា")))));
        sumHtml += '<div class="bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs font-bold text-[11px] text-slate-800">' +
          '<span>' + k + '៖ </span><b class="text-blue-700">' + Number(prodQtyMap[k]).toLocaleString() + ' ' + unit + '</b>' +
        '</div>';
      });

      sumHtml += '</div></div>';
      var tableContainer = tbody.closest('.card');
      if (tableContainer) {
        tableContainer.insertAdjacentHTML('afterbegin', sumHtml);
      }
    }

  } catch(e) {
    console.error("Custom history by date error:", e);
  }
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
// 💡 ១០. MODALS ជំនួយសម្រាប់ម៉ូយ (PRICES, PASSWORD, CONTACT & STATEMENT MODAL)
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
      '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3 relative border text-center animate-in zoom-in duration-200">' +
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
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3 relative border text-center animate-in zoom-in duration-200">' +
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
    '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-sm p-5 space-y-3.5 relative border text-center animate-in zoom-in duration-200">' +
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

// 📑 កាតគ្រីផ្ទាល់ខ្លួនរបស់ម៉ូយ (MY MONTHLY STATEMENT MODAL POPUP)
async function viewMyMonthlyStatement() {
  var now = new Date();
  var firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  var today = now.toISOString().split('T')[0];

  showToast("កំពុងរៀបចំកាតគ្រីខែនេះ...");

  try {
    const { data: items } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .gte('created_at', firstDay + 'T00:00:00Z')
      .lte('created_at', today + 'T23:59:59Z')
      .order('created_at', { ascending: true });

    const { data: payments } = await supabaseClient
      .from('settlements')
      .select('*')
      .eq('customer_name', currentUser.fullName)
      .gte('settled_at', firstDay + 'T00:00:00Z')
      .lte('settled_at', today + 'T23:59:59Z')
      .order('settled_at', { ascending: true });

    const { data: lastSet } = await supabaseClient
      .from('settlements')
      .select('balance_khr')
      .eq('customer_name', currentUser.fullName)
      .lt('settled_at', firstDay + 'T00:00:00Z')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    var prevDebt = lastSet ? parseFloat(lastSet.balance_khr || 0) : 0;
    var totalPurchased = 0, totalPaidInMonth = 0;

    (items || []).forEach(i => { totalPurchased += parseFloat(i.total || 0); });
    (payments || []).forEach(p => { totalPaidInMonth += parseFloat(p.paid_khr || 0); });
    var finalBalance = Math.max(0, prevDebt + totalPurchased - totalPaidInMonth);

    var itemsHtml = '';
    (items || []).forEach(function(item) {
      var dateStr = new Date(item.created_at).toLocaleString('km-KH', { dateStyle: 'short', timeStyle: 'short' });
      itemsHtml += '<tr class="border-b"><td class="p-2 text-[10px] text-gray-500">' + dateStr + '</td><td class="p-2 font-bold text-gray-800">' + item.product_name + '</td><td class="p-2 text-center text-blue-700 font-bold">' + item.qty + '</td><td class="p-2 text-right font-black text-green-700">៛ ' + Number(item.total).toLocaleString() + '</td></tr>';
    });

    var payHtml = '';
    if (payments && payments.length > 0) {
      payments.forEach(function(p) {
        payHtml += '<div class="flex justify-between text-[11px] bg-white p-1.5 rounded border"><span>' + new Date(p.settled_at).toLocaleDateString('km-KH') + ' (' + p.pay_method + ')</span><b class="text-blue-700">-៛ ' + Number(p.paid_khr).toLocaleString() + '</b></div>';
      });
    }

    var modalHtml = '<div id="myStatementModal" class="fixed inset-0 z-[7500] flex items-center justify-center p-3">' +
      '<div class="absolute inset-0 bg-black/60 backdrop-blur-xs" onclick="document.getElementById(\'myStatementModal\').remove()"></div>' +
      '<div class="bg-white rounded-3xl shadow-2xl z-10 w-full max-w-md overflow-hidden p-4 space-y-3 relative border text-center animate-in zoom-in duration-200">' +
        '<div id="my-statement-printable" class="p-3 bg-white text-left space-y-2 border rounded-2xl">' +
          '<div class="text-center border-b pb-2"><b class="text-green-800 text-base uppercase">KC WATER - កាតគ្រីអតិថិជន</b><div class="text-xs text-gray-600 font-bold">ឈ្មោះ៖ ' + currentUser.fullName + '</div><div class="text-[10px] text-gray-400">ប្រចាំខែ៖ ' + firstDay + ' ដល់ ' + today + '</div></div>' +
          '<div class="flex justify-between text-xs bg-orange-50 p-2 rounded-xl text-orange-900 border border-orange-200 font-bold"><span>បំណុលចាស់ពីមុន៖</span><b>៛ ' + prevDebt.toLocaleString() + '</b></div>' +
          '<div class="max-h-48 overflow-y-auto border rounded-xl"><table class="w-full text-left text-[11px]"><thead class="bg-gray-100 font-bold text-gray-600"><tr><th class="p-2">កាលបរិច្ឆេទ</th><th class="p-2">មុខទំនិញ</th><th class="p-2 text-center">ចំនួន</th><th class="p-2 text-right">សរុប</th></tr></thead><tbody>' + (itemsHtml || '<tr><td colspan="4" class="p-3 text-center text-gray-400 italic">គ្មានទំនិញដកខែនេះ</td></tr>') + '</tbody></table></div>' +
          (payHtml ? '<div class="bg-blue-50 p-2 rounded-xl text-[11px] space-y-1"><div class="font-bold text-blue-900">ប្រាក់បានបង់សងក្នុងខែនេះ៖</div>' + payHtml + '</div>' : '') +
          '<div class="p-2.5 bg-green-50 rounded-xl border border-green-200 space-y-1 text-xs font-bold"><div class="flex justify-between"><span>សរុបទំនិញដកថ្មី (+)៖</span><b>៛ ' + totalPurchased.toLocaleString() + '</b></div><div class="flex justify-between text-blue-700"><span>សរុបបានបង់ (-)៖</span><b>-៛ ' + totalPaidInMonth.toLocaleString() + '</b></div><div class="flex justify-between text-green-950 font-black border-t border-green-300 pt-1 text-sm"><span>បំណុលនៅសល់ (=)៖</span><span class="text-green-800">៛ ' + finalBalance.toLocaleString() + '</span></div></div>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2 pt-1"><button onclick="downloadMyStatementPNG()" class="py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition"><i class="fas fa-download text-green-400"></i> ទាញយក PNG</button><button onclick="document.getElementById(\'myStatementModal\').remove()" class="py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs active:scale-95 transition">បិទ</button></div>' +
      '</div>' +
    '</div>';

    var old = document.getElementById('myStatementModal');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

  } catch(e) {
    showToast("កំហុសទាញកាតគ្រី៖ " + e.message, "error");
  }
}

function downloadMyStatementPNG() {
  var el = document.getElementById('my-statement-printable');
  if (!el) return;
  showToast("កំពុងទាញយករូបភាព...");
  html2canvas(el, { scale: 3 }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'Statement-' + currentUser.fullName + '.png';
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("បានទាញយកកាតគ្រីជោគជ័យ!", "success");
  });
}

// ==========================================
// 🔢 ១. មុខងារ Update លេខរៀង POS ដោយដៃ (រុញលេខស្ទួនអូតូ)
// ==========================================
async function quickUpdateSortPos(prodId, val) {
  var s = parseInt(val) || 1;
  try {
    var cur = allProducts.find(i => i.id === prodId);
    if (cur) cur.sort_order = s;
    await supabaseClient.from('products').update({ sort_order: s }).eq('id', prodId);

    var posItems = allProducts.filter(p => {
      var ch = String(p.channel || 'ALL').toUpperCase();
      return (ch === 'ALL' || ch === 'POS') && p.id !== prodId;
    });

    var conflicts = posItems.filter(p => parseInt(p.sort_order) === s);
    for (var j = 0; j < conflicts.length; j++) {
      var nextPosS = s + j + 1;
      conflicts[j].sort_order = nextPosS;
      await supabaseClient.from('products').update({ sort_order: nextPosS }).eq('id', conflicts[j].id);
    }

    showToast("បានប្តូរលេខ POS ទៅ #" + s + " ជោគជ័យ!", "success");
    renderStockTableRows();
  } catch(e) {
    showToast("កំហុស៖ " + e.message, "error");
  }
}

// ==========================================
// 💵 ២. មុខងារ Preview និង រក្សាទុកអត្រាប្តូរប្រាក់រហ័ស (Exchange Rates)
// ==========================================
function updateRatePreviewLive() {
  var usdInp = document.getElementById('set_rate_usd');
  var thbInp = document.getElementById('set_rate_thb');
  if (usdInp && usdInp.value) exchangeRateUSD = parseFloat(usdInp.value) || 4100;
  if (thbInp && thbInp.value) exchangeRateTHB = parseFloat(thbInp.value) || 115;
}

async function saveQuickExchangeRates() {
  var usdInp = document.getElementById('set_rate_usd');
  var thbInp = document.getElementById('set_rate_thb');
  var btn = document.getElementById('btnSaveQuickRates');

  var rUSD = parseFloat(usdInp ? usdInp.value : 4100) || 4100;
  var rTHB = parseFloat(thbInp ? thbInp.value : 115) || 115;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងរក្សាទុក...';
  }

  try {
    const { error } = await supabaseClient.from('settings').upsert([
      { key: 'Exchange_Rate_USD', value: String(rUSD) },
      { key: 'Exchange_Rate_THB', value: String(rTHB) }
    ]);

    if (error) throw error;

    exchangeRateUSD = rUSD;
    exchangeRateTHB = rTHB;

    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "ជោគជ័យ! 🎉",
        message: "បានធ្វើបច្ចុប្បន្នភាពអត្រាប្តូរប្រាក់ $1 = " + rUSD.toLocaleString() + "៛ និង 1฿ = " + rTHB.toLocaleString() + "៛ រួចរាល់!",
        type: "success"
      });
    } else {
      showToast("បានរក្សាទុកអត្រាប្តូរប្រាក់ជោគជ័យ!", "success");
    }

    if (typeof fetchInitialPOSData === 'function') await fetchInitialPOSData();
  } catch(err) {
    showToast("កំហុសរក្សាទុកអត្រាប្តូរប្រាក់៖ " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk mr-1"></i> រក្សាទុកអត្រាប្តូរប្រាក់';
    }
  }
}

// ==========================================
// 🖼️ មុខងារគ្រប់គ្រង SLIDES & BANNERS លើ WEB
// ==========================================
var activeSlideIndex = 0;
var defaultSlidesData = [
  { id: 1, cat: 'BARREL', tag: '💧 ទឹកពិសាបរិសុទ្ធ ខេ ស៊ី (KC WATER)', title: 'ទឹកធុង ២០L & ទឹកយួរដបគ្រប់ចំណុះ', desc: 'ឆ្លងកាត់ការចម្រោះ ៧ ដំណាក់កាល UV និង Ozone ស្តង់ដារសុខភាព ១០០%', badge: '👉 ចុចមើលមុខទឹក', img: '' },
  { id: 2, cat: 'GROCERY', tag: '🍚 ស្បៀងអាហារ & គ្រឿងទេសទូទៅ', title: 'អង្ករផ្កាម្លិះ មី ត្រីខ ប្រេងឆា ទឹកត្រី ទឹកស៊ីអ៊ីវ', desc: 'ស្បៀងអាហារថ្មីៗ គុណភាពខ្ពស់ សេវាដឹកជូនដល់មុខផ្ទះរហ័ស', badge: '👉 ចុចមើលគ្រឿងទេស', img: '' },
  { id: 3, cat: 'HOUSEHOLD', tag: '🧻 របស់ប្រើប្រាស់ & អនាម័យ', title: 'ក្រដាសអនាម័យ សាប៊ូ & បរិក្ខារ', desc: 'សម្ភារប្រើប្រាស់ក្នុងផ្ទះប្រចាំថ្ងៃ ស្តង់ដារសុវត្ថិភាព និងអនាម័យ', badge: '👉 ចុចមើលរបស់ប្រើប្រាស់', img: '' },
  { id: 4, cat: 'ALL', tag: '⚡ សេវាដឹកជញ្ជូន KC MART (ប៉ោយប៉ែត)', title: 'សេវាដឹកដល់មុខផ្ទះ ៣០ - ៤៥ នាទី', desc: 'ដឹកជូនដល់មុខផ្ទះផ្ទាល់ដី បន្ទប់ជួល ជាន់ខ្ពស់ និងអគារក្នុងក្រុងប៉ោយប៉ែត', badge: '🛵 អ្នកដឹកផ្លូវការ KC', img: '' }
];
var currentSlidesData = JSON.parse(JSON.stringify(defaultSlidesData));

// 🖼️ ធ្វើបច្ចុប្បន្នភាព Functions ស្លាយឱ្យស្គាល់ប៊ូតុង ON / OFF
function switchSlideEditTab(idx) {
  activeSlideIndex = idx;
  for (var i = 0; i < 4; i++) {
    var btn = document.getElementById('tabSlide_' + i);
    if (btn) {
      btn.className = (i === idx) ? 
        "py-2 rounded-xl bg-teal-700 text-white shadow-xs" : 
        "py-2 rounded-xl text-slate-600 hover:bg-white";
    }
  }

  var s = currentSlidesData[idx] || defaultSlidesData[idx];
  var statusInp = document.getElementById('inp_slide_status');
  var tagInp = document.getElementById('inp_slide_tag');
  var titleInp = document.getElementById('inp_slide_title');
  var descInp = document.getElementById('inp_slide_desc');
  var previewImg = document.getElementById('slideImgPreview');
  var titleHint = document.getElementById('slideImgTitleHint');

  // កំណត់ស្ថានភាព ON ឬ OFF
  if (statusInp) statusInp.value = s.status || (s.img ? 'ON' : 'OFF');
  if (tagInp) tagInp.value = s.tag || '';
  if (titleInp) titleInp.value = s.title || '';
  if (descInp) descInp.value = s.desc || '';
  if (titleHint) titleHint.innerText = "រូបភាពស្លាយទី " + (idx + 1);

  if (previewImg) {
    previewImg.src = s.img || "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
  }
}

function onSlideFieldChanged() {
  var s = currentSlidesData[activeSlideIndex];
  if (!s) return;
  s.status = document.getElementById('inp_slide_status') ? document.getElementById('inp_slide_status').value : 'OFF';
  s.tag = document.getElementById('inp_slide_tag') ? document.getElementById('inp_slide_tag').value : '';
  s.title = document.getElementById('inp_slide_title') ? document.getElementById('inp_slide_title').value : '';
  s.desc = document.getElementById('inp_slide_desc') ? document.getElementById('inp_slide_desc').value : '';
}
function previewSlideImageFile(input) {
  if (input.files && input.files[0]) {
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxDim = 900;
        var w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; } }
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var base64 = canvas.toDataURL('image/jpeg', 0.85);

        currentSlidesData[activeSlideIndex].img = base64;
        var preview = document.getElementById('slideImgPreview');
        if (preview) preview.src = base64;
        showToast("បានភ្ជាប់រូបភាពស្លាយទី " + (activeSlideIndex + 1) + " រួចរាល់!", "success");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function removeSlideImage() {
  currentSlidesData[activeSlideIndex].img = '';
  var preview = document.getElementById('slideImgPreview');
  if (preview) preview.src = "https://cdn-icons-png.flaticon.com/512/3100/3100566.png";
  showToast("បានដករូបភាពស្លាយទី " + (activeSlideIndex + 1) + " ចេញ!", "info");
}

async function saveSlidesConfigToSupabase() {
  onSlideFieldChanged();
  var btn = document.getElementById('btnSaveSlidesAction');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> កំពុងរក្សាទុកស្លាយ...';
  }

  try {
    const { error } = await supabaseClient.from('settings').upsert([
      { key: 'Store_Slides_Config', value: JSON.stringify(currentSlidesData) }
    ]);
    if (error) throw error;

    if (typeof kcAlert === 'function') {
      await kcAlert({
        title: "ជោគជ័យ! 🎉",
        message: "បានរក្សាទុកផ្ទាំងស្លាយ Web រួចរាល់! រូបភាព និងអក្សរនឹងបង្ហាញលើទូរស័ព្ទភ្ញៀវភ្លាមៗ។",
        type: "success"
      });
    } else {
      showToast("បានរក្សាទុកផ្ទាំងស្លាយ Web ជោគជ័យ!", "success");
    }
  } catch(err) {
    showToast("កំហុសរក្សាទុកស្លាយ៖ " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk mr-1"></i> រក្សាទុកផ្ទាំងស្លាយទាំងអស់ (Save Slides)';
    }
  }
}
