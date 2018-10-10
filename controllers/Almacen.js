'use strict'

const Almacen = require('../models/Almacen');
const Helpers = require('../helpers');
const MovimientoInventario = require('../models/MovimientoInventario');


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

function getAlmacenesByIDSucursal(req,res){
	let _idSucursal = req.params.idSucursal;

	Almacen.find({idSucursal:_idSucursal},(err,almacenes)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(almacenes);
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

function validaPosicion(req, res) {
	let _posicion = req.params.posicion;
	let _nivel= req.params.nivel;

	console.log(_posicion);
	console.log(_nivel);

	MovimientoInventario.find({posicion:_posicion,nivel:_nivel})
	.then((data)=>{
		console.log(data);
		if(data.length === 0){
			return res.status(200).send(false);
		}
		else
			return res.status(200).send(true);
	})
	.catch((error)=>{
		res.status(500).send(error);
	})
}

module.exports = {
	getAlmacenes,
	getAlmacen,
	getAlmacenesByIDSucursal,
	saveAlmacen,
	updateAlmacen,
	deleteAlmacen,
	validaPosicion
}