// ============================================
// FIREBASE CONFIGURATION (Same as app.js)
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
// ADMIN AUTHENTICATION
// ============================================
let adminUser = null;

function initAdminAuth() {
    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Check if user is admin (in real app, check custom claims)
            // For simplicity, we'll allow any logged-in user to access admin
            adminUser = user;
            showAdminDashboard();
        } else {
            showLoginSection();
        }
    });

    // Admin login form
    document.getElementById('admin-login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('Admin login successful!');
            })
            .catch(error => {
                alert('Login failed: ' + error.message);
            });
    });

    // Admin logout
    document.getElementById('admin-logout').addEventListener('click', () => {
        auth.signOut().then(() => {
            alert('Logged out successfully');
            showLoginSection();
        });
    });
}

function showLoginSection() {
    document.getElementById('admin-login-section').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
}

function showAdminDashboard() {
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadOrders();
    loadProductsForAdmin();
    loadInventory();
}

// ============================================
// ORDER MANAGEMENT
// ============================================
function loadOrders(filter = 'all') {
    let query = db.collection('orders').orderBy('timestamp', 'desc');
    
    if (filter !== 'all') {
        query = query.where('status', '==', filter);
    }
    
    query.get().then(snapshot => {
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            const date = order.timestamp ? order.timestamp.toDate().toLocaleDateString() : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id.substring(0, 8)}...</td>
                <td>${order.customerName}</td>
                <td>${order.phone}</td>
                <td>₹${order.totalAmount}</td>
                <td>
                    <select class="status-select" data-order-id="${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>${date}</td>
                <td>
                    <button class="btn-small view-order" data-order-id="${order.id}">View</button>
                    <button class="btn-small whatsapp-order" data-phone="${order.phone}">WhatsApp</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners for status changes
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                updateOrderStatus(e.target.dataset.orderId, e.target.value);
            });
        });
        
        // Add event listeners for view buttons
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                viewOrderDetails(e.target.dataset.orderId);
            });
        });
        
        // Add event listeners for WhatsApp buttons
        document.querySelectorAll('.whatsapp-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phone = e.target.dataset.phone;
                const message = encodeURIComponent(`Hello! Your order from SARM SPIRAL NOTEBOOKS is being processed. We'll contact you soon for delivery.`);
                window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
            });
        });
    });
}

function updateOrderStatus(orderId, status) {
    db.collection('orders').doc(orderId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert(`Order status updated to ${status}`);
        loadOrders(document.getElementById('order-filter').value);
    })
    .catch(error => {
        console.error('Error updating order:', error);
        alert('Failed to update order status');
    });
}

