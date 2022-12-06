import AbstractProvider from "./abstract.js"
import ccxt from "ccxt"

export default class CCXT extends AbstractProvider {
	static async requestCandles(request) {
		if (!request.ticker.exchange) return [null, null]

		let ccxtInstance
		if (request.ticker.exchange.id === "binance") {
			ccxtInstance = new ccxt.binance()
			ccxtInstance.proxy = `http://${process.env.PROXY_IP}/`
		} else if (request.ticker.exchange.id === "binanceusdm") {
			ccxtInstance = new ccxt.binanceusdm()
			ccxtInstance.proxy = `http://${process.env.PROXY_IP}/`
		} else if (request.ticker.exchange.id === "binancecoinm") {
			ccxtInstance = new ccxt.binancecoinm()
			ccxtInstance.proxy = `http://${process.env.PROXY_IP}/`
		} else {
			ccxtInstance = new ccxt[request.ticker.exchange.id]()
		}

		let rawData
		try {
			rawData = await ccxtInstance.fetchOHLCV(request.ticker.symbol, "1m", Date.now() - 3 * 60 * 1000)
			if (rawData.length === 0 || !rawData[rawData.length - 1][4] || !rawData[0][1]) return [null, null]
		} catch (err) {
			console.error(err)
			return [null, null]
		}

		let payload = {
			candles: [],
			title: request.ticker.name,
			sourceText: "Data from " + request.ticker.exchange.name,
			platform: "CCXT",
		}

		rawData.forEach((e) => {
			const timestamp = e[0] / 1000
			payload.candles.push([timestamp, e[1], e[2], e[3], e[4]])
		})

		return [payload, null]
	}
}