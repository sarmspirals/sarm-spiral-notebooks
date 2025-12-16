/*************************
 * FIREBASE INITIALIZATION
 *************************/
const firebaseConfig = {
  apiKey: "AIzaSyB2bfLiik96iccPzM3v7dz-Tc-S_4R4pHc",
  authDomain: "sarm-spiral-notebooks.firebaseapp.com",
  projectId: "sarm-spiral-notebooks",
  storageBucket: "sarm-spiral-notebooks.firebasestorage.app",
  messagingSenderId: "486034342174",
  appId: "1:486034342174:web:a1b964d3a1e8abee90890f"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/*****************
 * GLOBAL STATE
 *****************/
let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("sarm_cart") || "{}");

/*****************
 * HELPERS
 *****************/
function normalizePhone(phone) {
  return phone.replace(/\D/g, "").slice(-10);
}

function cartSummary() {
  let total = 0;
  let items = 0;

  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    total += p.price * cart[id];
    items += cart[id];
  }
  return { total, items };
}

function saveCart() {
  localStorage.setItem("sarm_cart", JSON.stringify(cart));
  updateCartUI();
}

/*****************
 * LOAD PRODUCTS
 *****************/
async function loadProductsFromFirebase() {
  const snap = await db.collection("products").get();
  PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}

/*****************
 * DOM ELEMENTS
 *****************/
const productsGrid = document.getElementById("productsGrid");
const cartPanel = document.getElementById("cartPanel");
const cartBtn = document.getElementById("cartBtn");
const closeCartBtn = document.getElementById("closeCart");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");

const upiModal = document.getElementById("upiModal");
const upiQR = document.getElementById("upiQR");
const upiAmount = document.getElementById("upiAmount");
const upiPaidBtn = document.getElementById("upiPaidBtn");

/*****************
 * CART UI
 *****************/
function renderProducts() {
  productsGrid.innerHTML = "";
  PRODUCTS.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <img src="${p.img}">
      <h3>${p.title}</h3>
      <p>Pages: ${p.pages}</p>
      <strong>Rs ${p.price}</strong>
      ${
        p.stock > 0
          ? `<button data-id="${p.id}">Buy Now</button>`
          : `<button disabled>Out of Stock</button>`
      }
    `;
    productsGrid.appendChild(div);
  });

  productsGrid.querySelectorAll("button[data-id]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      cart[id] = (cart[id] || 0) + 1;
      saveCart();
      openCart();
    };
  });
}

function updateCartUI() {
  const { total, items } = cartSummary();
  cartItemsEl.innerHTML = "";
  cartTotalEl.textContent = `Rs ${total}`;
  cartCount.textContent = items;

  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;

    const row = document.createElement("div");
    row.innerHTML = `${p.title} x ${cart[id]}`;
    cartItemsEl.appendChild(row);
  }
}

/*****************
 * CART OPEN/CLOSE
 *****************/
function openCart() {
  cartPanel.classList.add("open");
}
function closeCart() {
  cartPanel.classList.remove("open");
}
cartBtn.onclick = openCart;
closeCartBtn.onclick = closeCart;

/*****************
 * DELIVERY FORM
 *****************/
function getDeliveryDetails() {
  const name = prompt("Full Name:");
  const phone = prompt("Phone Number:");
  const address = prompt("Delivery Address:");
  if (!name || !phone || !address) return null;
  return { name, phone, address };
}

/*****************
 * UPI QR
 *****************/
function showUpiQR(amount) {
  upiModal.style.display = "flex";
  upiQR.innerHTML = "";

  const upiURL =
    `upi://pay?pa=7006927825@pz&pn=SARM Spiral Notebooks&am=${amount}&cu=INR`;

  new QRCode(upiQR, { modal: upiURL, width: 200, height: 200 });
  upiAmount.textContent = `Amount to pay: Rs ${amount}`;
}

upiPaidBtn.onclick = () => {
  if (!confirm("Have you completed the UPI payment?")) return;
  upiModal.style.display = "none";
  cart = {};
  saveCart();
  location.href = "success.html";
};

/*****************
 * CHECKOUT (SINGLE CLEAN FLOW)
 *****************/
checkoutBtn.onclick = async () => {
  const paymentMethod =
    document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";

  const summary = cartSummary();
  if (summary.items === 0) {
    alert("Cart is empty");
    return;
  }

  const customer = getDeliveryDetails();
  if (!customer) return;

  const phone = normalizePhone(customer.phone);

  // WhatsApp (CUSTOMER)
  window.open(
    `https://wa.me/91${phone}?text=${encodeURIComponent(
      `✅ Order Confirmed\nTotal: Rs ${summary.total}\nPayment: ${paymentMethod}`
    )}`,
    "_blank"
  );

  // WhatsApp (ADMIN)
  window.open(
    `https://wa.me/917006927825?text=${encodeURIComponent(
      `🛒 New Order\nName: ${customer.name}\nTotal: Rs ${summary.total}\nPayment: ${paymentMethod}`
    )}`,
    "_blank"
  );

  await db.collection("orders").add({
    customer,
    total: summary.total,
    paymentMethod,
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  if (paymentMethod === "UPI") {
    showUpiQR(summary.total);
    return;
  }

  cart = {};
  saveCart();
  location.href = "success.html";
};

/*****************
 * INIT
 *****************/
updateCartUI();
loadProductsFromFirebase();
