<?php
function sendWhatsAppAlert($orderDetails) {
    $apiKey = 'YOUR_WHATSAPP_API_KEY'; // Get from WhatsApp Business API
    $phone = '7006927925'; // Your business number
    
    $message = "📦 *NEW ORDER RECEIVED!*\n\n";
    $message .= "Name: " . $orderDetails['name'] . "\n";
    $message .= "Phone: " . $orderDetails['phone'] . "\n";
    $message .= "Address: " . $orderDetails['address'] . "\n";
    $message .= "Total: ₹" . $orderDetails['total'] . "\n";
    $message .= "Order ID: " . $orderDetails['order_id'] . "\n\n";
    $message .= "Order placed at: " . date('Y-m-d H:i:s');
    
    // Encode message for URL
    $encodedMessage = urlencode($message);
    
    // For WhatsApp Business API
    $url = "https://api.whatsapp.com/send?phone=$phone&text=$encodedMessage";
    
    // Or for WhatsApp API service (like Twilio)
    // $url = "https://api.twilio.com/...";
    
    // Send request
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    return $response;
}
?>
