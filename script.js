// -------------------- Firebase Setup --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkIgFWSsFrnFtcDLzOw9cYseuHCuxgXpU",
  authDomain: "collab-e7ef8.firebaseapp.com",
  projectId: "collab-e7ef8",
  storageBucket: "collab-e7ef8.firebasestorage.app",
  messagingSenderId: "336523551888",
  appId: "1:336523551888:web:3879d7083e8096f9646415",
  measurementId: "G-QJ1YM184DM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===================== CONFIGURATION =====================
const ADMIN_EMAIL = "your@email.com";   // 👈 Change to YOUR email
// =========================================================

// -------------------- Toast --------------------
function showToast(msg, type = "default") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "show " + type;
  setTimeout(() => { toast.className = "hidden"; }, 3500);
}

// -------------------- Scroll To Top --------------------
const scrollBtn = document.getElementById("scroll-top");
window.addEventListener("scroll", () => {
  scrollBtn.classList.toggle("visible", window.scrollY > 300);
});
scrollBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

// -------------------- Search --------------------
let searchQuery = "";
document.getElementById("search-input").addEventListener("input", async (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  await renderPosts(auth.currentUser);
});

// -------------------- Department Filter --------------------
const DEPARTMENTS = ["All", "ECE", "CSE", "EEE", "Mech", "Bio Medical", "BBL", "IT", "Arts"];
let activeFilter = "All";

function renderFilterButtons() {
  const container = document.getElementById("dept-filter");
  container.innerHTML = "";
  DEPARTMENTS.forEach(dept => {
    const btn = document.createElement("button");
    btn.textContent = dept;
    btn.className = "filter-btn" + (dept === activeFilter ? " active-filter" : "");
    btn.onclick = async () => {
      activeFilter = dept;
      renderFilterButtons();
      await renderPosts(auth.currentUser);
    };
    container.appendChild(btn);
  });
}

// -------------------- Navbar --------------------
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const btnLogout = document.getElementById("btn-logout");

btnShowLogin.onclick = () => openAuthModal("login");
btnShowRegister.onclick = () => openAuthModal("register");
btnLogout.onclick = async () => {
  await signOut(auth);
  document.getElementById("admin-panel").classList.add("hidden");
  showToast("Logged out successfully");
};

document.getElementById("btn-admin").onclick = () => {
  const panel = document.getElementById("admin-panel");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) loadAdminDashboard();
};
document.getElementById("admin-close").onclick = () => {
  document.getElementById("admin-panel").classList.add("hidden");
};

document.getElementById("auth-close-btn").onclick = closeAuthModal;
document.getElementById("auth-overlay").onclick = (e) => {
  if (e.target === document.getElementById("auth-overlay")) closeAuthModal();
};
document.getElementById("switch-to-register").onclick = (e) => { e.preventDefault(); openAuthModal("register"); };
document.getElementById("switch-to-login").onclick = (e) => { e.preventDefault(); openAuthModal("login"); };

function openAuthModal(panel) {
  document.getElementById("auth-overlay").classList.remove("hidden");
  document.getElementById("login-form").classList.toggle("hidden", panel !== "login");
  document.getElementById("register-form").classList.toggle("hidden", panel !== "register");
}
function closeAuthModal() {
  document.getElementById("auth-overlay").classList.add("hidden");
}

// -------------------- Roll Number Validation --------------------
document.getElementById("reg-roll").addEventListener("input", (e) => {
  const val = e.target.value.trim();
  const hint = document.getElementById("roll-hint");
  if (!val) { hint.textContent = ""; return; }
  // Basic roll number format: letters and numbers, 8-15 chars
  const valid = /^[a-zA-Z0-9]{8,20}$/.test(val);
  if (valid) {
    hint.textContent = "✅ Looks good";
    hint.className = "field-hint hint-ok";
  } else {
    hint.textContent = "⚠️ Roll number should be 8-20 characters (letters and numbers only)";
    hint.className = "field-hint hint-warn";
  }
});

// -------------------- Password Toggle --------------------
document.getElementById("toggle-pass").addEventListener("click", () => {
  const input = document.getElementById("reg-pass");
  const eye = document.getElementById("toggle-pass");
  input.type = input.type === "password" ? "text" : "password";
  eye.textContent = input.type === "password" ? "👁️" : "🙈";
});
document.getElementById("toggle-login-pass").addEventListener("click", () => {
  const input = document.getElementById("login-pass");
  const eye = document.getElementById("toggle-login-pass");
  input.type = input.type === "password" ? "text" : "password";
  eye.textContent = input.type === "password" ? "👁️" : "🙈";
});

