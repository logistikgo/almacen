module.exports = {
	port: process.env.PORT || 8080,
	//TEST
	db: process.env.MONGODB || 'mongodb://admin:R9VdEsuAXRY3@ds018268.mlab.com:18268/logistikgo_test',//TEST 3
	//DEMO
	//db: process.env.MONGODB || 'mongodb://admin:R9VdEsuAXRY3@ds121163.mlab.com:21163/alm_demo',//DEMO
	//PRODUCCION
	//db: process.env.MONGODB || 'mongodb://admin:R9VdEsuAXRY3@ds127843.mlab.com:27843/alm',//PRODUCCION
}