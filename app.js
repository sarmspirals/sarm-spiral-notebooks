// === FIREBASE CONFIG (your provided config) ===
const firebaseConfig = {
  apiKey: "AIzaSyB2bfLiik96iccPzM3v7dz-Tc-S_4R4pHc",
  authDomain: "sarm-spiral-notebooks.firebaseapp.com",
  projectId: "sarm-spiral-notebooks",
  storageBucket: "sarm-spiral-notebooks.firebasestorage.app",
  messagingSenderId: "486034342174",
  appId: "1:486034342174:web:a1b964d3a1e8abee90890f",
  measurementId: "G-JCPQTB8KHZ"
};
// ======================================================

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let PRODUCTS = [];
async function loadProductsFromFirebase() {
  const snapshot = await db.collection("products").get();

  PRODUCTS = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderProducts();
}

// UPI DETAILS (already set by you)
const UPI_VPA   = "7006927825@pz";
const UPI_NAME  = "SARM Spiral Notebooks";
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
function generateInvoice(order) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("SARM SPIRAL NOTEBOOKS", 20, 20);

  doc.setFontSize(12);
  doc.text(`Customer Name: ${order.customer.name}`, 20, 35);
  doc.text(`Phone: ${order.customer.phone}`, 20, 45);
  doc.text(`Address: ${order.customer.address}`, 20, 55);

  doc.text("Order Details:", 20, 70);

  let y = 80;
  order.items.forEach(item => {
    doc.text(
      `${item.title} x ${item.qty} = Rs ${item.price * item.qty}`,
      20,
      y
    );
    y += 10;
  });

  doc.text(`Total Amount: Rs ${order.total}`, 20, y + 10);

  doc.save(`SARM-Invoice-${Date.now()}.pdf`);
}


// DOM element refs
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartPanel = document.getElementById('cartPanel');
const cartCount = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const upiBtn = document.getElementById('upiBtn');
const closeCartBtn = document.getElementById('closeCart');
const upiModal = document.getElementById('upiModal');
const qrcodeEl = document.getElementById('qrcode');
const upiText = document.getElementById('upiText');
const closeUpi = document.getElementById('closeUpi');
const finishBtn = document.getElementById('finishBtn');
const darkToggle = document.getElementById('darkToggle');
const yearEl = document.getElementById('year');

yearEl && (yearEl.textContent = new Date().getFullYear());

// CART SYSTEM (localStorage)
let cart = JSON.parse(localStorage.getItem('sarm_cart') || '{}');

function saveCart(){
  localStorage.setItem('sarm_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(id){
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
}

function changeQty(productId, qty){
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  saveCart();
}

function cartSummary(){
  let total = 0, items = 0;
  for (const id in cart){
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    total += p.price * cart[id];
    items += cart[id];
  }
  return { total, items };
}

// RENDER PRODUCTS
function renderProducts(){
  productsGrid.innerHTML = '';
  PRODUCTS.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'product';
    div.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <h3>${p.title}</h3>
      <div>Pages: ${p.pages}</div>
      <div class="price">Rs ${p.price}</div>
      <div class="actions">
        ${p.stock > 0
  ? `<button class="btn btn-primary" data-add="${p.id}">Buy Now</button>`
  : `<button class="btn btn-outline" disabled>Out of Stock</button>`
}
      </div>
    `;
    productsGrid.appendChild(div);
  });

  productsGrid.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-add');
      addToCart(id);
      openCart();
    });
  });

  productsGrid.querySelectorAll('[data-detail]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-detail');
      const p = PRODUCTS.find(x=>x.id===id);
      // Simple product detail modal/alert (you can replace with full page)
      alert(`${p.title}\nPrice: Rs ${p.price}\nPages: ${p.pages}`);
    });
  });
}

// CART UI
function updateCartUI(){
  const { total, items } = cartSummary();
  cartCount.textContent = items;
  cartTotalEl.textContent = 'Rs ' + total;
 if (!cartItemsEl) {
  console.error("cartItems element not found in DOM");
  return;
}
  cartItemsEl.innerHTML = '';

  for (const id in cart){
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    const qty = cart[id];
    const row = document.createElement('div');
    row.style.display='flex';
    row.style.justifyContent='space-between';
    row.style.alignItems='center';
    row.style.padding='8px 0';
    row.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:700">${p.title}</div>
        <div class="muted">Rs ${p.price} x ${qty}</div>
      </div>
      <div>
        <button data-minus="${id}" class="btn btn-outline">-</button>
        <span style="margin:0 8px">${qty}</span>
        <button data-plus="${id}" class="btn btn-outline">+</button>
      </div>
    `;
    cartItemsEl.appendChild(row);
  }

  cartItemsEl.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click', e=>{
    const id = e.currentTarget.getAttribute('data-plus');
    changeQty(id, (cart[id]||0) + 1);
  }));
  cartItemsEl.querySelectorAll('[data-minus]').forEach(b=>b.addEventListener('click', e=>{
    const id = e.currentTarget.getAttribute('data-minus');
    changeQty(id, (cart[id]||0) - 1);
  }));
}

