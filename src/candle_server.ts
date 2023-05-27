import express from "express"

import CCXT from "./components/ccxt.js"
import Twelvedata from "./components/twelvedata.js"

const app = express()

const requestCandles = async (request: any, platform: string) => {
	if (platform === "CCXT") {
		return await CCXT.requestCandles(request)
	} else if (platform === "Twelvedata") {
		return await Twelvedata.requestCandles(request)
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

app.post("/candle/twelvedata", async (req, res) => {
	const [response, message] = await Twelvedata.requestCandles(req.body)
	res.send({ response, message })
})

// Remove after September 1st 2023
app.post("/candle/iexc", async (req, res) => {
	const [response, message] = await Twelvedata.requestCandles(req.body)
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
