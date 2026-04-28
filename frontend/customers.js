
let customers = [];

async function loadCustomers(){
  document.getElementById("app").innerHTML = `
    ${shell("customers")}
    <main class="main">
      ${topbar("العملاء", "إدارة العملاء وحساباتهم وربطهم بالفواتير.")}

      <div class="panel">
        <div class="panel-head"><h3>إضافة عميل</h3></div>
        <div class="form-grid" style="padding:18px">
          <input id="name" placeholder="اسم العميل">
          <input id="balance" type="number" placeholder="الحساب" value="0">
          <input id="notes" placeholder="ملاحظات">
          <button class="confirm" onclick="addCustomer()">إضافة عميل</button>
        </div>
      </div>

      <br>

      <div class="panel">
        <div class="panel-head"><h3>العملاء الحاليين</h3></div>
        <table>
          <thead><tr><th>الاسم</th><th>الحساب</th><th>ملاحظات</th><th>تحصيل</th><th>تعديل</th><th>حذف</th></tr></thead>
          <tbody id="customers"></tbody>
        </table>
      </div>
    </main>
  `;

  customers = await apiGet("/api/customers");
  document.getElementById("customers").innerHTML = customers.map(c => `
    <tr>
      <td>${c.name}</td>
      <td class="money">${c.balance}</td>
      <td>${c.notes || ""}</td>
      <td><button class="btn book" onclick="payCustomer(${c.id})">دفع</button></td>
      <td><button class="btn info" onclick="editCustomer(${c.id})">تعديل</button></td>
      <td class="delete" onclick="deleteCustomer(${c.id})">🗑</td>
    </tr>
  `).join("");
}

async function addCustomer(){
  await apiSend("/api/customers", "POST", {
    name: document.getElementById("name").value,
    balance: document.getElementById("balance").value,
    notes: document.getElementById("notes").value
  });
  await loadCustomers();
}

async function editCustomer(id){
  const c = customers.find(x => x.id === id);
  const name = prompt("اسم العميل:", c.name) || c.name;
  const balance = Number(prompt("الحساب:", c.balance) ?? c.balance);
  const notes = prompt("ملاحظات:", c.notes || "") || "";

  await apiSend(`/api/customers/${id}`, "PUT", {name, balance, notes});
  await loadCustomers();
}

async function payCustomer(id){
  const c = customers.find(x => x.id === id);
  const amount = Number(prompt(`المبلغ اللي ${c.name} دفعه:`, "0") || 0);
  if(!amount || amount <= 0) return;

  const notes = prompt("ملاحظة اختيارية:", "") || "";
  await apiSend(`/api/customers/${id}/pay`, "POST", {amount, notes});
  alert("تم تحصيل المبلغ وإضافته للنقدية ✅");
  await loadCustomers();
}

async function deleteCustomer(id){
  if(confirm("حذف العميل؟")){
    await apiSend(`/api/customers/${id}`, "DELETE", {});
    await loadCustomers();
  }
}

loadCustomers();