// open/close cart
function openCart(){ cartPanel.classList.add('open'); cartPanel.setAttribute('aria-hidden','false'); updateCartUI(); }
function closeCart(){ cartPanel.classList.remove('open'); cartPanel.setAttribute('aria-hidden','true'); }

cartBtn && cartBtn.addEventListener('click', openCart);
closeCartBtn && closeCartBtn.addEventListener('click', closeCart);
upiBtn && upiBtn.addEventListener('click', () => {
  const { total, items } = cartSummary();

  if (items === 0) {
    alert("Cart is empty");
    return;
  }

  showUpiQR(total);
});

// CHECKOUT -> Create order in Firestore + show UPI QR
checkoutBtn && checkoutBtn.addEventListener('click', async () => {
  const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
const paymentMethod = paymentMethodEl ? paymentMethodEl.value : "COD";
  try {
    // Ensure products loaded
    if (!PRODUCTS || PRODUCTS.length === 0) {
      alert("Products are still loading. Please wait.");
      return;
    }

    // Build cart items safely
    const cartItems = Object.keys(cart).map(id => {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return null;

      return {
        id: product.id,
        title: product.title,
        price: product.price,
        qty: cart[id]
      };
    }).filter(Boolean);

    if (cartItems.length === 0) {
      alert("Your cart is empty");
      return;
    }

    // Calculate total
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    // Get delivery details
    const customer = getDeliveryDetails();
    if (!customer) return;

    // Prevent overselling
    for (let item of cartItems) {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product || product.stock < item.qty) {
        alert(`${product.title} is out of stock`);
        return;
      }
    }

    // Create order object
    const order = {
      customer,
      items: cartItems,
      total,
      paymentMethod,
  status: paymentMethod === "COD" ? "cod_pending" : "upi_pending",
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
 };

    // Save order to Firestore
    const docRef = await db.collection("orders").add(order);

    // Reduce stock permanently in Firebase
    for (let item of cartItems) {
      await db.collection("products")
        .doc(item.id)
        .update({
          stock: firebase.firestore.FieldValue.increment(-item.qty)
        });
    }

    // Generate Invoice PDF
    if (typeof generateInvoice === "function") {
      generateInvoice(order);
    }

    // Open UPI payment
    const upiURL = `upi://pay?pa=7006927825@pz&pn=SARM Spiral Notebooks&am=${total}&cu=INR`;
    if (paymentMethod === "UPI") {
  window.showUpiQR(total);

  // ⛔ STOP further checkout execution
  return;
}

}
    // WhatsApp alert to admin
    const whatsappMessage = `
🛒 NEW ORDER - SARM SPIRAL NOTEBOOKS

👤 Name: ${customer.name}
📞 Phone: ${customer.phone}
🏠 Address: ${customer.address}
💳 Payment Method: ${paymentMethod}

📦 Order Items:
${cartItems.map(i => `• ${i.title} x ${i.qty} = Rs ${i.price * i.qty}`).join('\n')}

💰 Total: Rs ${total}
🆔 Order ID: ${docRef.id}
    `;

    window.open(
      `https://wa.me/917006927825?text=${encodeURIComponent(whatsappMessage)}`,
      "_blank"
    );

    // Clear cart
  if (paymentMethod === "COD") {
    cart = {};
    saveCart();
    updateCartUI();
  }
setTimeout(() => {
    window.location.href = "success.html";
}, 500);
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed. Please try again.");
  }
});

closeUpi && closeUpi.addEventListener('click', ()=>{
  upiModal.classList.remove('show'); upiModal.setAttribute('aria-hidden','true');
});
finishBtn && finishBtn.addEventListener('click', ()=>{
  upiModal.classList.remove('show'); upiModal.setAttribute('aria-hidden','true');
});

// DARK MODE
function applyDarkMode(on){
  if (on) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  localStorage.setItem('sarm_dark', on ? '1' : '0');
  if (darkToggle) darkToggle.textContent = on ? '☀️' : '🌙';
}
darkToggle && darkToggle.addEventListener('click', ()=> applyDarkMode(localStorage.getItem('sarm_dark') !== '1'));
applyDarkMode(localStorage.getItem('sarm_dark') === '1');

// INIT
updateCartUI();
saveCart();

window.showUpiQR = function (amount) {
  const modal = document.getElementById("upiModal");
  const qrBox = document.getElementById("upiQR");
  const amtText = document.getElementById("upiAmount");

  modal.style.display = "flex";
  qrBox.innerHTML = "";

  if (typeof QRCode === "undefined") {
    alert("QR system not loaded. Please refresh the page.");
    return;
  }

  const upiURL =
    `upi://pay?pa=7006927825@pz&pn=SARM Spiral Notebooks&am=${amount}&cu=INR`;

  new QRCode(qrBox, {
    text: upiURL,
    width: 200,
    height: 200
  });

  amtText.textContent = `Amount to pay: Rs ${amount}`;
};

document.addEventListener("DOMContentLoaded", () => {
  const paidBtn = document.getElementById("upiPaidBtn");

  if (paidBtn) {
    paidBtn.addEventListener("click", () => {
      document.getElementById("upiModal").style.display = "none";

      cart = {};
      saveCart();
      updateCartUI();

      window.location.href = "success.html";
    });
  }
});

loadProductsFromFirebase();























