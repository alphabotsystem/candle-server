import { Semaphore } from "async-mutex"
import AbstractProvider, { CandleResponse } from "./abstract.js"

const MAX_REQUESTS = 3
const semaphore = new Semaphore(MAX_REQUESTS)

export default class IEXC extends AbstractProvider {
	static async requestCandles(
		request: any
	): Promise<{
		payload: CandleResponse | null,
		message: string | null
	}> {
		console.warn("IEXC is deprecated")
		if (!request.ticker.exchange) return { payload: null, message: null }

		const [value, release] = await semaphore.acquire()
		const start = Date.now()

		let rawData, response

		try {
			response = await fetch("https://cloud.iexapis.com/stable/stock/" + request.ticker.id + "/intraday-prices?chartLast=3&token=" + process.env.IEXC_KEY)
			rawData = await response.json()
		} catch (err) {
			console.error("Error occurred when fetching candles for", request.ticker.id, "from", request.ticker.exchange.id)
			console.error(err)
			console.error(response)
			release()
			return { payload: null, message: null }
		}

		setTimeout(() => {
			release()
		}, 1100 - (Date.now() - start))

		if (rawData.length == 0) return { payload: null, message: null }
		if (!request.ticker.quote) return { payload: null, message: "Price for `" + request.ticker.name + "` is not available on " + request.ticker.exchange.name + "." }

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

		return { payload, message: null }
	}
}