// -------------------- Register --------------------
document.getElementById("btn-register").onclick = async () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const roll = document.getElementById("reg-roll").value.trim().toUpperCase();
  const year = document.getElementById("reg-year").value;
  const dept = document.getElementById("reg-dept").value;
  const skills = document.getElementById("reg-skills").value.split(",").map(s => s.trim()).filter(Boolean);
  const pass = document.getElementById("reg-pass").value.trim();

  if (!name || !email || !roll || !year || !dept || !pass) return showToast("Please fill all fields.", "error");
  if (pass.length < 6) return showToast("Password must be at least 6 characters.", "error");
  if (!/^[a-zA-Z0-9]{8,20}$/.test(roll)) return showToast("Please enter a valid roll number.", "error");

  try {
    // Check if roll number already exists
    const usersSnap = await getDocs(collection(db, "users"));
    const rollExists = usersSnap.docs.some(d => d.data().rollNumber === roll);
    if (rollExists) return showToast("This roll number is already registered.", "error");

    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", userCred.user.uid), {
      name, email, rollNumber: roll, year, department: dept, skills,
      role: email === ADMIN_EMAIL ? "admin" : "user",
      verified: email === ADMIN_EMAIL ? true : false,
      joinedAt: Date.now()
    });
    closeAuthModal();
    showToast("Welcome to CollabHub! 🎉", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
};

// -------------------- Login --------------------
document.getElementById("btn-login").onclick = async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  if (!email || !pass) return showToast("Please fill all fields.", "error");
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeAuthModal();
    showToast("Welcome back! 👋", "success");
  } catch (err) {
    showToast("Invalid email or password.", "error");
  }
};

// -------------------- Auth State --------------------
onAuthStateChanged(auth, async (user) => {
  await updateAuthUI(user);
  renderFilterButtons();
  await renderPosts(user);
  if (user) await renderProfile(user);
  await updateStats();
});

