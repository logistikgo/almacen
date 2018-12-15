'use strict'

const Embalaje = require('../models/Embalaje');


function get(req,res){
	Embalaje.find({status:"ACTIVO"})
	.then((embalajes)=>{
		res.status(200).send(embalajes);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function getById(req,res){
	let _id = req.query.id;
	
	Embalaje.findOne({_id:_id})
	.then((embalaje)=>{
		res.status(200).send(embalaje);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function save(req,res){
	let nEmbalaje = new Embalaje();

	nEmbalaje.clave = req.body.clave;
	nEmbalaje.nombre = req.body.nombre;
	nEmbalaje.descripcion = req.body.descripcion;
	nEmbalaje.fechaAlta = new Date();
	nEmbalaje.usuarioAlta_id = req.body.usuarioAlta_id;
	nEmbalaje.nombreUsuario = req.body.nombreUsuario;
	nEmbalaje.status = "ACTIVO";

	nEmbalaje.save()
	.then((embalajeStored)=>{
		res.status(200).send(embalajeStored);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function update(req,res){
	let _id = req.body.id;
	let _clave = req.body.clave;
	let _nombre = req.body.nombre;
	let _descripcion = req.body.descripcion;
	let _fechaEdita = new Date();
	let _usuarioEdita_id = req.body.usuarioEdita;

	let editQuery = {
		clave:_clave,
		nombre:_nombre,
		descripcion:_descripcion,
		fechaEdita:_fechaEdita,
		usuarioEdita_id:_usuarioEdita_id
	};

	Embalaje.updateOne({_id:_id},{$set:editQuery})
	.then((updated)=>{
		res.status(200).send(updated);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});

}

function _delete(req,res){
	let _id = req.body.id;

	let editQuery = {
		status:"BAJA"
	};

	Embalaje.updateOne({_id:_id},{$set:editQuery})
	.then((deleted)=>{
		res.status(200).send(deleted);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

module.exports = {
	get,
	save,
	getById,
	update,
	_delete
}