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
