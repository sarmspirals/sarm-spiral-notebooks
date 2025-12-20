<?php
// admin/login.php
session_start();

// Check credentials (use database in production)
$valid_username = 'admin';
$valid_password_hash = password_hash('your_password', PASSWORD_DEFAULT);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];
    
    if ($username === $valid_username && password_verify($password, $valid_password_hash)) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $username;
        header('Location: admin/dashboard.php');
        exit();
    } else {
        $error = "Invalid credentials!";
    }
}
?>

<!-- Login Form HTML -->
<form method="POST">
    <input type="text" name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button type="submit">Login</button>
</form>
