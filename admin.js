// Enhanced Admin Functions for SARM SPIRAL NOTEBOOKS

// ============================================
// ADVANCED ADMIN FUNCTIONS
// ============================================

// 1. ADVANCED ANALYTICS FUNCTIONS
async function getAdvancedAnalytics() {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Get orders from last 30 days
        const ordersSnapshot = await db.collection('orders')
            .where('timestamp', '>=', thirtyDaysAgo)
            .get();
        
        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        // Get all products
        const productsSnapshot = await db.collection('products').get();
        const products = [];
        productsSnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // Calculate daily sales
        const dailySales = {};
        orders.forEach(order => {
            const date = order.timestamp ? order.timestamp.toDate().toISOString().split('T')[0] : 'Unknown';
            dailySales[date] = (dailySales[date] || 0) + (order.totalAmount || 0);
        });
        
        // Calculate product performance
        const productPerformance = {};
        orders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    if (!productPerformance[item.name]) {
                        productPerformance[item.name] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productPerformance[item.name].quantity += item.quantity;
                    productPerformance[item.name].revenue += item.total;
                });
            }
        });
        
        // Calculate order status distribution
        const statusDistribution = {
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };
        
        orders.forEach(order => {
            statusDistribution[order.status] = (statusDistribution[order.status] || 0) + 1;
        });
        
        // Calculate customer retention
        const customerOrders = {};
        orders.forEach(order => {
            if (order.phone) {
                customerOrders[order.phone] = (customerOrders[order.phone] || 0) + 1;
            }
        });
        
        const repeatCustomers = Object.values(customerOrders).filter(count => count > 1).length;
        
        return {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            averageOrderValue: orders.length > 0 
                ? orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / orders.length 
                : 0,
            dailySales,
            productPerformance,
            statusDistribution,
            repeatCustomers,
            repeatCustomerRate: orders.length > 0 ? (repeatCustomers / Object.keys(customerOrders).length) * 100 : 0,
            lowStockItems: products.filter(p => p.stock < 10).length,
            outOfStockItems: products.filter(p => p.stock === 0).length
        };
        
    } catch (error) {
        console.error('Error getting advanced analytics:', error);
        throw error;
    }
}

