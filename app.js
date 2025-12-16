// ================= FIREBASE CONFIG =================
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
const db = firebase.firestore();
const auth = firebase.auth();

// ================= HELPERS =================
// Normalize phone number for WhatsApp (IMPORTANT)
function normalizePhone(phone) {
  return phone.replace(/\D/g, "").slice(-10);
}

// ================= PRODUCTS =================
let PRODUCTS = [];

async function loadProductsFromFirebase() {
  const snapshot = await db.collection("products").get();
  PRODUCTS = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderProducts();
}

// ================= UPI DETAILS =================
const UPI_VPA = "7006927825@pz";
const UPI_NAME = "SARM Spiral Notebooks";

// ================= DELIVERY DETAILS =================
function getDeliveryDetails() {
  const name = prompt("Enter your full name:");
  const phone = prompt("Enter your phone number:");
  const address = prompt("Enter delivery address:");

  if (!name || !phone || !address) {
    alert("Delivery details required!");
    return null;
  }
  return { name, phone, address };
}

// ================= INVOICE =================
function generateInvoice(order) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("SARM SPIRAL NOTEBOOKS", 20, 20);
  doc.text(`Name: ${order.customer.name}`, 20, 35);
  doc.text(`Phone: ${order.customer.phone}`, 20, 45);
  doc.text(`Address: ${order.customer.address}`, 20, 55);

  let y = 75;
  order.items.forEach(i => {
    doc.text(`${i.title} x ${i.qty} = Rs ${i.price * i.qty}`, 20, y);
    y += 10;
  });

  doc.text(`Total: Rs ${order.total}`, 20, y + 10);
  doc.save(`Invoice-${Date.now()}.pdf`);
}

// ================= DOM =================
const productsGrid = document.getElementById("productsGrid");
const cartBtn = document.getElementById("cartBtn");
const cartPanel = document.getElementById("cartPanel");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const upiBtn = document.getElementById("upiBtn");
const closeCartBtn = document.getElementById("closeCart");

// ================= CART =================
let cart = JSON.parse(localStorage.getItem("sarm_cart") || "{}");

function saveCart() {
  localStorage.setItem("sarm_cart", JSON.stringify(cart));
  updateCartUI();
}

function cartSummary() {
  let total = 0, items = 0;
  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    total += p.price * cart[id];
    items += cart[id];
  }
  return { total, items };
}

// ================= RENDER PRODUCTS =================
function renderProducts() {
  productsGrid.innerHTML = "";
  PRODUCTS.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <h3>${p.title}</h3>
      <p>Pages: ${p.pages}</p>
      <p>Rs ${p.price}</p>
      ${p.stock > 0
        ? `<button onclick="addToCart('${p.id}')">Buy</button>`
        : `<button disabled>Out of Stock</button>`
      }
    `;
    productsGrid.appendChild(div);
  });
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  openCart();
}

// ================= CART UI =================
function updateCartUI() {
  const { total, items } = cartSummary();
  cartCount.textContent = items;
  cartTotalEl.textContent = `Rs ${total}`;
  cartItemsEl.innerHTML = "";

  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    cartItemsEl.innerHTML += `<p>${p.title} x ${cart[id]}</p>`;
  }
}

function openCart() {
  cartPanel.classList.add("open");
}
function closeCart() {
  cartPanel.classList.remove("open");
}

cartBtn && cartBtn.addEventListener("click", openCart);
closeCartBtn && closeCartBtn.addEventListener("click", closeCart);

// ================= CHECKOUT =================
checkoutBtn && checkoutBtn.addEventListener("click", async () => {
  try {
    const { total, items } = cartSummary();
    if (items === 0) return alert("Cart empty");

    const customer = getDeliveryDetails();
    if (!customer) return;

    const phone = normalizePhone(customer.phone);

    // WhatsApp to CUSTOMER (MUST be here)
    const customerMsg = `
✅ Order Confirmed – SARM Spiral Notebooks

Thank you ${customer.name} 🙏
Total: Rs ${total}
We will contact you shortly.
`;
    window.open(
      `https://wa.me/91${phone}?text=${encodeURIComponent(customerMsg)}`,
      "_blank"
    );

    const cartItems = Object.keys(cart).map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      return { id, title: p.title, price: p.price, qty: cart[id] };
    });

    const order = {
      customer,
      items: cartItems,
      total,
      status: "Pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("orders").add(order);

    generateInvoice(order);

    cart = {};
    saveCart();
    window.location.href = "success.html";

  } catch (err) {
    console.error(err);
    alert("Checkout failed");
  }
});

// ================= INIT =================
updateCartUI();
loadProductsFromFirebase();
