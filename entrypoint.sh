source /run/secrets/alpha-service/key
if [[ $PRODUCTION_MODE == "1" ]]
then
	node app/candle_server.js
else
	node app/candle_server.js
fi