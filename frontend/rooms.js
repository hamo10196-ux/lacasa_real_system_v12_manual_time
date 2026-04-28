
let rooms = [];

async function loadRooms(){
  document.getElementById("app").innerHTML = `
    ${shell("rooms")}
    <main class="main">
      ${topbar("تعديل الأوض", "هنا بس تعدل بيانات الأوض والأسعار Single / Multi.")}
      <div class="section-head">
        <h3>إدارة الأوض</h3>
        <button class="add-btn" onclick="addRoom()">+ إضافة أوضة</button>
      </div>
      <div class="panel">
        <table class="editor-table">
          <thead>
            <tr>
              <th>ID</th><th>الاسم</th><th>النوع</th><th>Single</th><th>Multi</th><th>اللون</th><th>حفظ</th><th>حذف</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </main>
  `;

  rooms = (await apiGet("/api/devices")).filter(d => (d.kind || "room") === "room");
  renderRooms();
}

function renderRooms(){
  document.getElementById("rows").innerHTML = rooms.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><input id="name-${r.id}" value="${r.name}"></td>
      <td>
        <select id="type-${r.id}">
          <option ${r.type==="PS4"?"selected":""}>PS4</option>
          <option ${r.type==="PS5"?"selected":""}>PS5</option>
        </select>
      </td>
      <td><input id="single-${r.id}" type="number" value="${r.single_price || r.price}"></td>
      <td><input id="multi-${r.id}" type="number" value="${r.multi_price || r.price}"></td>
      <td><input id="color-${r.id}" type="color" value="${r.color}"></td>
      <td><button class="btn book" onclick="saveRoom(${r.id})">حفظ</button></td>
      <td><button class="danger-btn" onclick="deleteRoom(${r.id})">حذف</button></td>
    </tr>
  `).join("");
}

async function saveRoom(id){
  const payload = {
    name: document.getElementById(`name-${id}`).value,
    type: document.getElementById(`type-${id}`).value,
    single_price: Number(document.getElementById(`single-${id}`).value),
    multi_price: Number(document.getElementById(`multi-${id}`).value),
    price: Number(document.getElementById(`single-${id}`).value),
    kind: "room",
    color: document.getElementById(`color-${id}`).value
  };

  await apiSend(`/api/devices/${id}`, "PUT", payload);
  alert("تم حفظ بيانات الأوضة ✅");
  await loadRooms();
}

async function addRoom(){
  const name = prompt("اسم الأوضة:");
  if(!name) return;
  await apiSend("/api/devices", "POST", {
    name,
    type:"PS5",
    price:100,
    single_price:100,
    multi_price:120,
    kind:"room",
    color:"#8b5cf6"
  });
  await loadRooms();
}

async function deleteRoom(id){
  if(confirm("حذف الأوضة؟")){
    await apiSend(`/api/devices/${id}`, "DELETE", {});
    await loadRooms();
  }
}

loadRooms();