// -------------------- Stats --------------------
async function updateStats() {
  const postsSnap = await getDocs(collection(db, "posts"));
  const usersSnap = await getDocs(collection(db, "users"));
  animateCount("stat-projects", postsSnap.size);
  animateCount("stat-members", usersSnap.size);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

// -------------------- Format Date --------------------
function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// -------------------- Create Project --------------------
document.getElementById("btn-create").onclick = async () => {
  const title = document.getElementById("post-title").value.trim();
  const desc = document.getElementById("post-desc").value.trim();
  const skillsNeeded = document.getElementById("post-skills").value.split(",").map(s => s.trim()).filter(Boolean);
  const user = auth.currentUser;
  if (!user) return showToast("Please login first.", "error");
  if (!title || !desc) return showToast("Please fill title and description.", "error");
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();
  await addDoc(collection(db, "posts"), {
    title, description: desc, skillsNeeded,
    createdByUid: user.uid,
    createdByName: userData.name,
    createdByDept: userData.department,
    joined: [],
    createdAt: Date.now()
  });
  document.getElementById("post-title").value = "";
  document.getElementById("post-desc").value = "";
  document.getElementById("post-skills").value = "";
  showToast("Project posted! 🚀", "success");
  await renderPosts(auth.currentUser);
  await updateStats();
};

// -------------------- Delete Project --------------------
async function deletePost(postId) {
  if (!confirm("Delete this project? This cannot be undone.")) return;
  await deleteDoc(doc(db, "posts", postId));
  closeDetail();
  showToast("Project deleted.", "default");
  await renderPosts(auth.currentUser);
  await renderProfile(auth.currentUser);
  await updateStats();
}

// -------------------- Render Posts --------------------
async function renderPosts(user) {
  const postsList = document.getElementById("posts-list");
  postsList.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Loading projects...</p></div>`;

  const snapshot = await getDocs(collection(db, "posts"));
  let posts = [];
  snapshot.forEach(docSnap => posts.push({ ...docSnap.data(), id: docSnap.id }));
  posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (activeFilter !== "All") {
    posts = posts.filter(p => (p.createdByDept || "").toLowerCase() === activeFilter.toLowerCase());
  }
  if (searchQuery) {
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(searchQuery) ||
      (p.description || "").toLowerCase().includes(searchQuery) ||
      (p.skillsNeeded || []).some(s => s.toLowerCase().includes(searchQuery)) ||
      (p.createdByName || "").toLowerCase().includes(searchQuery)
    );
  }

  postsList.innerHTML = "";
  if (posts.length === 0) {
    postsList.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${searchQuery ? "No projects match your search." : "No projects found."}</p></div>`;
    return;
  }

  let isAdmin = false;
  if (user) {
    const uSnap = await getDoc(doc(db, "users", user.uid));
    if (uSnap.exists()) isAdmin = uSnap.data().role === "admin";
  }

  posts.forEach((p) => {
    const pid = p.id;
    const isJoined = user && (p.joined || []).includes(user.uid);
    const joinedCount = (p.joined || []).length;
    const isOwner = user && p.createdByUid === user.uid;
    const canDelete = isOwner || isAdmin;
    const shortDesc = (p.description || "").slice(0, 160);
    const hasMore = (p.description || "").length > 160;
    const dateStr = formatDate(p.createdAt);

    const div = document.createElement("div");
    div.className = "post-card";
    div.innerHTML = `
      <div class="post-card-header">
        <div>
          <div class="post-card-title">${escapeHtml(p.title)}</div>
          <div class="post-card-by">by ${escapeHtml(p.createdByName)} ${dateStr ? `<span class="post-date">· ${dateStr}</span>` : ""}</div>
        </div>
        <span class="post-card-dept">${escapeHtml(p.createdByDept || "")}</span>
      </div>
      <div class="post-card-desc">${escapeHtml(shortDesc)}${hasMore ? `<span class="read-more"> ...read more</span>` : ""}</div>
      <div class="tags">${(p.skillsNeeded || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>
      <div class="post-card-footer">
        ${!user
          ? `<button class="btn btn-sm btn-primary login-to-join">🔒 Login to Join</button>`
          : `<button class="btn btn-sm ${isOwner ? "btn-ghost" : isJoined ? "btn-success" : "btn-primary"} join-btn"
              ${isOwner ? "disabled" : ""}>
              ${isOwner ? "Your Project" : isJoined ? "✅ Joined" : "Join Project"}
            </button>`
        }
        <span class="joined-count">👥 ${joinedCount} member${joinedCount !== 1 ? "s" : ""}</span>
        ${canDelete ? `<button class="btn btn-sm btn-danger delete-btn" style="margin-left:auto">🗑️ ${isAdmin && !isOwner ? "Remove" : "Delete"}</button>` : ""}
      </div>`;

    div.querySelector(".post-card-title").onclick = () => openDetail(pid);
    if (div.querySelector(".read-more")) div.querySelector(".read-more").onclick = () => openDetail(pid);
    if (!user && div.querySelector(".login-to-join")) div.querySelector(".login-to-join").onclick = () => openAuthModal("login");
    if (user && !isOwner && div.querySelector(".join-btn")) div.querySelector(".join-btn").onclick = () => toggleJoin(pid, user.uid);
    if (canDelete) div.querySelector(".delete-btn").onclick = () => deletePost(pid);

    postsList.appendChild(div);
  });
}

// -------------------- Toggle Join --------------------
async function toggleJoin(postId, uid) {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const p = postSnap.data();
  const isJoined = (p.joined || []).includes(uid);
  await updateDoc(postRef, { joined: isJoined ? arrayRemove(uid) : arrayUnion(uid) });
  showToast(isJoined ? "Left project" : "Joined project! 🎉", isJoined ? "default" : "success");
  await renderPosts(auth.currentUser);
  await renderProfile(auth.currentUser);
}

