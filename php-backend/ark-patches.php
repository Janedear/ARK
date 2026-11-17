<?php
/**
 * ARK Crisis Suite — Patch Server
 * Upload to: public_html/ark-patches.php
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$patchFile = __DIR__ . '/ark-data/patches/latest.json';

if (!file_exists($patchFile)) {
    // No patch file yet — return inactive patch
    echo json_encode(['active' => false]);
    exit;
}

$content = file_get_contents($patchFile);
$patch   = json_decode($content, true);

if (!$patch) {
    echo json_encode(['active' => false]);
    exit;
}

echo $content;
