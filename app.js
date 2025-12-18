// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyB2bfLiik96iccPzM3v7dz-Tc-S_4R4pHc",
    authDomain: "sarm-spiral-notebooks.firebaseapp.com",
    projectId: "sarm-spiral-notebooks",
    storageBucket: "sarm-spiral-notebooks.firebasestorage.app",
    messagingSenderId: "486034342174",
    appId: "1:486034342174:web:a1b964d3a1e8abee90890f",
    measurementId: "G-JCPQTB8KHZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('sarm_cart')) || [];
let products = [];

// ============================================
// PRODUCT DATA (Fallback if Firebase fails)
// ============================================
const defaultProducts = [
    {
        id: 'p200',
        name: 'Spiral Notebook 200 Pages',
        pages: 200,
        price: 69,
        image: '200.jpg',
        stock: 100,
        description: 'Standard 200-page spiral notebook'
    },
    {
        id: 'p250',
        name: 'Spiral Notebook 250 Pages',
        pages: 250,
        price: 85,
        image: '250.jpg',
        stock: 100,
        description: '250-page notebook with durable cover'
    },
    {
        id: 'p300',
        name: 'Spiral Notebook 300 Pages',
        pages: 300,
        price: 105,
        image: '300.jpg',
        stock: 35,
        description: '300-page thick notebook for extensive use'
    },
    {
        id: 'p350',
        name: 'Spiral Notebook 350 Pages',
        pages: 350,
        price: 115,
        image: '350.jpg',
        stock: 30,
        description: '350-page premium notebook'
    },
    {
        id: 'p400',
        name: 'Spiral Notebook 400 Pages',
        pages: 400,
        price: 130,
        image: '400.jpg',
        stock: 25,
        description: '400-page heavy-duty notebook'
    },
    {
        id: 'p500',
        name: 'Spiral Notebook 500 Pages',
        pages: 500,
        price: 155,
        image: '500.jpg',
        stock: 100,
        description: '500-page maximum capacity notebook'
    }
];

