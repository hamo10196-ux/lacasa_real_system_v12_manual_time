
let products = [];
let devices = [];
let customers = [];
let cart = [];
let recentOrders = [];

async function loadOrders(){
  document.getElementById("app").innerHTML = `
    ${shell("orders")}
    <main class="main">
      ${topbar("الأوردرات / البوفيه", "اختار منتجات، أضف خصم، واربط الفاتورة بعميل موجود.",
        '<input id="productSearch" class="search" placeholder="ابحث عن منتج..." oninput="renderProducts()">'
      )}

      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head">
            <h3>المنتجات</h3>
            <select id="categoryFilter" onchange="renderProducts()"><option value="">كل الأقسام</option></select>
          </div>
          <div class="products-grid" id="products"></div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>طلب جديد</h3><button class="danger-btn" onclick="clearCart()">إلغاء الطلب</button></div>
          <div class="booking-form">
            <label>الروم / الترابيزة</label>
            <select id="deviceSelect"></select>

            <label>ربط بعميل موجود اختياري</label>
            <select id="customerSelect" onchange="syncCustomerName()">
              <option value="">بدون عميل مسجل</option>
            </select>

            <label>اسم العميل اختياري</label>
            <input id="customerName" placeholder="اتركه فاضي لو مش محتاج اسم" />

            <label>نوع الدفع</label>
            <select id="paymentType">
              <option value="cash">دفع كاش</option>
              <option value="debt">إضافة على حساب العميل</option>
            </select>

            <label>خصم الفاتورة</label>
            <input id="discount" type="number" value="0" min="0" oninput="renderCart()" />

            <div id="cart"></div>

            <div class="total">
              قبل الخصم: <span id="subtotal">0</span> جنيه<br>
              الخصم: <span id="discountValue">0</span> جنيه<br>
              الإجمالي: <span id="orderTotal">0</span> جنيه
            </div>

            <label>ملاحظة</label>
            <textarea id="notes" placeholder="أي ملاحظات..."></textarea>

            <button class="confirm" onclick="saveOrder()">دفع الفاتورة</button>
          </div>
        </div>
      <br>
      <div class="panel">
        <div class="panel-head"><h3>طلبات البوفيه الأخيرة</h3></div>
        <table>
          <thead><tr><th>رقم</th><th>روم / ترابيزة</th><th>العميل</th><th>الإجمالي</th><th>الوقت</th></tr></thead>
          <tbody id="recentBuffetOrders"></tbody>
        </table>
      </div>
    </main>
  `;

  products = await apiGet("/api/products");
  recentOrders = await apiGet("/api/orders");
  devices = await apiGet("/api/devices");
  customers = await apiGet("/api/customers");

  const selectedId = localStorage.getItem("selectedDeviceId");

  document.getElementById("deviceSelect").innerHTML =
    `<option value="">بدون روم</option>` +
    devices.map(d => `<option value="${d.id}" ${String(d.id)===String(selectedId) ? "selected" : ""}>${d.name}</option>`).join("");

  document.getElementById("customerSelect").innerHTML +=
    customers.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name} | الحساب: ${c.balance}</option>`).join("");

  const categories = [...new Set(products.map(p => p.category))];
  document.getElementById("categoryFilter").innerHTML += categories.map(c => `<option value="${c}">${c}</option>`).join("");

  renderProducts();
  renderCart();
  renderRecentOrders();
}

function syncCustomerName(){
  const select = document.getElementById("customerSelect");
  const selected = select.options[select.selectedIndex];
  if(select.value){
    document.getElementById("customerName").value = selected.dataset.name || "";
    document.getElementById("paymentType").value = "debt";
  }
}

function renderProducts(){
  const word = document.getElementById("productSearch")?.value?.toLowerCase() || "";
  const cat = document.getElementById("categoryFilter")?.value || "";

  const list = products.filter(p =>
    (!cat || p.category === cat) &&
    p.name.toLowerCase().includes(word)
  );

  document.getElementById("products").innerHTML = list.map(p => `
    <div class="product-card">
      <h3>${p.name}</h3>
      <p>${p.category}</p>
      <p class="money">${p.customer_price} جنيه</p>
      <p>المخزون: ${p.quantity}</p>
      <button class="btn book" onclick="addToCart(${p.id})">إضافة</button>
    </div>
  `).join("");
}

function addToCart(id){
  const product = products.find(p => p.id === id);
  const found = cart.find(i => i.id === id);
  if(found) found.qty++;
  else cart.push({id:product.id, name:product.name, price:product.customer_price, qty:1});
  renderCart();
}

function renderCart(){
  const subtotal = cart.reduce((s,i)=>s + i.price * i.qty, 0);
  const discount = Math.max(0, Number(document.getElementById("discount")?.value || 0));
  const total = Math.max(0, subtotal - discount);

  document.getElementById("subtotal").innerText = subtotal;
  document.getElementById("discountValue").innerText = discount;
  document.getElementById("orderTotal").innerText = total;

  document.getElementById("cart").innerHTML = cart.length === 0
    ? `<p>لا توجد منتجات في الفاتورة</p>`
    : cart.map((i,index)=>`
      <div class="cart-item">
        <span>${i.name} × ${i.qty}</span>
        <b>${i.price * i.qty} جنيه</b>
        <button class="danger-btn" onclick="removeItem(${index})">×</button>
      </div>
    `).join("");
}

function removeItem(index){
  cart.splice(index,1);
  renderCart();
}

function clearCart(){
  cart = [];
  renderCart();
}

async function saveOrder(){
  if(cart.length === 0){
    alert("أضف منتجات أولاً");
    return;
  }

  const customer_id = document.getElementById("customerSelect").value || null;
  const payment_type = document.getElementById("paymentType").value;

  if(payment_type === "debt" && !customer_id){
    alert("لو هتضيف على حساب العميل لازم تختار عميل موجود");
    return;
  }

  const payload = {
    device_id: document.getElementById("deviceSelect").value || null,
    customer_id,
    customer_name: document.getElementById("customerName").value || "عميل",
    discount: Number(document.getElementById("discount").value || 0),
    payment_type,
    notes: document.getElementById("notes").value || "",
    items: cart
  };

  const result = await apiSend("/api/orders", "POST", payload);
  alert(`تم حفظ الفاتورة ✅\nقبل الخصم: ${result.subtotal} جنيه\nالخصم: ${result.discount} جنيه\nالإجمالي: ${result.total} جنيه`);
  cart = [];
  await loadOrders();
}

loadOrders();


function renderRecentOrders(){
  const el = document.getElementById("recentBuffetOrders");
  if(!el) return;

  el.innerHTML = recentOrders.slice(0, 10).map(o => {
    const place = devices.find(d => String(d.id) === String(o.device_id));
    return `
      <tr>
        <td>#${o.id}</td>
        <td>${place ? place.name : "-"}</td>
        <td>${o.customer_name || "عميل"}</td>
        <td class="money">${o.total} جنيه</td>
        <td>${formatEgyptTime(o.created_at)}</td>
      </tr>
    `;
  }).join("");
}
