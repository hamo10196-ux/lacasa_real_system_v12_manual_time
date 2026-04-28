
let data = null;

async function loadDayClose(){
  document.getElementById("app").innerHTML = `
    ${shell("dayclose")}
    <main class="main">
      ${topbar("تقفيل اليوم", "راجع أرقام اليوم واقفل اليوم في آخر الشيفت.")}

      <section class="kpis">
        <div class="kpi green"><div class="icon">↑</div><h3>كاش اليوم</h3><div class="num" id="rev">0</div><small>جنيه</small></div>
        <div class="kpi amber"><div class="icon">👥</div><h3>ديون اليوم</h3><div class="num" id="debt">0</div><small>جنيه</small></div>
        <div class="kpi red"><div class="icon">↓</div><h3>مصروفات اليوم</h3><div class="num" id="exp">0</div><small>جنيه</small></div>
        <div class="kpi purple"><div class="icon">💳</div><h3>صافي النقدية</h3><div class="num" id="net">0</div><small>جنيه</small></div>
      </section>

      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head"><h3>حركات اليوم</h3></div>
          <table>
            <thead><tr><th>النوع</th><th>العملية</th><th>القيمة</th><th>العميل</th><th>الوقت</th></tr></thead>
            <tbody id="rows"></tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>تقفيل</h3></div>
          <div class="form-box">
            <label>ملاحظة التقفيل</label>
            <textarea id="notes" placeholder="مثال: تم تسليم النقدية بالكامل"></textarea>
            <button class="confirm" onclick="closeDay()">تقفيل اليوم</button>
            <button class="btn info" onclick="window.print()">طباعة التقرير</button>
          </div>
        </div>
      </section>
    </main>
  `;

  data = await apiGet("/api/day-close/today");
  renderDayClose();
}

function renderDayClose(){
  document.getElementById("rev").innerText = formatMoney(data.revenue + data.cashAdds + data.cashRemoves);
  document.getElementById("debt").innerText = formatMoney(data.debt);
  document.getElementById("exp").innerText = formatMoney(data.expenses);
  document.getElementById("net").innerText = formatMoney(data.netCash);

  document.getElementById("rows").innerHTML = data.rows.map(r => `
    <tr>
      <td>${r.type}</td>
      <td>${r.title}</td>
      <td class="money">${formatMoney(r.amount)}</td>
      <td>${r.customer_name || "-"}</td>
      <td>${formatEgyptTime(r.created_at)}</td>
    </tr>
  `).join("");
}

async function closeDay(){
  const notes = document.getElementById("notes").value || "";
  try{
    const result = await apiSend("/api/day-close/close", "POST", {notes});
    alert(`تم تقفيل اليوم ✅\nصافي النقدية: ${result.netCash} جنيه`);
    await loadDayClose();
  }catch(e){
    alert(e.message || "لا يمكن تقفيل اليوم");
  }
}

loadDayClose();
