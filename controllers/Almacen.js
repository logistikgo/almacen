'use strict'

const Almacen = require('../models/Almacen');
const Helpers = require('../helpers');


async function getNextID(){
	return await Helpers.getNextID(Almacen,"idAlmacen");
}

function getAlmacenes(req,res){

	Almacen.find({status:"ACTIVO"},(err,almacenes)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(almacenes);
	})
}

function getAlmacen(req,res){
	let _idAlmacen = req.params.idAlmacen;

	Almacen.find({idAlmacen:_idAlmacen},(err,almacen)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(almacen);
	});
}

async function saveAlmacen(req,res){
	let nAlmacen = new Almacen();

	nAlmacen.idAlmacen = await getNextID();
	nAlmacen.nombre = req.body.nombre;
	nAlmacen.idSucursal = req.body.idSucursal;
	nAlmacen.status = "ACTIVO";

	nAlmacen.save((err,almacenStored)=>{
		if(err)
			return res.status(500).send({message:`Error al guardar${error}`});
		res.status(200).send(almacenStored);
	});
}

function updateAlmacen(req,res){
	let _idAlmacen = req.body.idAlmacen;

	let item = {
		nombre:req.body.nombre,
		idSucursal:req.body.idSucursal
	}

	Almacen.updateOne({idAlmacen:_idAlmacen},{$set:item},(err,almacen)=>{
		if(err)
			return res.status(500).send({message:"Error al editar"});
		res.status(200).send(almacen);

	});
}

function deleteAlmacen(req,res){
	let _idAlmacen = req.body.idAlmacen;

	let item = {
		status:"BAJA"
	}

	Almacen.updateOne({idAlmacen:_idAlmacen},{$set:item},(err,almacen)=>{
		if(err)
			return res.status(500).send({message:"Error al eliminar"});
		res.status(200).send(almacen);
	});
}


module.exports = {
	getAlmacenes,
	getAlmacen,
	saveAlmacen,
	updateAlmacen,
	deleteAlmacen
}