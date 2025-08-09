const mq = require('../config/db.js');


function GetAllSites(callback) {
  const query = `
    SELECT 
      site.id_site,
      site.code_wilaya,
      region.wilaya AS wilaya_name,
      site.surface,
      site.nature,
      site.pv_choix,
      site.pv_document,
      site.arrete,
      site.procedures,
      site.depot,
      site.approbation,
      site.etude,
      site.leve,
      site.observation,
      CDC.name AS cdc_name,
      genie.name AS genie_name
    FROM site
    LEFT JOIN region ON site.code_wilaya = region.codes
    LEFT JOIN CDC ON site.id_cdc = CDC.id_cdc
    LEFT JOIN genie ON site.code_genie = genie.id;
  `;
  mq.query(query, function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows);
  });
}


function GetSiteById(id_site, callback) {
  const query = `
    SELECT 
      site.id_site,
      site.code_wilaya,
      region.wilaya AS wilaya_name,
      site.surface,
      site.nature,
      site.pv_choix,
      site.pv_document,
      site.arrete,
      site.procedure,
      site.depot,
      site.approbation,
      site.etude,
      site.leve,
      site.observation,
      CDC.name AS cdc_name,
      genie.name AS genie_name
    FROM site
    LEFT JOIN region ON site.code_wilaya = region.codes
    LEFT JOIN CDC ON site.id_cdc = CDC.id_cdc
    LEFT JOIN genie ON site.code_genie = genie.id
    WHERE site.id_site = ?;
  `;
  mq.query(query, [id_site], function (err, rows) {
    if (err) return callback(err, null);
    callback(null, rows.length ? rows[0] : null); // Return single site or null
  });
}

// Create a new site
function CreateSite(siteData, callback) {
  const {
    code_wilaya,
    surface,
    nature,
    pv_choix,
    pv_document,
    arrete,
    procedures,
    depot,
    approbation,
    etude,
    leve,
    observation,
    id_cdc,
    code_genie,
    site_name
  } = siteData;

  const query = `
    INSERT INTO site (
      code_wilaya,
      surface,
      nature,
      pv_choix,
      pv_document,
      arrete,
      procedures,
      depot,
      approbation,
      etude,
      leve,
      observation,
      id_cdc,
      code_genie,
      site_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? );
  `;
  mq.query(
    query,
    [
      code_wilaya,
      surface,
      nature,
      pv_choix,
      pv_document,
      arrete,
      procedures,
      depot,
      approbation,
      etude,
      leve,
      observation,
      id_cdc,
      code_genie,
      site_name
    ],
    (err, result) => {
      if (err) return callback(err, null);
      callback(null, result);
    }
  );
}

// Update site by ID
function UpdateSite(id_site, updates, callback) {
  const query = 'UPDATE site SET ? WHERE id_site = ?';

  // Execute the query
  mq.query(query, [updates, id_site], (err, result) => {
    if (err) return callback(err, null);
    callback(null, result);
  });
}

// Delete site by ID
function DeleteSite(id_site, callback) {
  const query = 'DELETE FROM site WHERE id_site = ?';
  mq.query(query, [id_site], function (err, result) {
    if (err) return callback(err, null);
    callback(null, result);
  });
}


// In your backend controller (e.g., siteController.js)

const getSitesWithRegion = (callback) => {
  const query = `
    SELECT 
      site.id_site,
      site.site_name,
      site.surface AS site_surface,
      site.nature,
      site.pv_choix,
      site.pv_document,
      site.arrete,
      site.procedures,
      site.depot,
      site.approbation,
      site.etude,
      site.leve,
      site.observation,
      site.id_cdc,
      site.code_genie,
      region.codes AS region_code,
      region.wilaya,
      region.surface AS region_surface,
      region.capacite_accueil,
      region.programme,
      region.deg
    FROM site
    JOIN region ON site.code_wilaya = region.codes;
  `;

  mq.query(query, (err, result) => {
    if (err) {
      callback(err, null);  // Pass the error to the callback
    } else {
      callback(null, result);  // Pass the result to the callback
    }
  });
};

