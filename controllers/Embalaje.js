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

	let nEmbalaje = new Embalaje(req.body);

	nEmbalaje.fechaAlta = new Date();
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

	req.body.fechaEdita = new Date();
	
	Embalaje.updateOne({_id:_id},{$set:req.body})
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