const { pool: mq } = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      


async function GetConById(id) {
  const [rows] = await db.query(`SELECT * FROM conjoints WHERE user_id = ?`, [id]);
  return rows[0] || null;
}




        




module.exports = {
 
   GetConById

  };