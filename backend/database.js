const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'employee_database',
    user: 'root',
    password: 'root',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;