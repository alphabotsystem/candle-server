import { Semaphore } from "async-mutex"
import AbstractProvider, { CandleResponse } from "./abstract.js"

const MAX_REQUESTS = 3
const semaphore = new Semaphore(MAX_REQUESTS)

export default class IEXC extends AbstractProvider {
	static async requestCandles(request: any) {
		if (!request.ticker.exchange) return [null, null]
		// console.log("Fetching candles for", request.ticker.id, "from", request.ticker.exchange.id)

		const [value, release] = await semaphore.acquire()
		const start = Date.now()
		// console.log(`Request ${value}/${MAX_REQUESTS}`)

		let rawData, response

		try {
			response = await fetch("https://cloud.iexapis.com/stable/stock/" + request.ticker.id + "/intraday-prices?chartLast=3&token=" + process.env.IEXC_KEY)
			rawData = await response.json()
		} catch (err) {
			console.error("Error occurred when fetching candles for", request.ticker.id, "from", request.ticker.exchange.id)
			console.error(err)
			console.error(response)
			release()
			return [null, null]
		}

		setTimeout(() => {
			release()
		}, 1100 - (Date.now() - start))

		if (rawData.length == 0) return [null, null]
		if (!request.ticker.quote) return [null, "Price for `" + request.ticker.name + "` is not available on " + request.ticker.exchange.name + "."]

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