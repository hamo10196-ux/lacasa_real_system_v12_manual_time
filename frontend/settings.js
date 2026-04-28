
function loadSettings(){
  document.getElementById("app").innerHTML = `
    ${shell("settings")}
    <main class="main">
      ${topbar("الإعدادات", "إعدادات السيستم وحذف بيانات التشغيل.")}

      <div class="panel">
        <div class="panel-head"><h3>معلومات المحل</h3></div>
        <div class="form-box">
          <label>اسم المحل</label>
          <input value="LaCasa">
          <label>عنوان الفاتورة</label>
          <textarea>LA CASA 🎮\nPLAYSTATION & CAFE</textarea>
        </div>
      </div>

      <br>

      <div class="panel">
        <div class="panel-head"><h3>حذف بيانات التشغيل</h3></div>
        <div class="form-box">
          <p>سيتم حذف الأوردرات والمعاملات وإنهاء الجلسات الحالية. الأجهزة والمنتجات والعملاء لن يتم حذفهم.</p>
          <button class="danger-btn" onclick="clearBusiness()">حذف بيانات التشغيل</button>
        </div>
      </div>
    </main>
  `;
}

async function clearBusiness(){
  if(confirm("متأكد من حذف بيانات التشغيل؟")){
    await apiSend("/api/settings/clear-business", "POST", {});
    alert("تم الحذف");
  }
}

loadSettings();
