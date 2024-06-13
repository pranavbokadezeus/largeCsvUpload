const mysql = require('mysql2/promise');

async function extractDatabaseInfo() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    database: 'employee_database',
    user: 'root',
    password: 'root'
  });
  try {
    // Query to get table information
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'employee_database';
    `);
    console.log('Tables:', tables);

    // Query to get column information
    const [columns] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY, EXTRA 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'employee_database' 
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `);
    console.log('Columns:', columns);

    // Query to get index information
    const [indexes] = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'employee_database' 
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
    `);
    console.log('Indexes:', indexes);

    // Query to get lock information, compatible with versions where INNODB_LOCKS is unavailable
    let locks;
    try {
      [locks] = await connection.query(`SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCKS;`);
      console.log('Locks:', locks);
    } catch (err) {
      console.warn("INNODB_LOCKS table is not available. Skipping lock information.");
    }

    // Query to get lock wait information, compatible with versions where INNODB_LOCK_WAITS is unavailable
    let lockWaits;
    try {
      [lockWaits] = await connection.query(`SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCK_WAITS;`);
      console.log('Lock Waits:', lockWaits);
    } catch (err) {
      console.warn("INNODB_LOCK_WAITS table is not available. Skipping lock wait information.");
    }

    // Query to get transaction information
    const [transactions] = await connection.query(`SELECT * FROM INFORMATION_SCHEMA.INNODB_TRX;`);
    console.log('Transactions:', transactions);

    // Query to get the latest InnoDB status
    const [innodbStatus] = await connection.query(`SHOW ENGINE INNODB STATUS;`);
    console.log('InnoDB Status:', innodbStatus[0].Status);

  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await connection.end();
  }
}

extractDatabaseInfo();