
const express = require('express');
const router = express.Router();
const sousModel = require('../../models/traitement/souscripteurs');
const dossiermodel = require('../../models/traitement/dossier');
const conjointmodel= require('../../models/traitement/conjoint');
const affiliationsmodel=require('../../models/traitement/affiliations');
const controlemodel=require('../../models/traitement/controle_filieres');
const validationmodel=require('../../models/traitement/agent_validations');

const { verifyToken, verifyAccessType2 } = require('../../middlewares/authmiddleware');
const fs = require('fs');
const path = require('path');
const regionsData = require('../../config/regions'); 


const { PDFDocument } = require('pdf-lib'); 
const fsPromises = require('fs').promises;



const { Readable } = require('stream');
const { LRUCache } = require('lru-cache');
const cache = new LRUCache({
  max: 200,            // up to 200 merged PDFs
  ttl: 1000 * 60 * 60, // 1 hour TTL
});



router.get('/getsousbyid/:sousId', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const sousId = parseInt(req.params.sousId);
const userRole=req.user.userRole;
  if (!sousId || !userId) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const [
      souscripteur,
      dossiers,
      dossiersreviews,
      address,
      conjoint,
      affiliations,
      controle,
      motifs
    ] = await Promise.all([
      sousModel.GetSousById(sousId),
      dossiermodel.GetDossierById(sousId),
     // dossiermodel.GetDossierStateById(sousId, userId),
      
     userRole === 'membre'
        ? dossiermodel.GetDossierStateByIdsous(sousId)
        : dossiermodel.GetDossierStateById(sousId, userId),
     
     sousModel.GetAddressesBySouscripteurId(sousId),
      conjointmodel.GetConById(sousId),
      affiliationsmodel.GetAffiliationById(sousId),
      controlemodel.GetControleById(sousId),
      controlemodel.GetMotifsBysous(sousId)
    ]);

    return res.json({
      souscripteur,
      dossiers,
      dossiersreviews,
      address,
      conjoint,
      affiliations,
      controle,
      motifs
    });

  } catch (err) {
    console.error('Error retrieving souscripteur data:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

//const BASE_UPLOAD_DIR = path.join(__dirname, 'uploads'); 

const BASE_UPLOAD_DIR = 'C:\\uploads';
/*
router.get('/test-doc/:url', (req, res) => {
  
  try {
    console.log("url is ");
    const decodedRelativePath = decodeURIComponent(req.params.url);

    // ✅ Prevent path traversal attacks
    const resolvedPath = path.resolve(BASE_UPLOAD_DIR, decodedRelativePath);
    if (!resolvedPath.startsWith(BASE_UPLOAD_DIR)) {
      console.warn('Blocked unauthorized access attempt:', resolvedPath);
      return res.status(400).json({ error: 'Invalid path' });
    }

    // ✅ Check file existence using stat (also gives us metadata)
    fs.stat(resolvedPath, (err, stats) => {
      if (err || !stats.isFile()) {
        console.error('File not found or inaccessible:', resolvedPath);
        return res.status(404).json({ error: 'File not found' });
      }

      // ✅ Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(resolvedPath)}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // ✅ Stream file (non-blocking, concurrent-friendly)
      const readStream = fs.createReadStream(resolvedPath);

      readStream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        if (!res.headersSent) {
          res.sendStatus(500);
        }
      });

      readStream.pipe(res);
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});*/

function readableFromBuffer(buffer) {
  const stream = new Readable();
  stream._read = () => {}; // no-op
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Utility: safe resolve within base dir
function safeResolve(baseDir, relativePath) {
  const decoded = relativePath;
  const resolved = path.resolve(baseDir, decoded);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Invalid path');
  }
  return resolved;
}

// Merge PDF files given an array of full file paths -> returns Buffer
async function mergePdfsToBuffer(files) {
  const mergedPdf = await PDFDocument.create();
  for (const filePath of files) {
    const bytes = await fs.promises.readFile(filePath);
    const loaded = await PDFDocument.load(bytes);
    const copied = await mergedPdf.copyPages(loaded, loaded.getPageIndices());
    copied.forEach(p => mergedPdf.addPage(p));
  }
  const mergedBytes = await mergedPdf.save();
  return Buffer.from(mergedBytes);
}

// Route: /test-doc/* -> prefix matching + merge matching files in same folder
router.get('/test-doc/*', async (req, res) => {
  try {
    const decodedRelative = decodeURIComponent(req.params[0] || '');
    const resolvedPath = safeResolve(BASE_UPLOAD_DIR, decodedRelative);

    // ensure it points inside base dir
    const folder = path.dirname(resolvedPath);
    const baseFileName = path.basename(resolvedPath);
    const prefix = baseFileName.replace(/\.pdf$/i, '');
    const cacheKey = `${folder}/${prefix}`;

    // Serve from LRU Buffer cache if available
    if (cache.has(cacheKey)) {
      const buffer = cache.get(cacheKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${prefix}_merged.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return readableFromBuffer(buffer).pipe(res);
    }

    // read folder, find matching pdfs starting with prefix
    let filesInFolder;
    try {
      filesInFolder = await fs.promises.readdir(folder);
    } catch (err) {
      console.error('Folder read error:', err);
      return res.status(404).json({ error: 'Folder not found' });
    }

    const matching = [];
    for (const name of filesInFolder) {
      if (!name.toLowerCase().endsWith('.pdf')) continue;
      if (!name.startsWith(prefix)) continue;
      const fp = path.join(folder, name);
      try {
        const st = await fs.promises.stat(fp);
        if (st.isFile()) matching.push({ fullPath: fp, mtime: st.mtime });
      } catch (e) {
        // ignore broken files
      }
    }

    if (matching.length === 0) {
      return res.status(404).json({ error: 'No matching PDF found.' });
    }

    // sort newest first (optional)
    matching.sort((a, b) => b.mtime - a.mtime);

    // merge into buffer
    const filePaths = matching.map(m => m.fullPath);
    const mergedBuffer = await mergePdfsToBuffer(filePaths);

    // cache the Buffer (LRU)
    cache.set(cacheKey, mergedBuffer);

    // optional: persist merged to disk for faster subsequent reads (commented)
    // const outPath = path.join(folder, `${prefix}_merged.pdf`);
    // await fs.promises.writeFile(outPath, mergedBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${prefix}_merged.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return readableFromBuffer(mergedBuffer).pipe(res);

  } catch (err) {
    console.error('PDF merge error:', err);
    if (!res.headersSent) {
      const isInvalidPath = err.message === 'Invalid path';
      return res.status(isInvalidPath ? 400 : 500).json({ error: isInvalidPath ? 'Invalid path' : 'Server error' });
    }
  }
});




router.post('/insert-dossier-review', verifyToken, async (req, res) => {
  const { souscripteurId, dossierType } = req.body;
  const agentId = req.user.userId; // récupéré depuis verifyToken

  if (!souscripteurId || !dossierType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await dossiermodel.insertDossierReview(souscripteurId, agentId, dossierType);
    res.status(201).json({ message: 'Dossier review inserted successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Review already exists for this dossier' });
    }
    console.error('Insert dossier review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



router.post('/examined', verifyToken, async (req, res) => {
  const { souscripteurId, dossierType } = req.body;
  const agentId = req.user.userId;
  console.log('exxx');

  if (!souscripteurId || !dossierType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await dossiermodel.markDossierExamined(souscripteurId, agentId, dossierType);
    res.status(200).json({ message: 'Dossier marked as examined successfully' });
  } catch (err) {
    console.error('Mark dossier as examined error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/conforme', verifyToken, async (req, res) => {
  const { souscripteurId, dossierType } = req.body;
  const agentId = req.user.userId;

  if (!souscripteurId || !dossierType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await dossiermodel.markDossierConforme(souscripteurId, agentId, dossierType);
    res.status(200).json({ message: 'Dossier marked as conforme successfully' });
  } catch (err) {
    console.error('Mark dossier as conforme error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


/* address endpoints   */



router.post('/addresses', verifyToken, async (req, res) => {
  const { souscripteur_id, commune, wilaya, adresse } = req.body;

  const agent_id = req.user.userId;
  if (!souscripteur_id || !commune || wilaya === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newId = await sousModel.InsertAddress({ souscripteur_id, agent_id, commune, wilaya, adresse });
    res.status(201).json({ success: true, id: newId });
  } catch (error) {
    console.error('InsertAddress Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});




router.get('/addresses/:souscripteurId', verifyToken, async (req, res) => {
  const { souscripteurId } = req.params;

  try {
    const addresses = await sousModel.GetAddressesBySouscripteurId(souscripteurId);
    res.json({ success: true, addresses });
  } catch (error) {
    console.error('GetAddresses Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await sousModel.getSouscripteurStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('getSouscripteurStats error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/stats/traite-par-jour', async (req, res) => {
  try {
    const data = await sousModel.getTraitesParJourDerniers10Jours();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});



router.get('/validations', verifyToken, async (req, res) => {

  try {
 if (req.user?.userRole !== 'membre') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const decision = req.query.decision || '';
    const dr = req.user?.userDr;
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = parseInt(req.query.offset || '0', 10);
  console.log(req.user?.userRole,dr );
    if (!decision || isNaN(dr)) {
      return res.status(400).json({ success: false, message: 'decision et dr (entier) requis' });
    }

    const data = await new Promise((resolve, reject) => {
      validationmodel.getValidationsPaginated(decision, dr, limit, offset, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('getValidationsPaginated error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});



router.get('/validationspv', verifyToken, async (req, res) => {
  try {
    if (req.user?.userRole !== 'membre') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const dr = req.user?.userDr;
    
    if (!dr || isNaN(dr)) {
      return res.status(400).json({ success: false, message: 'Champ DR (entier) requis' });
    }

    // Use the new function to get data
    const data = await new Promise((resolve, reject) => {
      validationmodel.getValidationsPv(dr, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('getValidationsPv error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});



router.post('/validations/bulk', verifyToken, async (req, res) => {
  if (req.user?.userRole !== 'membre') {
    return res.status(403).json({ success: false, message: 'Accès refusé' });
  }

  const membreId = req.user?.userId;
  const { decisions } = req.body;

  if (!Array.isArray(decisions) || decisions.length === 0) {
    return res.status(400).json({ success: false, message: 'Aucune décision fournie.' });
  }

  // Prepare data for update
  const formatted = decisions.map(({ souscripteurId, decision, motif,observation }) => ({
    souscripteurId,
    membreId,
    decision,
    motif: motif || null,
    observation: observation || null
  }));

  try {
    await new Promise((resolve, reject) => {
      validationmodel.updateValidationDecision(formatted, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    return res.status(200).json({ success: true, message: 'Décisions mises à jour avec succès.' });
  } catch (error) {
    console.error('Erreur updateValidationDecision:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});



router.post('/insertToComplete', verifyToken, (req, res) => {
  const { souscripteurId, dossier } = req.body;

  if (!souscripteurId || !dossier) {
    return res.status(400).json({ error: 'souscripteurId et dossier sont requis.' });
  }
validationmodel.insertToComplete(souscripteurId, dossier, (err, result) => {
    if (err) {
      console.error('Erreur lors de l’insertion dans complete :', err);
      return res.status(500).json({ error: 'Erreur base de données' });
    }

    res.status(201).json({ message: 'Insertion réussie', data: result });
  });
});




module.exports = router;