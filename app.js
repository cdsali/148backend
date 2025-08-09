var express = require('express');
const path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require("body-parser");
// Import express-rate-limit for rate limiting
const rateLimit = require('express-rate-limit');


require('dotenv').config();

var app = express();

app.use('/documents', express.static(path.join(__dirname, 'uploads')));

var userRouter = require('./routes/traitement/auth'); 
var siteRouter=require('./routes/site');


var assign=require('./routes/traitement/agent_assignments');

var sous=require('./routes/traitement/souscripteurs');



const cors = require('cors');



const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());


app.get('/status', (req, res) => {
  const maintenance = process.env.MAINTENANCE_MODE === 'true'
  res.json({ maintenance })
})


// Define routes
app.use('/user', userRouter);
app.use('/sites',siteRouter);



app.use('/assign',assign);
app.use('/souscripteurs',sous);



app.use(function(req, res, next) {
  res.status(404).json({ error: "Not Found" });
});







// Start the server
app.listen(process.env.PORT || 3602, () => {
  console.log("Server running on port 3600");
});

module.exports = app;
