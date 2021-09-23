const zmq = require("zeromq");
const {
	ErrorReporting
} = require('@google-cloud/error-reporting');

const {
	CCXT
} = require("./components/ccxt.js");
const {
	IEXC
} = require("./components/iexc.js");

const errors = new ErrorReporting();


const request_candle = async (request) => {
	var payload = {}, candleMessage = "", updatedCandleMessage = "";

	for (const platform of request.platforms) {
		const currentRequest = request[platform];

		if (platform == "CCXT") {
			[payload, updatedCandleMessage] = await CCXT.request_candles(currentRequest);
		} else if (platform == "IEXC") {
			[payload, updatedCandleMessage] = await IEXC.request_candles(currentRequest);
		}

		if (Object.keys(payload).length != 0) {
			return [JSON.stringify(payload), updatedCandleMessage];
		} else if (updatedCandleMessage != "") {
			candleMessage = updatedCandleMessage;
		}
	}

	return [JSON.stringify({}), candleMessage];
}

const main = async () => {
	console.log("[Startup]: Candle Server is online");

	const sock = new zmq.Router();
	await sock.bind("tcp://*:6900");

	while (true) {
		try {
			var response = [JSON.stringify({}), ""];
			const message = await sock.receive();
			if (message.length != 5) continue;
			const [origin, delimeter, clientId, service, r] = message;
			const request = JSON.parse(r.toString());
			if (parseInt(request.timestamp) + 60 < Date.now() / 1000) {
				console.log("Request received too late");
				continue;
			}

			if (service.toString() == "candle") {
				response = await request_candle(request);
			}

			await sock.send([...[origin, delimeter], ...response]);
		
		} catch (error) {
			console.error(error);
			if (process.env.PRODUCTION_MODE) errors.report(error);
		}
	};
};

main();