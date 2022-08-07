import express from "express"
import { ErrorReporting } from "@google-cloud/error-reporting"

import CCXT from "./components/ccxt.js"
import IEXC from "./components/iexc.js"

const errors = new ErrorReporting()
const app = express()

const request_candle = async (request) => {
	let payload = {},
		candleMessage = "",
		updatedCandleMessage = ""

	try {
		if (platform == "CCXT") {
			[payload, updatedCandleMessage] = await CCXT.request_candles(request)
		} else if (platform == "IEXC") {
			[payload, updatedCandleMessage] = await IEXC.request_candles(request)
		}

		if (Object.keys(payload).length != 0) {
			return [payload, updatedCandleMessage]
		} else if (updatedCandleMessage != "") {
			candleMessage = updatedCandleMessage
		}
	} catch (error) {
		console.error(error)
		if (process.env.PRODUCTION_MODE) errors.report(error)
	}

	return [{}, candleMessage]
}

app.use(express.json())
app.post("/", async (req, res) => {
	const [response, message] = await request_candle(req.body)
	res.send({ response, message })
})

const port = parseInt(process.env.PORT) || 8080
app.listen(port, () => {
	console.log("[Startup]: Candle Server is online")
})
