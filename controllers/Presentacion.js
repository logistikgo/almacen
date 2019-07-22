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

	req.body.fechaAlta = new Date();
	req.body.statusReg = "ACTIVO";

	let nPresentacion = new Presentacion(req.body);

	nPresentacion.save()
	.then((presentacion)=>{
		res.status(200).send(presentacion);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function update(req, res){
	
	let idPresentacion = req.body.idPresentacion;
	req.body.fechaEdita = new Date();

	Presentacion.updateOne({_id:idPresentacion},{$set:req.body})
	.then((presentacion)=>{
		res.status(200).send(presentacion);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function _delete(req, res){
	let idPresentacion = req.body.idPresentacion;

	Presentacion.updateOne({_id:idPresentacion},{$set:{statusReg:"BAJA"}})
	.then((presentacion)=>{
		res.status(200).send(presentacion);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
	
}

module.exports = {
	get,
	getById,
	save,
	update,
	_delete
}