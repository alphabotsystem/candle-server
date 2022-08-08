import { Exchange } from "ticker-parser"
import AbstractProvider from "./abstract.js"

export default class CCXT extends AbstractProvider {
	static async requestCandles(request) {
		const ticker = request.ticker
		const exchange = Exchange.fromDict(ticker.exchange)

		if (!exchange) return [null, null]

		let rawData

		try {
			rawData = await exchange.properties.fetchOHLCV(ticker.symbol, "1m", Date.now() - 3 * 60 * 1000)
			if (rawData.length == 0 || !rawData[rawData.length - 1][4] || !rawData[0][1]) return [null, null]
		} catch (err) {
			return [null, null]
		}

		let payload = {
			candles: [],
			title: ticker.name,
			sourceText: "Data from " + exchange.name,
			platform: "CCXT",
		}

		rawData.forEach((e) => {
			const timestamp = e[0] / 1000
			payload.candles.push([timestamp, e[1], e[2], e[3], e[4]])
		})

		return [payload, null]
	}
}