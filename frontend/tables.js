
let tables = [];

async function loadTables(){
  document.getElementById("app").innerHTML = `
    ${shell("tables")}
    <main class="main">
      ${topbar("الترابيزات", "ترابيزات للكافيه، تقدر تضيف عليها أوردرات بوفيه.")}
      <div class="section-head">
        <h3>كل الترابيزات 🪑</h3>
        <button class="add-btn" onclick="addTable()">+ إضافة ترابيزة</button>
      </div>
      <section class="devices" id="tables"></section>
    </main>
  `;

  tables = (await apiGet("/api/devices")).filter(d => d.kind === "table");
  renderTables();
}

function renderTables(){
  document.getElementById("tables").innerHTML = tables.map(t => `
    <article class="device-card table-card" style="--glow:${t.color}">
      <div class="room-img">
        <div class="device-top">
          <span class="status available">متاحة</span>
          <span class="room-name">${t.name}</span>
        </div>
        <div class="device-type">TABLE · ☕</div>
        <div class="timer">طلبات كافيه</div>
        <div class="room-line"></div>
      </div>
      <div class="card-body">
        <button class="btn book" onclick="goOrders(${t.id})">إضافة طلب</button>
        <button class="btn info" onclick="editTable(${t.id})">تعديل</button>
      </div>
    </article>
  `).join("");
}

function goOrders(id){
  localStorage.setItem("selectedDeviceId", id);
  window.location.href = "orders.html";
}

async function addTable(){
  const name = prompt("اسم الترابيزة:", "ترابيزة جديدة");
  if(!name) return;

  await apiSend("/api/devices", "POST", {
    name,
    type:"TABLE",
    price:0,
    single_price:0,
    multi_price:0,
    kind:"table",
    color:"#f59e0b"
  });

  await loadTables();
}

async function editTable(id){
  const t = tables.find(x => x.id === id);
  const name = prompt("اسم الترابيزة:", t.name) || t.name;
  const color = prompt("اللون:", t.color) || t.color;

  await apiSend(`/api/devices/${id}`, "PUT", {
    name,
    type:"TABLE",
    price:0,
    single_price:0,
    multi_price:0,
    kind:"table",
    color
  });

  await loadTables();
}

loadTables();
