const express = require("express");
const cors = require("cors");
const fs = require("fs");

if(process.argv.length !== 3) {
    console.log("Usage:");
    console.log('node "directory server.js" port');
    process.exit(0);
}
const port = process.argv[2];

const pkiPub = JSON.parse(fs.readFileSync("sphinx nodes signed.json", "utf8"));

const app = express();

app.use(function(req, res, next) {
    console.log(`Directory Server ${req.method} request for '${req.url}' - ${req.body}`);
    next();
});

app.use(cors());

app.get('/', function (req, res) {
    res.json(pkiPub);
});

let server = app.listen(port, function () {
    let host = server.address().address;
    let port = server.address().port;

    console.log("Directory server listening at http://%s:%s", host, port);
});