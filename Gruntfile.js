module.exports = function(grunt) {
    grunt.initConfig({
        browserify: {
            client: {
                src: ["client/js/sphinxclient.js"],
                dest: "client/js/sphinxclient.bundle.js",
                options: {
                    alias: [
                        './node_modules/milagro-crypto-js/src/aes.js:./aes',
                        './node_modules/milagro-crypto-js/src/big.js:./big',
                        './node_modules/milagro-crypto-js/src/ecdh.js:./ecdh',
                        './node_modules/milagro-crypto-js/src/ecp.js:./ecp',
                        './node_modules/milagro-crypto-js/src/ecp2.js:./ecp2',
                        './node_modules/milagro-crypto-js/src/ff.js:./ff',
                        './node_modules/milagro-crypto-js/src/fp.js:./fp',
                        './node_modules/milagro-crypto-js/src/fp2.js:./fp2',
                        './node_modules/milagro-crypto-js/src/fp4.js:./fp4',
                        './node_modules/milagro-crypto-js/src/fp12.js:./fp12',
                        './node_modules/milagro-crypto-js/src/gcm.js:./gcm',
                        './node_modules/milagro-crypto-js/src/hash256.js:./hash256',
                        './node_modules/milagro-crypto-js/src/hash384.js:./hash384',
                        './node_modules/milagro-crypto-js/src/hash512.js:./hash512',
                        './node_modules/milagro-crypto-js/src/mpin.js:./mpin',
                        './node_modules/milagro-crypto-js/src/newhope.js:./newhope',
                        './node_modules/milagro-crypto-js/src/nhs.js:./nhs',
                        './node_modules/milagro-crypto-js/src/pair.js:./pair',
                        './node_modules/milagro-crypto-js/src/rand.js:./rand',
                        './node_modules/milagro-crypto-js/src/rom_curve.js:./rom_curve',
                        './node_modules/milagro-crypto-js/src/rom_field.js:./rom_field',
                        './node_modules/milagro-crypto-js/src/rsa.js:./rsa',
                        './node_modules/milagro-crypto-js/src/sha3.js:./sha3',
                        './node_modules/milagro-crypto-js/src/uint64.js:./uint64'
                    ]
                }
            }
        },
        watch: {
            client: {
                files: ["client/js/sphinxclient.js"],
                tasks: ["browserify"]
            }
        },
        maildev: {
            test: {
                options: {
                    keepAlive: true,
                    open: true,
                    smtp: {
                        port: 1025
                    },
                    http: {
                        port: 1026
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-browserify");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-maildev");

    grunt.registerTask("default", ["browserify"]);
};