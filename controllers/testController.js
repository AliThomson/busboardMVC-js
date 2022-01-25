const Test = require('../models/Test');
const fetch = require("node-fetch");
const BusArrivals = require("../models/BusArrivals");
const winston = require("winston");
const logger = winston.createLogger({
transports: [
new winston.transports.Console(),
   new winston.transports.File({ filename: 'combined.log' })
]
    });

exports.getTestData = (req, res) => {
	let data = [
		new Test('Test name', 12),
		new Test('Second name', 13)
	];
	res.render('testView', {
		data : data,
	});
};

exports.getSecondTestData = (req, res) => {
	let data = [
		new Test('other name', 15),
		new Test('other second name', 16)
	];
	res.render('testView', {
		data : data,
	});
};

exports.getBusArrivals = async (req, res) => {

function isValidPostcode(inputPC) { 
    let postcodeRegEx = /[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}/i; 
    return postcodeRegEx.test(inputPC); 
}

let inpPostCode = "";
// for now hardcode postcode
inpPostCode = "W13 9DE"
while (isValidPostcode(inpPostCode) === false) {
    try {

    inpPostCode = readlineSync.question("Please input your post code: ");
    if (isValidPostcode(inpPostCode) === false) {
        throw "Sorry, the postcode you have entered is invalid - please try again";
        }
    }
    catch (err) {
        inpPostCode = "";
        logger.error(err);

    }
}

const pcResponse = await fetch("https://api.postcodes.io/postcodes/" + encodeURI(inpPostCode));
const coords = await pcResponse.json();

let busStopRadius = 500;
let numberOfStops = 0;
let busStops = {};

while (numberOfStops === 0) {
    try {
        const bsResponse = await fetch("https://api.tfl.gov.uk/StopPoint/?lat=" + coords.result.latitude + "&lon=" + coords.result.longitude + "&stopTypes=NaptanPublicBusCoachTram&radius=" + busStopRadius)
        busStops = await bsResponse.json(); 

        numberOfStops = busStops.stopPoints.length;
        
        if(numberOfStops < 2) {
            throw "Your search returned less than 2 bus stops. Widening search area...";
        }
    }
    catch (err) {
        numberOfStops = 0;
        busStopRadius = busStopRadius + 500;
        if (busStopRadius > 4000) {
            logger.error("Sorry, your postcode did not return any buses");
        } else {
            logger.info(err);
        }

    }
}

const firstTwoStops = busStops.stopPoints.slice(0,2);

for (let i=0; i<=1; i++) {

    let arrivalsResponse = await fetch("https://api.tfl.gov.uk/StopPoint/" + firstTwoStops[i].naptanId + "/Arrivals");
    let arrivals = await arrivalsResponse.json();

    
    
    try {
        if (arrivals != "") {
                    
            arrivals.sort(function(a, b) {
                    return a.timeToStation - (b.timeToStation);
                });
			

            let firstFiveArrivals = arrivals.slice(0,5);
			console.log("firstFiveArrivals = " + firstFiveArrivals)
			
            //FIX NEEDED HERE
			const busArrivals = firstFiveArrivals.map(
				bus => new BusArrivals(
					bus.stationName,
					bus.lineName,
					bus.destinationName,
					bus.timeToStation/60
				)
			);
	            console.log("Bus no. " + bus.lineName + " to " + bus.destinationName + " is arriving at " + bus.expectedArrival.substring(11,16));
        } else {
            throw "Sorry, no buses scheduled to arrive";
        }
    }
    catch (err) {
        logger.error(err);
    }

	res.render('busArrivalsView', {
		data: busArrivals,
	});
};
}
/* 
	
	for (let bus of firstFiveArrivals) {
				bus => new BusArrivals(
					bus.stationName,
					bus.lineName,
					bus.destinationName,
					bus.timeToStation/60
				);
	BusArrivals.commonName = firstTwoStops[i].commonName); */