// 2. BULK PRODUCT OPERATIONS
async function bulkUpdateProducts(updates) {
    try {
        const batch = db.batch();
        
        updates.forEach(update => {
            const productRef = db.collection('products').doc(update.id);
            batch.update(productRef, {
                price: update.price,
                stock: update.stock,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        return { success: true, message: `Updated ${updates.length} products` };
    } catch (error) {
        console.error('Error in bulk update:', error);
        return { success: false, message: error.message };
    }
}

async function importProductsFromCSV(csvData) {
    try {
        const rows = csvData.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
        
        const products = [];
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].split(',');
            const product = {};
            
            headers.forEach((header, index) => {
                product[header] = values[index] ? values[index].trim() : '';
            });
            
            // Convert numeric fields
            product.price = parseFloat(product.price) || 0;
            product.stock = parseInt(product.stock) || 0;
            product.pages = parseInt(product.pages) || 0;
            
            products.push(product);
        }
        
        const batch = db.batch();
        products.forEach(product => {
            const id = product.id || generateProductId(product.name);
            const docRef = db.collection('products').doc(id);
            batch.set(docRef, {
                name: product.name,
                price: product.price,
                stock: product.stock,
                pages: product.pages,
                description: product.description || '',
                category: product.category || 'notebook',
                image: product.image || 'default.jpg',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        return { success: true, count: products.length };
    } catch (error) {
        console.error('Error importing products:', error);
        return { success: false, message: error.message };
    }
}

function generateProductId(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 20) + '_' + Date.now().toString(36);
}

// 3. ORDER PROCESSING AUTOMATION
async function processPendingOrdersAutomatically() {
    try {
        const pendingOrdersSnapshot = await db.collection('orders')
            .where('status', '==', 'pending')
            .where('timestamp', '<=', new Date(Date.now() - 2 * 60 * 60 * 1000)) // Older than 2 hours
            .get();
        
        const batch = db.batch();
        const processedOrders = [];
        
        pendingOrdersSnapshot.forEach(doc => {
            const orderRef = db.collection('orders').doc(doc.id);
            batch.update(orderRef, {
                status: 'confirmed',
                autoProcessedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            processedOrders.push(doc.id);
        });
        
        if (processedOrders.length > 0) {
            await batch.commit();
            
            // Send notifications
            processedOrders.forEach(orderId => {
                sendOrderStatusNotification(orderId, 'confirmed', true);
            });
            
            return { success: true, processed: processedOrders.length };
        }
        
        return { success: true, processed: 0 };
    } catch (error) {
        console.error('Error processing orders automatically:', error);
        return { success: false, message: error.message };
    }
}

async function sendOrderStatusNotification(orderId, status, auto = false) {
    try {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) return;
        
        const order = orderDoc.data();
        
        // WhatsApp message
        const message = encodeURIComponent(
            `📦 Order Update: ${orderId}\n\n` +
            `Status: ${status.toUpperCase()}\n` +
            `Amount: ₹${order.totalAmount}\n\n` +
            (auto ? '✅ Your order has been automatically confirmed and is being processed.\n\n' : '') +
            `Thank you for choosing SARM SPIRAL NOTEBOOKS!\n` +
            `Need help? Call: 7006927825`
        );
        
        // Send to customer
        if (order.phone) {
            window.open(`https://wa.me/91${order.phone}?text=${message}`, '_blank');
        }
        
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

// 4. INVENTORY FORECASTING
function forecastInventoryNeeds(products, salesData, leadTimeDays = 7, safetyStock = 5) {
    const forecasts = [];
    
    products.forEach(product => {
        // Calculate average daily sales
        const productSales = salesData.filter(sale => 
            sale.items.some(item => item.productId === product.id)
        );
        
        const dailySales = productSales.length / 30; // Average per day over 30 days
        const leadTimeDemand = dailySales * leadTimeDays;
        const reorderPoint = leadTimeDemand + safetyStock;
        
        const needsReorder = product.stock <= reorderPoint;
        const orderQuantity = Math.max(reorderPoint * 2 - product.stock, 0);
        
        forecasts.push({
            productId: product.id,
            productName: product.name,
            currentStock: product.stock,
            dailySales: dailySales.toFixed(2),
            leadTimeDemand: Math.ceil(leadTimeDemand),
            reorderPoint: Math.ceil(reorderPoint),
            needsReorder,
            orderQuantity: Math.ceil(orderQuantity),
            urgency: product.stock < safetyStock ? 'high' : 
                    product.stock < reorderPoint ? 'medium' : 'low'
        });
    });
    
    return forecasts;
}

// 5. CUSTOMER MANAGEMENT
async function getCustomerInsights() {
    try {
        const ordersSnapshot = await db.collection('orders').get();
        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        const customers = {};
        
        orders.forEach(order => {
            if (!order.phone) return;
            
            if (!customers[order.phone]) {
                customers[order.phone] = {
                    phone: order.phone,
                    name: order.customerName,
                    totalOrders: 0,
                    totalSpent: 0,
                    firstOrder: order.timestamp,
                    lastOrder: order.timestamp,
                    averageOrderValue: 0,
                    favoriteProducts: {}
                };
            }
            
            const customer = customers[order.phone];
            customer.totalOrders++;
            customer.totalSpent += (order.totalAmount || 0);
            customer.lastOrder = order.timestamp;
            
            if (order.timestamp < customer.firstOrder) {
                customer.firstOrder = order.timestamp;
            }
            
            // Track favorite products
            if (order.items) {
                order.items.forEach(item => {
                    customer.favoriteProducts[item.name] = 
                        (customer.favoriteProducts[item.name] || 0) + item.quantity;
                });
            }
        });
        
        // Calculate averages and find favorite product
        Object.values(customers).forEach(customer => {
            customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
            
            // Find favorite product
            let maxQuantity = 0;
            let favoriteProduct = '';
            
            Object.entries(customer.favoriteProducts).forEach(([product, quantity]) => {
                if (quantity > maxQuantity) {
                    maxQuantity = quantity;
                    favoriteProduct = product;
                }
            });
            
            customer.favoriteProduct = favoriteProduct;
            customer.favoriteProductQuantity = maxQuantity;
        });
        
        return Object.values(customers)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 50); // Top 50 customers
    } catch (error) {
        console.error('Error getting customer insights:', error);
        throw error;
    }
}

// 6. REPORT GENERATION
async function generateSalesReport(startDate, endDate) {
    try {
        const ordersSnapshot = await db.collection('orders')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .get();
        
        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        const report = {
            period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            averageOrderValue: orders.length > 0 
                ? orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / orders.length 
                : 0,
            
            // By status
            byStatus: {
                pending: orders.filter(o => o.status === 'pending').length,
                confirmed: orders.filter(o => o.status === 'confirmed').length,
                shipped: orders.filter(o => o.status === 'shipped').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length
            },
            
            // By payment method
            byPayment: {
                COD: orders.filter(o => o.paymentMethod === 'COD').length,
                UPI: orders.filter(o => o.paymentMethod === 'UPI').length
            },
            
            // Top products
            topProducts: getTopProductsFromOrders(orders, 10),
            
            // Daily breakdown
            dailyBreakdown: getDailyBreakdown(orders),
            
            // Customer metrics
            uniqueCustomers: new Set(orders.map(o => o.phone)).size,
            repeatCustomers: getRepeatCustomers(orders),
            
            generatedAt: new Date().toISOString()
        };
        
        return report;
    } catch (error) {
        console.error('Error generating sales report:', error);
        throw error;
    }
}

function getTopProductsFromOrders(orders, limit = 10) {
    const productSales = {};
    
    orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                if (!productSales[item.name]) {
                    productSales[item.name] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.name].quantity += item.quantity;
                productSales[item.name].revenue += item.total;
            });
        }
    });
    
    return Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);
}

function getDailyBreakdown(orders) {
    const daily = {};
    
    orders.forEach(order => {
        const date = order.timestamp ? order.timestamp.toDate().toISOString().split('T')[0] : 'Unknown';
        
        if (!daily[date]) {
            daily[date] = {
                date,
                orders: 0,
                revenue: 0
            };
        }
        
        daily[date].orders++;
        daily[date].revenue += (order.totalAmount || 0);
    });
    
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
}

function getRepeatCustomers(orders) {
    const customerOrderCounts = {};
    
    orders.forEach(order => {
        if (order.phone) {
            customerOrderCounts[order.phone] = (customerOrderCounts[order.phone] || 0) + 1;
        }
    });
    
    return Object.values(customerOrderCounts).filter(count => count > 1).length;
}

// 7. BACKUP AND RESTORE
async function backupDatabase() {
    try {
        // Backup products
        const productsSnapshot = await db.collection('products').get();
        const products = [];
        productsSnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // Backup orders (limit to last 1000 for performance)
        const ordersSnapshot = await db.collection('orders')
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .get();
        
        const orders = [];
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            // Convert timestamp to string for JSON serialization
            orders.push({ 
                id: doc.id, 
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
                updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
            });
        });
        
        const backup = {
            timestamp: new Date().toISOString(),
            products,
            orders,
            version: '1.0'
        };
        
        // Create download link
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sarm_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, message: `Backup created with ${products.length} products and ${orders.length} orders` };
    } catch (error) {
        console.error('Error creating backup:', error);
        return { success: false, message: error.message };
    }
}

