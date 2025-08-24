const { pool: mq } = require('../../config/db');
const crypto = require('crypto');

// 🔐 Authenticate user by email and hashed password
function AuthenticateUser(username, password, callback) {
  const query = 'SELECT * FROM users WHERE email = ? AND password = SHA2(?, 256)';
  mq.query(query, [username, password], function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows[0] || null);
  });
}

// ✅ Update last login and set user online
async function UpdateLastLogin(userId) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET last_login = NOW(), is_online = 1 WHERE id = ?`;
    mq.query(query, [userId], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ✅ Update last logout and set user offline
async function UpdateLogout(userId) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET last_logout = NOW(), is_online = 0 WHERE id = ?`;
    mq.query(query, [userId], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function CreateSession(userId, token = null, ip = null) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO user_session (id_user, token, ip_address, datetime)
      VALUES (?, ?, ?, NOW())
    `;
    mq.query(query, [userId, token, ip], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ✅ Get currently online users (with last login and status)

/*
function getSessions(callback) {
  const query = `
    SELECT 
      id, name,affectation,affectation_recours,role,dr, last_login, last_logout, 
      IF(is_online = 1, 'online', 'offline') AS status 
    FROM users 
    ORDER BY last_login DESC
  `;
  mq.query(query, (err, rows) => {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}*/
/*
function getSessions(callback) {
  const query = `
    SELECT 
    u.id, 
    u.name, 
    u.affectation, 
    u.affectation_recours, 
    u.role, 
    u.dr, 
    u.last_login, 
    u.last_logout, 
    IF(u.is_online = 1, 'online', 'offline') AS status,
    COUNT(av.agent_id) AS count_traite
FROM 
    users u
LEFT JOIN 
    agent_validations av ON u.id = av.agent_id 
GROUP BY 
    u.id
ORDER BY 
    u.last_login DESC
  `;
  mq.query(query, (err, rows) => {
    if (err) return callback(err, null);
    callback(null, rows);
  });


}*/


function getSessions(date = null, callback) {
  const queryParams = [];

  const query = `
     SELECT 
    u.id, 
    u.name, 
    u.affectation, 
    u.affectation_recours, 
    u.role, 
    u.dr, 
    u.last_login, 
    u.last_logout, 
    IF(u.is_online = 1, 'online', 'offline') AS status,
    COUNT(av.agent_id) AS count_traite
FROM 
    users u
LEFT JOIN 
    agent_validations av ON u.id = av.agent_id 
      ${date ? "AND DATE(av.validated_at) = ?" : ""}
    GROUP BY
      u.id
    ORDER BY
      u.last_login DESC
  `;

  if (date) queryParams.push(date);

  mq.query(query, queryParams, (err, rows) => {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}







function getSessionsByDr(dr,date = null, callback) {

  const queryParams = [];
  const query = `
   SELECT 
    u.id, 
    u.name, 
    u.affectation, 
    u.affectation_recours, 
    u.role, 
    u.dr, 
    u.last_login, 
    u.last_logout, 
    IF(u.is_online = 1, 'online', 'offline') AS status,
    COUNT(av.agent_id) AS count_traite
FROM 
    users u
LEFT JOIN 
    agent_validations av ON u.id = av.agent_id 
      ${date ? "AND DATE(av.validated_at) = ?" : ""}
WHERE 
    u.dr = ? 
GROUP BY 
    u.id
ORDER BY 
    u.last_login DESC

  `;

  if (date) queryParams.push(date);

  queryParams.push(dr);

  mq.query(query, queryParams, (err, rows) => {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}


// Optional helper: manually set user online
async function SetUserOnline(userId) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET is_online = 1 WHERE id = ?`;
    mq.query(query, [userId], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Optional helper: manually set user offline
async function SetUserOffline(userId) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET is_online = 0 WHERE id = ?`;
    mq.query(query, [userId], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// 🔍 Basic utilities (you already had)
function GetAllUsers(callback) {
  const query = 'SELECT * FROM users';
  mq.query(query, function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}

function GetUserById(id, callback) {
  const query = 'SELECT * FROM users WHERE id = ?';
  mq.query(query, [id], function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows[0]);
  });
}


// ✅ Insert a new user into the database
function InsertUser(user, callback) {
  const {
    name,
    email,
    password,
    fonction,
    affectation,
    role,
    dr,
    affectation_recours,
    affected_by
  } = user;

  const query = `
    INSERT INTO users (
      name, email, password, fonction, affectation, role, dr, created_at, affectation_recours,affected_by
    ) VALUES (?, ?, SHA2(?, 256), ?, ?, ?, ?, NOW(), ? , ?)
  `;

  mq.query(
    query,
    [name, email, password, fonction, affectation, role, dr, affectation_recours,affected_by],
    (err, result) => {
      if (err) return callback(err, null);

      // On retourne l'utilisateur avec son ID généré
      callback(null, { id: result.insertId, ...user });
    }
  );
}

function UpdateAffectationRecours(userId, affectation_recours, callback) {
  const query = `
    UPDATE users
    SET affectation_recours = ?
    WHERE id = ?
  `;

  mq.query(query, [affectation_recours, userId], (err, result) => {
    if (err) return callback(err);

    
    if (result.affectedRows === 0) {
      return callback(new Error('Aucun utilisateur trouvé avec cet ID.'));
    }

    return callback(null, result);
  });
}


function DeleteUncompletedAssignments(agentId) {
  const query = `
    DELETE FROM agent_assignments
    WHERE agent_id = ? AND completed = 0
  `;
  return new Promise((resolve, reject) => {
    mq.query(query, [agentId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}



function UpdatePassword(userId, newPassword, callback) {
  const query = 'UPDATE users SET password = SHA2(?, 256) WHERE id = ?';
  mq.query(query, [newPassword, userId], function (err, result) {
    if (err) return callback(err, null);
    callback(null, result.affectedRows > 0); // Return true if password was updated
  });
}




// ✅ Export all functions
module.exports = {
  AuthenticateUser,
  UpdateLastLogin,
  UpdateLogout,
  CreateSession,
  getSessions,
  GetAllUsers,
  GetUserById,
  SetUserOnline,
  SetUserOffline,
  InsertUser,
  UpdateAffectationRecours,

  DeleteUncompletedAssignments,getSessionsByDr,
  UpdatePassword
};
