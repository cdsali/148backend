const express = require('express');
const router = express.Router();
const fn = require('../../models/traitement/agent_assignments');
const fnvalid = require('../../models/traitement/agent_validations');
const { verifyToken, verifyAccessType2 } = require('../../middlewares/authmiddleware');


const regionsData = require('../../config/regions'); 





/*
router.get('/assign_liste', verifyToken, verifyAccessType2, (req, res) => {
  const { accessType, numero_organisation } = req.user;

  //if (accessType === 0) {
    // Fetch all projects
    fn.GetAllEnrepriseIds((err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching projects', error: err });
      }
      res.json({ success: true, data: result });
    });
});*/


router.post('/mark-completed', verifyToken, (req, res) => {
  const agentId = parseInt(req.user.userId);
  const { souscripteurId, decision, motif ,observation} = req.body;

  if (!souscripteurId || !decision || !['valide', 'rejete','complete'].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: 'souscripteurId and valid decision (valide/rejete) are required',
    });
  }

 
  fnvalid.insertValidationDecision(souscripteurId, agentId, decision, motif || '',observation || '', (err1, result1) => {
    if (err1) {
      console.error('Error inserting validation:', err1);
      return res.status(500).json({ success: false, message: 'Database error on validation insert' });
    }

   
    fn.markAssignmentCompleted(agentId, souscripteurId, (err2, result2) => {
      if (err2) {
        console.error('Error marking assignment completed:', err2);
        return res.status(500).json({ success: false, message: 'Database error on assignment update' });
      }

      return res.json({
        success: true,
        message: 'Validation saved and assignment marked as completed',
        validation: result1,
        completion: result2,
      });
    });
  });
});



router.get('/assigned-souscripteurs', verifyToken, async (req, res) => {
  const userRole = req.user.userRole;
  const affectation_recours = req.user.affectation_recours;
  const userId = parseInt(req.user.userId);

  if (userRole !== 'cadre_commercial') {
    return res.status(403).json({
      success: false,
      message: "Vous n'avez pas le droit d'accéder à cette ressource.",
    });
  }

  try {
    // Step 1: Check how many souscripteurs are assigned
    fn.GetassignCountByUser(userId, async (err1, res1) => {
      if (err1) {
        console.error('Error checking assigned count:', err1);
        return res.status(500).json({ error: 'Database error' });
      }

      if (res1[0].count > 0) {
     
        fn.GetassignByUser(userId, (err2, result) => {
          if (err2) {
            console.error('Error fetching assigned souscripteurs:', err2);
            return res.status(500).json({ error: 'Database error' });
          }
          return res.json({ success: true, data: result });
        });
      } else {
        // No assigned souscripteurs → assign new ones
        try {
          const assignResult = await fn.assignNewSouscripteurs(userId,affectation_recours, 10);

          if (assignResult.assigned === 0) {
            return res.json({
              success: true,
              data: [],
              message: "Aucun souscripteur disponible à assigner.",
            });
          }

          //fetch the news assigned 
          fn.GetassignByUser(userId, (err3, result) => {
            if (err3) {
              console.error('Error fetching newly assigned souscripteurs:', err3);
              return res.status(500).json({ error: 'Database error' });
            }
            return res.json({ success: true, data: result });
          });

        } catch (assignErr) {
          console.error('Error during souscripteur assignment:', assignErr);
          return res.status(500).json({ error: 'Error assigning new souscripteurs' });
        }
      }
    });

  } catch (outerErr) {
    console.error('Unexpected error:', outerErr);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});










module.exports = router;