// Test that the file we have signed verifies correctly.

const CTX = require("milagro-crypto-js");
const base64js = require('base64-js');
const bytesjs = require("bytes.js");
const fs = require("fs");

const ctx = new CTX("NIST256");
const sha = ctx.ECDH.HASH_TYPE;
const verKey = base64js.toByteArray("BBryzNoNXwDDfCfPbQ02IhqnRkKYMAtVkdIUDhwZ/OcXIGtoJ87QprV2W/FNdn40q4ccG74iyeOdiF/fzivXhyo=");

let pkiPub_signed = JSON.parse(fs.readFileSync('sphinx nodes signed.json', 'utf-8'));
let pkiPub_bytes = bytesjs.fromString(JSON.stringify(pkiPub_signed.nodes));
let sig = pkiPub_signed.sig;
let CS = base64js.toByteArray(sig.CS);
let DS = base64js.toByteArray(sig.DS);

let res = ctx.ECDH.ECPVP_DSA(sha, verKey, pkiPub_bytes, CS, DS);
if(res === 0) {
    console.log("Success!");
}
else {
    console.log("Error: " + res);
}