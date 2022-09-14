import AbstractProvider from "./abstract.js"

export default class IEXC extends AbstractProvider {
	static async requestCandles(request) {
		if (!request.ticker.exchange) return [null, null]

		let rawData

		try {
			const response = await fetch("https://cloud.iexapis.com/stable/stock/" + request.ticker.id + "/intraday-prices?chartLast=3&token=" + process.env.IEXC_KEY)
			rawData = await response.json()
			if (rawData.length == 0) return [null, null]
			if (!request.ticker.quote) return [null, "Price for `" + request.ticker.name + "` is not available on " + request.ticker.exchange.name + "."]
		} catch (err) {
			console.error(err)
			return [null, null]
		}

		let payload = {
			candles: [],
			title: request.ticker.name,
			sourceText: "Data provided by IEX Cloud",
			platform: "IEXC",
		}

		rawData.forEach((e) => {
			const timestamp = Date.parse(e.date + " " + e.minute) / 1000

			if (e.marketClose) {
				payload["candles"].push([timestamp, e.marketOpen, e.marketHigh, e.marketLow, e.marketClose])
			} else if (e.close) {
				payload["candles"].push([timestamp, e.open, e.high, e.low, e.close])
			}
		})

		return [payload, null]
	}
}