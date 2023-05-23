# Bitmovin Player Timestamp Sample

## Server 
### Setup (MacOS / Linux)
1) Install [Go](https://golang.org/doc/install)
2) Clone and compile [repo](https://github.com/AdBoxAlgo/BitMovin.git)
3) Run server with `go run . -a 66.6.225.86:10026 -p nbaxbbtx49 -o out -l 4 -f 60`
4) A folder named `out` will be created with the output segments. 
5) Create a http server to serve the files under `out` folder. To stream locally, the http responses must enable
'Access-Control-Allow-Origin'. This can be done with the attached python script with 
command: `python3 server.py`. By default, the server will run on port 8001.

## Client
### Setup
1) Install [npm](https://www.npmjs.com/get-npm)
2) Enter the `typescript` folder
3) Install packages with `npm ci`
4) Build the sample using `npm run build`
5) Server HTML page via a webserver (for example `python3 -m http.server 8080`)
6) Open the page in a browser (for example `http://localhost:8080/index.html`)
7) Wait for the source to be loaded and the player to start playing