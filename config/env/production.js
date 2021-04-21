let uriDb = process.env.DB_URL_ACCESS_PROD;

module.exports = {
    port: process.env.PORT || 8080,
	currentEnv: process.env.NODE_ENV,
	mongoDb: {
		user: process.env.DB_USER_MONGO_PROD,
		password: process.env.DB_PASSWORD_MONGO_PROD,
		dbName: process.env.DB_DB_NAME_MONGO_PROD,
		createUri: function () {
			return uriDb.replace("user", this.user)
						.replace("password", this.password)
						.replace("dbname", this.dbName);
			}
		},
	mssql: {
		user: process.env.User1, 
		password: process.env.Password1, 
		server: process.env.Server1, //SERVER = PRODUCCION
  	//user: process.env.User2, password: process.env.Password2, server: process.env.Server2, //SERVER = DEBUG

  	//BROKERAGES
    //database: process.env.DatabaseBRO_Demo, //DEMO
    //database: process.env.DatabaseBRO_Produccion, //PRODUCCION
    //database: process.env.DatabaseBRO_Debug, //DEBUG

    //CROSSDOCKS
    database: process.env.DatabaseXD_Demo, //DEMO
    //database: process.env.DatabaseXD_Produccion, //PRODUCCION
    encrypt: true	
	}

}