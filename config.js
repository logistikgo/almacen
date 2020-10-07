
const dotenv = require('dotenv'); //Used for environment variables
dotenv.config();

module.exports = {
	port: process.env.PORT || 8080,
	//TEST
	//db: process.env.MONGODB || process.env.DB_TEST_URL_ACCESS,//TEST 3
	//DEMO
	//db: process.env.MONGODB || process.env.DB_DEMO_URL_ACCESS,//DEMO 
	//PRODUCCION
    db: process.env.MONGODB || process.env.DB_PRODUCTION_URL_ACCESS,//PRODUCCION

}