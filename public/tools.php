<?php
// tools.php — simple JSON-based tool storage
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// Later: per-user file via ?user=ID. For now global file.
$user = isset($_GET['user']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['user']) : 'global';
$file = __DIR__ . '/tools_' . $user . '.json';

// Default tools if file doesn't exist
$defaults = [
  [
    'id' => 'T1', 'name' => 'Schaftfräser 16mm', 'type' => 'endmill',
    'diameter' => 16, 'length' => 60, 'flutes' => 4,
    'cutData' => ['feed' => 800, 'speed' => 3000, 'maxCutHeight' => 5, 'coolant' => true]
  ],
  [
    'id' => 'T2', 'name' => 'Schaftfräser 8mm', 'type' => 'endmill',
    'diameter' => 8, 'length' => 40, 'flutes' => 3,
    'cutData' => ['feed' => 600, 'speed' => 5000, 'maxCutHeight' => 3, 'coolant' => true]
  ]
];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (file_exists($file)) {
    echo file_get_contents($file);
  } else {
    echo json_encode($defaults, JSON_PRETTY_PRINT);
  }
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  if ($data === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
  }
  $ok = file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
  if ($ok === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Write failed']);
  } else {
    echo json_encode(['status' => 'ok', 'count' => count($data)]);
  }
  exit;
}
