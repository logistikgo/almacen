'use strict'

const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');

mongoose.connect(config.db, { useNewUrlParser: true })
.then((res) => {
	console.log("Mongo connected!");

	app.get('/',(req, res)=>{
		res.send(`API ALMACEN VERSIÓN:${process.env.npm_package_version}`);
	});

	app.listen(config.port, () => {
		console.log(`API ALMACEN JALANDO EN:${config.port}`);
	})
})
.catch((err) => {
	console.log(err)
});


