const { pool: mq } = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      

      /*   
function GetSousById(Id, callback) {
  const query = `
    SELECT 
      *
    FROM souscripteurs
    WHERE id = ?;
  `;

  mq.query(query, [Id], function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}*/

async function GetSousById(id) {
  const [rows] = await db.query(`SELECT * FROM souscripteurs WHERE code = ?`, [id]);
  return rows[0] || null;
}



 

async function InsertAddress({ souscripteur_id, agent_id, commune, wilaya, adresse }) {
  const query = `
    INSERT INTO addresses (souscripteur_id, agent_id, commune, wilaya, adresse)
    VALUES (?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(query, [souscripteur_id, agent_id, commune, wilaya, adresse]);
  return result.insertId;
}


async function GetAddressesBySouscripteurId(souscripteur_id) {
  const [rows] = await db.query(
    `SELECT * FROM addresses WHERE souscripteur_id = ? ORDER BY date_saisi DESC`,
    [souscripteur_id]
  );
  return rows[0];
}

      

        
async function getSouscripteurStats() {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM souscripteurs) AS total,
      (SELECT COUNT(*) FROM souscripteurs WHERE assign = 1) AS assigned,
      (SELECT COUNT(*) FROM agent_validations WHERE decision = 'valide') AS favorable,
      (SELECT COUNT(*) FROM agent_validations WHERE decision = 'rejete') AS defavorable,
        (SELECT COUNT(*) FROM agent_validations WHERE decision = 'complete') AS complete
  `);

  const { total, assigned, favorable, defavorable,complete } = rows[0];
  const traites = favorable + defavorable+complete;
  const restants = total - traites;

  return {
    total,
    assigned,
    favorable,
    defavorable,
    traites,
    restants,
    complete
  };
}

async function getTraitesParJourDerniers10Jours() {
  const query = `
    SELECT 
  DATE(validated_at) AS jour,
  COUNT(*) AS total_traites,
  SUM(decision = 'valide') AS favorable,
  SUM(decision = 'rejete') AS defavorable,
  SUM(decision = 'complete') AS complete
FROM agent_validations
WHERE 
DATE(validated_at) >= CURDATE() - INTERVAL 9 DAY
GROUP BY jour
ORDER BY jour ASC;
  `;

  try {
    const [rows] = await db.query(query);
    return rows;
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers traités par jour:', error);
    throw error;
  }
}

module.exports = {
 
  GetSousById,
  InsertAddress,
  GetAddressesBySouscripteurId,
  getSouscripteurStats,
  getTraitesParJourDerniers10Jours

  };