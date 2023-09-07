import { HttpsProxyAgent } from "https-proxy-agent"
import ccxt, { binance, binanceusdm, binancecoinm, Exchange, NetworkError } from "ccxt"
import { BigQuery } from "@google-cloud/bigquery"

import AbstractProvider, { CandleResponse } from "./abstract.js"

const client = new BigQuery();

const CCXT_TO_CACHE_MAP: { [exchange: string]: string[] } = {
	// binance: ["binance", "s"],
	// binanceusdm: ["binance", "f"],
	// binancecoinm: ["binance", "i"],
}

export default class CCXT extends AbstractProvider {
	static async requestCandles(
		request: any,
		depth: number | undefined = 1
	): Promise<{
		payload: CandleResponse | null,
		message: string | null
	}> {
		if (!request.ticker.exchange) return { payload: null, message: null }

		const [bqExchangeId, bqMarket] = CCXT_TO_CACHE_MAP[request.ticker.exchange.id] ?? [undefined, undefined]

		if (bqExchangeId && bqMarket) {
			const query = `
				WITH t1 AS (
					SELECT close FROM \`nlc-bot-36685.orderflow.crypto\`
					WHERE symbol="${request.ticker.id}" AND exchange="${bqExchangeId}" AND market="${bqMarket}"
					ORDER BY timestamp DESC LIMIT 1
				), t2 AS (
					SELECT open FROM \`nlc-bot-36685.orderflow.crypto\`
					WHERE symbol="${request.ticker.id}" AND exchange="${bqExchangeId}" AND market="${bqMarket}" AND timestamp > UNIX_MILLIS(CURRENT_TIMESTAMP())-180*1000
					ORDER BY timestamp ASC LIMIT 1
				), t3 AS (
					SELECT MAX(high) AS high, MIN(low) AS low, SUM(volume) AS volume FROM \`nlc-bot-36685.orderflow.crypto\`
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

			return { payload, message: null }
		} else {
			let ccxtInstance

			const url = new URL(`http://${process.env.PROXY_AUTH}@${process.env.PROXY_IP}`)
			if (request.ticker.exchange.id === "binance") {
				let agent = new HttpsProxyAgent(url)
				ccxtInstance = new binance({ agent })
			} else if (request.ticker.exchange.id === "binanceusdm") {
				let agent = new HttpsProxyAgent(url)
				ccxtInstance = new binanceusdm({ agent })
			} else if (request.ticker.exchange.id === "binancecoinm") {
				let agent = new HttpsProxyAgent(url)
				ccxtInstance = new binancecoinm({ agent })
			} else {
				ccxtInstance = new (ccxt as any)[request.ticker.exchange.id]() as Exchange
			}

			let rawData

			try {
				rawData = await ccxtInstance.fetchOHLCV(request.ticker.symbol, "1m", Date.now() - 3 * 60 * 1000)
				if (rawData.length === 0 || !rawData[rawData.length - 1][4] || !rawData[0][1]) return { payload: null, message: null }
			} catch (err) {
				if (err instanceof NetworkError) {
					console.warn(`Network error occurred when fetching candles for ${request.ticker.symbol} from ${request.ticker.exchange.id}`)
					await new Promise(resolve => setTimeout(resolve, 500))
					if (depth > 3) return { payload: null, message: null }
					return await CCXT.requestCandles(request, depth + 1)
				} else {
					console.error(`Error occurred when fetching candles for ${request.ticker.symbol} from ${request.ticker.exchange.id}`)
					console.error(err)
					return { payload: null, message: null }
				}
			}

			let payload: CandleResponse = {
				candles: rawData.map((e: number[]) => [e[0] / 1000, e[1], e[2], e[3], e[4]]),
				title: request.ticker.name,
				sourceText: "Data from " + request.ticker.exchange.name,
				platform: "CCXT",
			}

			return { payload, message: null }
		}
	}
}