import { Exchange } from "ticker-parser"
import AbstractProvider from "./abstract.js"

export default class IEXC extends AbstractProvider {
	static async requestCandles(request) {
		const ticker = request.ticker
		const exchange = Exchange.fromDict(ticker.exchange)

		let rawData

		try {
			const response = await fetch("https://cloud.iexapis.com/stable/stock/" + ticker.id + "/intraday-prices?chartLast=3&token=" + process.env.IEXC_KEY)
			rawData = await response.json()
			if (rawData.length == 0) return [null, null]
			if (!ticker.quote && exchange) return [null, "Price for `" + ticker.name + "` is not available on " + exchange.name + "."]
		} catch (err) {
			console.error(err)
			return [null, null]
		}

		let payload = {
			candles: [],
			title: ticker.name,
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