const {
	Exchange
} = require("ticker-parser");
const {
	AbstractProvider
} = require("./abstract.js");


class CCXT extends AbstractProvider {
	static async request_candles(request) {
		const ticker = request.ticker;
		const exchange = Exchange.from_dict(ticker.exchange);

		if (!exchange) return [{}, ""];

		var rawData;

		try {
			rawData = await exchange.properties.fetchOHLCV(ticker.symbol, "1m", Date.now() - 3 * 60 * 1000)
			if (rawData.length == 0 || !rawData[rawData.length - 1][4] || !rawData[0][1]) return [{}, ""];
		} catch (err) {
			return [{}, ""];
		}

		let payload = {
			candles: [],
			title: ticker.name,
			sourceText: "Data from " + exchange.name,
			platform: "CCXT"
		}

		rawData.forEach(e => {
			const timestamp = e[0] / 1000;
			if (ticker.isReversed) {
				payload.candles.push([timestamp, 1 / e[1], 1 / e[2], 1 / e[3], 1 / e[4]]);
			} else {
				payload.candles.push([timestamp, e[1], e[2], e[3], e[4]]);
			}
		});

		return [payload, ""];
	}
}

module.exports = { CCXT };