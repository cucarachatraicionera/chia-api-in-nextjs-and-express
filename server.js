const express = require('express');
const bodyParser=require('body-parser');

require("dotenv").config();

const chia = require('./src/controllers/chia');
const auth = require('./src/controllers/auth').router;


const port = process.env.PORT;
const app = express();
  
app.listen(port, function() {
    console.log("Server is listening at port:" + port);
});

// Parses the text as url encoded data
app.use(bodyParser.urlencoded({extended: true}));
 
// Parses the text as json
app.use(bodyParser.json());

app.use('/chia', chia);
app.use('/auth', auth);
