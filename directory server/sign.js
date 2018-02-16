// Sign the "sphinx nodes.json" file. This allows sphinx clients to verify that they have an authentic list of servers.

const CTX = require("milagro-crypto-js");
const base64js = require('base64-js');
const bytesjs = require("bytes.js");
const fs = require("fs");
const Rand = require("sphinx-js").Rand;

const ctx = new CTX("NIST256");
const sha = ctx.ECDH.HASH_TYPE;
const rng = new Rand();
const privKey = base64js.toByteArray("oZpXTxWq+fE+KSS9ZLEdfR15l5DFW3hArhmwBR/W8mQ=");

const pkiPub = JSON.parse(fs.readFileSync("sphinx nodes.json", "utf-8"));
const pkiPub_bytes = bytesjs.fromString(JSON.stringify(pkiPub)); // Remove whitespace

let CS = [];
let DS = [];
let res = ctx.ECDH.ECPSP_DSA(sha, rng, privKey, pkiPub_bytes, CS, DS);

if(res === 0) {
    console.log("Success!");
    let pkiPub_signed = {
        nodes: pkiPub,
        sig: {
            CS: base64js.fromByteArray(CS),
            DS: base64js.fromByteArray(DS)
        }
    };
    fs.writeFileSync("sphinx nodes signed.json", JSON.stringify(pkiPub_signed));
}
else {
    console.log("Error: " + res);
}
