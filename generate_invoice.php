<?php
require('fpdf/fpdf.php'); // Download FPDF from http://www.fpdf.org

function generateInvoice($orderData) {
    $pdf = new FPDF();
    $pdf->AddPage();
    
    // Add logo
    $pdf->Image('logo.png', 10, 10, 30);
    
    // Title
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->Cell(0, 10, 'SARM SPIRAL NOTEBOOKS', 0, 1, 'C');
    $pdf->Cell(0, 10, 'INVOICE', 0, 1, 'C');
    
    // Order Details
    $pdf->SetFont('Arial', '', 12);
    $pdf->Cell(0, 10, 'Order ID: INV-' . $orderData['order_id'], 0, 1);
    $pdf->Cell(0, 10, 'Date: ' . date('d/m/Y'), 0, 1);
    
    // Customer Details
    $pdf->Cell(0, 10, 'Customer: ' . $orderData['name'], 0, 1);
    $pdf->Cell(0, 10, 'Phone: ' . $orderData['phone'], 0, 1);
    $pdf->Cell(0, 10, 'Address: ' . $orderData['address'], 0, 1);
    
    // Items Table
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->Cell(100, 10, 'Item', 1);
    $pdf->Cell(45, 10, 'Quantity', 1);
    $pdf->Cell(45, 10, 'Price', 1, 1);
    
    $pdf->SetFont('Arial', '', 12);
    foreach ($orderData['items'] as $item) {
        $pdf->Cell(100, 10, $item['name'], 1);
        $pdf->Cell(45, 10, $item['quantity'], 1);
        $pdf->Cell(45, 10, '₹' . $item['price'], 1, 1);
    }
    
    // Total
    $pdf->Cell(145, 10, 'Total:', 1);
    $pdf->Cell(45, 10, '₹' . $orderData['total'], 1, 1);
    
    // Save PDF
    $filename = 'invoices/invoice_' . $orderData['order_id'] . '.pdf';
    $pdf->Output('F', $filename);
    
    return $filename;
}
?>
