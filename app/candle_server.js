import express from "express"
import cache from "memory-cache"
import crypto from "crypto"

import CCXT from "./components/ccxt.js"
import IEXC from "./components/iexc.js"

const app = express()

const requestCandles = async (request, platform) => {
	if (platform === "CCXT") {
		return await CCXT.requestCandles(request)
	} else if (platform === "IEXC") {
		return await IEXC.requestCandles(request)
	}
	return [null, ""]
}

app.use(express.json())

app.post("/candle", async (req, res) => {
	let finalMessage = null

	for (const platform of req.body.platforms) {
		const [payload, message] = await requestCandles(req.body[platform], platform)
		if (payload !== null) {
			res.send({ response: payload, message: message })
			return
		} else if (typeof message === "string") {
			finalMessage = message
		}
	}

	res.send({ response: null, message: finalMessage })
})

app.post("/candle/ccxt", async (req, res) => {
	const hash = crypto
		.createHash("md5")
		.update(JSON.stringify(req.body.ticker, Object.keys(req.body.ticker).sort()))
		.digest("hex")
	const cached = cache.get(hash)
	if (cached !== null) {
		res.send(cached)
		return
	}

	const [response, message] = await CCXT.requestCandles(req.body)
	const ttl = 60000 - Date.now() % 60000
	cache.put(hash, { response, message }, ttl)

	res.send({ response, message })
})

app.post("/candle/iexc", async (req, res) => {
	const hash = crypto
		.createHash("md5")
		.update(JSON.stringify(req.body.ticker, Object.keys(req.body.ticker).sort()))
		.digest("hex")
	const cached = cache.get(hash)
	if (cached !== null) {
		res.send(cached)
		return
	}

	const [response, message] = await IEXC.requestCandles(req.body)
	const ttl = 60000 - Date.now() % 60000
	cache.put(hash, { response, message }, ttl)

	res.send({ response, message })
})

const port = parseInt(process.env.PORT) || 8080
const server = app.listen(port, () => {
	console.log("[Startup]: Candle Server is online")
})

process.on("SIGTERM", () => {
	server.close(() => {
		console.log("[Shutdown]: Candle Server is offline")
		process.exit(0)
	})
})
