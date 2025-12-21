// Calculate total amount
function calculateTotal() {
    let total = 0;
    
    // Get all cart items from localStorage or session
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    cartItems.forEach(item => {
        total = item.price * item.quantity;
    });
    
    // Update total display
    document.getElementById('totalAmount').textContent = '₹' + total;
    document.getElementById('totalInput').value = total;
    
    return total;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    calculateTotal();
    
    // Add event listeners to quantity changes
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', calculateTotal);
    });
});