async function restoreFromBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const backup = JSON.parse(e.target.result);
                
                // Validate backup
                if (!backup.products || !backup.orders) {
                    throw new Error('Invalid backup format');
                }
                
                // Restore products
                const productBatch = db.batch();
                backup.products.forEach(product => {
                    const docRef = db.collection('products').doc(product.id);
                    // Remove id from data before saving
                    const { id, ...data } = product;
                    productBatch.set(docRef, data);
                });
                
                await productBatch.commit();
                
                // Restore orders
                const orderBatch = db.batch();
                backup.orders.forEach(order => {
                    const docRef = db.collection('orders').doc(order.id);
                    const { id, ...data } = order;
                    // Convert string dates back to timestamps
                    if (data.timestamp) {
                        data.timestamp = firebase.firestore.Timestamp.fromDate(new Date(data.timestamp));
                    }
                    if (data.updatedAt) {
                        data.updatedAt = firebase.firestore.Timestamp.fromDate(new Date(data.updatedAt));
                    }
                    orderBatch.set(docRef, data);
                });
                
                await orderBatch.commit();
                
                resolve({ 
                    success: true, 
                    message: `Restored ${backup.products.length} products and ${backup.orders.length} orders` 
                });
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// 8. BULK EMAIL/SMS NOTIFICATIONS
async function sendBulkNotification(customers, message, type = 'whatsapp') {
    try {
        const results = [];
        
        for (const customer of customers) {
            try {
                if (type === 'whatsapp' && customer.phone) {
                    const encodedMessage = encodeURIComponent(message);
                    window.open(`https://wa.me/91${customer.phone}?text=${encodedMessage}`, '_blank');
                    results.push({ phone: customer.phone, status: 'sent' });
                } else if (type === 'sms') {
                    // Implement SMS gateway integration here
                    results.push({ phone: customer.phone, status: 'skipped (SMS not implemented)' });
                }
                
                // Delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                results.push({ phone: customer.phone, status: 'failed', error: error.message });
            }
        }
        
        return { success: true, results };
    } catch (error) {
        console.error('Error sending bulk notifications:', error);
        return { success: false, message: error.message };
    }
}

