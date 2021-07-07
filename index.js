'use strict'

const mongoose = require('mongoose');
const app = require('./app');
const { initServer } = require('./server');
const {mongoDb, port, currentEnv} = require('./config/env/');

mongoose.set('useFindAndModify', false);

mongoose.connect(mongoDb.createUri(), { useNewUrlParser: true ,useUnifiedTopology: true})
.then((res) => {
	console.log("Mongo connected!");

	app.get('/',(req, res)=>{
		res.send(`API ALMACEN VERSIÓN:${process.env.npm_package_version}`);
	});

	initServer({port, currentEnv});

})
.catch((err) => {
	console.log(err)
});


