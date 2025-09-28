// -------------------- Storage helpers --------------------
function loadUsers() { return JSON.parse(localStorage.getItem("users") || "[]"); }
function saveUsers(u) { localStorage.setItem("users", JSON.stringify(u)); }
function loadPosts() { return JSON.parse(localStorage.getItem("posts") || "[]"); }
function savePosts(p) { localStorage.setItem("posts", JSON.stringify(p)); }
function getCurrent() { return localStorage.getItem("currentUser"); }
function setCurrent(email) { localStorage.setItem("currentUser", email); }

// -------------------- Auth --------------------
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const btnLogout = document.getElementById("btn-logout");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

btnShowLogin.onclick = () => { loginForm.classList.toggle("hidden"); registerForm.classList.add("hidden"); };
btnShowRegister.onclick = () => { registerForm.classList.toggle("hidden"); loginForm.classList.add("hidden"); };
btnLogout.onclick = () => { localStorage.removeItem("currentUser"); updateAuthUI(); renderProfile(); };

// Login
document.getElementById("btn-login").onclick = () => {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const users = loadUsers();
  const u = users.find((x) => x.email === email && x.pass === pass);
  if (!u) return alert("Invalid login");
  setCurrent(email);
  loginForm.classList.add("hidden");
  updateAuthUI();
  renderProfile();
};

// Register
document.getElementById("btn-register").onclick = () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const dept = document.getElementById("reg-dept").value.trim();
  const skills = document.getElementById("reg-skills").value.split(",").map((s) => s.trim()).filter(Boolean);
  const pass = document.getElementById("reg-pass").value.trim();
  const users = loadUsers();
  if (users.find((u) => u.email === email)) return alert("Email exists");
  users.push({ name, email, department: dept, skills, pass });
  saveUsers(users);
  alert("Registered! Please login.");
  registerForm.classList.add("hidden");
};

// -------------------- Create Project --------------------
document.getElementById("btn-create").onclick = () => {
  const title = document.getElementById("post-title").value.trim();
  const desc = document.getElementById("post-desc").value.trim();
  const skillsNeeded = document.getElementById("post-skills").value.split(",").map((s) => s.trim()).filter(Boolean);
  const cur = getCurrent();
  if (!cur) return alert("Login first");
  const users = loadUsers();
  const u = users.find((x) => x.email === cur);
  if (!u) return alert("User not found");
  const posts = loadPosts();
  posts.push({ id: Date.now(), title, description: desc, skillsNeeded, createdByEmail: cur, createdByName: u.name, joined: [] });
  savePosts(posts);
  renderPosts();
};

// -------------------- Render Posts --------------------
function renderPosts() {
  const postsList = document.getElementById("posts-list");
  postsList.innerHTML = "";
  const posts = loadPosts();
  const cur = getCurrent();
  posts.forEach((p) => {
    const div = document.createElement("div");
    div.className = "post card";
    const isJoined = p.joined?.includes(cur);
    const joinedCount = p.joined?.length || 0;
    div.innerHTML = `
      <div><strong>${escapeHtml(p.title)}</strong> <span class="muted">by ${escapeHtml(p.createdByName)}</span></div>
      <div><button class="small-btn" ${!cur ? "disabled" : ""}>${isJoined ? "Joined" : "Join Project"}</button></div>
      <div style="margin-top:8px">${escapeHtml((p.description || "").slice(0, 250))}</div>
      <div style="margin-top:8px">${(p.skillsNeeded || []).map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join(" ")}</div>
      <div style="margin-top:10px; font-size:13px" class="muted">${joinedCount} joined</div>`;
    div.querySelector("button").onclick = () => { if (!cur) return alert("Login first"); toggleJoin(p.id, cur); };
    postsList.appendChild(div);
  });
  updateAuthUI();
}

function toggleJoin(postId, userEmail) {
  const posts = loadPosts();
  const p = posts.find((x) => x.id === postId);
  if (!p) return alert("Post not found");
  p.joined = p.joined || [];
  if (p.joined.includes(userEmail)) p.joined = p.joined.filter((x) => x !== userEmail);
  else p.joined.push(userEmail);
  savePosts(posts);
  renderPosts();
  renderProfile();
}

// -------------------- Profile --------------------
function renderProfile() {
  const cur = getCurrent();
  const profileInfo = document.getElementById("profile-info");
  const profilePosts = document.getElementById("profile-posts");
  const profileJoined = document.getElementById("profile-joined");
  profileInfo.innerHTML = ""; profilePosts.innerHTML = ""; profileJoined.innerHTML = "";
  if (!cur) { profileInfo.innerHTML = '<div class="muted">Not logged in</div>'; return; }
  const users = loadUsers();
  const u = users.find((x) => x.email === cur);
  if (!u) return profileInfo.innerHTML = '<div class="muted">User data not found</div>';
  profileInfo.innerHTML = `<div><strong>${escapeHtml(u.name)}</strong></div>
    <div class="muted">${escapeHtml(u.email)} • ${escapeHtml(u.department || "")}</div>
    <div class="muted">Skills: ${(u.skills || []).map(escapeHtml).join(", ")}</div>`;
  const posts = loadPosts();
  const mine = posts.filter((p) => p.createdByEmail === cur);
  const joined = posts.filter((p) => (p.joined || []).includes(cur));
  if (mine.length === 0) profilePosts.innerHTML = '<div class="muted">You have not created any posts yet.</div>';
  else mine.forEach((p) => { const d = document.createElement("div"); d.className = "post card"; d.innerHTML = `<strong>${escapeHtml(p.title)}</strong><div class="muted">${escapeHtml(p.description || "")}</div>`; profilePosts.appendChild(d); });
  if (joined.length === 0) profileJoined.innerHTML = '<div class="muted">You have not joined any projects.</div>';
  else joined.forEach((p) => { const d = document.createElement("div"); d.className = "post card"; d.innerHTML = `<strong>${escapeHtml(p.title)}</strong><div class="muted">by ${escapeHtml(p.createdByName)}</div>`; profileJoined.appendChild(d); });
}

// -------------------- Auth UI update --------------------
function updateAuthUI() {
  const cur = getCurrent();
  if (cur) { btnShowLogin.classList.add("hidden"); btnShowRegister.classList.add("hidden"); btnLogout.classList.remove("hidden"); document.getElementById("create-panel").classList.remove("hidden"); }
  else { btnShowLogin.classList.remove("hidden"); btnShowRegister.classList.remove("hidden"); btnLogout.classList.add("hidden"); document.getElementById("create-panel").classList.add("hidden"); }
}

// -------------------- Escape helper --------------------
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Initial render
renderPosts();
updateAuthUI();
renderProfile();