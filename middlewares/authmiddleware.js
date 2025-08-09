const jwt = require('jsonwebtoken');


function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ success: false, message: 'Token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    req.user = decoded; 
    next();
  });
}


function verifyAccessType(allowedAccessTypes) {
  return (req, res, next) => {
    const { accessType } = req.user; 
    if (allowedAccessTypes.includes(accessType)) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
  };
}


function verifyAccessType2(req, res, next) {
  const { accessType } = req.user; 

  if (accessType >= 0 && accessType <= 2) {
  
    next();
  } else {
    console.log("s bad");
    res.status(403).json({ success: false, message: 'Unauthorized access: Invalid access type' });
  }
}

module.exports = { verifyToken,verifyAccessType,verifyAccessType2};
