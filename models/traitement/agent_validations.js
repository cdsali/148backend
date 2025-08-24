const { pool: mq }  = require('../../config/db.js');
const { promise: db } = require('../../config/db');
      


function insertValidationDecision(souscripteurId, agentId, decision, motif,observation, callback) {
  const query = `
    INSERT INTO agent_validations (souscripteur_id, agent_id, decision, motif,observation_cadre)
    VALUES (?, ?, ?, ? , ?  )
    ON DUPLICATE KEY UPDATE 
      decision = VALUES(decision),
      motif = VALUES(motif),
      validated_at = CURRENT_TIMESTAMP
  `;

  mq.query(query, [souscripteurId, agentId, decision, motif,observation], (err, result) => {
    if (err) return callback(err, null);
    return callback(null, result);
  });
}

/*

function getValidationsPaginated(decisionType, dr,observation_cadre, limit, offset, callback) {
 
  let query = `
SELECT 
  s.nom,
  s.prenom,
  s.date_nais,
  s.code AS id_souscripteur,
  u.name AS agent_name,
  u.affectation,
  av.agent_id,
  av.validated_at,
  av.motif,
  av.decision
FROM agent_validations av
JOIN souscripteurs s ON av.souscripteur_id = s.code
JOIN users u ON av.agent_id = u.id
WHERE av.decision = ?
  AND u.dr = ?
  AND av.membre_id IS NULL
`;

// Add condition for observation_cadre based on true/false
if (observation_cadre === true) {
  query += ` AND av.observation_cadre IS NOT NULL AND av.observation_cadre != ''`;
}

// Append ORDER BY, LIMIT, and OFFSET
query += ` ORDER BY av.validated_at DESC LIMIT ? OFFSET ?`;


  mq.query(query, [decisionType, dr, limit, offset], (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
}



*/