// -------------------- Project Detail --------------------
async function openDetail(postId) {
  const user = auth.currentUser;
  const postSnap = await getDoc(doc(db, "posts", postId));
  if (!postSnap.exists()) return showToast("Project not found.", "error");
  const p = postSnap.data();
  const isOwner = user && p.createdByUid === user.uid;
  const isJoined = user && (p.joined || []).includes(user.uid);
  const joinedCount = (p.joined || []).length;

  let isAdmin = false;
  if (user) {
    const uSnap = await getDoc(doc(db, "users", user.uid));
    if (uSnap.exists()) isAdmin = uSnap.data().role === "admin";
  }
  const canDelete = isOwner || isAdmin;

  let membersHTML = `<p class="muted">No members yet — be the first to join!</p>`;
  if ((p.joined || []).length > 0) {
    const memberData = await Promise.all(
      p.joined.map(async uid => {
        try {
          const uSnap = await getDoc(doc(db, "users", uid));
          if (uSnap.exists()) {
            const u = uSnap.data();
            return `<div class="member-chip">👤 ${escapeHtml(u.name)} <span class="member-dept">${escapeHtml(u.department || "")}${u.rollNumber ? ` · ${escapeHtml(u.rollNumber)}` : ""}</span></div>`;
          }
        } catch { return ""; }
        return "";
      })
    );
    membersHTML = `<div class="detail-members">${memberData.filter(Boolean).join("")}</div>`;
  }

  document.getElementById("detail-body").innerHTML = `
    <span class="detail-dept-badge">${escapeHtml(p.createdByDept || "")}</span>
    <div class="detail-title">${escapeHtml(p.title)}</div>
    <div class="detail-by">Posted by <strong>${escapeHtml(p.createdByName)}</strong> · <span class="post-date">${formatDate(p.createdAt)}</span></div>
    <div class="detail-section-label">Description</div>
    <div class="detail-desc">${escapeHtml(p.description || "")}</div>
    <div class="detail-section-label">Skills Needed</div>
    <div class="tags">${(p.skillsNeeded || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join("") || `<span class="muted">None specified</span>`}</div>
    <div class="detail-section-label">Team Members (${joinedCount})</div>
    ${membersHTML}
    <div class="detail-actions">
      ${!user
        ? `<button class="btn btn-primary detail-login-btn">🔒 Login to Join</button>`
        : !isOwner
          ? `<button class="btn btn-primary detail-join-btn">${isJoined ? "Leave Project" : "Join Project"}</button>`
          : `<button class="btn btn-ghost" disabled>Your Project</button>`
      }
      ${canDelete ? `<button class="btn btn-danger detail-delete-btn">🗑️ Delete Project</button>` : ""}
    </div>`;

  if (!user && document.querySelector(".detail-login-btn")) {
    document.querySelector(".detail-login-btn").onclick = () => { closeDetail(); openAuthModal("login"); };
  }
  if (user && !isOwner && document.querySelector(".detail-join-btn")) {
    document.querySelector(".detail-join-btn").onclick = async () => {
      await toggleJoin(postId, user.uid);
      await openDetail(postId);
    };
  }
  if (canDelete) document.querySelector(".detail-delete-btn").onclick = () => deletePost(postId);

  document.getElementById("detail-modal").classList.remove("hidden");
}

function closeDetail() {
  document.getElementById("detail-modal").classList.add("hidden");
  document.getElementById("detail-body").innerHTML = "";
}
document.getElementById("detail-close").onclick = closeDetail;
document.getElementById("detail-modal").onclick = (e) => {
  if (e.target === document.getElementById("detail-modal")) closeDetail();
};

