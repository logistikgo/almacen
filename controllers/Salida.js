'use strict'

const Salida = require('../models/Salida');

function get(req,res) {
	Salida.find({})
	.then((salidas)=>{
		res.status(200).send(salidas);
	})
	.catch(error=>console.log(error));
}

function getByID(req,res) {

}

function save(req,res) {

}

module.exports = {
	get, 
	getByID,
	save
}