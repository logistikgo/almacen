let uriDb = process.env.DB_URL_ACCESS_DEMO;

module.exports = {
    port: process.env.PORT || 8080,
	currentEnv: process.env.NODE_ENV,
	mongoDb: {
		user: process.env.DB_USER_MONGO_DEMO,
		password: process.env.DB_PASSWORD_MONGO_DEMO,
		dbName: process.env.DB_DB_NAME_MONGO_DEMO,
		createUri: function () {
			return uriDb.replace("user", this.user)
						.replace("password", this.password)
						.replace("dbname", this.dbName);
		}
	},
	mssql: {
		user: process.env.User1, password: process.env.Password1, server: process.env.Server1, //SERVER = PRODUCCION
    //CROSSDOCKS
    	database: process.env.DatabaseXD_Demo, //DEMO
    //database: process.env.DatabaseXD_Produccion, //PRODUCCION
    	encrypt: true	
	}
}