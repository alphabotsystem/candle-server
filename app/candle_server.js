import express from "express"

import CCXT from "./components/ccxt.js"
import IEXC from "./components/iexc.js"

const app = express()

const requestCandles = async (request, platform) => {
	if (platform === "CCXT") {
		return await CCXT.requestCandles(request)
	} else if (platform === "IEXC") {
		return await IEXC.requestCandles(request)
	}
	return [null, null]
}

app.use(express.json())

app.post("/candle", async (req, res) => {
	let finalMessage = null

	for (const platform of req.body.platforms) {
		const [payload, message] = await requestCandles(req.body[platform], platform)
		if (payload !== null) {
			res.send({ response: payload, message: message })
			return
		} else if (typeof message === "string" && !finalMessage) {
			finalMessage = message
		}
	}

	res.send({ response: null, message: finalMessage })
})

app.post("/candle/ccxt", async (req, res) => {
	const [response, message] = await CCXT.requestCandles(req.body)
	res.send({ response, message })
})

app.post("/candle/iexc", async (req, res) => {
	const [response, message] = await IEXC.requestCandles(req.body)
	res.send({ response, message })
})

// const port = parseInt(process.env.PORT) || 8080
const server = app.listen(6900, () => {
	console.log("[Startup]: Candle Server is online")
})

const shutdown = () => {
	server.close(() => {
		console.log("[Shutdown]: Candle Server is offline")
		process.exit(0)
	})
}

process.on("SIGTERM", () => {
	shutdown()
})
