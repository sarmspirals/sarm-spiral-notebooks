<?php
session_start();
require_once 'sendWhatsAppAlert.php';
require_once 'generate_invoice.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get form data
    $name = $_POST['name'];
    $phone = $_POST['phone'];
    $address = $_POST['address'];
    $landmark = $_POST['landmark'];
    $pincode = $_POST['pincode'];
    $payment_method = $_POST['payment_method'];
    $total = $_POST['total'];
    
    // Generate order ID
    $order_id = 'ORD' . date('Ymd') . rand(1000, 9999);
    
    // Prepare order data
    $orderData = [
        'order_id' => $order_id,
        'name' => $name,
        'phone' => $phone,
        'address' => $address,
        'landmark' => $landmark,
        'pincode' => $pincode,
        'payment_method' => $payment_method,
        'total' => $total,
        'items' => json_decode($_POST['cart_items'], true),
        'date' => date('Y-m-d H:i:s')
    ];
    
    // Save to database (you need to implement this)
    // saveToDatabase($orderData);
    
    // Send WhatsApp alert
    sendWhatsAppAlert($orderData);
    
    // Generate PDF invoice
    $invoicePath = generateInvoice($orderData);
    
    // Clear cart
    unset($_SESSION['cart']);
    
    // Redirect to success page
    header('Location: order_success.php?order_id=' . $order_id);
    exit();
}
?>
