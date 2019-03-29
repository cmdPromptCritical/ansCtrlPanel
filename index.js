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

// function used to adjust the neutron detector height
let dhChange = dhSetpoint => {
    
    let direction = null;

    // does things to get current state of detector
    if (detectorHeight >= dhSetpoint) {
        port.write('7')
        direction = 'down';
    } else {
        port.write('8')
        direction = 'up';
    }

    // starts movement after ANS has time to prepare 
    // (aka switch motor power connections)
    setTimeout(() => {
        port.write('9')
    }, 500)

    // enters routine to monitor actual v target
    var ctrldh = setInterval(() =>{
        if (direction == 'down') {
            if (detectorHeight < dhSetpoint) {
                clearInterval(ctrldh);
            }
        } else {
            if (detectorHeight > dhSetpoint) {
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
    
});
io.on('abort', (msg) => {
    // checks abort message from ctrlPanel and determines 
    // which signal to send to ANS
    for (var i = 0; i < str.length; i++) {
        port.write(str.charAt(i));
      }      
});

io.on('waterSetpoint', (msg) => {
    console.log('waterSetpoint: ', msg);
});
io.on('dhSetpoint', (dhSetpoint) => {
    console.log('dhSetpoint: ' + dhSetpoint);
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

// Read data from COM port when available
port.on('readable', () => {
    const rPressure = /\d+.\d+ Pa/gm;
    const rNewCycle = /ANSW/gm;
    const rWaterLevel = /ANSB\d+/gm;
    const rDetectorHeight = /ANSC\d+/gm;

    let m;
    let nc;
    let wl;
    let dh;
    let dist; // used for dev only

    let data = port.read().toString('utf8');
    while ((m = rPressure.exec(data)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === rPressure.lastIndex) {
            rPressure.lastIndex++;
        }
        
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            console.log(`Found match, group ${groupIndex}: ${match}`);
            pressure = match.substring(0, match.length-3);
        });
    };

    // Catch ANSW
    while ((nc = rNewCycle.exec(data)) !== null) {
        if (nc.index === rNewCycle.lastIndex) {
            rNewCycle.lastIndex++;
        };

        nc.forEach((match, groupIndex) => {
            console.log('ANSW');
            io.emit('watchdog', 1);``
        });
    };
    
    // Catch ANSB
    while (wl = rWaterLevel.exec(data) !== null) {
        if (wl.index === rWaterLevel.lastIndex) {
            rWaterLevel.lastIndex++;
        };

        wl.forEach((match, groupIndex) => {
            console.log(`Found waterLevel, group ${groupIndex}: ${match}`);
            waterLevel = match.substring(4, match.length);
        });        
    };

    // Catch UT distance. used for dev only
    let pattern = /Distance: \d+/gm
    let myarr =  data.match(pattern)
    if (myarr[0] != '') {
        distance = myarr[0].substring(10, myarr[0].length);
        console.log('distance: ' + distance)
        testDist = distance
    } else {

    }
    
});