
let rows = [];

async function loadCash(){
  document.getElementById("app").innerHTML = `
    ${shell("cash")}
    <main class="main">
      ${topbar("النقدية", "ضيف نقدية أو اسحب نقدية من غير فواتير، وكل حاجة هتظهر في التقارير.")}

      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head"><h3>حركة نقدية جديدة</h3></div>
          <div class="form-box">
            <label>نوع العملية</label>
            <select id="action">
              <option value="add">إضافة نقدية</option>
              <option value="remove">سحب نقدية</option>
            </select>

            <label>اسم العملية</label>
            <input id="title" placeholder="مثال: عهدة / تحويل / سحب من الخزنة">

            <label>المبلغ</label>
            <input id="amount" type="number" min="1" placeholder="مثال: 500">

            <label>ملاحظة</label>
            <textarea id="notes" placeholder="اختياري"></textarea>

            <button class="confirm" onclick="saveCash()">حفظ الحركة</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>آخر حركات النقدية</h3></div>
          <div id="cashRows"></div>
        </div>
      </section>
    </main>
  `;

  rows = await apiGet("/api/cash-adjustments");
  renderCash();
}

function renderCash(){
  document.getElementById("cashRows").innerHTML = rows.length === 0
    ? `<div class="form-box"><p>لا توجد حركات نقدية.</p></div>`
    : rows.map(r => `
      <div class="expense-row">
        <div>
          <div class="expense-title">${r.title}</div>
          <div class="expense-date">${formatEgyptTime(r.created_at)}</div>
        </div>
        <div class="${Number(r.amount) >= 0 ? "money" : ""}">${formatMoney(r.amount)} جنيه</div>
        <div>${r.type === "cash_add" ? "إضافة" : "سحب"}</div>
      </div>
    `).join("");
}

async function saveCash(){
  const action = document.getElementById("action").value;
  const title = document.getElementById("title").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const notes = document.getElementById("notes").value.trim();

  if(!amount || amount <= 0){
    alert("اكتب مبلغ صحيح");
    return;
  }

  await apiSend("/api/cash-adjustments", "POST", {action, title, amount, notes});
  alert("تم حفظ الحركة ✅");
  await loadCash();
}

loadCash();
