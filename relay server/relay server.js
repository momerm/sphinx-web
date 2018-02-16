const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");
const nodemailer = require('nodemailer');

const base64js = require('base64-js');
const bytesjs = require("bytes.js");

const sphinx_process = require("sphinx-js").SphinxNode.sphinx_process;
const SphinxParams = require("sphinx-js").SphinxParams;
const SC = require("sphinx-js").SphinxClient;

if(process.argv.length !== 4) {
    console.log("Usage:");
    console.log('node "relay server.js" port private_key');
    process.exit(0);
}
const port = process.argv[2];

let params = new SphinxParams();
let ctx = params.ctx;
let params_dict = {};
params_dict[JSON.stringify([params.max_len, params.m])] = params;
const private_key = ctx.BIG.fromBytes(base64js.toByteArray(process.argv[3]));

let seen_tags = [];
function seen_tag(tag) {
    // Check if tag is in the list of seen tags
    for(let i = 0; i < seen_tags.length; i++) {
        let j;
        for (j = 0; j < tag.length; j++) {
            if (seen_tags[i][j] !== tag[j]) break;
        }
        if (j === tag.length) return true;
    }
    return false;
}

let transporter = nodemailer.createTransport({
    port: 1025,
    ignoreTLS: true
});

const app = express();
app.use(bodyParser.raw({type: 'application/octet-stream'}));
app.use(express.static(__dirname + "/../client"));
app.use(cors());
app.post('/', function (req, res) {
    let packet = req.body;
    console.log(port + " Received a packet of length " + packet.length);

    let [p, [header, delta]] = SC.unpack_message(params_dict, ctx, packet);
    let tag, B, mac_key;
    [tag, B, [header, delta], mac_key] = sphinx_process(p, private_key, header, delta);
    // If the tag has been seen before, discard the message
    if(seen_tag(tag)) {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end(port + " Message tag already seen.");
        return;
    }
    else {
        seen_tags.push(tag);
    }
    let routing = SC.route_unpack(B);

    if (routing[0] === SC.Relay_flag) {
        let addr = routing[1];
        request({
            method: 'POST',
            uri: 'http://' + addr + '/',
            headers: {'content-type': 'application/octet-stream'},
            body: SC.pack_message(params, [header, delta])
        }, function (error, response, body) {
            if(!error && response.statusCode === 200) {
                console.log(port + " Relayed packet to: " + addr);
            }
            else {
                console.log(port + " Failed to relay packet to " + addr);
            }
        });
    }
    else if (routing[0] === SC.Dest_flag) {
        let [dec_dest, dec_msg] = SC.receive_forward(params, mac_key, delta);
        console.log(port + " Received message");

        let destination = bytesjs.toString(dec_dest);
        let message = bytesjs.toString(dec_msg);
        console.log("To: " + destination);
        console.log(message);

        // Send message to destination
        let mailOptions = {
            envelope: {
                from: 'noreply@sphinxmix.com',
                to: [destination]
            },
            raw: message
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);

        });
    }
    else if (routing[0] === SC.Surb_flag) {
        let dest = routing[1];
        let id = routing[2];
        console.log(port + " Received reply message");
        // Send (id, delta) to destination
    }
    else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(port + " Bad routing flag");
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("OK");
});

let server = app.listen(port, function () {
    let host = server.address().address;
    let port = server.address().port;

    console.log("Sphinx node listening at http://%s:%s", host, port);
});