// -------------------- Admin Dashboard --------------------
async function loadAdminDashboard() {
  const usersSnap = await getDocs(collection(db, "users"));
  const postsSnap = await getDocs(collection(db, "posts"));

  const users = [];
  usersSnap.forEach(d => users.push({ ...d.data(), id: d.id }));
  const posts = [];
  postsSnap.forEach(d => posts.push({ ...d.data(), id: d.id }));

  const totalJoins = posts.reduce((sum, p) => sum + (p.joined || []).length, 0);
  const unverified = users.filter(u => !u.verified && u.role !== "admin").length;

  document.getElementById("admin-stat-users").textContent = users.length;
  document.getElementById("admin-stat-posts").textContent = posts.length;
  document.getElementById("admin-stat-joins").textContent = totalJoins;
  document.getElementById("admin-stat-unverified").textContent = unverified;

  // Users table
  const usersList = document.getElementById("admin-users-list");
  usersList.innerHTML = `
    <div style="margin-bottom:12px; font-size:13px; color:var(--text-muted);">
      💡 Click <strong>Verify</strong> to confirm a student is genuine. Verified students show a ✅ badge on their profile.
    </div>
    <div style="overflow-x:auto;">
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Roll No.</th><th>Dept</th><th>Year</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td><strong>${escapeHtml(u.name)}</strong></td>
            <td class="roll-cell">${escapeHtml(u.rollNumber || "—")}</td>
            <td><span class="post-card-dept">${escapeHtml(u.department || "")}</span></td>
            <td class="muted">${escapeHtml(u.year || "—")}</td>
            <td class="muted" style="font-size:12px">${escapeHtml(u.email)}</td>
            <td>
              ${u.role === "admin"
                ? `<span class="role-badge admin-badge">Admin</span>`
                : u.verified
                  ? `<span class="role-badge verified-badge">✅ Verified</span>`
                  : `<span class="role-badge unverified-badge">⏳ Unverified</span>`
              }
            </td>
            <td style="display:flex; gap:6px; flex-wrap:wrap;">
              ${u.role !== "admin"
                ? `${!u.verified
                    ? `<button class="btn btn-sm btn-success" data-uid="${u.id}" data-action="verify">✅ Verify</button>`
                    : `<button class="btn btn-sm btn-ghost" data-uid="${u.id}" data-action="unverify">↩️ Unverify</button>`
                  }
                  <button class="btn btn-sm btn-danger" data-uid="${u.id}" data-action="delete-user">🗑️</button>`
                : `<span class="muted">—</span>`
              }
            </td>
          </tr>`).join("")}
      </tbody>
    </table>
    </div>`;

  usersList.querySelectorAll("[data-action='verify']").forEach(btn => {
    btn.onclick = () => adminVerifyUser(btn.dataset.uid, true);
  });
  usersList.querySelectorAll("[data-action='unverify']").forEach(btn => {
    btn.onclick = () => adminVerifyUser(btn.dataset.uid, false);
  });
  usersList.querySelectorAll("[data-action='delete-user']").forEach(btn => {
    btn.onclick = () => adminDeleteUser(btn.dataset.uid);
  });

  // Projects table
  const projectsList = document.getElementById("admin-projects-list");
  projectsList.innerHTML = `
    <div style="overflow-x:auto;">
    <table class="admin-table">
      <thead><tr><th>Title</th><th>Posted By</th><th>Roll No.</th><th>Dept</th><th>Members</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>
        ${posts.map(p => {
          const creator = users.find(u => u.id === p.createdByUid);
          return `
          <tr>
            <td><strong>${escapeHtml(p.title)}</strong></td>
            <td>${escapeHtml(p.createdByName)}</td>
            <td class="roll-cell">${escapeHtml(creator?.rollNumber || "—")}</td>
            <td><span class="post-card-dept">${escapeHtml(p.createdByDept || "")}</span></td>
            <td class="muted">👥 ${(p.joined || []).length}</td>
            <td class="muted">${formatDate(p.createdAt)}</td>
            <td><button class="btn btn-sm btn-danger" data-pid="${p.id}" data-action="delete-post">🗑️ Delete</button></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    </div>`;

  projectsList.querySelectorAll("[data-action='delete-post']").forEach(btn => {
    btn.onclick = () => adminDeletePost(btn.dataset.pid);
  });

  // Tabs
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active-tab"));
      tab.classList.add("active-tab");
      document.getElementById("admin-users-tab").classList.toggle("hidden", tab.dataset.tab !== "users");
      document.getElementById("admin-projects-tab").classList.toggle("hidden", tab.dataset.tab !== "projects");
    };
  });
}

async function adminVerifyUser(uid, verified) {
  // Double-check caller is admin
  const callerSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!callerSnap.exists() || callerSnap.data().role !== "admin") {
    return showToast("Unauthorized.", "error");
  }
  try {
    await updateDoc(doc(db, "users", uid), { verified });
    showToast(verified ? "Student verified ✅" : "Verification removed", verified ? "success" : "default");
    await loadAdminDashboard();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
}

async function adminDeleteUser(uid) {
  const callerSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!callerSnap.exists() || callerSnap.data().role !== "admin") {
    return showToast("Unauthorized.", "error");
  }
  if (!confirm("Remove this student from the database?")) return;
  try {
    await deleteDoc(doc(db, "users", uid));
    showToast("Student removed.", "default");
    await loadAdminDashboard();
    await updateStats();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
}

async function adminDeletePost(postId) {
  const callerSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!callerSnap.exists() || callerSnap.data().role !== "admin") {
    return showToast("Unauthorized.", "error");
  }
  if (!confirm("Delete this project?")) return;
  try {
    await deleteDoc(doc(db, "posts", postId));
    showToast("Project deleted.", "default");
    await loadAdminDashboard();
    await renderPosts(auth.currentUser);
    await updateStats();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
}

