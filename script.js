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

// -------------------- Auth UI Elements --------------------
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const btnLogout = document.getElementById("btn-logout");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

btnShowLogin.onclick = () => { loginForm.classList.toggle("hidden"); registerForm.classList.add("hidden"); };
btnShowRegister.onclick = () => { registerForm.classList.toggle("hidden"); loginForm.classList.add("hidden"); };

// -------------------- Logout --------------------
btnLogout.onclick = async () => {
  await signOut(auth);
};

// -------------------- Register --------------------
document.getElementById("btn-register").onclick = async () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const dept = document.getElementById("reg-dept").value.trim();
  const skills = document.getElementById("reg-skills").value.split(",").map(s => s.trim()).filter(Boolean);
  const pass = document.getElementById("reg-pass").value.trim();

  if (!name || !email || !dept || !pass) return alert("Please fill all fields.");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", userCred.user.uid), {
      name, email, department: dept, skills
    });
    alert("Registered successfully! You are now logged in.");
    registerForm.classList.add("hidden");
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// -------------------- Login --------------------
document.getElementById("btn-login").onclick = async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    loginForm.classList.add("hidden");
  } catch (err) {
    alert("Invalid email or password.");
  }
};

// -------------------- Auth State Listener --------------------
onAuthStateChanged(auth, async (user) => {
  updateAuthUI(user);
  renderFilterButtons();
  await renderPosts(user);
  await renderProfile(user);
});

// -------------------- Create Project --------------------
document.getElementById("btn-create").onclick = async () => {
  const title = document.getElementById("post-title").value.trim();
  const desc = document.getElementById("post-desc").value.trim();
  const skillsNeeded = document.getElementById("post-skills").value.split(",").map(s => s.trim()).filter(Boolean);
  const user = auth.currentUser;

  if (!user) return alert("Login first.");
  if (!title || !desc) return alert("Please fill title and description.");

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  await addDoc(collection(db, "posts"), {
    title,
    description: desc,
    skillsNeeded,
    createdByUid: user.uid,
    createdByName: userData.name,
    createdByDept: userData.department,
    joined: [],
    createdAt: Date.now()
  });

  document.getElementById("post-title").value = "";
  document.getElementById("post-desc").value = "";
  document.getElementById("post-skills").value = "";

  alert("Project created!");
  await renderPosts(auth.currentUser);
};

// -------------------- Delete Project --------------------
async function deletePost(postId) {
  const confirmed = confirm("Are you sure you want to delete this project?");
  if (!confirmed) return;

  await deleteDoc(doc(db, "posts", postId));
  await renderPosts(auth.currentUser);
  await renderProfile(auth.currentUser);
}

// -------------------- Render Posts --------------------
async function renderPosts(user) {
  const postsList = document.getElementById("posts-list");
  postsList.innerHTML = "<div class='muted'>Loading projects...</div>";

  const snapshot = await getDocs(collection(db, "posts"));
  postsList.innerHTML = "";

  let posts = [];
  snapshot.forEach(docSnap => {
    posts.push({ ...docSnap.data(), id: docSnap.id });
  });

  // Apply department filter
  if (activeFilter !== "All") {
    posts = posts.filter(p => (p.createdByDept || "").toLowerCase() === activeFilter.toLowerCase());
  }

  if (posts.length === 0) {
    postsList.innerHTML = "<div class='muted'>No projects found for this department.</div>";
    return;
  }

  posts.forEach((p) => {
    const pid = p.id;
    const isJoined = user && (p.joined || []).includes(user.uid);
    const joinedCount = (p.joined || []).length;
    const isOwner = user && p.createdByUid === user.uid;

    const div = document.createElement("div");
    div.className = "post card";
    div.innerHTML = `
      <div><strong>${escapeHtml(p.title)}</strong> <span class="muted">by ${escapeHtml(p.createdByName)} (${escapeHtml(p.createdByDept || "")})</span></div>
      <div style="margin-top:8px">${escapeHtml((p.description || "").slice(0, 250))}</div>
      <div style="margin-top:8px">${(p.skillsNeeded || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join(" ")}</div>
      <div style="margin-top:10px; display:flex; align-items:center; gap:12px;">
        <button class="small-btn join-btn" ${!user || isOwner ? "disabled" : ""}>${isOwner ? "Your Project" : isJoined ? "✅ Joined" : "Join Project"}</button>
        <span class="muted" style="font-size:13px">${joinedCount} joined</span>
        ${isOwner ? `<button class="small-btn delete-btn" style="background:#e74c3c; color:white;">🗑️ Delete</button>` : ""}
      </div>`;

    if (!isOwner) {
      div.querySelector(".join-btn").onclick = () => {
        if (!user) return alert("Login first.");
        toggleJoin(pid, user.uid);
      };
    }

    if (isOwner) {
      div.querySelector(".delete-btn").onclick = () => deletePost(pid);
    }

    postsList.appendChild(div);
  });
}

