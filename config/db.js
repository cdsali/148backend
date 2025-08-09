
/*var mysql = require('mysql2');


const connection = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    dateStrings: process.env.dateStrings
});




connection.connect(function (err) {

    if (err) throw err;

    console.log("connection database done");

});



module.exports = connection;*/


// config/db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
  dateStrings: process.env.dateStrings,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export both: for compatibility
module.exports = {
  pool,              // Use for classic `mq.pool.query(...)`
  promise: pool.promise(),  // Use for async/await
};