// ============================================
// DOM ELEMENTS
// ============================================
const productContainer = document.getElementById('product-container');
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutModal = document.getElementById('checkout-modal');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const checkoutForm = document.getElementById('checkout-form');
const orderSummaryItems = document.getElementById('order-summary-items');
const orderTotal = document.getElementById('order-total');
const upiQr = document.getElementById('upi-qr');
const paymentOptions = document.querySelectorAll('input[name="payment"]');

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
function initAuth() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            console.log('User logged in:', user.email);
        } else {
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
        }
    });

    loginBtn.addEventListener('click', () => {
        loginModal.classList.add('active');
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            alert('Logged out successfully');
        }).catch(error => {
            console.error('Logout error:', error);
        });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('Login successful!');
                loginModal.classList.remove('active');
                loginForm.reset();
            })
            .catch(error => {
                alert('Login failed: ' + error.message);
            });
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const name = document.getElementById('reg-name').value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Save additional user data to Firestore
                return db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                alert('Registration successful!');
                registerForm.reset();
                showLogin.click();
            })
            .catch(error => {
                alert('Registration failed: ' + error.message);
            });
    });

    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Close modals when clicking X or outside
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.classList.remove('active');
            checkoutModal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.classList.remove('active');
        if (e.target === checkoutModal) checkoutModal.classList.remove('active');
    });
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================
function loadProducts() {
    // Try to load from Firebase first
    db.collection('products').get()
        .then(snapshot => {
            if (!snapshot.empty) {
                products = [];
                snapshot.forEach(doc => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                renderProducts();
            } else {
                // Use default products if Firebase is empty
                products = defaultProducts;
                renderProducts();
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
            // Fallback to default products
            products = defaultProducts;
            renderProducts();
        });
}

function renderProducts() {
    productContainer.innerHTML = '';
    
    products.forEach(product => {
        const cartItem = cart.find(item => item.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        const availableStock = product.stock - quantity;
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-img">
                <i class="fas fa-book"></i>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.description || `${product.pages} pages`}</p>
                <p class="price">₹${product.price}</p>
                <p class="stock ${availableStock > 10 ? 'in-stock' : availableStock > 0 ? 'low-stock' : 'out-stock'}">
                    ${availableStock > 10 ? 'In Stock' : availableStock > 0 ? 'Low Stock' : 'Out of Stock'} (${availableStock} left)
                </p>
                <div class="quantity-controls" style="display: flex; align-items: center; gap: 10px; margin: 1rem 0;">
                    <button class="quantity-btn" onclick="updateCart('${product.id}', -1)" ${quantity === 0 ? 'disabled' : ''}>-</button>
                    <span id="qty-${product.id}" style="font-weight: bold; min-width: 30px; text-align: center;">${quantity}</span>
                    <button class="quantity-btn" onclick="updateCart('${product.id}', 1)" ${availableStock <= 0 ? 'disabled' : ''}>+</button>
                </div>
                <button class="btn-cart" onclick="updateCart('${product.id}', 1)" ${availableStock <= 0 ? 'disabled' : ''}>
                    ${quantity > 0 ? 'Update Cart' : 'Add to Cart'}
                </button>
            </div>
        `;
        productContainer.appendChild(productCard);
    });
}

// ============================================
// CART FUNCTIONS
// ============================================
function updateCart(productId, change) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const cartIndex = cart.findIndex(item => item.id === productId);
    const currentQty = cartIndex >= 0 ? cart[cartIndex].quantity : 0;
    const newQty = currentQty + change;
    
    // Check stock availability
    if (newQty > product.stock) {
        alert(`Only ${product.stock} items available in stock`);
        return;
    }
    
    if (newQty <= 0) {
        // Remove item from cart
        if (cartIndex >= 0) {
            cart.splice(cartIndex, 1);
        }
    } else {
        // Update or add item
        if (cartIndex >= 0) {
            cart[cartIndex].quantity = newQty;
            cart[cartIndex].total = newQty * product.price;
        } else {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                quantity: newQty,
                total: newQty * product.price
            });
        }
    }
    
    saveCart();
    updateCartDisplay();
    renderProducts(); // Update product quantities
}

function saveCart() {
    localStorage.setItem('sarm_cart', JSON.stringify(cart));
}

function updateCartDisplay() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart items list
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        total += item.total;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} × ${item.quantity} = ₹${item.total}</p>
            </div>
            <div class="cart-item-actions">
                <button class="quantity-btn" onclick="updateCart('${item.id}', -1)">-</button>
                <button class="quantity-btn" onclick="updateCart('${item.id}', 1)">+</button>
                <button class="remove-item" onclick="updateCart('${item.id}', -${item.quantity})">Remove</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    // Update total
    cartTotal.textContent = `₹${total}`;
    
    // If cart is empty, show message
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 2rem;">Your cart is empty</p>';
    }
}

function openCart() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
}

function closeCart() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('active');
}

// ============================================
// CHECKOUT & ORDER FUNCTIONS
// ============================================
function initCheckout() {
    // Open cart when cart icon is clicked
    document.querySelector('a[href="#cart"]').addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });
    
    // Close cart buttons
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
    
    // Checkout button
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        
        // Update order summary
        orderSummaryItems.innerHTML = '';
        let total = 0;
        
        cart.forEach(item => {
            total += item.total;
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.marginBottom = '0.5rem';
            div.innerHTML = `
                <span>${item.name} (${item.quantity})</span>
                <span>₹${item.total}</span>
            `;
            orderSummaryItems.appendChild(div);
        });
        
        orderTotal.textContent = `₹${total}`;
        
        // Show checkout modal
        closeCart();
        checkoutModal.classList.add('active');
    });
    
    // Payment method toggle
    paymentOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            upiQr.style.display = e.target.value === 'UPI' ? 'block' : 'none';
        });
    });
    
    // Checkout form submission
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (cart.length === 0) {
            alert('Cart is empty!');
            return;
        }
        
        // Validate phone number
        const phone = document.getElementById('phone').value;
        if (!/^\d{10}$/.test(phone)) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }
        
        // Validate pincode
        const pincode = document.getElementById('pincode').value;
        if (!/^\d{6}$/.test(pincode)) {
            alert('Please enter a valid 6-digit pincode');
            return;
        }
        
        // Collect form data
        const orderData = {
            customerName: document.getElementById('name').value,
            phone: phone,
            address: document.getElementById('address').value,
            landmark: document.getElementById('landmark').value || 'Near BSNL Tower',
            pincode: pincode,
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.total
            })),
            totalAmount: cart.reduce((sum, item) => sum + item.total, 0),
            paymentMethod: document.querySelector('input[name="payment"]:checked').value,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser ? currentUser.uid : null
        };
        
        try {
            // Save order to Firebase
            const orderRef = await db.collection('orders').add(orderData);
            const orderId = orderRef.id;
            
            // Update stock in Firebase
            const batch = db.batch();
            cart.forEach(item => {
                const productRef = db.collection('products').doc(item.id);
                batch.update(productRef, {
                    stock: firebase.firestore.FieldValue.increment(-item.quantity)
                });
            });
            await batch.commit();
            
            // Generate invoice
            const invoiceUrl = await generateInvoice(orderId, orderData);
            
            // Send WhatsApp alerts
            sendWhatsAppAlert(orderId, orderData);
            
            // Clear cart
            cart = [];
            saveCart();
            updateCartDisplay();
            renderProducts();
            
            // Show success message and redirect
            alert(`Order placed successfully! Order ID: ${orderId}`);
            checkoutModal.classList.remove('active');
            checkoutForm.reset();
            
            // Redirect to success page
            window.location.href = `success.html?orderId=${orderId}`;
            
        } catch (error) {
            console.error('Error placing order:', error);
            alert('Failed to place order. Please try again.');
        }
    });
}

// ============================================
// INVOICE GENERATION
// ============================================
async function generateInvoice(orderId, orderData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Invoice Header
    doc.setFontSize(20);
    doc.text('SARM SPIRAL NOTEBOOKS', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('KAWOOSA KHALISA, NARBAL, BADGAM | PIN: 193411', 105, 28, { align: 'center' });
    doc.text('Phone: 7006927825 | Email: mir7amir@gmail.com', 105, 34, { align: 'center' });
    
    // Invoice Title
    doc.setFontSize(16);
    doc.text('INVOICE', 105, 45, { align: 'center' });
    
    // Order Details
    doc.setFontSize(10);
    doc.text(`Order ID: ${orderId}`, 20, 60);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 66);
    
    // Customer Details
    doc.text('Bill To:', 20, 80);
    doc.text(`Name: ${orderData.customerName}`, 20, 86);
    doc.text(`Phone: ${orderData.phone}`, 20, 92);
    doc.text(`Address: ${orderData.address}`, 20, 98);
    doc.text(`Landmark: ${orderData.landmark}`, 20, 104);
    doc.text(`Pincode: ${orderData.pincode}`, 20, 110);
    
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 120, 170, 10, 'F');
    doc.text('Item', 25, 127);
    doc.text('Price', 100, 127);
    doc.text('Qty', 130, 127);
    doc.text('Total', 160, 127);
    
    // Table Rows
    let yPos = 135;
    orderData.items.forEach(item => {
        doc.text(item.name.substring(0, 40), 25, yPos);
        doc.text(`₹${item.price}`, 100, yPos);
        doc.text(item.quantity.toString(), 130, yPos);
        doc.text(`₹${item.total}`, 160, yPos);
        yPos += 8;
    });
    
    // Total
    yPos += 10;
    doc.setFontSize(12);
    doc.text('Total Amount:', 130, yPos);
    doc.text(`₹${orderData.totalAmount}`, 160, yPos);
    
    // Payment Method
    yPos += 10;
    doc.text(`Payment Method: ${orderData.paymentMethod}`, 20, yPos);
    
    // Footer
    yPos += 20;
    doc.setFontSize(10);
    doc.text('Thank you for your order!', 105, yPos, { align: 'center' });
    doc.text('For any queries, contact: 7006927825', 105, yPos + 6, { align: 'center' });
    
    // Save PDF
    const invoiceName = `invoice_${orderId}.pdf`;
    doc.save(invoiceName);
    
    // Return blob URL for potential upload
    return doc.output('bloburl');
}

// ============================================
// WHATSAPP ALERT FUNCTION
// ============================================
function sendWhatsAppAlert(orderId, orderData) {
    const phone = '917006927825'; // WhatsApp number with country code
    const message = encodeURIComponent(
        `New Order Received!\n\n` +
        `Order ID: ${orderId}\n` +
        `Customer: ${orderData.customerName}\n` +
        `Phone: ${orderData.phone}\n` +
        `Address: ${orderData.address}\n` +
        `Landmark: ${orderData.landmark}\n` +
        `Pincode: ${orderData.pincode}\n` +
        `Items: ${orderData.items.map(item => `${item.name} (${item.quantity})`).join(', ')}\n` +
        `Total: ₹${orderData.totalAmount}\n` +
        `Payment: ${orderData.paymentMethod}\n\n` +
        `Please process the order.`
    );
    
    // Create WhatsApp link for admin
    const adminWhatsAppLink = `https://wa.me/${phone}?text=${message}`;
    
    // Also create message for customer
    const customerMessage = encodeURIComponent(
        `Thank you for your order!\n\n` +
        `Order ID: ${orderId}\n` +
        `Total: ₹${orderData.totalAmount}\n` +
        `Status: Pending\n\n` +
        `We will contact you shortly for delivery.`
    );
    
    const customerWhatsAppLink = `https://wa.me/91${orderData.phone}?text=${customerMessage}`;
    
    // Open admin WhatsApp in new tab (simulated)
    window.open(adminWhatsAppLink, '_blank');
    
    // Note: Customer WhatsApp would typically be triggered after customer confirmation
    // For now, we'll just log it
    console.log('Customer WhatsApp link:', customerWhatsAppLink);
    
    // In a real scenario, you might send this link to the customer via SMS or email
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadProducts();
    initCheckout();
    updateCartDisplay();
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            loginModal.classList.remove('active');
            checkoutModal.classList.remove('active');
            closeCart();
        }
    });
    
    console.log('SARM SPIRAL NOTEBOOKS website initialized');
});

