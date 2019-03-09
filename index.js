var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
const SerialPort = require('serialport')

// CONFIGURATION
let arduinoPort = 'COM6'
let baudrate = 9600
let webPort = 8080 // port to access ctrlPanel e.g. http://localhost:8080
// END CONFIGURATION


// INITIALIZAITON
const port = new SerialPort(arduinoPort, {
    baudRate: baudrate
})

let pressure = 0
// END INITIALIZATION


// viewed at http://localhost:webPort
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));

    //while (pressure !== null) {
        //res.send(pressure)
    //}
});

app.use("/public", express.static(__dirname + "/public"));


// establishes connection with browser
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    socket.on('waterSetpoint', function(msg){
        console.log('waterSetpoint: ', msg);
    });

    
});
  
setInterval(function(){
    io.emit('level update', pressure);
}, 2000);

http.listen(webPort);

// Read data when available, keeps it in "paused mode" (don't know signficance of this atm)
port.on('readable', function () {
    const regex = /\d+.\d+ Pa/gm;
    let m;
    let data = port.read().toString('utf8');
    while ((m = regex.exec(data)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            console.log(`Found match, group ${groupIndex}: ${match}`);
            pressure = match.substring(0, match.length-3);
        });
    }
})