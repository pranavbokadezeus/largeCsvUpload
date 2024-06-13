const mysql = require('mysql');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'employee_database',
    user: 'root',
    password: 'root'
});

module.exports = pool;