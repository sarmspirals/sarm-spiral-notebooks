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
        id: '200',
        name: 'Spiral Notebook 200 Pages',
        pages: 200,
        price: 69,
        image: '200.jpg',
        stock: 50,
        description: 'Standard 200-page spiral notebook'
    },
    {
        id: '250',
        name: 'Spiral Notebook 250 Pages',
        pages: 250,
        price: 85,
        image: '250.jpg',
        stock: 40,
        description: '250-page notebook with durable cover'
    },
    {
        id: '300',
        name: 'Spiral Notebook 300 Pages',
        pages: 300,
        price: 105,
        image: '300.jpg',
        stock: 35,
        description: '300-page thick notebook for extensive use'
    },
    {
        id: '350',
        name: 'Spiral Notebook 350 Pages',
        pages: 350,
        price: 115,
        image: '350.jpg',
        stock: 30,
        description: '350-page premium notebook'
    },
    {
        id: '400',
        name: 'Spiral Notebook 400 Pages',
        pages: 400,
        price: 130,
        image: '400.jpg',
        stock: 25,
        description: '400-page heavy-duty notebook'
    },
    {
        id: '500',
        name: 'Spiral Notebook 500 Pages',
        pages: 500,
        price: 155,
        image: '500.jpg',
        stock: 20,
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
// Enhanced Functions for SARM SPIRAL NOTEBOOKS

// 1. STOCK MANAGEMENT FUNCTIONS
function updateStockInRealTime() {
    // Listen for stock changes in real-time
    db.collection('products').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const updatedProduct = { id: change.doc.id, ...change.doc.data() };
                const index = products.findIndex(p => p.id === updatedProduct.id);
                if (index !== -1) {
                    products[index] = updatedProduct;
                    renderProducts();
                    updateCartDisplay();
                    
                    // Show notification for low stock items
                    if (updatedProduct.stock < 5 && updatedProduct.stock > 0) {
                        showToast(`${updatedProduct.name} is running low on stock!`, 'warning');
                    }
                }
            }
        });
    });
}

// 2. ORDER TRACKING SYSTEM
function trackOrder(orderId) {
    return new Promise((resolve, reject) => {
        db.collection('orders').doc(orderId).onSnapshot((doc) => {
            if (doc.exists) {
                const order = { id: doc.id, ...doc.data() };
                resolve(order);
                
                // Show status update notifications
                showOrderStatusNotification(order);
            } else {
                reject(new Error('Order not found'));
            }
        }, reject);
    });
}

function showOrderStatusNotification(order) {
    const statusMessages = {
        'pending': 'Your order has been received and is being processed.',
        'confirmed': 'Your order has been confirmed and is being prepared for shipping.',
        'shipped': 'Your order has been shipped and is on its way to you.',
        'delivered': 'Your order has been delivered successfully!',
        'cancelled': 'Your order has been cancelled.'
    };
    
    if (statusMessages[order.status]) {
        showToast(`Order Update: ${statusMessages[order.status]}`, 'info');
    }
}

