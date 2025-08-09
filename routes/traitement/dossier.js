const express = require('express');
const router = express.Router();
const fn = require('../../models/traitement/souscripteurs');
const { verifyToken, verifyAccessType2 } = require('../../middlewares/authmiddleware');


const regionsData = require('../../config/regions'); 







router.get('/getsousbyid/:sousId', verifyToken, (req, res) => {
  const userRole = req.user.userRole; 
  const sousId = parseInt(req.params.sousId); 
 console.log(sousId);
 

 
  fn.GetSousById(sousId, (err, result) => {
    if (err) {
      console.error('Error retrieving assigned souscripteurs:', err);
      return res.status(500).json({ error: 'Database error' });
    }
 console.log(result);
    res.json(result);
  });
});






module.exports = router;