const dotenv = require('dotenv'); //Used for environment variables

//Identificar archivo de variable de entorno
if(process.env.NODE_ENV){
	dotenv.config({
		path: `${__dirname}/.env.${process.env.NODE_ENV}`
	});
}else{
	dotenv.config();
}

const DEVELOPMENT = require("./development");
const PRODUCTION = require("./production");
const DEMO = require("./demo");
const { NODE_ENV } = process.env;


let currentEnv = DEVELOPMENT;

if(NODE_ENV === "production")
    currentEnv = PRODUCTION;

if(NODE_ENV === "development")
    currentEnv = DEVELOPMENT;

if(NODE_ENV === "demo")
    currentEnv = DEMO;

module.exports = currentEnv;
