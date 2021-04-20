
const dotenv = require('dotenv'); //Used for environment variables

//Identificar archivo de variable de entorno
if(process.env.NODE_ENV){
	dotenv.config({
		path: `${__dirname}/.env.${process.env.NODE_ENV}`
	});
}else{
	dotenv.config();
}

let db_config = {
	port: process.env.PORT || 8080,
	database: process.env.DB_URL_ACCESS,
	currentEnv: process.env.NODE_ENV
};

module.exports = db_config