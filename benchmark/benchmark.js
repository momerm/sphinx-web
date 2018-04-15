const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");

const base64js = require('base64-js');
const bytesjs = require("bytes.js");
const assert = require('assert');

const sphinx_process = require("sphinx-js").SphinxNode.sphinx_process;
const SphinxParams = require("sphinx-js").SphinxParams;
const SC = require("sphinx-js").SphinxClient;

const p = new SphinxParams();
const ctx = p.ctx;
const params_dict = {};
params_dict[JSON.stringify([p.max_len, p.m])] = p;

const myAddress = "127.0.0.1:8000";
const myPubKey =  ctx.ECP.fromBytes(base64js.toByteArray("BIkbJNvAjL9KpKWkWRanMtZpdO41X3iKB4tdHCEaACWnFrxZrz3OJaYnMDSB1/nH68SPjJqieYTrfhQjLi8fegI="));
const myPrivKey = ctx.BIG.fromBytes(base64js.toByteArray("tGyiM2rl3oMPmHSWE2C2HeYgm5KC/QXmyovIWNPchL8="));

const maxMessageCount = 50;
const nHops = 5; // Maximum 5
const endToEnd = false; // Include time to encode the messages

let messageCount = 0;
let startTime;
let endTime;
let totalTime = 0;

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

const app = express();
app.use(bodyParser.raw({type: 'application/octet-stream', limit: '2mb'}));
app.use(cors());
app.post('/', function (req, res) {
    let packet = req.body;
    //console.log(port + " Received a packet of length " + packet.length);

    let params, header, delta, tag, B, mac_key;
    try {
        [params, [header, delta]] = SC.unpack_message(params_dict, ctx, packet);
        [tag, B, [header, delta], mac_key] = sphinx_process(params, myPrivKey, header, delta);
    } catch(err) {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end(err);
        return;
    }

    // If the tag has been seen before, discard the message
    if(seen_tag(tag)) {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end("Message tag already seen.");
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
              //  console.log(port + " Relayed packet to: " + addr);
            }
            else {
                console.log("Failed to relay packet to " + addr);
                console.log(body);
            }
        });
    }
    else if (routing[0] === SC.Dest_flag) {
        let [dec_dest, dec_msg] = SC.receive_forward(params, mac_key, delta);
        let destination = bytesjs.toString(dec_dest);
        let message = bytesjs.toString(dec_msg);
        assert(destination === "bob");
        assert(message === "This is a test.");
        endTime = Date.now();

        totalTime += endTime - startTime;
        if(messageCount === maxMessageCount) {
            console.log("Average time taken to route a message: " + totalTime/maxMessageCount + " milliseconds");
            process.exit(0);
        }
        else {
            start();
        }
    }
    else if (routing[0] === SC.Surb_flag) {
        let dest = routing[1];
        let id = routing[2];
        console.log("Received reply message");
        // Send (id, delta) to destination
    }
    else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end("Unrecognised routing flag " + routing[0]);
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("OK");
});

let server = app.listen(8000, function () {
    let host = server.address().address;
    let port = server.address().port;

    console.log("Sphinx node listening at http://%s:%s", host, port);
});

function start() {
    if(endToEnd) startTime = Date.now();
    const dest = "bob";
    const message = "This is a test.";
    const message_bytes = bytesjs.fromString(message);
    const dest_bytes = bytesjs.fromString(dest);

    // Create sphinx packet
    let nodes_routing = Array(nHops).fill(SC.nenc(myAddress));
    let node_keys = Array(nHops).fill(myPubKey);

    let [header, delta] = SC.create_forward_message(p, nodes_routing, node_keys, dest_bytes, message_bytes);
    let packet = SC.pack_message(p, [header, delta]);

    // Send to first node
    if(!endToEnd) startTime = Date.now();
    request({
        uri:'http://'+ myAddress,
        method: "POST",
        headers : {"Content-type" : "application/octet-stream"},
        body: packet
    }, function (error, response, body) {
        if(!error && response.statusCode === 200) {
            messageCount++;
            console.log("Sent message " + messageCount);
        }
        else {
            console.log("Failed to send message " + messageCount);
            console.log(body);
            console.log("Status " + response.statusCode);
            process.exit(0);
        }
    });
}

start();