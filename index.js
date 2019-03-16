const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const SerialPort = require('serialport')

// CONFIGURATION
let arduinoPort = 'COM7'
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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// allows content in the folder "public" to be shared via http
app.use("/public", express.static(__dirname + "/public"));


// establishes connection with browser to transfer live data
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('waterSetpoint', (msg) => {
        console.log('waterSetpoint: ', msg);
    });

    
});
  
setInterval(() => {
    io.emit('level update', pressure);
}, 2000);

http.listen(webPort, (err) => {
    if (err) {
        console.log('Error: something went wrong setting up http server.')
    } else {
        console.log('HTTP server established! Listening on port ' + webPort)
    }
});

// Read data when available, keeps it in "paused mode" (don't know signficance of this atm)
port.on('readable', () => {
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
});

let setpoint = waterlevel => {
    console.log('code goes here');
}