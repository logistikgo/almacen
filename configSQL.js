const dotenv = require('dotenv'); //Used for environment variables
dotenv.config();

const config = {
	
	user: process.env.User1, password: process.env.Password1, server: process.env.Server1, //SERVER = PRODUCCION
  	//user: process.env.User2, password: process.env.Password2, server: process.env.Server2, //SERVER = DEBUG

  	//BROKERAGES
    //database: process.env.DatabaseBRO_Demo, //DEMO
    //database: process.env.DatabaseBRO_Produccion, //PRODUCCION
    //database: process.env.DatabaseBRO_Debug, //DEBUG

    //CROSSDOCKS
    database: process.env.DatabaseXD_Demo, //DEMO
    //database: process.env.DatabaseXD_Produccion, //PRODUCCION
    encrypt: true	
};


const configDebug = {
  
  //user: process.env.User1, password: process.env.Password1, server: process.env.Server1, //SERVER = PRODUCCION
    user: process.env.User2, password: process.env.Password2, server: process.env.Server2, //SERVER = DEBUG

    //BROKERAGES
    //database: process.env.DatabaseBRO_Demo, //DEMO
    //database: process.env.DatabaseBRO_Produccion, //PRODUCCION
    //database: process.env.DatabaseBRO_Debug, //DEBUG

    //CROSSDOCKS
    //database: process.env.DatabaseXD_Demo, //DEMO
    //database: process.env.DatabaseXD_Produccion, //PRODUCCION


    //ALMACEN YORK 
    database : process.env.DatabaseALM_Produccion, //PRODUCCION


    encrypt: true 
};



module.exports = config;