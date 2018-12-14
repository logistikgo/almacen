'use strict'

const Almacen = require('../models/Almacen');
const Helpers = require('../helpers');
const MovimientoInventario = require('../models/MovimientoInventario');
const Posicion = require('../controllers/Posicion');

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

	Almacen.find({idAlmacen:_idAlmacen, status:"ACTIVO"},(err,almacen)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(almacen);
	});
}

function getById(req,res){
	let _idAlmacen = req.query.idAlmacen;

	Almacen.findOne({_id:_idAlmacen})
	.then((almacen) => {
		res.status(200).send(almacen);
	})
	.catch((error) => {
		return res.status(500).send({
			message: error
		});
	});
}

function getAlmacenesByIDSucursal(req,res){
	let _arrSucursales = req.query.arrSucursales;

	Almacen.find({idSucursal:{$in:_arrSucursales}},(err,almacenes)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(almacenes);
	});
}

function getUbicaciones(req,res){
	let _almacen_id = req.query.almacen_id;
	let _idClienteFiscal = req.query.idClienteFiscal;

	MovimientoInventario.find( {almacen_id:_almacen_id,idClienteFiscal:_idClienteFiscal,posicion: { $ne: null } })
	.populate({
		path:'producto_id'
	})
	.populate({
		path:'posicion_id'
	})
	.then((data)=>{
		let arrPosiciones = data.map((x)=>{
			return ({
				posicion:x.posicion_id.nombre,
				nivel: x.nivel,
				clave:x.producto_id.clave,
				descripcion:x.producto_id.descripcion
			})
		});

		res.status(200).send(arrPosiciones);
	})
	.catch((error)=>{

	});
}

async function saveAlmacen(req,res){
	let nAlmacen = new Almacen();

	nAlmacen.idAlmacen = await getNextID();
	nAlmacen.nombre = req.body.nombre;
	nAlmacen.cp = req.body.cp;
	nAlmacen.colonia = req.body.colonia;
	nAlmacen.calle = req.body.calle;
	nAlmacen.numExt = req.body.numExt;
	nAlmacen.numInt = req.body.numInt;
	nAlmacen.idSucursal = req.body.idSucursal;
	nAlmacen.sucursal_id = req.body.sucursal_id,
	nAlmacen.status = "ACTIVO";

	let posiciones = req.body.posiciones;

	nAlmacen.save()
	.then(async(data)=>{
		for(let posicion of posiciones){
			Posicion.save(data._id, posicion);
		}
		res.status(200).send(data);
	})
	.catch((err)=>{
		console.log(err);
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
	let _almacen = req.params.almacen_id;

	console.log(_posicion);
	console.log(_nivel);

	MovimientoInventario.find({posicion:_posicion,nivel:_nivel,almacen_id:_almacen})
	.then((data)=>{
		console.log(data);
		if(data.length === 0){
			return res.status(200).send(true);
		}
		else
			return res.status(200).send(false);
	})
	.catch((error)=>{
		res.status(500).send(error);
	})
}

module.exports = {
	getAlmacenes,
	getAlmacen,
	getById,
	getAlmacenesByIDSucursal,
	saveAlmacen,
	updateAlmacen,
	deleteAlmacen,
	validaPosicion,
	getUbicaciones
}