'use strict'

const mongoose = require('mongoose');
const app = require('./app');
const {database, port, currentEnv} = require('./config');

mongoose.connect(database, { useNewUrlParser: true ,useUnifiedTopology: true})
.then((res) => {
	console.log("Mongo connected!");

	app.get('/',(req, res)=>{
		res.send(`API ALMACEN VERSIÓN:${process.env.npm_package_version}`);
	});

	app.listen(port, () => {
		console.log(`API ALMACEN JALANDO EN:${port}`);
		console.log(`API FUNCIONANDO EN EL PUERTO: ${port} EN EL AMBIENTE DE: ${currentEnv}`)
	});
})
.catch((err) => {
	console.log(err)
});