// 9. AUTO-RESTOCK ALERTS
function setupAutoRestockAlerts() {
    // Check stock levels every hour
    setInterval(async () => {
        try {
            const productsSnapshot = await db.collection('products').get();
            const lowStockProducts = [];
            
            productsSnapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                if (product.stock < 5 && product.stock > 0) {
                    lowStockProducts.push(product);
                }
            });
            
            if (lowStockProducts.length > 0) {
                // Send WhatsApp alert to admin
                const message = encodeURIComponent(
                    `⚠️ LOW STOCK ALERT ⚠️\n\n` +
                    `${lowStockProducts.length} products are running low:\n\n` +
                    lowStockProducts.map(p => `• ${p.name}: ${p.stock} left`).join('\n') +
                    `\n\nPlease restock soon!`
                );
                
                window.open(`https://wa.me/917006927825?text=${message}`, '_blank');
            }
        } catch (error) {
            console.error('Error checking stock levels:', error);
        }
    }, 60 * 60 * 1000); // Check every hour
}

// 10. PERFORMANCE MONITORING
async function getSystemPerformance() {
    const startTime = performance.now();
    
    try {
        // Test database read performance
        const productsStart = performance.now();
        const productsSnapshot = await db.collection('products').limit(10).get();
        const productsTime = performance.now() - productsStart;
        
        // Test database write performance
        const writeStart = performance.now();
        const testDoc = db.collection('performance_tests').doc();
        await testDoc.set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: 'performance'
        });
        const writeTime = performance.now() - writeStart;
        
        // Clean up test document
        await testDoc.delete();
        
        const totalTime = performance.now() - startTime;
        
        return {
            databaseRead: `${productsTime.toFixed(2)}ms`,
            databaseWrite: `${writeTime.toFixed(2)}ms`,
            totalRequest: `${totalTime.toFixed(2)}ms`,
            status: totalTime < 1000 ? 'good' : totalTime < 3000 ? 'fair' : 'slow',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error testing performance:', error);
        return {
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// 11. CUSTOMER FEEDBACK ANALYSIS
async function analyzeCustomerFeedback() {
    try {
        // This would integrate with a feedback system
        // For now, we'll analyze order notes/comments if they exist
        const ordersSnapshot = await db.collection('orders')
            .where('notes', '!=', null)
            .limit(50)
            .get();
        
        const feedback = [];
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.notes) {
                feedback.push({
                    orderId: doc.id,
                    customer: order.customerName,
                    phone: order.phone,
                    notes: order.notes,
                    date: order.timestamp ? order.timestamp.toDate() : null,
                    sentiment: analyzeSentiment(order.notes)
                });
            }
        });
        
        return feedback;
    } catch (error) {
        console.error('Error analyzing feedback:', error);
        return [];
    }
}

function analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'thanks', 'thank', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'poor', 'worst', 'disappointed', 'problem', 'issue', 'late'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
        if (lowerText.includes(word)) score++;
    });
    
    negativeWords.forEach(word => {
        if (lowerText.includes(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
}

// 12. EXPORT FUNCTIONS FOR USE IN ADMIN PANEL
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAdvancedAnalytics,
        bulkUpdateProducts,
        importProductsFromCSV,
        processPendingOrdersAutomatically,
        forecastInventoryNeeds,
        getCustomerInsights,
        generateSalesReport,
        backupDatabase,
        restoreFromBackup,
        sendBulkNotification,
        setupAutoRestockAlerts,
        getSystemPerformance,
        analyzeCustomerFeedback
    };
} else {
    // Make functions available globally
    window.AdminFunctions = {
        getAdvancedAnalytics,
        bulkUpdateProducts,
        importProductsFromCSV,
        processPendingOrdersAutomatically,
        forecastInventoryNeeds,
        getCustomerInsights,
        generateSalesReport,
        backupDatabase,
        restoreFromBackup,
        sendBulkNotification,
        setupAutoRestockAlerts,
        getSystemPerformance,
        analyzeCustomerFeedback
    };
                   }
