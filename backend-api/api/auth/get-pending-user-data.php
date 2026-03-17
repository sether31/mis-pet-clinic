<?php
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../middleware/auth-middleware.php';

require_once __DIR__ . '/../../service/Jwt.php';

$admin = validate_auth(['clinic_admin']);

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "SELECT 
      /* get user and role */
      u.user_id, u.first_name, u.last_name, u.email, u.status as user_status,
      r.role_name,

      /* get clinic and branch */
      c.clinic_id,
      b.branch_id, b.name as branch_name, b.description, b.est, b.contact_number,
      b.address, b.municipality, b.province, b.zip_code, 
      b.website, b.facebook,
      b.tin_id_picture, b.business_permit_picture, 
      b.tin_id_number, b.business_permit_number,
      b.status as branch_status, b.feedback,
      b.subscription_id, b.feedback
    FROM user_tb u
    INNER JOIN roles_tb r ON u.role_id = r.role_id
    LEFT JOIN clinics_tb c ON u.user_id = c.created_by
    LEFT JOIN clinic_branches_tb b ON c.clinic_id = b.clinic_id
    WHERE u.user_id = :user_id
    LIMIT 1"
);
  $stmt->execute([':user_id' => $admin->user_id]);
  
  $user = $stmt->fetch();

  if($user) {
    $responseData = [
      "success" => true,
      "data" => [
        // user data
        "user" => [
          "id" => $user['user_id'],
          "first_name" => $user['first_name'],
          "last_name" => $user['last_name'],
          "role" => $user['role_name'],
          "status" => $user['user_status']
        ],

        // clinic data
        "clinic" => [
          "branch_id" => $user['branch_id'],
          "branch_name" => $user['branch_name'],
          "description" => $user['description'],
          "established" => $user['est'], 
          "status" => $user['branch_status'],
          "feedback" => $user['feedback'] ?? '',
          "subscription_id" => $user['subscription_id'],
          "contact_number" => $user['contact_number'],

          "license" => [
            "tin_id_pic" => $user['tin_id_picture'],
            "tin_id_number" => $user['tin_id_number'],
            "business_permit_pic" => $user['business_permit_picture'],
            "business_permit_number" => $user['business_permit_number']
          ],

          "contact_info" => [
            "website" => $user['website'],
            "facebook" => $user['facebook'] 
          ],

          "location" => [
            "address" => $user['address'],
            "municipality" => $user['municipality'],
            "province" => $user['province'],
            "zip_code" => $user['zip_code']
          ]
        ]
      ]
    ];

    // if approved generate new token with updated data
    if($user['user_status'] === 'approved' && $user['branch_status'] === 'approved') {
      $new_token = createJWT([
        "user_id" => $user['user_id'],
        "role" => $user['role_name'],
        "status" => 'approved' 
      ]);
      $responseData['data']['new_token'] = $new_token;
    }

    echo json_encode($responseData);

} else {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "User not found"]);
  }
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>