<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Admin – Orders</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background:#f5f5f5;
      padding:20px;
    }
    h2 { text-align:center; }
    .order {
      background:#fff;
      padding:15px;
      margin-bottom:15px;
      border-radius:8px;
      box-shadow:0 2px 6px rgba(0,0,0,0.1);
    }
    .hidden { display:none; }
    #loginBox {
      max-width:300px;
      margin:100px auto;
      background:#fff;
      padding:20px;
      border-radius:8px;
      text-align:center;
    }
    input, button {
      width:100%;
      padding:10px;
      margin-top:10px;
    }
  </style>
</head>
<body>

<!-- 🔐 LOGIN BOX -->
<div id="loginBox">
  <h3>Admin Login</h3>
  <input type="password" id="adminPass" placeholder="Enter password">
  <button onclick="login()">Login</button>
</div>

<!-- 📦 ADMIN DASHBOARD -->
<div id="adminPanel" class="hidden">
  <h2>📦 SARM Orders Dashboard</h2>
  <button onclick="logout()" style="margin-bottom:15px;">Logout</button>
  <div id="orders"></div>
</div>

<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

<script>
  // 🔐 CHANGE THIS PASSWORD
  const ADMIN_PASSWORD = "Sameer786@";

  function login() {
    const pass = document.getElementById("adminPass").value;
    if (pass === ADMIN_PASSWORD) {
      localStorage.setItem("admin_logged_in", "1");
      showAdmin();
    } else {
      alert("Wrong password");
    }
  }

  function logout() {
    localStorage.removeItem("admin_logged_in");
    location.reload();
  }

  function showAdmin() {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("adminPanel").classList.remove("hidden");
  }

  if (localStorage.getItem("admin_logged_in") === "1") {
    showAdmin();
  }

  // 🔥 FIREBASE CONFIG
  const firebaseConfig = {
    apiKey: "AIzaSyB2bfLiik96iccPzM3v7dz-Tc-S_4R4pHc",
    authDomain: "sarm-spiral-notebooks.firebaseapp.com",
    projectId: "sarm-spiral-notebooks",
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const ordersDiv = document.getElementById("orders");

  db.collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      ordersDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const o = doc.data();
        const div = document.createElement("div");
        div.className = "order";
        div.innerHTML = `
          <strong>Order ID:</strong> ${doc.id}<br>
          <strong>Name:</strong> ${o.customer.name}<br>
          <strong>Phone:</strong> ${o.customer.phone}<br>
          <strong>Address:</strong> ${o.customer.address}<br>
          <strong>Payment:</strong> ${o.paymentMethod}<br>
        <strong>Status:</strong>
<select onchange="updateStatus('${doc.id}', this.value)">
  <option ${o.status==="Pending"?"selected":""}>Pending</option>
  <option ${o.status==="Shipped"?"selected":""}>Shipped</option>
  <option ${o.status==="Delivered"?"selected":""}>Delivered</option>
</select>

          <strong>Total:</strong> Rs ${o.total}
        `;
        ordersDiv.appendChild(div);
      });
    });
function updateStatus(orderId, newStatus) {
  db.collection("orders").doc(orderId).update({
    status: newStatus
  });
}

</script>

</body>
</html>
