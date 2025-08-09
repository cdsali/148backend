const { pool: mq } = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      


async function GetDossierById(id) {
  const [rows] = await db.query(`SELECT * FROM dossiers WHERE souscripteur_id = ?`, [id]);
  return rows[0] || null;
}


async function GetDossierStateById(id,agent) {
  const [rows] = await db.query(
    `SELECT * FROM dossier_reviews WHERE souscripteur_id = ? and agent_id= ?`,
    [id,agent]
  );
  return rows || null;
}



async function GetDossierStateByIdsous(sousId) {
  const [rows] = await db.query(
    `SELECT * FROM dossier_reviews WHERE souscripteur_id = ?`,
    [sousId]
  );
  return rows || null;
}





 
  async function insertDossierReview(souscripteurId, agentId, dossierType) {
  await db.query(
    `INSERT INTO dossier_reviews (
      souscripteur_id, agent_id, dossier_type
    ) VALUES (?, ?, ?)`,
    [souscripteurId, agentId, dossierType]
  );
}



async function markDossierExamined(souscripteurId, agentId, dossierType) {
  await db.query(
    `UPDATE dossier_reviews
     SET examined = 1, examined_at = NOW()
     WHERE souscripteur_id = ? AND dossier_type = ? AND examined = 0`,
    [souscripteurId, dossierType]
  );
}

async function markDossierConforme(souscripteurId, agentId, dossierType) {
  await db.query(
    `UPDATE dossier_reviews
     SET conforme = 1, conformed_at = NOW()
     WHERE souscripteur_id = ? AND dossier_type = ? AND conforme = 0`,
    [souscripteurId, dossierType]
  );
}


      

        




module.exports = {
 
  GetDossierById,
  GetDossierStateById,
  insertDossierReview,
  markDossierExamined,
  markDossierConforme,
  GetDossierStateByIdsous

  };