import express from "express"

import CCXT from "./components/ccxt.js"
import IEXC from "./components/iexc.js"

const app = express()

const verification = (req, res, next) => {
	if (req.headers["authorization"] === process.env.INTERNAL_SERVICES_KEY) {
		next()
	} else {
		res.status(401).send({ message: "Unauthorized" })
	}
}

const request_candle = async (request, platform) => {
	if (platform == "CCXT") {
		return await CCXT.request_candles(request)
	} else if (platform == "IEXC") {
		return await IEXC.request_candles(request)
	}
	return [{}, ""]
}

app.use(express.json())
app.use(verification)

app.post("/", async (req, res) => {
	let finalMessage = ""

	for (const platform of request.platforms) {
		const [payload, message] = await request_candle(req.body[platform], platform)
		if (Object.keys(payload).length != 0) {
			res.send({ response: payload, message: message })
			return
		} else if (message != "") {
			finalMessage = message
		}
	}

	res.send({ response: {}, message: finalMessage })
})

app.post("/ccxt", async (req, res) => {
	const [response, message] = await CCXT.request_candles(req.body)
	res.send({ response, message })
})

app.post("/iexc", async (req, res) => {
	const [response, message] = await IEXC.request_candles(req.body)
	res.send({ response, message })
})

const port = parseInt(process.env.PORT) || 8080
app.listen(port, () => {
	console.log("[Startup]: Candle Server is online")
})
