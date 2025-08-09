const express = require('express');
const router = express.Router();

const fn = require('../../models/traitement/auth');
const jwt = require('jsonwebtoken');
const {
  verifyAccessType,
  verifyToken,
  verifyAccessType2
} = require('../../middlewares/authmiddleware');

// ✅ Login Route
router.post('/login', async function (req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  fn.AuthenticateUser(username, password, async function (err, user) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: err
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        userRole: user.role,
        userDr: user.dr,
        userName: user.name,
        affectation_recours:user.affectation_recours
      },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );

    // ✅ Get user IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
 console.log("ip ",ip);
    try {
      // ✅ Log last login, mark online, and save session with IP
      await fn.UpdateLastLogin(user.id);
      await fn.CreateSession(user.id, token, ip);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        userId: user.id,
        userRole: user.role,
        userDr: user.dr,
        userName: user.name,
        affectation_recours:user.affectation_recours
        
      });
    } catch (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Error updating login/session info',
        error: updateError
      });
    }
  });
});

// ✅ Logout Route (new)
router.post('/logout', verifyToken, async function (req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  try {
    await fn.UpdateLogout(userId); // Set is_online = 0, update last_logout
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: err
    });
  }
});

// ✅ Get online users or sessions
router.get('/session', verifyToken, function (req, res) {
  fn.getSessions(function (err, sessions) {
    if (err) {
      console.error('Erreur lors de la récupération des sessions:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des sessions',
        error: err.message || err
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sessions récupérées avec succès',
      data: sessions
    });
  });
});


router.get('/sessionDr', verifyToken, function (req, res) {
  const dr = parseInt(req.user.userDr);
  fn.getSessionsByDr(dr,function (err, sessions) {
    if (err) {
      console.error('Erreur lors de la récupération des sessions:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des sessions',
        error: err.message || err
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sessions récupérées avec succès',
      data: sessions
    });
  });
});



// ✅ Insert a new user
router.post('/insert', verifyToken, function (req, res) {

  const affected_by = parseInt(req.user.userId);

  const {
    name,
    email,
    password,
    fonction = '',
    affectation = '',
    role = 'cadre_commercial',
    dr = null,
    affectation_recours = null
 
  } = req.body;
console.log("recours " ,affectation_recours);
  // Validation basique
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nom, email et mot de passe sont requis.'
    });
  }

  const newUser = {
    name,
    email,
    password,
    fonction,
    affectation,
    role,
    dr,
    affectation_recours,
    affected_by
  };

  fn.InsertUser(newUser, (err, insertedUser) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé.'
        });
      }

      console.error('Erreur lors de l’insertion d’un utilisateur :', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur interne lors de l’ajout de l’utilisateur.',
        error: err
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Utilisateur ajouté avec succès.',
      data: insertedUser
    });
  });
});



router.put('/update-affectation-recours/:id', verifyToken, function (req, res) {
  const userId = req.params.id;
  const { affectation_recours } = req.body;

  // Validation de base
  if (!affectation_recours) {
    return res.status(400).json({
      success: false,
      message: 'Le champ "affectation_recours" est requis.'
    });
  }

  fn.UpdateAffectationRecours(userId, affectation_recours, (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour :', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de l’utilisateur.',
        error: err
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Affectation recours mise à jour avec succès.'
    });
  });
});





module.exports = router;
