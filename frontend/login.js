async function login(){
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("loginError");

  error.innerText = "";

  try{
    const res = await apiSend("/api/login", "POST", {username, password});
    localStorage.setItem("lacasa_user", JSON.stringify(res.user));
    location.href = "index.html";
  }catch(e){
    error.innerText = e.message || "بيانات الدخول غير صحيحة";
  }
}

document.addEventListener("keydown", function(e){
  if(e.key === "Enter") login();
});
