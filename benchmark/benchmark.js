// Send a series of messages through a fixed path in the network and time how long they take to come back.


const SC = require("sphinx-js").SphinxClient;
const SphinxParams = require("sphinx-js").SphinxParams;
const sphinx_process = require("sphinx-js").SphinxNode.sphinx_process;
const base64js = require('base64-js');
const bytesjs = require("bytes.js");
const assert = require('assert');

const request = require("request");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const params = new SphinxParams();
const ctx = params.ctx;
let params_dict = {};
params_dict[JSON.stringify([params.max_len, params.m])] = params;

const myAddress = "127.0.0.1:8000";
const myPubKey = "BIkbJNvAjL9KpKWkWRanMtZpdO41X3iKB4tdHCEaACWnFrxZrz3OJaYnMDSB1/nH68SPjJqieYTrfhQjLi8fegI=";
const myPrivKey = ctx.BIG.fromBytes(base64js.toByteArray("tGyiM2rl3oMPmHSWE2C2HeYgm5KC/QXmyovIWNPchL8="));

const directory_server = "127.0.0.1:8080";
const sha = ctx.ECDH.HASH_TYPE;
// Key used to verify the pki received from a directory server.
const verKey = base64js.toByteArray("BBryzNoNXwDDfCfPbQ02IhqnRkKYMAtVkdIUDhwZ/OcXIGtoJ87QprV2W/FNdn40q4ccG74iyeOdiF/fzivXhyo=");
let pkiPub = null;

const maxMessageCount = 50;
let messageCount = 0;
let startTime;
let totalTime = 0;

// Receive messages from other nodes. We will not need to forward them since this is the last node.
const app = express();
app.use(bodyParser.raw({type: 'application/octet-stream'}));
app.use(express.static(__dirname + "/../client"));
app.use(cors());
app.post('/', function (req, res) {
    let packet = req.body;
    let [p, [header, delta]] = SC.unpack_message(params_dict, ctx, packet);
    let tag, B, mac_key;
    [tag, B, [header, delta], mac_key] = sphinx_process(p, myPrivKey, header, delta);
    let routing = SC.route_unpack(B);

    if (routing[0] === SC.Relay_flag) {}
    else if (routing[0] === SC.Dest_flag) {
        let [dec_dest, dec_msg] = SC.receive_forward(params, mac_key, delta);
        let destination = bytesjs.toString(dec_dest);
        let message = bytesjs.toString(dec_msg);
        assert(destination === "bob");
        assert(message === "This is a test.");
        console.log("Received message " + messageCount);

        let endTime = Date.now();
        totalTime += endTime - startTime;
        if(messageCount === maxMessageCount) {
            console.log("Average time taken to route a message: " + totalTime/maxMessageCount + " milliseconds");
            process.exit(0);
        }
        else {
            start();
        }
    }
    else if (routing[0] === SC.Surb_flag) {}
    else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end("Bad routing flag");
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("OK");
});

let server = app.listen(8000, function () {
    let host = server.address().address;
    let port = server.address().port;
    console.log("Benchmark node running at http://%s:%s", host, port);
});

// Get list of servers from a directory server
request('http://' + directory_server, function (error, response, body) {
    if(!error && response.statusCode === 200) {
        let pkiPub_signed = JSON.parse(body);
        let res = verify_pkiPub(pkiPub_signed);
        if(res === 0) {
            pkiPub = pkiPub_signed.nodes;
            start();
        }
        else {
           console.log("Failed to validate the list of sphinx nodes. Code " + res);
           process.exit(0);
        }
    }
    else {
        console.log("Failed to get server list.");
        console.log(error);
        console.log("Status " + response.statusCode);
        process.exit(0);
    }
});

function verify_pkiPub(pkiPub_signed) {
    let CS = base64js.toByteArray(pkiPub_signed.sig.CS);
    let DS = base64js.toByteArray(pkiPub_signed.sig.DS);
    return ctx.ECDH.ECPVP_DSA(sha, verKey, bytesjs.fromString(JSON.stringify(pkiPub_signed.nodes)), CS, DS);
}

function start() {
    startTime = Date.now();

    const dest = "bob";
    const message = "This is a test.";
    const message_bytes = bytesjs.fromString(message);
    const dest_bytes = bytesjs.fromString(dest);

    // Create sphinx packet
    let use_nodes = Object.getOwnPropertyNames(pkiPub).slice(0,4);
    let nodes_routing = use_nodes.map(n => SC.nenc(n));
    let node_keys = use_nodes.map(n => params.ctx.ECP.fromBytes(base64js.toByteArray(pkiPub[n])));

    // Add this node as the last
    nodes_routing.push(SC.nenc(myAddress));
    node_keys.push(params.ctx.ECP.fromBytes(base64js.toByteArray(myPubKey)));

    let [header, delta] = SC.create_forward_message(params, nodes_routing, node_keys, dest_bytes, message_bytes);
    let packet = SC.pack_message(params, [header, delta]);

    // Send to first node
    request({
        uri:'http://'+ use_nodes[0],
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
            console.log(error);
            console.log("Status " + response.statusCode);
            process.exit(0);
        }
    });
}