import AbstractProvider, { CandleResponse } from "./abstract.js"

export default class IEXC extends AbstractProvider {
	static async requestCandles(request: any) {
		if (!request.ticker.exchange) return [null, null]
		console.log("Fetching candles for", request.ticker.id, "from", request.ticker.exchange.id)

		let rawData

		try {
			rawData = await fetch("https://cloud.iexapis.com/stable/stock/" + request.ticker.id + "/intraday-prices?chartLast=3&token=" + process.env.IEXC_KEY).then((res) => res.json())
			if (rawData.length == 0) return [null, null]
			if (!request.ticker.quote) return [null, "Price for `" + request.ticker.name + "` is not available on " + request.ticker.exchange.name + "."]
		} catch (err) {
			console.error("Error occurred when fetching candles for", request.ticker.id, "from", request.ticker.exchange.id)
			console.error(err)
			return [null, null]
		}

		let payload: CandleResponse = {
			candles: [],
			title: request.ticker.name,
			sourceText: "Data provided by IEX Cloud",
			platform: "IEXC",
		}

		rawData.forEach((e: any) => {
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