// -------------------- Toggle Join --------------------
async function toggleJoin(postId, uid) {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const p = postSnap.data();

  if ((p.joined || []).includes(uid)) {
    await updateDoc(postRef, { joined: arrayRemove(uid) });
  } else {
    await updateDoc(postRef, { joined: arrayUnion(uid) });
  }

  await renderPosts(auth.currentUser);
  await renderProfile(auth.currentUser);
}

// -------------------- Render Profile --------------------
async function renderProfile(user) {
  const profileInfo = document.getElementById("profile-info");
  const profilePosts = document.getElementById("profile-posts");
  const profileJoined = document.getElementById("profile-joined");

  profileInfo.innerHTML = "";
  profilePosts.innerHTML = "";
  profileJoined.innerHTML = "";

  if (!user) {
    profileInfo.innerHTML = "<div class='muted'>Not logged in.</div>";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const u = userSnap.data();

  profileInfo.innerHTML = `
    <div><strong>${escapeHtml(u.name)}</strong></div>
    <div class="muted">${escapeHtml(u.email)} • ${escapeHtml(u.department || "")}</div>
    <div class="muted">Skills: ${(u.skills || []).map(escapeHtml).join(", ")}</div>`;

  const snapshot = await getDocs(collection(db, "posts"));
  let myPosts = [], joinedPosts = [];

  snapshot.forEach((docSnap) => {
    const p = { ...docSnap.data(), id: docSnap.id };
    if (p.createdByUid === user.uid) myPosts.push(p);
    else if ((p.joined || []).includes(user.uid)) joinedPosts.push(p);
  });

  if (myPosts.length === 0) profilePosts.innerHTML = "<div class='muted'>You have not created any projects yet.</div>";
  else myPosts.forEach(p => {
    const d = document.createElement("div");
    d.className = "post card";
    d.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${escapeHtml(p.title)}</strong>
        <button class="small-btn" style="background:#e74c3c; color:white;">🗑️ Delete</button>
      </div>
      <div class="muted">${escapeHtml(p.description || "")}</div>`;
    d.querySelector("button").onclick = () => deletePost(p.id);
    profilePosts.appendChild(d);
  });

  if (joinedPosts.length === 0) profileJoined.innerHTML = "<div class='muted'>You have not joined any projects yet.</div>";
  else joinedPosts.forEach(p => {
    const d = document.createElement("div");
    d.className = "post card";
    d.innerHTML = `<strong>${escapeHtml(p.title)}</strong><div class="muted">by ${escapeHtml(p.createdByName)}</div>`;
    profileJoined.appendChild(d);
  });
}

// -------------------- Auth UI Update --------------------
function updateAuthUI(user) {
  if (user) {
    btnShowLogin.classList.add("hidden");
    btnShowRegister.classList.add("hidden");
    btnLogout.classList.remove("hidden");
    document.getElementById("create-panel").classList.remove("hidden");
  } else {
    btnShowLogin.classList.remove("hidden");
    btnShowRegister.classList.remove("hidden");
    btnLogout.classList.add("hidden");
    document.getElementById("create-panel").classList.add("hidden");
  }
}

// -------------------- Escape Helper --------------------
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// -------------------- Toggle Password Visibility --------------------
const togglePass = document.getElementById("toggle-pass");
const regPass = document.getElementById("reg-pass");

togglePass.addEventListener("click", () => {
  if (regPass.type === "password") {
    regPass.type = "text";
    togglePass.textContent = "🙈";
  } else {
    regPass.type = "password";
    togglePass.textContent = "👁️";
  }
});
