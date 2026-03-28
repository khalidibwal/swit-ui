<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Konfigurasi Midtrans
    $server_key = getenv('MIDTRANS_SERVER_KEY') ?: 'MASUKKAN_SERVER_KEY_DISINI'; 
    $url = "https://app.midtrans.com/snap/v1/transactions";
    
    $auth_header = base64_encode($server_key . ':');

    $payload = json_encode([
        "transaction_details" => [
            "order_id" => $input['orderId'],
            "gross_amount" => $input['amount']
        ],
        "credit_card" => [
            "secure" => true
        ],
        "customer_details" => $input['customerDetails']
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Basic ' . $auth_header
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($httpCode);
    echo $response;
}
?>
