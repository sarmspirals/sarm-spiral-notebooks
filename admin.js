// Firebase config -- same as app.js
const firebaseConfig = {
  apiKey: "AIzaSyB2bfLiik96iccPzM3v7dz-Tc-S_4R4pHc",
  authDomain: "sarm-spiral-notebooks.firebaseapp.com",
  projectId: "sarm-spiral-notebooks",
  storageBucket: "sarm-spiral-notebooks.firebasestorage.app",
  messagingSenderId: "486034342174",
  appId: "1:486034342174:web:a1b964d3a1e8abee90890f",
  measurementId: "G-JCPQTB8KHZ"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM
const authSection = document.getElementById("authSection");
const panel = document.getElementById("panel");
const emailIn = document.getElementById("email");
const passIn = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ordersList = document.getElementById("ordersList");

loginBtn && (loginBtn.onclick = async () => {
  const email = (emailIn && emailIn.value) || '';
  const pass = (passIn && passIn.value) || '';
  if(!email || !pass) return alert('Please enter credentials');
  try { await auth.signInWithEmailAndPassword(email, pass); }
  catch(e){ alert(e.message); }
});

logoutBtn && (logoutBtn.onclick = () => auth.signOut());

auth.onAuthStateChanged(user=>{
  if (user){
    if (authSection) authSection.style.display = 'none';
    if (panel) panel.style.display = 'block';
    loadOrders();
  } else {
    if (authSection) authSection.style.display = 'block';
    if (panel) panel.style.display = 'none';
  }
});

function loadOrders(){
  if (!ordersList) return;
  ordersList.innerHTML = '<p class="muted">Loading…</p>';
  db.collection('orders').orderBy('createdAt','desc').onSnapshot(snap => {
    ordersList.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const div = document.createElement('div');
      div.className = 'product';
      const created = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : '';
      div.innerHTML = `
        <strong>Order ${doc.id}</strong><br>
        Created: ${created}<br>
        Total: Rs ${d.total}<br>
        Status: <span id="s-${doc.id}">${d.status || ''}</span>
        <div style="margin-top:8px">
          <button class="btn-primary" data-id="${doc.id}" data-action="paid">Mark Paid</button>
          <button class="btn-outline" data-id="${doc.id}" data-action="shipped">Mark Shipped</button>
        </div>
        <div style="margin-top:8px">${(d.items||[]).map(i=>`<div>${i.title} x ${i.qty} — Rs ${i.price}</div>`).join('')}</div>
      `;
      ordersList.appendChild(div);
    });

    // attach events
    ordersList.querySelectorAll('[data-action]').forEach(btn=>{
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const action = e.currentTarget.getAttribute('data-action');
        if (action === 'paid') await db.collection('orders').doc(id).update({ status: 'paid' });
        if (action === 'shipped') await db.collection('orders').doc(id).update({ status: 'shipped' });
        const statusEl = document.getElementById('s-' + id);
        if (statusEl) statusEl.textContent = action === 'paid' ? 'paid' : 'shipped';
      });
    });
  }, err => {
    console.error(err);
    ordersList.innerHTML = '<p class="muted">Could not load orders.</p>';
  });
}
// ===============================
// SHOW UPI QR MODAL
// ===============================
function showUpiQR(amount) {
  const modal = document.getElementById("upiModal");
  const qrBox = document.getElementById("upiQR");
  const amtText = document.getElementById("upiAmount");

  if (!modal || !qrBox || !amtText) {
    console.error("UPI modal elements missing in HTML");
    alert("UPI payment UI not available. Please choose COD.");
    return;
  }

  qrBox.innerHTML = "";

  const upiURL =
    `upi://pay?pa=7006927825@pz&pn=SARM Spiral Notebooks&am=${amount}&cu=INR`;

  new QRCode(qrBox, {
    text: upiURL,
    width: 200,
    height: 200
  });

  amtText.textContent = `Amount to pay: Rs ${amount}`;
  modal.style.display = "flex";
}

