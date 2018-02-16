const base64js = require('base64-js');

// Generate a few ECC key pairs
const SphinxParams = require("sphinx-js").SphinxParams;

let params = new SphinxParams();

for(let i = 0; i < 10; i++) {
    let x = params.group.gensecret();
    let y = params.group.expon(params.group.g, x);

    let buffer = [];
    x.toBytes(buffer);
    console.log("private key: " + base64js.fromByteArray(buffer));

    buffer = [];
    y.toBytes(buffer);
    console.log("public key: " + base64js.fromByteArray(buffer) + "\n");
}



