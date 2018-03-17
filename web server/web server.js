const express = require("express");
const cors = require("cors");

if(process.argv.length !== 3) {
    console.log("Usage:");
    console.log('node "web server.js" port');
    process.exit(0);
}
const port = process.argv[2];

const app = express();
app.use(cors());

app.use(function(req, res, next) {
    console.log(`Web Server ${req.method} request for '${req.url}' - ${req.body}`);
    next();
});

app.use(express.static(__dirname + "/../client"));

let server = app.listen(port, function () {
    let host = server.address().address;
    let port = server.address().port;

    console.log("Web server listening at http://%s:%s", host, port);
});
