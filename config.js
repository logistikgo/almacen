module.exports = {
	port: process.env.PORT || 8080,
	db: process.env.MONGODB || 'mongodb://admin:R9VdEsuAXRY3@ds018268.mlab.com:18268/logistikgo_test',//TEST
	// db: process.env.MONGODB || 'mongodb://admin:R9VdEsuAXRY3@ds121163.mlab.com:21163/alm_demo',//DEMO
	//db: process.env.MONGODB || `mongodb://logistikgo:7qcviPCAzXqhWYg4eaTwKlD5gme0oVavey3QjXZtx75XOc5t8ODNHkPbgFL6tIqIZFZRIvUNNW9fgxSDlDyByg%3D%3D@logistikgo.documents.azure.com:10255/logistikgo_alm?ssl=true&replicaSet=globaldb`,//PRODUCCION	  
}