// 3. INVOICE GENERATION WITH jsPDF
async function generateInvoice(orderId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    try {
        // Fetch order details
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) throw new Error('Order not found');
        
        const order = orderDoc.data();
        
        // Invoice Header
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text('SARM SPIRAL NOTEBOOKS', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('KAWOOSA KHALISA, NARBAL, BADGAM | PIN: 193411', 105, 28, { align: 'center' });
        doc.text('Phone: 7006927825 | Email: mir7amir@gmail.com', 105, 34, { align: 'center' });
        
        // Invoice Title
        doc.setFontSize(16);
        doc.setTextColor(52, 152, 219);
        doc.text('TAX INVOICE', 105, 45, { align: 'center' });
        
        // Invoice Details
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Invoice No: INV-${orderId.substring(0, 8).toUpperCase()}`, 20, 60);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 66);
        doc.text(`Order ID: ${orderId}`, 20, 72);
        
        // Customer Details
        doc.text('Bill To:', 20, 85);
        doc.text(order.customerName, 20, 91);
        doc.text(`Phone: ${order.phone}`, 20, 97);
        doc.text(`Address: ${order.address}`, 20, 103);
        doc.text(`${order.landmark} - ${order.pincode}`, 20, 109);
        
        // Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 120, 170, 10, 'F');
        doc.text('Description', 25, 127);
        doc.text('Price', 120, 127);
        doc.text('Qty', 145, 127);
        doc.text('Amount', 165, 127);
        
        // Table Rows
        let yPos = 135;
        order.items.forEach((item, index) => {
            if (index > 8) return; // Limit items per page
            
            doc.text(item.name.substring(0, 30), 25, yPos);
            doc.text(`₹${item.price}`, 120, yPos);
            doc.text(item.quantity.toString(), 145, yPos);
            doc.text(`₹${item.total}`, 165, yPos);
            yPos += 8;
        });
        
        // Total
        yPos += 10;
        doc.setFontSize(12);
        doc.text('Total Amount:', 130, yPos);
        doc.text(`₹${order.totalAmount}`, 165, yPos);
        
        // Payment Method
        yPos += 10;
        doc.text(`Payment Method: ${order.paymentMethod}`, 20, yPos);
        
        // Footer
        yPos += 20;
        doc.setFontSize(10);
        doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
        doc.text('For any queries, contact: 7006927825', 105, yPos + 6, { align: 'center' });
        
        // Save PDF
        const invoiceName = `Invoice_SARM_${orderId.substring(0, 8)}.pdf`;
        doc.save(invoiceName);
        
        return invoiceName;
    } catch (error) {
        console.error('Error generating invoice:', error);
        showToast('Failed to generate invoice', 'error');
        throw error;
    }
}

// 4. WISHLIST FUNCTIONALITY
let wishlist = JSON.parse(localStorage.getItem('sarm_wishlist')) || [];

function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index === -1) {
        wishlist.push(productId);
        showToast('Added to wishlist', 'success');
    } else {
        wishlist.splice(index, 1);
        showToast('Removed from wishlist', 'info');
    }
    localStorage.setItem('sarm_wishlist', JSON.stringify(wishlist));
    renderProducts();
}

// 5. PRODUCT FILTERING AND SORTING
function filterProducts(category) {
    const filtered = category === 'all' 
        ? products 
        : products.filter(p => p.category === category);
    renderFilteredProducts(filtered);
}

function sortProducts(sortBy) {
    let sorted = [...products];
    switch(sortBy) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'stock':
            sorted.sort((a, b) => b.stock - a.stock);
            break;
    }
    renderFilteredProducts(sorted);
}

function renderFilteredProducts(filteredProducts) {
    productsContainer.innerHTML = '';
    filteredProducts.forEach(product => {
        // Same render logic as in renderProducts
        // ... (reuse product card creation code)
    });
}

// 6. ANALYTICS AND STATISTICS
async function getSalesAnalytics() {
    try {
        const snapshot = await db.collection('orders').get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const analytics = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            averageOrderValue: orders.length > 0 
                ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length 
                : 0,
            monthlySales: calculateMonthlySales(orders)
        };
        
        return analytics;
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return null;
    }
}

function calculateMonthlySales(orders) {
    const monthlySales = {};
    orders.forEach(order => {
        const date = order.timestamp ? order.timestamp.toDate() : new Date();
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!monthlySales[monthYear]) {
            monthlySales[monthYear] = 0;
        }
        monthlySales[monthYear] += order.totalAmount;
    });
    
    return monthlySales;
}

// 7. BULK OPERATIONS
async function updateBulkStock(updates) {
    const batch = db.batch();
    
    updates.forEach(update => {
        const productRef = db.collection('products').doc(update.id);
        batch.update(productRef, {
            stock: update.newStock,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    
    try {
        await batch.commit();
        showToast('Stock updated successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error updating stock:', error);
        showToast('Failed to update stock', 'error');
        return false;
    }
}

// 8. EMAIL NOTIFICATIONS (Using EmailJS or similar service)
async function sendEmailNotification(to, subject, templateId, templateParams) {
    // Implementation using EmailJS
    // emailjs.send('service_id', templateId, templateParams)
    //     .then(() => console.log('Email sent'))
    //     .catch(error => console.error('Email error:', error));
}

// 9. CUSTOMER LOYALTY PROGRAM
function calculateLoyaltyPoints(amount) {
    return Math.floor(amount / 100); // 1 point per ₹100
}

function updateCustomerLoyalty(userId, points) {
    return db.collection('users').doc(userId).update({
        loyaltyPoints: firebase.firestore.FieldValue.increment(points),
        lastPurchase: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// 10. AUTO-BACKUP SYSTEM
async function backupData() {
    const backup = {
        products: products,
        orders: orders,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('sarm_backup_' + Date.now(), JSON.stringify(backup));
    
    // Optionally upload to Firebase Storage
    // const storageRef = firebase.storage().ref();
    // const backupRef = storageRef.child(`backups/backup_${Date.now()}.json`);
    // await backupRef.putString(JSON.stringify(backup));
    
    return backup;
}

// 11. OFFLINE CAPABILITY
function setupOfflineSupport() {
    // Check if user is online
    window.addEventListener('online', () => {
        showToast('You are back online', 'success');
        // Sync any pending operations
        syncPendingOperations();
    });
    
    window.addEventListener('offline', () => {
        showToast('You are offline. Some features may be limited.', 'warning');
    });
}

let pendingOperations = JSON.parse(localStorage.getItem('pending_ops')) || [];

function addPendingOperation(operation) {
    pendingOperations.push({
        ...operation,
        timestamp: Date.now()
    });
    localStorage.setItem('pending_ops', JSON.stringify(pendingOperations));
}

async function syncPendingOperations() {
    while (pendingOperations.length > 0) {
        const op = pendingOperations.shift();
        try {
            // Execute operation
            await executeOperation(op);
            showToast('Synced pending operation', 'success');
        } catch (error) {
            // Put it back if it fails
            pendingOperations.unshift(op);
            break;
        }
    }
    localStorage.setItem('pending_ops', JSON.stringify(pendingOperations));
}

// 12. PRODUCT REVIEWS SYSTEM
async function addProductReview(productId, review) {
    if (!currentUser) throw new Error('User must be logged in');
    
    const reviewData = {
        productId: productId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        rating: review.rating,
        comment: review.comment,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    return db.collection('reviews').add(reviewData);
}

async function getProductReviews(productId) {
    const snapshot = await db.collection('reviews')
        .where('productId', '==', productId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 13. DISCOUNT AND COUPON SYSTEM
const validCoupons = {
    'WELCOME10': 10, // 10% discount
    'SARM25': 25,    // 25% discount
    'NOTEBOOK50': 50  // ₹50 off
};

function applyCoupon(code) {
    if (validCoupons[code]) {
        const discount = validCoupons[code];
        return {
            valid: true,
            discount: discount,
            message: `Coupon applied! ${code.includes('%') ? `${discount}% off` : `₹${discount} off`}`
        };
    }
    return {
        valid: false,
        message: 'Invalid coupon code'
    };
}

// 14. SHIPPING CALCULATOR
function calculateShipping(pincode) {
    // Simple shipping calculation based on pincode
    const shippingRates = {
        '193411': 0, // Free delivery in Narbal
        '1934': 50,  // ₹50 for nearby areas
        'default': 100 // ₹100 for other areas
    };
    
    for (const [prefix, rate] of Object.entries(shippingRates)) {
        if (pincode.startsWith(prefix)) {
            return rate;
        }
    }
    return shippingRates.default;
}

// 15. PRODUCT RECOMMENDATIONS
function getProductRecommendations() {
    const viewedProducts = JSON.parse(localStorage.getItem('viewed_products')) || [];
    const cartProductIds = cart.map(item => item.id);
    
    // Get products in same category as viewed products
    const recommendations = products.filter(product => {
        return !cartProductIds.includes(product.id) && 
               !viewedProducts.includes(product.id) &&
               product.stock > 0;
    }).slice(0, 4); // Show 4 recommendations
    
    return recommendations;
}

// Initialize enhanced features
function initializeEnhancedFeatures() {
    // Start real-time stock updates
    updateStockInRealTime();
    
    // Setup offline support
    setupOfflineSupport();
    
    // Check for abandoned carts
    checkAbandonedCart();
    
    // Load wishlist
    loadWishlist();
}

function checkAbandonedCart() {
    const lastCartUpdate = localStorage.getItem('last_cart_update');
    if (lastCartUpdate && cart.length > 0) {
        const hoursSinceUpdate = (Date.now() - parseInt(lastCartUpdate)) / (1000 * 60 * 60);
        if (hoursSinceUpdate > 24) {
            showToast('You have items in your cart from your last visit!', 'info');
        }
    }
}

function loadWishlist() {
    wishlist = JSON.parse(localStorage.getItem('sarm_wishlist')) || [];
}

// Track product views
function trackProductView(productId) {
    let viewedProducts = JSON.parse(localStorage.getItem('viewed_products')) || [];
    if (!viewedProducts.includes(productId)) {
        viewedProducts.push(productId);
        localStorage.setItem('viewed_products', JSON.stringify(viewedProducts.slice(-20))); // Keep last 20
    }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateInvoice,
        trackOrder,
        updateStockInRealTime,
        getSalesAnalytics,
        applyCoupon,
        calculateShipping,
        getProductRecommendations
    };
                                        }

