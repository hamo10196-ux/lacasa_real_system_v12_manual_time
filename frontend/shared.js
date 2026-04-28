
function getCurrentUser(){
  return JSON.parse(localStorage.getItem("lacasa_user") || "null");
}

function requireLogin(){
  const isLoginPage = location.pathname.endsWith("login.html");
  const user = getCurrentUser();

  if(!user && !isLoginPage){
    location.href = "login.html";
  }

  if(user && isLoginPage){
    location.href = "index.html";
  }
}

function logout(){
  localStorage.removeItem("lacasa_user");
  location.href = "login.html";
}

requireLogin();


const API = "";

function formatMoney(value){
  return Number(value || 0).toLocaleString("en-US");
}

function formatEgyptTime(value){
  return new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function toggleTheme(){
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  const btn = document.querySelector(".theme-btn");
  if(btn) btn.innerText = document.body.classList.contains("light") ? "🌙" : "☀️";
}

function applyTheme(){
  if(localStorage.getItem("theme") === "light"){
    document.body.classList.add("light");
  }
  const btn = document.querySelector(".theme-btn");
  if(btn) btn.innerText = document.body.classList.contains("light") ? "🌙" : "☀️";
}

async function apiGet(url){
  const res = await fetch(API + url);
  if(!res.ok) throw new Error("API error");
  return res.json();
}

async function apiSend(url, method, data){
  const res = await fetch(API + url, {
    method,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(data || {})
  });
  if(!res.ok){
    const err = await res.json().catch(()=>({error:"Error"}));
    throw new Error(err.error || "API error");
  }
  return res.json();
}

function shell(active){
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon ps-logo">PS</div>
        <div>
          <h1>LaCasa</h1>
          <p>PS & CAFE</p><img class="brand-photo" src="assets/lacasa-logo.jpeg" alt="LaCasa logo">
        </div>
      </div>

      <nav class="nav">
        <a href="index.html" class="nav-item ${active==='home'?'active':''}"><span>🏠</span><b>الرئيسية</b></a>
        <a href="devices.html" class="nav-item ${active==='devices'?'active':''}"><span>🎮</span><b>الأجهزة</b></a>
        <a href="rooms.html" class="nav-item ${active==='rooms'?'active':''}"><span>🛠️</span><b>تعديل الأوض</b></a>
        <a href="tables.html" class="nav-item ${active==='tables'?'active':''}"><span>🪑</span><b>الترابيزات</b></a>
        <a href="orders.html" class="nav-item ${active==='orders'?'active':''}"><span>🍔</span><b>الطلبات</b></a>
        <a href="storage.html" class="nav-item ${active==='storage'?'active':''}"><span>🏷️</span><b>المخزن والأسعار</b></a>
        <a href="customers.html" class="nav-item ${active==='customers'?'active':''}"><span>👥</span><b>العملاء</b></a>
        <a href="expenses.html" class="nav-item ${active==='expenses'?'active':''}"><span>💸</span><b>المصروفات</b></a>
        <a href="cash.html" class="nav-item ${active==='cash'?'active':''}"><span>💵</span><b>النقدية</b></a>
        <a href="dayclose.html" class="nav-item ${active==='dayclose'?'active':''}"><span>🔒</span><b>تقفيل اليوم</b></a>
        <a href="reports.html" class="nav-item ${active==='reports'?'active':''}"><span>📋</span><b>التقارير</b></a>
        <a href="settings.html" class="nav-item ${active==='settings'?'active':''}"><span>⚙️</span><b>الإعدادات</b></a>
      </nav>

      <button class="logout" onclick="logout()">تسجيل خروج ↪</button>
      
    </aside>
  `;
}

function topbar(title, subtitle, extra=""){
  return `
    <img class="floating-mask-img" src="assets/lacasa-mask.png" title="LaCasa Mode" alt="LaCasa mask">
    <header class="topbar">
      <div class="user-box">
        <div class="avatar">A</div>
        <div>
          <strong>${getCurrentUser()?.username || "Ahmed"}</strong>
          <small>${getCurrentUser()?.role || "مدير النظام"}</small>
        </div>
        <div class="bell">🔔<i>3</i></div>
      </div>
      <div class="actions">
        ${extra}
        <button class="theme-btn" onclick="toggleTheme()">🌙</button>
      </div>
    </header>
    <div class="title-row">
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
    </div>
    ${developerSignature()}
  `;
}

document.addEventListener("DOMContentLoaded", applyTheme);


function developerSignature(){
  return `
    <div class="dev-badge">
      Developed by <b>Eng/Ahmed Reda</b>
    </div>
  `;

}
