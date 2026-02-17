<?php
function log_audit($pdo, $user_id, $clinic_id, $branch_id, $action, $entity, $entity_id) {
  try {
    $stmt = $pdo->prepare("INSERT INTO audit_logs_tb 
      (user_id, clinic_id, branch_id, action_type, entity_name, entity_id) 
      VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $clinic_id, $branch_id, $action, $entity, $entity_id]);
  } catch (Exception $e) {
    error_log("Audit Log Error: " . $e->getMessage());
  }
}
?>