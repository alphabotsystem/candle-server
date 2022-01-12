const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))
const { Exchange } = require("ticker-parser")
const { AbstractProvider } = require("./abstract.js")

class IEXC extends AbstractProvider {
	static async request_candles(request) {
		const ticker = request.ticker
		const exchange = Exchange.from_dict(ticker.exchange)

		var rawData

		try {
			const response = await fetch("https://cloud.iexapis.com/stable/stock/" + ticker.id + "/intraday-prices?chartLast=3&token=" + process.env.IEXC_KEY)
			rawData = await response.json()
			if (rawData.length == 0) return [{}, ""]
			if (!ticker.quote && exchange) return [{}, "Price for `" + ticker.name + "` is not available on " + exchange.name + "."]
		} catch (err) {
			return [{}, ""]
		}

		let payload = {
			candles: [],
			title: ticker.name,
			sourceText: "Data provided by IEX Cloud",
			platform: "IEXC",
		}

		rawData.forEach((e) => {
			const timestamp = Date.parse(e.date + " " + e.minute) / 1000

			if (ticker.isReversed) {
				if (e.marketClose) {
					payload["candles"].push([timestamp, 1 / e.marketOpen, 1 / e.marketHigh, 1 / e.marketLow, 1 / e.marketClose])
				} else {
					payload["candles"].push([timestamp, 1 / e.open, 1 / e.high, 1 / e.low, 1 / e.close])
				}
			} else {
				if (e.marketClose) {
					payload["candles"].push([timestamp, e.marketOpen, e.marketHigh, e.marketLow, e.marketClose])
				} else {
					payload["candles"].push([timestamp, e.open, e.high, e.low, e.close])
				}
			}
		})

		return [payload, ""]
	}
}

module.exports = { IEXC }
