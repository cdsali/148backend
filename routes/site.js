const express = require('express');
const router = express.Router();
const fn = require('../models/sitem');
const { verifyToken, verifyAccessType, verifyAccessType2 } = require('../middlewares/authmiddleware');

router.get('/sites', verifyToken, verifyAccessType([1, 2]), (req, res) => {
  fn.GetAllSites((err, sites) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching sites', error: err });
    }
    res.json({ success: true, data: sites });
  });
});


router.get('/site/:id', verifyToken, verifyAccessType([1, 2]), (req, res) => {
  const { id } = req.params;
  fn.GetSiteById(id, (err, site) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching sitee', error: err });
    }
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }
    res.json({ success: true, data: site });
  });
});


router.post('/addSite', verifyToken, verifyAccessType2, (req, res) => {
  const { accessType } = req.user;
  const siteData = req.body;


  if (!siteData.code_wilaya || !siteData.surface || !siteData.nature) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }


  if (accessType !== 0 && accessType !== siteData.code_wilaya) {
    return res.status(403).json({ success: false, message: 'Unauthorized access' });
  }


  fn.CreateSite(siteData, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error creating site', error: err });
    }
    res.status(201).json({ success: true, message: 'Site created successfully', siteId: result.insertId });
  });
});



router.put('/site/:id', verifyToken, verifyAccessType([1]), (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  fn.UpdateSite(id, updates, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error updating site', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Site not found or no changes made' });
    }
    res.json({ success: true, message: 'Site updated successfully' });
  });
});


router.delete('/site/:id', verifyToken, verifyAccessType([1]), (req, res) => {
  const { id } = req.params;

  fn.DeleteSite(id, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting site', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }
    res.json({ success: true, message: 'Site deleted successfully' });
  });
});



/*
router.get('/sitesr', verifyToken, verifyAccessType([1, 2]), (req, res) => {
  fn.getSitesWithRegion((err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching site data with region', error: err });
    }
    res.json({ success: true, data: result });
  });
});*/

router.get('/sitesr', verifyToken,verifyAccessType2, (req, res) => {
  const { accessType } = req.user;

  if (accessType === 0) {

    fn.getSitesWithRegion((err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching all site data with region', error: err });
      }
      res.json({ success: true, data: result });
    });
  } else  {
   
    fn.getSitesWithRegionId(accessType, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching site data with IID', error: err });
      }
      res.json({ success: true, data: result });
    });
  } 
});



router.get('/sitesrId/:id', verifyToken,verifyAccessType2, (req, res) => {
  const { id } = req.params;
  const { accessType } = req.user;

  if (accessType === 0 || accessType== id) {
  
   
    
    fn.getSitesWithRegionId(id, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching site data with IID', error: err });
      }
      res.json({ success: true, data: result });
    });
  } 
});





router.get("/stats", (req, res) => {
  /*fn.getDashboardStats((err, stats) => {
    if (err) {
      console.error("Error fetching stats:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json(stats);
  });*/
});


module.exports = router;