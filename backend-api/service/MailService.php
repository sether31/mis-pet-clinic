<?php

require_once __DIR__ . '/../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

function sendMailOtp($to_email, $otp_code, $name, $purpose, $expires_at) {
  $email = new PHPMailer(true);
  $displayPurpose = str_replace('_', ' ', $purpose);
  $readableTime = date("F j, Y, g:i a", strtotime($expires_at));

  try {
    $email->isSMTP();
    $email->Host = $_ENV['SMTP_HOST'];
    $email->Username = $_ENV['SMTP_USER'];
    $email->Password = $_ENV['SMTP_PASS'];
    $email->Port = $_ENV['SMTP_PORT'];
    $email->SMTPAuth = true;
    $email->SMTPSecure = "tls";

    // recipient
    $email->setFrom($_ENV['SMTP_FROM_EMAIL'], $_ENV['SMTP_FROM_NAME']);
    $email->addAddress($to_email, $name);

    // content
    $email->isHTML(true);
    $email->Subject = $_ENV['SMTP_FROM_NAME'] . ' ' . strtoupper($displayPurpose) . " OTP Code";
    $email->Body = "
      <p>Hello <strong>$name</strong>,</p>
      <p>
        Your OTP code for $displayPurpose is: 
        <strong>$otp_code</strong>
      </p>
      <p>This code will be expired at $readableTime</p>
      <br>
      <p>
        Best regards,
        <br>
        {$_ENV['SMTP_FROM_NAME']}
      </p>
      ";
    $email->send();
  } catch(Exception $e) {
    echo "error: {$email->ErrorInfo}";
  }
}
?>