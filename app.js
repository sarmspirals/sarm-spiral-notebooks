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

// PRODUCT DATA
const PRODUCTS = [
  { id:"p200", title:"Spiral Notebook (200 Pages)", price:69, img:"200.jpg", pages:200 },
  { id:"p250", title:"Spiral Notebook (250 Pages)", price:85, img:"250.jpg", pages:250 },
  { id:"p300", title:"Spiral Notebook (300 Pages)", price:105, img:"300.jpg", pages:300 },
  { id:"p400", title:"Spiral Notebook (400 Pages)", price:129, img:"400.jpg", pages:400 },
  { id:"p500", title:"Spiral Notebook (500 Pages)", price:155, img:"500.jpg", pages:500 }
];

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

// DOM element refs
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartPanel = document.getElementById('cartPanel');
const cartCount = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
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
      <img src="${p.img}" alt="${p.title}" loading="lazy">
      <h3>${p.title}</h3>
      <div>Pages: ${p.pages}</div>
      <div class="price">Rs ${p.price}</div>
      <div class="actions">
        <button class="btn btn-primary" data-add="${p.id}">Buy Now</button>
        <button class="btn btn-outline" data-detail="${p.id}">Details</button>
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
  cartItemsEl.innerHTML = '';

  if (items === 0) {
    cartItemsEl.innerHTML = '<p class="muted">Cart is empty</p>';
    return;
  }

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

// CHECKOUT -> Create order in Firestore + show UPI QR
checkoutBtn && checkoutBtn.addEventListener('click', async ()=>{
  const { total, items } = cartSummary();
  if (items === 0) return alert('Cart is empty');const customer = getDeliveryDetails();
if (!customer) {
  alert("Order cancelled. Delivery details required.");
  return;
}

  try {
    const order = {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      customer, // 👈 DELIVERY DETAILS SAVED HERE
      items: Object.keys(cart).map(id => {
        const p = PRODUCTS.find(x=>x.id===id);
        return { id: p.id, title: p.title, price: p.price, qty: cart[id] };
      }),
      total,
      status: 'pending_payment'
    };
    const docRef = await db.collection('orders').add(order);
    showUpiModal(docRef.id, total);
    cart = {}; saveCart();
  } catch(err) {
    console.error(err);
    alert('Error creating order. See console.');
  }
});

// UPI URI + QR generation
function upiUri(vpa, name, amount, txnNote, txId){
  const a = Number(amount).toFixed(2);
  const encodedName = encodeURIComponent(name);
  const encodedNote = encodeURIComponent(txnNote || '');
  const uri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodedName}&tr=${encodeURIComponent(txId)}&am=${a}&cu=INR&tn=${encodedNote}`;
  return uri;
}

function showUpiModal(orderId, amount){
  upiModal.classList.add('show');
  upiModal.setAttribute('aria-hidden','false');
  qrcodeEl.innerHTML = '';
  const note = `Order ${orderId}`;
  const uri = upiUri(UPI_VPA, UPI_NAME, amount, note, orderId);
  new QRCode(qrcodeEl, { text: uri, width: 200, height: 200 });
  upiText.textContent = `UPI: ${UPI_VPA} • Amount: Rs ${amount} • Ref: ${orderId}`;
}

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
renderProducts();
updateCartUI();
saveCart();




