'use strict'
const Productos = require('../models/Producto');

function get(req, res) {
	
	Productos.find({}, (error,producto) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);
	});

}

function getByIDClienteFiscal(req, res) {
	let _idClienteFiscal = req.params.idClienteFiscal;

	console.log(_idClienteFiscal);

	Productos.find({idClienteFiscal:_idClienteFiscal}, (error,producto) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);
	});

}

module.exports = {
	get,
	getByIDClienteFiscal
}