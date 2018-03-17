## Sphinx-web

Sphinx-web is a mock mix system to demonstrate the sphinx mix packet format. 

It uses the [`sphinx-js`](https://github.com/momerm/sphinx-js) package which implements the Sphinx mix packet format core cryptographic functions in JavaScript.

At the moment the system consists of three parts.

* *Relay Servers* (mix nodes) which receive and process sphinx packets to pass on to the next node or to the final destination.

* A *Directory Server* that serves a signed list of sphinx nodes and corresponding public keys to clients.

* *Sphinx Client*. A web page that allows users to encode messages to send through the network of mix nodes. 
All encoding is done locally with JavaScript.


## Usage
First install the dependencies and compile the browser code.
````
npm install --dev
grunt
````
Then you can start up the servers.
````
npm start
````
You can access the the sphinx client at `http://127.0.0.1:8080` in your browser.
You can access the test mail server at `http://127.0.0.1:1026` to view the received messages.

## How to run the benchmark
Sphinx-web includes a benchmark to test end to end performance.
The benchmark server is a special node that routes messages back to itself and measures the average time taken. Routing is done through five servers including itself, the final node.

To run the benchmark make sure you have already started the relay servers with `npm start`. Then run
````
npm run benchmark
````