// -------------------- Render Profile --------------------
async function renderProfile(user) {
  const profileInfo = document.getElementById("profile-info");
  const profilePosts = document.getElementById("profile-posts");
  const profileJoined = document.getElementById("profile-joined");

  if (!user) {
    document.getElementById("profile-section").classList.add("hidden");
    return;
  }

  document.getElementById("profile-section").classList.remove("hidden");

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const u = userSnap.data();
  const isAdmin = u.role === "admin";
  const isVerified = u.verified || isAdmin;

  const skillTags = (u.skills || []).map(s => `<span class="profile-skill-tag">${escapeHtml(s)}</span>`).join("");
  profileInfo.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
      <div>
        <h3>${escapeHtml(u.name)}
          ${isAdmin ? `<span class="role-badge admin-badge" style="font-size:11px; vertical-align:middle; margin-left:8px;">Admin</span>` : ""}
          ${isVerified && !isAdmin ? `<span class="role-badge verified-badge" style="font-size:11px; vertical-align:middle; margin-left:8px;">✅ Verified</span>` : ""}
          ${!isVerified && !isAdmin ? `<span class="role-badge unverified-badge" style="font-size:11px; vertical-align:middle; margin-left:8px;">⏳ Pending Verification</span>` : ""}
        </h3>
        <p>${escapeHtml(u.email)}</p>
        <p>🏛️ ${escapeHtml(u.department || "")} ${u.year ? `· ${escapeHtml(u.year)}` : ""}</p>
        ${u.rollNumber ? `<p>🎓 Roll No: <strong>${escapeHtml(u.rollNumber)}</strong></p>` : ""}
      </div>
    </div>
    ${skillTags ? `<div class="profile-skills" style="margin-top:12px;">${skillTags}</div>` : ""}`;

  const snapshot = await getDocs(collection(db, "posts"));
  let myPosts = [], joinedPosts = [];
  snapshot.forEach(docSnap => {
    const p = { ...docSnap.data(), id: docSnap.id };
    if (p.createdByUid === user.uid) myPosts.push(p);
    else if ((p.joined || []).includes(user.uid)) joinedPosts.push(p);
  });

  profilePosts.innerHTML = myPosts.length === 0
    ? `<div class="empty-state"><div class="empty-icon">📝</div><p>No projects yet.</p></div>`
    : myPosts.map(p => `
      <div class="mini-card">
        <div class="mini-card-actions">
          <div class="mini-card-title" data-id="${p.id}">${escapeHtml(p.title)}</div>
          <button class="btn btn-sm btn-danger" data-del="${p.id}">🗑️</button>
        </div>
        <div class="mini-card-sub">👥 ${(p.joined || []).length} member${(p.joined || []).length !== 1 ? "s" : ""} · ${formatDate(p.createdAt)}</div>
      </div>`).join("");

  profileJoined.innerHTML = joinedPosts.length === 0
    ? `<div class="empty-state"><div class="empty-icon">🤝</div><p>No joined projects yet.</p></div>`
    : joinedPosts.map(p => `
      <div class="mini-card">
        <div class="mini-card-title" data-id="${p.id}">${escapeHtml(p.title)}</div>
        <div class="mini-card-sub">by ${escapeHtml(p.createdByName)} · ${escapeHtml(p.createdByDept || "")}</div>
      </div>`).join("");

  profilePosts.querySelectorAll(".mini-card-title").forEach(el => el.onclick = () => openDetail(el.dataset.id));
  profilePosts.querySelectorAll("[data-del]").forEach(el => el.onclick = () => deletePost(el.dataset.del));
  profileJoined.querySelectorAll(".mini-card-title").forEach(el => el.onclick = () => openDetail(el.dataset.id));
}

// -------------------- Auth UI --------------------
async function updateAuthUI(user) {
  document.getElementById("btn-show-login").classList.toggle("hidden", !!user);
  document.getElementById("btn-show-register").classList.toggle("hidden", !!user);
  document.getElementById("user-nav").classList.toggle("hidden", !user);
  document.getElementById("create-panel").classList.toggle("hidden", !user);

  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const u = snap.data();
      document.getElementById("nav-username").textContent = "👤 " + u.name;
      document.getElementById("btn-admin").classList.toggle("hidden", u.role !== "admin");
    }
  } else {
    document.getElementById("btn-admin").classList.add("hidden");
  }
}

// -------------------- Escape Helper --------------------
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
