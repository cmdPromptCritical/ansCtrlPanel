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

// function used to adjust the neutron detector height (low=high, high=low)
function dhChange (dhSetpoint) {
    
    let direction = null;
    // checks if dhSetpoint is an integer, then updates gobal variable
    if (Number.isInteger(dhSetpoint) == false) {
        dhSetpoint = parseInt(dhSetpoint)
    }
    detectorHeightsp = dhSetpoint

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
                port.write('A')

            }
        } else {
            if (detectorHeight < dhSetpoint) {
                clearInterval(ctrldh);
                port.write('A')
            }
        }
    }, 200);
}
// function used to adjust the neutron detector height (low=high, high=low)
function wlChange (wlSetpoint) {
    
    let direction = null;
    // checks if dhSetpoint is an integer, then updates gobal variable
    if (Number.isInteger(wlSetpoint) == false) {
        wlSetpoint = parseInt(wlSetpoint)
    }
    waterLevelsp = wlSetpoint

    // does things to get current state of water level
    if (waterLevel <= wlSetpoint) {
        port.write('2')
        port.write('3')
        direction = 'down';
    } else {
        port.write('4')
        port.write('1')
        direction = 'up';
    }

    // starts movement after ANS has time to prepare 
    // (aka switch motor power connections)
    setTimeout(() => {
        port.write('5')
    }, 250)

    // enters routine to monitor actual v target
    var ctrlwlh = setInterval(() =>{
        if (direction == 'down') {
            if (waterLevel > wlSetpoint) {
                clearInterval(ctrlwlh);
                port.write('6')

            }
        } else {
            if (waterLevel < wlSetpoint) {
                clearInterval(ctrlwlh);
                port.write('6')
            }
        }
    }, 200);
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
        for (var i = 0; i < msg.length; i++) {
            port.write(msg.charAt(i));
        }
        console.log('#### ANS HALTED ####')
    });

    socket.on('wlsetpoint', (msg) => {
        console.log('wlsetpoint: ', msg);
        if (msg == '') {

        } else {
            wlChange(msg)
        }
    });

    socket.on('dhSetpoint', (dhSetpoint) => {
        console.log('dhSetpoint: ' + dhSetpoint);
        dhChange(dhSetpoint);
    });
    
});


// every 2 seconds, push data to the ctrlPanel
setInterval(() => {
    io.emit('level update', pressure); // demo purposes only. not to be used in final version
    io.emit('dhupdate', detectorHeight);
    io.emit('dhspupdate', detectorHeightsp);
    io.emit('wlupdate', waterLevel);
    io.emit('wlspupdate', waterLevelsp);
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
    let dist; // used for dev only



    // Catch ANSW
    const rNewCycle = /ANSW/gm;
    let nctest = data.match(rNewCycle)

    if (nctest != null) {
        console.log(nctest[0])
        io.emit('watchdog', true)
    }
    
    // Catch ANSB
    const rWaterLevel = /ANSB\d+/gm;
    let wltest = data.match(rWaterLevel)

    if (wltest != null) {
        waterLevel = parseInt(wltest[0].substring(4,wltest[0].length))
        console.log('water level: ', waterLevel)
    }

    // Catch ANSC
    const rDetectorHeight = /ANSC\d+/gm;
    let dhtest = data.match(rDetectorHeight)

    if (dhtest != null) {
        detectorHeight = parseInt(dhtest[0].substring(4,dhtest[0].length))
        console.log('detector height: ', detectorHeight)
    }
    
});