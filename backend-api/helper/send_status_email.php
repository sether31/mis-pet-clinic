<?php
require_once __DIR__ . '/../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Ensure dotenv is loaded if this file is called independently
if (class_exists('Dotenv\Dotenv')) {
  $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
  $dotenv->safeLoad(); // Use safeLoad so it doesn't crash if already loaded
}

function sendBranchStatusEmail($to_email, $name, $branch_name, $status, $feedback) {
  $email = new PHPMailer(true);
  
  try {
      $email->isSMTP();
      $email->Host = $_ENV['SMTP_HOST'];
      $email->Username = $_ENV['SMTP_USER'];
      $email->Password = $_ENV['SMTP_PASS'];
      $email->Port = $_ENV['SMTP_PORT'];
      $email->SMTPAuth = true;
      $email->SMTPSecure = "tls";

      // Recipient
      $email->setFrom($_ENV['SMTP_FROM_EMAIL'], $_ENV['SMTP_FROM_NAME']);
      $email->addAddress($to_email, $name);

      $email->isHTML(true);
      
      $cleanBranch = ucwords(strtolower($branch_name));
      $cleanFeedback = trim($feedback) ?: "No specific details provided.";

      // Format email based on the status
      if ($status === 'approved') {
          $email->Subject = "Branch Approved: $cleanBranch";
          $message = "<p>Great news! Your application for <strong>$cleanBranch</strong> has been approved. The branch is now active and ready for setup.</p>";
      } elseif ($status === 'suspended') {
          $email->Subject = "Branch Suspended: $cleanBranch";
          $message = "<p>Notice: Your branch <strong>$cleanBranch</strong> has been temporarily suspended.</p>
                      <p><strong>Reason/Feedback:</strong> $cleanFeedback</p>
                      <p>Please contact administration for further details.</p>";
      } else { // rejected
          $email->Subject = "Action Required: $cleanBranch Rejected";
          $message = "<p>We regret to inform you that your application for <strong>$cleanBranch</strong> was not approved at this time.</p>
                      <p><strong>Feedback:</strong> $cleanFeedback</p>
                      <p>Please review the feedback and resubmit your application.</p>";
      }

      $email->Body = "
          <div style='font-family: sans-serif; color: #333;'>
              <p>Hello <strong>$name</strong>,</p>
              $message
              <br>
              <p>Best regards,<br>{$_ENV['SMTP_FROM_NAME']}</p>
          </div>
      ";

      $email->send();
  } catch(Exception $e) {
      // We log the error instead of breaking the script, 
      // so the database still updates even if the email fails.
      error_log("Failed to send status email: {$email->ErrorInfo}");
  }
}
?>