const getSitesWithRegionId = (id,callback) => {
  const query = `
    SELECT 
      site.id_site,
      site.site_name,
      site.surface AS site_surface,
      site.nature,
      site.pv_choix,
      site.pv_document,
      site.arrete,
      site.procedures,
      site.depot,
      site.approbation,
      site.etude,
      site.leve,
      site.observation,
      site.id_cdc,
      site.code_genie,
      region.codes AS region_code,
      region.wilaya,
      region.surface AS region_surface,
      region.capacite_accueil,
      region.programme,
      region.deg
    FROM site
    JOIN region ON site.code_wilaya = region.codes and region.codes= ?;
  `;

  mq.query(query,[id], (err, result) => {
    if (err) {
      callback(err, null);  
    } else {
      callback(null, result); 
    }
  });
};


function getDashboardStats(callback) {
  const query = `
    SELECT 
      (SELECT count(id_candidature) FROM candidature2) AS totalCandidatures,
      (SELECT SUM(n_logts) FROM projet where flag_annule=0) AS totalCapacity,
      (SELECT COUNT(*) FROM (SELECT DISTINCT nom, prenom, daten FROM rh2) AS unique_combinations) AS totalRegions,
      (SELECT COUNT(*) FROM projet where flag_annule=0) AS totalProjets,

      
    (SELECT COUNT(distinct AGR) FROM groupement_stat) AS countbet,

(SELECT COUNT(DISTINCT AGR) FROM groupement_stat WHERE LENGTH(AGR) > 6) AS sumbureauxet,

(SELECT COUNT(DISTINCT AGR) 
FROM groupement_stat 
WHERE LENGTH(AGR) <= 6) AS sumbureauxpr,


( SELECT COUNT(distinct AGR) as countbet FROM groupement_stat g JOIN preselection ps ON g.candidat_id = ps.id_candidature where status_pr=0) AS countbetpreselection,

(SELECT COUNT(distinct AGR) as countbet FROM groupement_stat g JOIN prequalifie ps ON g.candidat_id = ps.id_candidature where status_pr=0) AS countbetprequalifie,

(SELECT COUNT(distinct AGR) as countbet FROM groupement_stat g JOIN finance ps ON g.candidat_id = ps.id_candidature where status_pr=0) AS countbetretenu,




       (SELECT count(id_candidature) FROM preselection where status_pr=0) AS countpreselection,
       (SELECT count(id_candidature) FROM prequalifie where status_pr=0) AS countprequalifie,
        (SELECT count(id_candidature) FROM finance where status_pr=0 ) AS countretenu,

    (SELECT count(id_candidature) FROM finance where status_pr=1 ) AS countattr,



        (SELECT SUM(totalLogts)
        FROM (
            SELECT p.n_logts AS totalLogts
            FROM preselection ps
            JOIN projet p ON ps.projectId = p.n_p
            WHERE ps.status_pr = 0
            GROUP BY p.n_p
        ) AS subquery
        ) AS sumlogtspreselction,
         (SELECT SUM(totalLogts)
         FROM (
             SELECT p.n_logts AS totalLogts
             FROM prequalifie ps
             JOIN projet p ON ps.projectId = p.n_p
             WHERE ps.status_pr = 0
             GROUP BY p.n_p
         ) AS subquery
         ) AS sumlogtsprequalifie,

          (SELECT SUM(totalLogts)
          FROM (
              SELECT p.n_logts AS totalLogts
              FROM finance ps
              JOIN projet p ON ps.projectId = p.n_p
              
              GROUP BY p.n_p
          ) AS subquery) AS sumlogtsretenu
          

  `;

  mq.query(query, function (err, result) {
    if (err) return callback(err, null);
    callback(null, result[0]); 
  });
}



module.exports = {
  GetAllSites,
  GetSiteById,
  CreateSite,
  UpdateSite,
  DeleteSite,
  getSitesWithRegion,
  getSitesWithRegionId,

  getDashboardStats
};