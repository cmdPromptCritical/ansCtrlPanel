const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')

// CONFIGURATION
let arduinoPort = 'COM8'
let baudrate = 9600
let webPort = 8080 // port to access ctrlPanel e.g. http://localhost:8080
// END CONFIGURATION


// INITIALIZAITON
const port = new SerialPort(arduinoPort, {
    baudRate: baudrate
})

let pressure = null; // delete when in production
let detectorHeightsp = null;
let waterLevelsp = null;
let waterLevel = null;
let detectorHeight = null;
let testDist = null; // delete when in production

// END INITIALIZATION


// FUNCTION DEFINITION
// (this might need to be put in a different file in a future update)

// function used to adjust the water level height
let wlSetpoint = sp => {
    console.log('code goes here');
    while (sp < testDist) {

    }
}

// function used to adjust the neutron detector height (low=high, high=low)
function dhChange (dhSetpoint) {
    
    let direction = null;

    // does things to get current state of detector
    if (detectorHeight <= dhSetpoint) {
        port.write('8')
        direction = 'down';
    } else {
        port.write('7')
        direction = 'up';
    }

    // starts movement after ANS has time to prepare 
    // (aka switch motor power connections)
    setTimeout(() => {
        port.write('9')
    }, 250)

    // enters routine to monitor actual v target
    var ctrldh = setInterval(() =>{
        if (direction == 'down') {
            if (detectorHeight > dhSetpoint) {
                clearInterval(ctrldh);
            }
        } else {
            if (detectorHeight < dhSetpoint) {
                clearInterval(ctrldh);
            }
        }
    }, 2000);
}


// END FUNCTION DEFINITION



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
    socket.on('abort', (msg) => {
        // checks abort message from ctrlPanel and determines 
        // which signal to send to ANS
        console.log('alhhhhhhhh')
        for (var i = 0; i < msg.length; i++) {
            port.write(str.charAt(i));
            console.log('abort initiated: ', msg)
        }      
    });
    socket.on('waterSetpoint', (msg) => {
        console.log('waterSetpoint: ', msg);
    });
    socket.on('dhSetpoint', (dhSetpoint) => {
        console.log('dhSetpoint: ' + dhSetpoint);
        dhChange(dhSetpoint);
    });
    
});


// every 2 seconds, push data to the ctrlPanel
setInterval(() => {
    io.emit('level update', pressure); // demo purposes only. not to be used in final version
    io.emit('detectorHeight', detectorHeight);
    io.emit('waterLevel', waterLevel);
}, 2000);

http.listen(webPort, (err) => {
    if (err) {
        console.log('Error: something went wrong setting up http server.')
    } else {
        console.log('HTTP server established! Listening on port ' + webPort)
    }
});

const parser = new Readline()
port.pipe(parser)

// Read data from COM port when available
parser.on('data', (data) => {
    const rPressure = /\d+.\d+ Pa/gm;
    const rDetectorHeight = /ANSC\d+/gm;
    let m;
    let dh;
    let dist; // used for dev only



    // Catch ANSW
    const rNewCycle = /ANSW/gm;
    let nctest = data.match(rNewCycle)

    if (nctest != null) {
        console.log(nctest[0])
    }
    
    // Catch ANSB
    const rWaterLevel = /ANSB\d+/gm;
    let wltest = data.match(rWaterLevel)

    if (wltest != null) {
        console.log(wltest[0])
    }


    // Catch UT distance. used for dev only
    let pattern = /Distance: \d+/gm
    let myarr =  data.match(pattern)
    if (myarr != null) {
        distance = myarr[0].substring(10, myarr[0].length);
        //console.log('distance: ' + distance)
        testDist = distance
        io.emit('level update', testDist)
    } else {

    }
    
});