
let expenses = [];

async function loadExpenses(){
  document.getElementById("app").innerHTML = `
    ${shell("expenses")}
    <main class="main">
      ${topbar("المصروفات", "سجل مصروفات حقيقية، وهيتخصموا تلقائيًا من صافي النقدية والتقارير.")}

      <section class="kpis">
        <div class="kpi red">
          <div class="icon">💸</div>
          <h3>إجمالي المصروفات</h3>
          <div class="num" id="totalExpenses">0</div>
          <small>جنيه</small>
        </div>
        <div class="kpi gold">
          <div class="icon">🎭</div>
          <h3>LaCasa Mode</h3>
          <div class="num">ON</div>
          <small>ستايل خاص بالسيستم</small>
        </div>
      </section>

      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head"><h3>إضافة مصروف</h3></div>
          <div class="form-box">
            <label>اسم المصروف</label>
            <input id="expenseTitle" placeholder="مثال: كهرباء / صيانة / مشتريات">

            <label>القيمة</label>
            <input id="expenseAmount" type="number" min="1" placeholder="مثال: 250">

            <label>ملاحظة اختيارية</label>
            <textarea id="expenseNotes" placeholder="أي تفاصيل عن المصروف..."></textarea>

            <button class="danger-btn" onclick="addExpense()">تسجيل المصروف</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>آخر المصروفات</h3>
            <button class="btn info small-btn" onclick="loadExpenses()">تحديث</button>
          </div>
          <div id="expensesList"></div>
        </div>
      </section>
    </main>
  `;

  expenses = await apiGet("/api/expenses");
  renderExpenses();
}

function renderExpenses(){
  const total = expenses.reduce((sum,e)=>sum + Number(e.amount || 0), 0);
  document.getElementById("totalExpenses").innerText = formatMoney(total);

  document.getElementById("expensesList").innerHTML = expenses.length === 0
    ? `<div class="form-box"><p>لا توجد مصروفات مسجلة.</p></div>`
    : expenses.map(e => `
      <div class="expense-row">
        <div>
          <div class="expense-title">${e.title}</div>
          <div class="expense-date">${formatEgyptTime(e.created_at)}</div>
        </div>
        <div class="money">${formatMoney(e.amount)} جنيه</div>
        <div>${e.employee || "admin"}</div>
        <button class="danger-btn" onclick="deleteExpense(${e.id})">حذف</button>
      </div>
    `).join("");
}

async function addExpense(){
  const title = document.getElementById("expenseTitle").value.trim();
  const amount = Number(document.getElementById("expenseAmount").value);
  const notes = document.getElementById("expenseNotes").value.trim();

  if(!title || !amount || amount <= 0){
    alert("اكتب اسم المصروف وقيمة صحيحة");
    return;
  }

  await apiSend("/api/expenses", "POST", {title, amount, notes});
  alert("تم تسجيل المصروف ✅");
  await loadExpenses();
}

async function deleteExpense(id){
  if(confirm("حذف المصروف؟")){
    await apiSend(`/api/expenses/${id}`, "DELETE", {});
    await loadExpenses();
  }
}

loadExpenses();
