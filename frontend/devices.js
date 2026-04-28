
let devices = [];
let customers = [];
let selectedDevice = null;

async function loadDevices(){
  document.getElementById("app").innerHTML = `
    ${shell("devices")}
    <main class="main">
      ${topbar("الأجهزة والرومات", "ابدأ جلسة، اعرض الفاتورة، واربط الفاتورة بعميل.",
        '<input id="search" class="search" placeholder="ابحث عن روم..." oninput="renderDevices()">'
      )}

      <div class="section-head">
        <h3>كل الأجهزة 🎮</h3>
        <a class="add-btn" href="rooms.html">تعديل الأوض والأسعار</a>
      </div>

      <section class="devices" id="devices"></section>

      ${startModal()}
      ${invoiceModal()}
      ${manualTimeModal()}
      ${adjustStartModal()}
      <div id="toast" class="toast"></div>

      <div class="footer"><span>LaCasa PlayStation © 2026</span><span>Devices Page</span></div>
    </main>
  `;

  devices = (await apiGet("/api/devices")).filter(d => (d.kind || 'room') === 'room');
  customers = await apiGet("/api/customers");
  renderDevices();
}

function timerText(startedAt){
  if(!startedAt) return "جاهز للحجز";
  const diff = new Date() - new Date(startedAt);
  const total = Math.floor(diff / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2,"0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2,"0");
  const s = String(total % 60).padStart(2,"0");
  return `${h}:${m}:${s}`;
}

function renderDevices(){
  const word = document.getElementById("search")?.value?.toLowerCase() || "";
  const list = devices.filter(d => d.name.toLowerCase().includes(word) || d.type.toLowerCase().includes(word));

  document.getElementById("devices").innerHTML = list.map(d => `
    <article class="device-card" style="--glow:${d.color}">
      <div class="room-img">
        <div class="device-top">
          <span class="status ${d.status === "busy" ? "busy" : "available"}">
            ${d.status === "busy" ? "مشغولة" : "متاحة"}
          </span>
          <span class="room-name">${d.name}</span>
        </div>

        <div class="device-type">${d.type} · S:${d.single_price || d.price} / M:${d.multi_price || d.price}</div>
        <div class="timer">${timerText(d.started_at)}</div>
        <div class="room-line"></div>
      </div>

      <div class="card-body">
        <button class="btn info" onclick="openInvoice(${d.id})">عرض الفاتورة</button>
        <button class="btn ${d.status === "busy" ? "end" : "book"}" onclick="${d.status === "busy" ? `openInvoice(${d.id})` : `openStartModal(${d.id})`}">
          ${d.status === "busy" ? "إنهاء / دفع" : "بدء الجلسة"}
        </button>
        <button class="btn info" onclick="location.href='rooms.html'">تعديل الأوض</button>
        <button class="btn book" onclick="goOrders(${d.id})">طلبات بوفيه</button>
        <button class="btn info" onclick="openManualTime(${d.id})">إضافة وقت</button>
        <button class="btn info" onclick="openAdjustStart(${d.id})">تعديل البداية</button>
      </div>
    </article>
  `).join("");
}

function startModal(){
  return `
    <div class="ui-modal" id="startModal">
      <div class="ui-modal-card">
        <button class="modal-x" onclick="closeModal('startModal')">×</button>
        <h2>بدء جلسة <span id="startDeviceName" class="tag"></span></h2>

        <label>اسم العميل اختياري</label>
        <input id="startCustomerName" placeholder="ممكن تسيبه فاضي">

        <label>نوع الوقت</label>
        <div class="radio-row">
          <label><input type="radio" name="sessionMode" value="single" checked> فردي Single</label>
          <label><input type="radio" name="sessionMode" value="multi"> مالتي Multi</label>
        </div>

        <button class="confirm" onclick="confirmStartSession()">بدء الجلسة</button>
      </div>
    </div>
  `;
}

function invoiceModal(){
  return `
    <div class="ui-modal" id="invoiceModal">
      <div class="ui-modal-card invoice-card">
        <button class="modal-x" onclick="closeModal('invoiceModal')">×</button>

        <div class="invoice-head">
          <h2>فاتورة <span id="invoiceDeviceName" class="tag"></span></h2>
          <small id="invoiceTime"></small>
        </div>

        <div class="invoice-message">
          <label>رسالة الفاتورة</label>
          <textarea id="invoiceNotes" placeholder="ملاحظة على الفاتورة..."></textarea>
        </div>

        <div class="invoice-grid">
          <div class="invoice-box">
            <b id="invoiceMinutes">00</b>
            <span>دقيقة</span>
          </div>
          <div class="invoice-box">
            <b id="invoiceHours">00</b>
            <span>ساعة</span>
          </div>
          <div class="invoice-box">
            <b id="invoiceMode">Single</b>
            <span>نوع الوقت</span>
          </div>
        </div>

        <div class="invoice-lines">
          <div><span>إجمالي الوقت</span><b id="sessionCost">0</b></div>
          <div><span>إجمالي البوفيه</span><b id="ordersCost">0</b></div>
          <div>
            <span>خصم</span>
            <input id="invoiceDiscount" type="number" value="0" min="0" oninput="updateInvoiceTotal()">
          </div>
          <div class="invoice-total"><span>الإجمالي</span><b id="invoiceTotal">0</b></div>
        </div>

        <div class="invoice-orders">
          <h3>طلبات البوفيه</h3>
          <div id="invoiceItems"></div>
        </div>

        <label>ربط الفاتورة بعميل اختياري</label>
        <select id="invoiceCustomer">
          <option value="">دفع كاش بدون عميل</option>
        </select>

        <div class="modal-actions">
          <button class="btn info" onclick="printInvoice()">طباعة الأوردر 🖨️</button>
          <button class="confirm" onclick="payInvoice()">دفع الفاتورة</button>
          <button class="danger-btn" onclick="closeModal('invoiceModal')">إلغاء</button>
        </div>
      </div>
    </div>
  `;
}


function manualTimeModal(){
  return `
    <div class="ui-modal" id="manualTimeModal">
      <div class="ui-modal-card">
        <button class="modal-x" onclick="closeModal('manualTimeModal')">×</button>
        <h2>إضافة وقت يدوي <span id="manualDeviceName" class="tag"></span></h2>

        <div class="form-grid">
          <div>
            <label>ساعات</label>
            <input id="manualHours" type="number" min="0" value="0" oninput="calcManualPreview()">
          </div>
          <div>
            <label>دقائق</label>
            <input id="manualMinutes" type="number" min="0" max="59" value="30" oninput="calcManualPreview()">
          </div>
          <div>
            <label>خصم</label>
            <input id="manualDiscount" type="number" min="0" value="0" oninput="calcManualPreview()">
          </div>
        </div>

        <label>نوع الوقت</label>
        <div class="radio-row">
          <label><input type="radio" name="manualMode" value="single" checked onchange="calcManualPreview()"> فردي Single</label>
          <label><input type="radio" name="manualMode" value="multi" onchange="calcManualPreview()"> مالتي Multi</label>
        </div>

        <label>ربط بعميل اختياري</label>
        <select id="manualCustomer"></select>

        <label>اسم العميل اختياري</label>
        <input id="manualCustomerName" placeholder="عميل">

        <div class="total">
          سعر الساعة: <span id="manualHourPrice">0</span> جنيه<br>
          الإجمالي قبل الخصم: <span id="manualSubtotal">0</span> جنيه<br>
          النهائي: <span id="manualTotal">0</span> جنيه
        </div>

        <button class="confirm" onclick="saveManualTime()">حفظ الوقت اليدوي</button>
      </div>
    </div>
  `;
}

function adjustStartModal(){
  return `
    <div class="ui-modal" id="adjustStartModal">
      <div class="ui-modal-card">
        <button class="modal-x" onclick="closeModal('adjustStartModal')">×</button>
        <h2>تعديل بداية الوقت <span id="adjustDeviceName" class="tag"></span></h2>

        <p>استخدمها لو فتحت الجلسة متأخر أو بدري.</p>

        <label>بداية الوقت</label>
        <input id="adjustStartedAt" type="datetime-local">

        <button class="confirm" onclick="saveAdjustedStart()">حفظ بداية الوقت</button>
      </div>
    </div>
  `;
}

function openManualTime(id){
  selectedDevice = devices.find(d => d.id === id);
  document.getElementById("manualDeviceName").innerText = selectedDevice.name;
  document.getElementById("manualHours").value = 0;
  document.getElementById("manualMinutes").value = 30;
  document.getElementById("manualDiscount").value = 0;
  document.getElementById("manualCustomerName").value = "";

  document.getElementById("manualCustomer").innerHTML =
    `<option value="">دفع كاش بدون عميل</option>` +
    customers.map(c => `<option value="${c.id}">${c.name} | الحساب: ${c.balance}</option>`).join("");

  document.querySelector('input[name="manualMode"][value="single"]').checked = true;
  calcManualPreview();
  openModal("manualTimeModal");
}

function calcManualPreview(){
  if(!selectedDevice) return;

  const hours = Number(document.getElementById("manualHours")?.value || 0);
  const minutes = Number(document.getElementById("manualMinutes")?.value || 0);
  const discount = Number(document.getElementById("manualDiscount")?.value || 0);
  const mode = document.querySelector('input[name="manualMode"]:checked')?.value || "single";

  const hourlyPrice = mode === "multi"
    ? Number(selectedDevice.multi_price || selectedDevice.price)
    : Number(selectedDevice.single_price || selectedDevice.price);

  const totalMinutes = hours * 60 + minutes;
  const subtotal = Math.ceil((totalMinutes / 60) * hourlyPrice);
  const total = Math.max(0, subtotal - discount);

  document.getElementById("manualHourPrice").innerText = hourlyPrice;
  document.getElementById("manualSubtotal").innerText = subtotal;
  document.getElementById("manualTotal").innerText = total;
}

async function saveManualTime(){
  const hours = Number(document.getElementById("manualHours").value || 0);
  const minutes = Number(document.getElementById("manualMinutes").value || 0);
  const discount = Number(document.getElementById("manualDiscount").value || 0);
  const session_mode = document.querySelector('input[name="manualMode"]:checked').value;
  const customer_id = document.getElementById("manualCustomer").value || null;
  const customer_name = document.getElementById("manualCustomerName").value || "عميل";

  if(hours === 0 && minutes === 0){
    showToast("دخل ساعات أو دقائق الأول");
    return;
  }

  const result = await apiSend(`/api/devices/${selectedDevice.id}/manual-session`, "POST", {
    hours,
    minutes,
    session_mode,
    discount,
    customer_id,
    customer_name
  });

  closeModal("manualTimeModal");
  showToast(`تم حفظ الوقت ✅ الإجمالي: ${result.total} جنيه`);
  await loadDevices();
}

function openAdjustStart(id){
  selectedDevice = devices.find(d => d.id === id);

  if(selectedDevice.status !== "busy"){
    showToast("لازم الجهاز يكون شغال عشان تعدل بداية الوقت");
    return;
  }

  document.getElementById("adjustDeviceName").innerText = selectedDevice.name;
  document.getElementById("adjustStartedAt").value = toDatetimeLocal(selectedDevice.started_at);
  openModal("adjustStartModal");
}

function toDatetimeLocal(value){
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0,16);
}

