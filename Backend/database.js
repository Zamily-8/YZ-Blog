// Fichier pour gérer la base de données
require('dotenv').config(); // S'assure que les variables d'environnement sont chargées
const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Laissez vide si pas de mot de passe pour l'utilisateur root local
  database: process.env.DB_NAME || 'yz_blog',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = dbPool;