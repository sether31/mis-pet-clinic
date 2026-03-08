<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT o.order_id as id, p.name as title, o.status, o.created_at as date
    FROM orders_tb o
    JOIN products_tb p ON o.product_id = p.product_id
    WHERE o.owner_id = ? AND o.status IN ('pending', 'confirmed', 'completed')
    ORDER BY o.created_at DESC
    LIMIT 3"
  );
  $stmt->execute([$userId]);
  $orders = $stmt->fetchAll();

  $formattedPickups = [];

  foreach ($orders as $order) {
    $formattedPickups[] = [
      'id' => $order['id'],
      'title' => $order['title'],
      'status' => $order['status'],
      'date' => date('M j', strtotime($order['date']))
    ];
  }

  echo json_encode([
    "success" => true,
    "data" => $formattedPickups
  ]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>