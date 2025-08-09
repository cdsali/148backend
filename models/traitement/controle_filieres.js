const { pool: mq } = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      


async function GetControleById(id) {
  const [rows] = await db.query(`SELECT type,motif FROM controle_filieres WHERE souscripteur_id = ?`, [id]);
  return rows || null;
}




async function GetMotifsBysous(id) {
  const [rows] = await db.query(`SELECT * FROM motifs WHERE code_souscripteur = ?`, [id]);
  return rows || null;
}


        




module.exports = {
 
   GetControleById,
   GetMotifsBysous

  };