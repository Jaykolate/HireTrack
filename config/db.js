
const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require("fs");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 13098,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { ca: fs.readFileSync("./ca.pem")}
});

module.exports = pool;