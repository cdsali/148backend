const { pool: mq }  = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      

function GetassignCountByUser(userId, callback) {
  const query = `
    SELECT 
      count(agent_id) as count
    FROM agent_assignments 
   
    WHERE agent_id = ? and completed=0 ;
  `;

 mq.query(query, [userId], function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}

function GetassignByUser(userId, callback) {
  const query = `
    SELECT 
      s.nom,
      s.prenom,
      s.date_nais,
      s.code AS id_souscripteur,
      aa.completed
    FROM agent_assignments aa
    JOIN souscripteurs s ON aa.souscripteur_id = s.code
    WHERE aa.agent_id = ? and completed=0 limit 10;
  `;

  mq.query(query, [userId], function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}

/*

async function assignNewSouscripteurs(agentId, limit = 10) {
  const connection = await db.getConnection();
console.log("limit is",limit);
  try {
    await connection.beginTransaction();

    // lockkkk
    const [rows] = await connection.query(`
      SELECT id
      FROM souscripteurs
      WHERE assign = 0 
      ORDER BY created_at
      LIMIT ?
      FOR UPDATE
    `, [limit]);

    if (rows.length === 0) {
      await connection.commit();
      return { assigned: 0 };
    }

    const sousIds = rows.map(row => row.id);

    // as assined flag
    await connection.query(`
      UPDATE souscripteurs
      SET assign = 1
      WHERE id IN (?)
    `, [sousIds]);

    //insert into agent_assing
    const values = sousIds.map(id => [id, agentId, 0]);
    await connection.query(`
      INSERT INTO agent_assignments (souscripteur_id, agent_id, completed)
      VALUES ?
    `, [values]);

    await connection.commit();
    return { assigned: sousIds.length };

  } catch (err) {
    await connection.rollback();
    console.error("Error during assignment:", err);
    throw err;
  } finally {
    connection.release();
  }
}

*/

/*
async function assignNewSouscripteurs(agentId, affectationRecours, limit = 10) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let query = '';
    let params = [];

    if (affectationRecours === 'traitement') {
      query = `
        SELECT s.id
        FROM souscripteurs s
        WHERE s.assign = 0
        AND (
          SELECT COUNT(DISTINCT m.type)
          FROM motifs m
          WHERE m.code_souscripteur = s.id
        ) = 1
        AND EXISTS (
          SELECT 1
          FROM motifs m
          WHERE m.code_souscripteur = s.id
          AND m.type = ?
        )
        ORDER BY s.created_at
        LIMIT ?
        FOR UPDATE
      `;
      params = ['traitement', limit];

    } else if (affectationRecours === 'mhuv' || affectationRecours === 'cnas' || affectationRecours === 'miclat'   ) {
      query = `
        SELECT s.id
        FROM souscripteurs s
        WHERE s.assign = 0
        AND EXISTS (
          SELECT 1
          FROM motifs m
          WHERE m.code_souscripteur = s.id
          AND m.type = ?
        )
        ORDER BY s.created_at
        LIMIT ?
        FOR UPDATE
      `;
      params = [affectationRecours, limit];
    } else {
      throw new Error('Unsupported affectation_recours type');
    }

    const [rows] = await connection.query(query, params);

    if (rows.length === 0) {
      await connection.commit();
      return { assigned: 0 };
    }

    const sousIds = rows.map(row => row.id);

    await connection.query(`
      UPDATE souscripteurs
      SET assign = 1
      WHERE id IN (?)
    `, [sousIds]);

    const values = sousIds.map(id => [id, agentId, 0]);
    await connection.query(`
      INSERT INTO agent_assignments (souscripteur_id, agent_id, completed)
      VALUES ?
    `, [values]);

    await connection.commit();
    return { assigned: sousIds.length };

  } catch (err) {
    await connection.rollback();
    console.error("Error during assignment:", err);
    throw err;
  } finally {
    connection.release();
  }
}
*/

async function assignNewSouscripteurs(agentId, affectationRecours, limit = 10) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let query = '';
    let params = [];

    // Determine the appropriate query based on affectationRecours
    if (affectationRecours === 'traitement') {
      query = `
        SELECT s.code
        FROM souscripteurs s
        WHERE s.assign = 0
          AND (
            SELECT COUNT(DISTINCT m.type)
            FROM motifs m
            WHERE m.code_souscripteur = s.code
          ) = 1
          AND EXISTS (
            SELECT 1
            FROM motifs m
            WHERE m.code_souscripteur = s.code AND m.type = ?
          )
        ORDER BY s.created_at
        LIMIT ?
        FOR UPDATE
      `;
      params = ['traitement', limit];

    } else if (['mhuv', 'dgdn'].includes(affectationRecours)) {
      query = `
        SELECT s.code
        FROM souscripteurs s
        WHERE s.assign = 0
          AND EXISTS (
            SELECT 1
            FROM motifs m
            WHERE m.code_souscripteur = s.code AND m.type = ?
          )
        ORDER BY s.created_at
        LIMIT ?
        FOR UPDATE
      `;
      params = [affectationRecours, limit];

    } else {
      throw new Error(`Unsupported affectationRecours type: ${affectationRecours}`);
    }

    // Fetch souscripteurs to assign
    const [rows] = await connection.query(query, params);

    if (rows.length === 0) {
      await connection.rollback(); // No update needed
      return { assigned: 0 };
    }

    const sousIds = rows.map(row => row.code);

    // Update assign flag
    const placeholders = sousIds.map(() => '?').join(',');
    await connection.query(
      `UPDATE souscripteurs SET assign = 1 WHERE code IN (${placeholders})`,
      sousIds
    );

    // Insert agent assignments
    const values = sousIds.map(code => [code, agentId, 0]); // completed = 0
    await connection.query(
      `INSERT INTO agent_assignments (souscripteur_id, agent_id, completed) VALUES ?`,
      [values]
    );

    await connection.commit();
    return { assigned: sousIds.length };

  } catch (err) {
    await connection.rollback();
    console.error("Error during assignment:", err);
    throw err;
  } finally {
    connection.release();
  }
}






 
  function markAssignmentCompleted(agentId, souscripteurId, callback) {
  const query = `
    UPDATE agent_assignments
    SET completed = 1
    WHERE agent_id = ? AND souscripteur_id = ?
  `;

  mq.query(query, [agentId, souscripteurId], function (err, result) {
    if (err) return callback(err, null);
    callback(null, result);
  });
}



module.exports = {
 
  GetassignByUser,
  GetassignCountByUser,
  assignNewSouscripteurs,
  markAssignmentCompleted
  };