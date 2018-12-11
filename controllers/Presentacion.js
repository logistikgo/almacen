'use strict'

const Presentacion = require('../models/Presentacion');
const Helpers = require('../helpers');

function get(req, res) {
	
	Presentacion.find({statusReg:"ACTIVO"})
	.then((presentaciones) => {
		res.status(200).send(presentaciones);
	})
	.catch((error) => {
		return res.status(500).send({message: error});
	});
}

function getById(req, res) {

}

async function save(req, res){
	let nPresentacion = new Presentacion();
	let params = req.body;

	nPresentacion.nombre = params.nombre;
	nPresentacion.descripcion = params.descripcion;
	nPresentacion.idUsuario = params.idUsuario;
	nPresentacion.nombreUsuario = params.nombreUsuario;
	nPresentacion.fechaAlta = new Date();;
	nPresentacion.statusReg = "ACTIVO";

	nPresentacion.save()
	.then((presentacion)=>{
		res.status(200).send(presentacion);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function update(req, res){

}

function _delete(req, res){

}

module.exports = {
	get,
	getById,
    save,
    update,
    _delete
}