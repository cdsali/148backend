const { pool: mq } = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      


async function GetAffiliationById(id) {
  const [rows] = await db.query(`SELECT status,employeur,date_affiliation,date_recrutement,salaire_cnas_casnos_cnr FROM affiliations WHERE souscripteur_id = ?`, [id]);
  return rows || null;
}




        




module.exports = {
 
   GetAffiliationById

  };