function viewOrderDetails(orderId) {
    db.collection('orders').doc(orderId).get().then(doc => {
        if (doc.exists) {
            const order = doc.data();
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `<li>${item.name} - ₹${item.price} × ${item.quantity} = ₹${item.total}</li>`;
            });
            
            alert(
                `Order Details:\n\n` +
                `Order ID: ${orderId}\n` +
                `Customer: ${order.customerName}\n` +
                `Phone: ${order.phone}\n` +
                `Address: ${order.address}\n` +
                `Landmark: ${order.landmark}\n` +
                `Pincode: ${order.pincode}\n` +
                `Items:\n${itemsHtml}\n` +
                `Total: ₹${order.totalAmount}\n` +
                `Payment: ${order.paymentMethod}\n` +
                `Status: ${order.status}\n` +
                `Date: ${order.timestamp ? order.timestamp.toDate().toLocaleString() : 'N/A'}`
            );
        }
    });
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================
function loadProductsForAdmin() {
    db.collection('products').get().then(snapshot => {
        const container = document.getElementById('admin-product-container');
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-img">
                    <i class="fas fa-book"></i>
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.pages} pages</p>
                    <p class="price">₹${product.price}</p>
                    <p class="stock ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-stock'}">
                        Stock: ${product.stock}
                    </p>
                    <button class="btn-cart edit-product" data-product-id="${product.id}">Edit</button>
                </div>
            `;
            container.appendChild(productCard);
        });
        
        // Add event listeners for edit buttons
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                openProductModal(e.target.dataset.productId);
            });
        });
        
        // Update product count
        document.getElementById('total-products').textContent = snapshot.size;
    });
}

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    const deleteBtn = document.getElementById('delete-product');
    
    if (productId) {
        // Edit existing product
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
        deleteBtn.style.display = 'inline-block';
        
        db.collection('products').doc(productId).get().then(doc => {
            if (doc.exists) {
                const product = doc.data();
                document.getElementById('product-id').value = productId;
                document.getElementById('product-name').value = product.name || '';
                document.getElementById('product-pages').value = product.pages || '';
                document.getElementById('product-price').value = product.price || '';
                document.getElementById('product-stock').value = product.stock || '';
                document.getElementById('product-image').value = product.image || '';
                document.getElementById('product-description').value = product.description || '';
            }
        });
    } else {
        // Add new product
        title.innerHTML = '<i class="fas fa-plus"></i> Add Product';
        deleteBtn.style.display = 'none';
        form.reset();
        document.getElementById('product-id').value = '';
    }
    
    modal.classList.add('active');
}

// Product form submission
document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        pages: parseInt(document.getElementById('product-pages').value),
        price: parseInt(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        image: document.getElementById('product-image').value || 'default.jpg',
        description: document.getElementById('product-description').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (productId) {
        // Update existing product
        db.collection('products').doc(productId).update(productData)
            .then(() => {
                alert('Product updated successfully!');
                document.getElementById('product-modal').classList.remove('active');
                loadProductsForAdmin();
                loadInventory();
            })
            .catch(error => {
                alert('Error updating product: ' + error.message);
            });
    } else {
        // Add new product
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        db.collection('products').add(productData)
            .then(() => {
                alert('Product added successfully!');
                document.getElementById('product-modal').classList.remove('active');
                loadProductsForAdmin();
                loadInventory();
            })
            .catch(error => {
                alert('Error adding product: ' + error.message);
            });
    }
});

// Delete product
document.getElementById('delete-product').addEventListener('click', () => {
    const productId = document.getElementById('product-id').value;
    if (!productId) return;
    
    if (confirm('Are you sure you want to delete this product?')) {
        db.collection('products').doc(productId).delete()
            .then(() => {
                alert('Product deleted successfully!');
                document.getElementById('product-modal').classList.remove('active');
                loadProductsForAdmin();
                loadInventory();
            })
            .catch(error => {
                alert('Error deleting product: ' + error.message);
            });
    }
});

// ============================================
// INVENTORY MANAGEMENT
// ============================================
function loadInventory() {
    db.collection('products').get().then(snapshot => {
        const tbody = document.getElementById('inventory-table-body');
        tbody.innerHTML = '';
        
        let lowStockCount = 0;
        let outOfStockCount = 0;
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            
            if (product.stock < 10) lowStockCount++;
            if (product.stock === 0) outOfStockCount++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.stock}</td>
                <td>₹${product.price}</td>
                <td class="${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-stock'}">
                    ${product.stock > 10 ? 'Good' : product.stock > 0 ? 'Low' : 'Out'}
                </td>
                <td>
                    <input type="number" id="stock-${product.id}" value="${product.stock}" min="0" style="width: 80px; padding: 5px;">
                    <button class="btn-small update-stock" data-product-id="${product.id}">Update</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Update counts
        document.getElementById('low-stock-count').textContent = lowStockCount;
        document.getElementById('out-of-stock-count').textContent = outOfStockCount;
        
        // Add event listeners for stock updates
        document.querySelectorAll('.update-stock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const newStock = parseInt(document.getElementById(`stock-${productId}`).value);
                updateStock(productId, newStock);
            });
        });
    });
    
    // Load today's orders count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    db.collection('orders')
        .where('timestamp', '>=', today)
        .get()
        .then(snapshot => {
            document.getElementById('today-orders').textContent = snapshot.size;
        });
}

function updateStock(productId, newStock) {
    if (isNaN(newStock) || newStock < 0) {
        alert('Please enter a valid stock number');
        return;
    }
    
    db.collection('products').doc(productId).update({
        stock: newStock,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Stock updated successfully!');
        loadInventory();
        loadProductsForAdmin();
    })
    .catch(error => {
        alert('Error updating stock: ' + error.message);
    });
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initAdminAuth();
    
    // Order filter
    document.getElementById('order-filter').addEventListener('change', (e) => {
        loadOrders(e.target.value);
    });
    
    // Refresh orders button
    document.getElementById('refresh-orders').addEventListener('click', () => {
        loadOrders(document.getElementById('order-filter').value);
    });
    
    // Add product button
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductModal();
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('product-modal').classList.remove('active');
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('product-modal')) {
            document.getElementById('product-modal').classList.remove('active');
        }
    });
    
    // Refresh inventory every 30 seconds
    setInterval(loadInventory, 30000);
});
