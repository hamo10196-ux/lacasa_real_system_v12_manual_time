
async function loadDashboard(){
  document.getElementById("app").innerHTML = `
    ${shell("home")}
    <main class="main">
      ${topbar("لوحة التحكم", "ملخص سريع عن الأجهزة والجلسات والإيرادات.")}
      <section class="kpis">
        <div class="kpi purple"><div class="icon">💳</div><h3>صافي النقدية</h3><div class="num" id="cash">0</div><small>جنيه</small></div>
        <div class="kpi green"><div class="icon">↑</div><h3>الإيرادات</h3><div class="num" id="revenue">0</div><small>جنيه</small></div>
        <div class="kpi red"><div class="icon">↓</div><h3>المصروفات</h3><div class="num" id="expenses">0</div><small>جنيه</small></div>
        <div class="kpi amber"><div class="icon">⏱️</div><h3>جلسات شغالة</h3><div class="num" id="busy">0</div><small>جهاز</small></div>
      </section>

      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head"><h3>آخر المعاملات</h3><a class="mini-link" href="reports.html">التقارير</a></div>
          <table>
            <thead><tr><th>العملية</th><th>القيمة</th><th>العميل</th><th>الوقت</th></tr></thead>
            <tbody id="recent"></tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>اختصارات</h3></div>
          <div class="form-box">
            <a class="primary-btn" href="devices.html">إدارة الأجهزة</a>
            <a class="primary-btn" href="orders.html">أوردر جديد</a>
            <a class="primary-btn" href="storage.html">المخزن والأسعار</a>
            <a class="danger-btn" href="expenses.html">تسجيل مصروف</a>
            <a class="primary-btn" href="cash.html">إضافة نقدية</a>
            <a class="primary-btn" href="dayclose.html">تقفيل اليوم</a>
          </div>
        </div>
      </section>

      <div class="footer"><span>LaCasa PlayStation © 2026</span><span>Developed by Eng/Ahmed Reda</span></div>
    </main>
  `;

  const data = await apiGet("/api/dashboard");
  document.getElementById("cash").innerText = formatMoney(data.cash) + ".00";
  document.getElementById("revenue").innerText = formatMoney(data.revenue);
  document.getElementById("expenses").innerText = formatMoney(data.expenses);
  document.getElementById("busy").innerText = data.busy;

  document.getElementById("recent").innerHTML = data.recent.map(t => `
    <tr>
      <td>${t.title}</td>
      <td class="money">${formatMoney(t.amount)} جنيه</td>
      <td>${t.customer_name || "-"}</td>
      <td>${new Date(t.created_at).toLocaleString("ar-EG")}</td>
    </tr>
  `).join("");
}

loadDashboard();
