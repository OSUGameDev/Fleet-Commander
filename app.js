var express = require('express');
var path = require('path');
var app = express();
var port = 8080;

/*****This section if for the home page*****/

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/cover.html'));
});

app.use(express.static('public'));

app.listen(port, function () {
    console.log('== The app start! ==');
    console.log('== The app is listening on port ' + port + ' !');
});
