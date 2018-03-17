const CTX = require("milagro-crypto-js");
const SC = require("sphinx-js").SphinxClient;
const SphinxParams = require("sphinx-js").SphinxParams;
const base64js = require('base64-js');
const bytesjs = require("bytes.js");

const directory_server = "127.0.0.1:8081";
const ctx = new CTX("NIST256");
const sha = ctx.ECDH.HASH_TYPE;
// Key used to verify the pki received from a directory server.
const verKey = base64js.toByteArray("BBryzNoNXwDDfCfPbQ02IhqnRkKYMAtVkdIUDhwZ/OcXIGtoJ87QprV2W/FNdn40q4ccG74iyeOdiF/fzivXhyo=");
let pkiPub = null;

const form = document.querySelector("#form");

form.onsubmit = function (e) {
    e.preventDefault();
};

start();

function start() {
    // Get public keys of nodes
    let req = new XMLHttpRequest();
    req.open("GET", 'http://' + directory_server + '/', true);
    req.send();
    req.onreadystatechange = function () {
        if(this.readyState === this.DONE)  {
            if(this.status === 200) {
                let pkiPub_signed = JSON.parse(req.responseText);
                let res = verify_pkiPub(pkiPub_signed);
                if(res === 0) {
                    pkiPub = pkiPub_signed.nodes;
                    form.onsubmit = function (e) {
                        e.preventDefault();
                        sendmail();
                    };
                }
                else {
                    alert("Failed to validate the list of sphinx nodes. Code " + res);
                    form.onsubmit = function (e) {
                        e.preventDefault();
                        alert("Failed to validate the list of sphinx nodes. Code " + res);
                    };
                }
            }
            else {
                alert("Failed to obtain the list of sphinx nodes " + req.status + " " + req.responseText);
                form.onsubmit = function (e) {
                    e.preventDefault();
                    alert("Failed to obtain the list of sphinx nodes " + req.status + " " + req.responseText);
                };
            }
        }
    };
}

function verify_pkiPub(pkiPub_signed) {
    let CS = base64js.toByteArray(pkiPub_signed.sig.CS);
    let DS = base64js.toByteArray(pkiPub_signed.sig.DS);
    return ctx.ECDH.ECPVP_DSA(sha, verKey, bytesjs.fromString(JSON.stringify(pkiPub_signed.nodes)), CS, DS);
}

function sendmail() {
    // Create MIME encoded message
    let from = form.elements[0].value;
    let to = form.elements[1].value;
    let subject = form.elements[2].value;
    let body = form.elements[3].value;
    let message = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${body}`;
    let message_bytes = bytesjs.fromString(message);

    // Initialise Parameters
    const r = 3; // Number of nodes to use for routing
    const params = new SphinxParams();

    // Create sphinx packet
    let use_nodes = SC.rand_subset(Object.getOwnPropertyNames(pkiPub), r);
    let nodes_routing = use_nodes.map(n => SC.nenc(n));
    let node_keys = use_nodes.map(n => params.ctx.ECP.fromBytes(base64js.toByteArray(pkiPub[n])));
    let dest_bytes = bytesjs.fromString(to);
    let [header, delta] = SC.create_forward_message(params, nodes_routing, node_keys, dest_bytes, message_bytes);
    let packet = SC.pack_message(params, [header, delta]);

    // Send to first node
    let req = new XMLHttpRequest();
    req.open("POST", 'http://' + use_nodes[0] + '/', true);
    req.setRequestHeader("Content-type", "application/octet-stream");
    req.send(packet);
    req.onreadystatechange = function () {
        if(this.readyState === this.DONE) {
            if (this.status === 200) {
                alert("Response: " + req.responseText);
            }
            else {
                alert("Error: " + this.status);
            }
        }
    };

}