async function saveAdjustedStart(){
  const val = document.getElementById("adjustStartedAt").value;
  if(!val){
    showToast("اختار وقت البداية");
    return;
  }

  const iso = new Date(val).toISOString();
  await apiSend(`/api/devices/${selectedDevice.id}/start-time`, "PUT", {started_at: iso});

  closeModal("adjustStartModal");
  showToast("تم تعديل بداية الوقت ✅");
  await loadDevices();
}


function openStartModal(id){
  selectedDevice = devices.find(d => d.id === id);
  document.getElementById("startDeviceName").innerText = selectedDevice.name;
  document.getElementById("startCustomerName").value = "";
  document.querySelector('input[name="sessionMode"][value="single"]').checked = true;
  openModal("startModal");
}

async function confirmStartSession(){
  const customer_name = document.getElementById("startCustomerName").value.trim() || "عميل";
  const session_mode = document.querySelector('input[name="sessionMode"]:checked').value;

  await apiSend(`/api/devices/${selectedDevice.id}/start`, "POST", {customer_name, session_mode});
  closeModal("startModal");
  showToast("تم بدء الجلسة ✅");
  await loadDevices();
}

async function openInvoice(id){
  selectedDevice = devices.find(d => d.id === id);

  if(selectedDevice.status !== "busy"){
    showToast("الجهاز غير مشغول، ابدأ جلسة الأول");
    return;
  }

  const data = await apiGet(`/api/devices/${id}/active-invoice`);
  const device = data.device;

  const started = new Date(device.started_at);
  const diff = new Date() - started;
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const hourlyPrice = device.session_mode === "multi"
    ? Number(device.multi_price || device.price)
    : Number(device.single_price || device.price);

  const diffHours = diff / (1000 * 60 * 60);
  const sessionCost = Math.ceil(diffHours * hourlyPrice);
  const ordersCost = Number(data.ordersTotal || 0);

  document.getElementById("invoiceDeviceName").innerText = device.name;
  document.getElementById("invoiceTime").innerText = `بداية الوقت: ${formatEgyptTime(device.started_at)}`;
  document.getElementById("invoiceHours").innerText = String(hours).padStart(2,"0");
  document.getElementById("invoiceMinutes").innerText = String(minutes).padStart(2,"0");
  document.getElementById("invoiceMode").innerText = device.session_mode === "multi" ? "Multi" : "Single";
  document.getElementById("sessionCost").innerText = sessionCost;
  document.getElementById("ordersCost").innerText = ordersCost;
  document.getElementById("invoiceDiscount").value = 0;

  document.getElementById("invoiceItems").innerHTML = data.items.length === 0
    ? `<p>لا توجد طلبات بوفيه على هذه الفاتورة</p>`
    : data.items.map(i => `
      <div class="invoice-item">
        <span>${i.product_name} × ${i.qty}</span>
        <b>${i.price * i.qty} جنيه</b>
      </div>
    `).join("");

  document.getElementById("invoiceCustomer").innerHTML =
    `<option value="">دفع كاش بدون عميل</option>` +
    customers.map(c => `<option value="${c.id}">${c.name} | الحساب: ${c.balance}</option>`).join("");

  updateInvoiceTotal();
  openModal("invoiceModal");
}

