<?php
/**
 * ARK Crisis Suite — Bug Report Receiver
 * Upload to: public_html/ark-bugs.php
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Read request body
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    // Try to store raw payload anyway
    $data = ['raw' => $raw];
}

// Ensure bugs directory exists
$bugsDir = __DIR__ . '/ark-data/bugs';
if (!is_dir($bugsDir)) {
    mkdir($bugsDir, 0755, true);
}

// Save bug report as JSON file
$timestamp = date('Y-m-d_H-i-s');
$id = uniqid();
$filename = $bugsDir . '/' . $timestamp . '_' . $id . '.json';

$report = [
    'id'        => $id,
    'timestamp' => date('c'),
    'ip'        => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'data'      => $data,
];

file_put_contents($filename, json_encode($report, JSON_PRETTY_PRINT));

// Optional: send email notification
// Uncomment and set your email below to get notified on each bug report
/*
$to      = 'hello@halosuite.ai';
$subject = '[ARK] New Bug Report — ' . $timestamp;
$message = "New bug report received:\n\n" . json_encode($report, JSON_PRETTY_PRINT);
$headers = 'From: noreply@ark.halosuite.ai';
mail($to, $subject, $message, $headers);
*/

echo json_encode(['status' => 'ok', 'id' => $id]);
