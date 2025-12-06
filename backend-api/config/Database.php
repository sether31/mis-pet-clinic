<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

class Database {
  private $host;
  private $dbname;
  private $user;
  private $password;
  private $port;

  public $pdo;

  public function __construct() {
    $this->host = $_ENV['DB_HOST'];
    $this->dbname = $_ENV['DB_NAME'];
    $this->user = $_ENV['DB_USER'];
    $this->password = $_ENV['DB_PASS'];
    $this->port = $_ENV['DB_PORT'];

    try {
      $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset=utf8mb4";

      $this->pdo = new PDO($dsn, $this->user, $this->password);
      $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
      die("Connection failed: " . $e->getMessage());
    }
  }
}
