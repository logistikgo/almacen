'use strict'

const Presentacion = require('../models/Presentacion');

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
	let idPresentacion = req.query.idPresentacion;

	Presentacion.findOne({_id:idPresentacion})
	.then((presentacion) => {
		res.status(200).send(presentacion);
	})
	.catch((error) => {
		return res.status(500).send({message: error});
	});
}

async function save(req, res){
	let nPresentacion = new Presentacion();
	let params = req.body;

	nPresentacion.nombre = params.nombre;
	nPresentacion.descripcion = params.descripcion;
	nPresentacion.usuarioAlta = params.usuarioAlta;
	nPresentacion.usuarioAlta_id = params.usuarioAlta_id;
	nPresentacion.fechaAlta = new Date();
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
	let params = req.body;
	let idPresentacion = params.idPresentacion;

	Presentacion.findOne({_id:idPresentacion})
	.then((presentacion) => {
		presentacion.nombre = params.nombre;
		presentacion.descripcion = params.descripcion;
		presentacion.usuarioAlta = params.usuarioAlta;
		presentacion.usuarioAlta_id = params.usuarioAlta_id;
		presentacion.fechaAlta = new Date();

		presentacion.save()
		.then(()=>{
			res.status(200).send(presentacion);
		})
		.catch((error)=>{
			res.status(500).send(error);
		})
	})
	.catch((error)=>{
		res.status(500).send(error);
	})
}

function _delete(req, res){
	let idPresentacion = req.body.idPresentacion;

	Presentacion.findOne({_id:idPresentacion})
	.then((presentacion) => {
		presentacion.statusReg = "BAJA";
		presentacion.save()
		.then(()=>{
			res.status(200).send(presentacion);
		})
	})
	.catch((error)=>{
		res.status(500).send(error);
	})
}

module.exports = {
	get,
	getById,
	save,
	update,
	_delete
}