function updateInvoiceTotal(){
  const sessionCost = Number(document.getElementById("sessionCost").innerText || 0);
  const ordersCost = Number(document.getElementById("ordersCost").innerText || 0);
  const discount = Number(document.getElementById("invoiceDiscount").value || 0);
  document.getElementById("invoiceTotal").innerText = Math.max(0, sessionCost + ordersCost - discount);
}

async function payInvoice(){
  const discount = Number(document.getElementById("invoiceDiscount").value || 0);
  const customer_id = document.getElementById("invoiceCustomer").value || null;

  const result = await apiSend(`/api/devices/${selectedDevice.id}/end`, "POST", {discount, customer_id});

  closeModal("invoiceModal");
  showToast(`تم دفع الفاتورة ✅ الإجمالي: ${result.total} جنيه`);
  await loadDevices();
}

function printInvoice(){
  window.print();
}

function goOrders(id){
  localStorage.setItem("selectedDeviceId", id);
  window.location.href = "orders.html";
}

function openModal(id){
  document.getElementById(id).classList.add("show");
}

function closeModal(id){
  document.getElementById(id).classList.remove("show");
}

function showToast(msg){
  const toast = document.getElementById("toast");
  if(!toast) return;
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2500);
}

setInterval(()=>renderDevices(), 1000);
loadDevices();
