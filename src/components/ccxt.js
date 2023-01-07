import { BigQuery } from "@google-cloud/bigquery"

import AbstractProvider from "./abstract.js"
import ccxt from "ccxt"

const client = new BigQuery();

const CCXT_TO_CACHE_MAP = {
	// binance: ["binance", "s"],
	// binanceusdm: ["binance", "f"],
	// binancecoinm: ["binance", "i"],
}

export default class CCXT extends AbstractProvider {
	static async requestCandles(request) {
		if (!request.ticker.exchange) return [null, null]

		const [bqExchangeId, bqMarket] = CCXT_TO_CACHE_MAP[request.ticker.exchange.id]

		if (bqExchangeId && bqMarket) {
			const query = `
				WITH t1 AS (
					SELECT price AS close FROM \`nlc-bot-36685.orderflow.crypto\`
					WHERE symbol="${request.ticker.id}" AND exchange="${bqExchangeId}" AND market="${bqMarket}"
					ORDER BY timestamp DESC LIMIT 1
				), t2 AS (
					SELECT price AS open FROM \`nlc-bot-36685.orderflow.crypto\`
					WHERE symbol="${request.ticker.id}" AND exchange="${bqExchangeId}" AND market="${bqMarket}" AND timestamp > UNIX_MILLIS(CURRENT_TIMESTAMP())-180*1000
					ORDER BY timestamp ASC LIMIT 1
				), t3 AS (
					SELECT MAX(price) AS high, MIN(price) AS low, SUM(qty) AS volume FROM \`nlc-bot-36685.orderflow.crypto\`
					WHERE symbol="${request.ticker.id}" AND exchange="${bqExchangeId}" AND market="${bqMarket}" AND timestamp > UNIX_MILLIS(CURRENT_TIMESTAMP())-180*1000
				)
				SELECT t2.open, t3.high, t3.low, t1.close, t3.volume FROM t1, t2, t3
			`

			const [results] = await client.query(query);

			const openPrice = results[0]["open"]
			const highPrice = results[0]["high"]
			const lowPrice = results[0]["low"]
			const closePrice = results[0]["close"]

			let payload = {
				candles: [[Date.now() / 1000 - 180, openPrice, highPrice, lowPrice, closePrice]],
				title: request.ticker.name,
				sourceText: "Data from " + request.ticker.exchange.name,
				platform: "CCXT",
			}

			return [payload, null]
		} else {
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
}