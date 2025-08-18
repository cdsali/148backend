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
      (SELECT COUNT(*) FROM agent_assignments) AS assigned,
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


async function getSouscripteurStatsDr(id) {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM souscripteurs) AS total,
       (SELECT COUNT(*) FROM agent_assignments ass
         JOIN users u ON ass.agent_id = u.id
         WHERE  u.dr = ?) AS assigned,
      (SELECT COUNT(*)
         FROM agent_validations av
         JOIN users u ON av.agent_id = u.id
         WHERE av.decision = 'valide' AND u.dr = ?) AS favorable,
      (SELECT COUNT(*)
         FROM agent_validations av
         JOIN users u ON av.agent_id = u.id
         WHERE av.decision = 'rejete' AND u.dr = ?) AS defavorable,
      (SELECT COUNT(*)
         FROM agent_validations av
         JOIN users u ON av.agent_id = u.id
         WHERE av.decision = 'complete' AND u.dr = ?) AS complete
  `, [id,id, id, id]);

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


async function getTraitesParJourDerniers10JoursDr(id) {
  const query = `
    SELECT 
      DATE(av.validated_at) AS jour,
      COUNT(*) AS total_traites,
      SUM(av.decision = 'valide') AS favorable,
      SUM(av.decision = 'rejete') AS defavorable,
      SUM(av.decision = 'complete') AS complete
    FROM agent_validations av
    JOIN users u ON av.agent_id = u.id
    WHERE 
      DATE(av.validated_at) >= CURDATE() - INTERVAL 9 DAY
      AND u.dr = ?
    GROUP BY jour
    ORDER BY jour ASC;
  `;

  try {
    const [rows] = await db.query(query, [id]);
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
  getTraitesParJourDerniers10Jours,
  getSouscripteurStatsDr,
  getTraitesParJourDerniers10JoursDr

  };