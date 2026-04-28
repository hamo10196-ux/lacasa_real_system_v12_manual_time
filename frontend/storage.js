
let products = [];

async function loadStorage(){
  document.getElementById("app").innerHTML = `
    ${shell("storage")}
    <main class="main">
      ${topbar("المخزن والأسعار", "أضف منتجات وعدل أسعار البوفيه والمخزون.")}

      <div class="panel">
        <div class="panel-head"><h3>إضافة منتج</h3></div>
        <div class="form-grid" style="padding:18px">
          <input id="name" placeholder="اسم المنتج">
          <input id="category" placeholder="القسم">
          <input id="customer_price" type="number" placeholder="سعر العميل">
          <input id="employee_price" type="number" placeholder="سعر الموظف">
          <input id="quantity" type="number" placeholder="الكمية">
          <button class="confirm" onclick="addProduct()">إضافة المنتج</button>
        </div>
      </div>

      <br>

      <div class="panel">
        <div class="panel-head"><h3>كل المنتجات</h3></div>
        <table>
          <thead><tr><th>الاسم</th><th>القسم</th><th>سعر العميل</th><th>سعر الموظف</th><th>الكمية</th><th>حذف</th></tr></thead>
          <tbody id="products"></tbody>
        </table>
      </div>
    </main>
  `;

  products = await apiGet("/api/products");
  renderProducts();
}

function renderProducts(){
  document.getElementById("products").innerHTML = products.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.customer_price}</td>
      <td>${p.employee_price}</td>
      <td>${p.quantity}</td>
      <td class="delete" onclick="deleteProduct(${p.id})">🗑</td>
    </tr>
  `).join("");
}

async function addProduct(){
  await apiSend("/api/products", "POST", {
    name: document.getElementById("name").value,
    category: document.getElementById("category").value,
    customer_price: document.getElementById("customer_price").value,
    employee_price: document.getElementById("employee_price").value,
    quantity: document.getElementById("quantity").value
  });
  await loadStorage();
}

async function deleteProduct(id){
  if(confirm("حذف المنتج؟")){
    await apiSend(`/api/products/${id}`, "DELETE", {});
    await loadStorage();
  }
}

loadStorage();