function getValidationsPaginated(decisionType, dr, observation_cadre, limit, offset, userId, callback) {
  let query = `
    SELECT
      s.nom,
      s.prenom,
      s.date_nais,
      s.code AS id_souscripteur,
      u.name AS agent_name,
      u.affectation,
      av.agent_id,
      av.validated_at,
      av.motif,
      av.decision
    FROM agent_validations av
    JOIN souscripteurs s ON av.souscripteur_id = s.code
    JOIN users u ON av.agent_id = u.id
    WHERE av.decision = ?
      AND u.dr = ?
      AND av.membre_id IS NULL
  `;

  const queryParams = [decisionType, dr];

  // Add condition for observation_cadre if true
  if (observation_cadre) {
    query += ` AND av.observation_cadre IS NOT NULL AND av.observation_cadre != ''`;
  }

  // Optional agent filter
  if (userId) {
    query += ` AND av.agent_id = ?`;
    queryParams.push(userId);
  }

  query += ` ORDER BY av.validated_at DESC LIMIT ? OFFSET ?`;
  queryParams.push(limit, offset);

  mq.query(query, queryParams, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
}



function getValidationsPv( dr, callback) {
  const query = `


  SELECT 
  s.nom,
  s.prenom,
  s.date_nais,
  s.code AS id_souscripteur,

  u.name AS agent_name,
  u.affectation,

  av.agent_id,
  av.validated_at,
  av.motif,
  av.decision,

  av.membre_id,
  m.name AS membre_name,
  av.motif_membre,
  av.decision_membre

FROM agent_validations av
JOIN souscripteurs s ON av.souscripteur_id = s.code
JOIN users u ON av.agent_id = u.id
LEFT JOIN users m ON av.membre_id = m.id

WHERE 
  u.dr = ?

ORDER BY av.validated_at DESC



  `;

  mq.query(query, [ dr], (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
}

/*

function updateValidationDecision(validations, callback) {
  if (!Array.isArray(validations) || validations.length === 0) {
    return callback(null, { message: 'No data to update.' });
  }

  const cases = {
    decision_membre: [],
    motif_membre: [],
    membre_id: [],
    validated_membre_at: [],
    observation_membre: [], // added this
  };
  const ids = [];

  validations.forEach(({ souscripteurId, membreId, decision, motif, observation }) => {
    ids.push(souscripteurId);
    cases.decision_membre.push(`WHEN ${souscripteurId} THEN ${mq.escape(decision)}`);
    cases.motif_membre.push(`WHEN ${souscripteurId} THEN ${mq.escape(motif)}`);
    cases.membre_id.push(`WHEN ${souscripteurId} THEN ${mq.escape(membreId)}`);
    cases.validated_membre_at.push(`WHEN ${souscripteurId} THEN CURRENT_TIMESTAMP`);
    cases.observation_membre.push(`WHEN ${souscripteurId} THEN ${mq.escape(observation || '')}`); // escape and fallback to empty string
  });

  const query = `
    UPDATE agent_validations
    SET
      decision_membre = CASE souscripteur_id ${cases.decision_membre.join(' ')} END,
      motif_membre = CASE souscripteur_id ${cases.motif_membre.join(' ')} END,
      membre_id = CASE souscripteur_id ${cases.membre_id.join(' ')} END,
      validated_membre_at = CASE souscripteur_id ${cases.validated_membre_at.join(' ')} END,
      observation_membre = CASE souscripteur_id ${cases.observation_membre.join(' ')} END
    WHERE souscripteur_id IN (${ids.join(',')})
  `;

  mq.query(query, (err, result) => {
    if (err) return callback(err, null);
    return callback(null, result);
  });
}

*/

function updateValidationDecision(validations, callback) {
  if (!Array.isArray(validations) || validations.length === 0) {
    return callback(null, { message: 'No data to update.' });
  }

  const cases = {
    decision_membre: [],
    motif_membre: [],
    membre_id: [],
    validated_membre_at: [],
    observation_membre: [],
  };
  const ids = [];

  validations.forEach(({ souscripteurId, membreId, decision, motif, observation }) => {
    // Escape the souscripteurId for safe SQL usage
    const escapedSouscripteurId = mq.escape(souscripteurId);

    // Push the escaped souscripteurId and build the CASE expressions
    ids.push(escapedSouscripteurId);
    cases.decision_membre.push(`WHEN ${escapedSouscripteurId} THEN ${mq.escape(decision)}`);
    cases.motif_membre.push(`WHEN ${escapedSouscripteurId} THEN ${mq.escape(motif)}`);
    cases.membre_id.push(`WHEN ${escapedSouscripteurId} THEN ${mq.escape(membreId)}`);
    cases.validated_membre_at.push(`WHEN ${escapedSouscripteurId} THEN CURRENT_TIMESTAMP`);
    cases.observation_membre.push(`WHEN ${escapedSouscripteurId} THEN ${mq.escape(observation || '')}`);
  });

  const query = `
    UPDATE agent_validations
    SET
      decision_membre = CASE souscripteur_id ${cases.decision_membre.join(' ')} END,
      motif_membre = CASE souscripteur_id ${cases.motif_membre.join(' ')} END,
      membre_id = CASE souscripteur_id ${cases.membre_id.join(' ')} END,
      validated_membre_at = CASE souscripteur_id ${cases.validated_membre_at.join(' ')} END,
      observation_membre = CASE souscripteur_id ${cases.observation_membre.join(' ')} END
    WHERE souscripteur_id IN (${ids.join(',')})
  `;

  // Execute the query
  mq.query(query, (err, result) => {
    if (err) return callback(err, null);
    return callback(null, result);
  });
}


function insertToComplete(souscripteurId, dossier, callback) {
  const query = `
    INSERT INTO complete (code_souscripteur, dossier)
    VALUES (?, ?)
  `;

  mq.query(query, [souscripteurId, dossier], (err, result) => {
    if (err) return callback(err, null);
    return callback(null, result);
  });
}





function getValidationsBySous(id, callback) {
  let query = `
    SELECT 
      av.decision,
      av.motif,
      av.observation_cadre
    FROM agent_validations av
    WHERE av.souscripteur_id = ?
  `;

  mq.query(query, [id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    return callback(null, results[0]);
  });
}



module.exports = {
 updateValidationDecision,
 insertValidationDecision,
 getValidationsPaginated,
 insertToComplete,
 getValidationsPv,
 getValidationsBySous
 
  };