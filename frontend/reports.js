
async function loadReports(){
  document.getElementById("app").innerHTML = `
    ${shell("reports")}
    <main class="main">
      ${topbar("التقارير", "إجمالي الكاش والديون والمصروفات وصافي الربح.")}

      <section class="kpis">
        <div class="kpi green"><div class="icon">↑</div><h3>إيرادات كاش</h3><div class="num" id="rev">0</div><small>جنيه</small></div>
        <div class="kpi amber"><div class="icon">👥</div><h3>ديون العملاء</h3><div class="num" id="debt">0</div><small>جنيه</small></div>
        <div class="kpi red"><div class="icon">↓</div><h3>مصروفات</h3><div class="num" id="exp">0</div><small>جنيه</small></div>
        <div class="kpi blue"><div class="icon">💵</div><h3>حركة نقدية</h3><div class="num" id="adj">0</div><small>جنيه</small></div>
        <div class="kpi purple"><div class="icon">💳</div><h3>صافي الكاش</h3><div class="num" id="net">0</div><small>جنيه</small></div>
      </section>

      <div class="panel">
        <div class="panel-head"><h3>تقرير الأيام</h3></div>
        <table>
          <thead><tr><th>اليوم</th><th>الكاش</th><th>الديون</th><th>المصروفات</th><th>حركة نقدية</th><th>الصافي</th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </main>
  `;

  const data = await apiGet("/api/reports");
  document.getElementById("rev").innerText = formatMoney(data.totalRevenue);
  document.getElementById("debt").innerText = formatMoney(data.totalDebt);
  document.getElementById("exp").innerText = formatMoney(data.totalExpenses);
  document.getElementById("adj").innerText = formatMoney(data.totalCashAdjust);
  document.getElementById("net").innerText = formatMoney(data.net);

  document.getElementById("rows").innerHTML = data.rows.map(r => `
    <tr>
      <td>${r.day}</td>
      <td class="money">${formatMoney(r.revenue)}</td>
      <td>${formatMoney(r.debt)}</td>
      <td>${formatMoney(r.expenses)}</td>
      <td>${formatMoney(r.cashAdjust)}</td>
      <td>${formatMoney(Number(r.revenue || 0) + Number(r.cashAdjust || 0) - Number(r.expenses || 0))}</td>
    </tr>
  `).join("");
}

loadReports();
