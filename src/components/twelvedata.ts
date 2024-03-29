import AbstractProvider, { CandleResponse } from "./abstract.js"

export default class Twelvedata extends AbstractProvider {
	static async requestCandles(
		request: any
	): Promise<{
		payload: CandleResponse | null,
		message: string | null
	}> {
		if (!request.ticker.exchange) return { payload: null, message: null }

		let rawData, response

		try {
			response = await fetch(`https://api.twelvedata.com/time_series?apikey=${process.env.TWELVEDATA_KEY}&interval=1min&type=${encodeURIComponent(request.ticker.metadata.type)}&symbol=${request.ticker.symbol}&exchange=${encodeURIComponent(request.ticker.exchange.name)}&timezone=utc&outputsize=3`)
			rawData = await response.json()
			if (!rawData.values || rawData.values.length == 0) return { payload: null, message: null }
			if (!request.ticker.quote) return { payload: null, message: "Price for `" + request.ticker.name + "` is not available on " + request.ticker.exchange.name + "." }
		} catch (err) {
			console.error("Error occurred when fetching candles for", request.ticker.symbol, "from", request.ticker.exchange.name)
			console.error(err)
			console.error(rawData)
			console.error(response)
			return { payload: null, message: null }
		}

		let payload: CandleResponse = {
			candles: [],
			title: request.ticker.name,
			sourceText: "Data provided by Twelve Data",
			platform: "Twelvedata",
		}

		rawData.values.forEach((e: any) => {
			const timestamp = Date.parse(e.datetime) / 1000
			payload["candles"].push([timestamp, parseFloat(e.open), parseFloat(e.high), parseFloat(e.low), parseFloat(e.close)])
		})

		return { payload, message: null }
	}
}