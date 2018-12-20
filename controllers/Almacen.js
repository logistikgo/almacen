'use strict'

const Almacen = require('../models/Almacen');
const Helpers = require('../helpers');
const MovimientoInventario = require('../models/MovimientoInventario');
const Posicion = require('../controllers/Posicion');
const PosicionModel = require('../models/Posicion');


async function getNextID(){
	return await Helpers.getNextID(Almacen,"idAlmacen");
}

function getAlmacenes(req,res){

	Almacen.find({statusReg:"ACTIVO"},(err,almacenes)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(almacenes);
	})
}

function getAlmacen(req,res){
	let _idAlmacen = req.params.idAlmacen;

	Almacen.find({idAlmacen:_idAlmacen, statusReg:"ACTIVO"},(err,almacen)=>{
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

function get(req,res){
	let _arrSucursales = req.query.arrSucursales;

	Almacen.find({
		idSucursal:{$in:_arrSucursales},
		statusReg:"ACTIVO"
	},(err,almacenes)=>{
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

async function save(req,res){
	let nAlmacen = new Almacen();
	let params =req.body;

	nAlmacen.nombre = params.nombre;
	nAlmacen.idSucursal = params.idSucursal;
	nAlmacen.sucursal_id = params.sucursal_id,
	nAlmacen.statusReg = "ACTIVO";
	nAlmacen.usuarioAlta= params.usuarioAlta;
	nAlmacen.usuarioAlta_id= params.usuarioAlta_id;
	nAlmacen.fechaAlta= new Date();

	let posiciones = params.posiciones;

	nAlmacen.save()
	.then(async(data)=>{
		for(let posicion of posiciones){

			PosicionModel.findOne({nombre:posicion.nombre, almacen_id:data._id})
			.then((dataPos) => {
				if(!dataPos)
					Posicion.save(data._id, posicion, params.usuarioAlta_id, params.usuarioAlta);
			})
		}
		res.status(200).send(data);
	})
	.catch((err)=>{
		console.log(err);
	});
}

function update(req,res){
	let params = req.body;
	let _idAlmacen = params.idAlmacen;

	Almacen.findOne({_id:_idAlmacen})
	.then((almacen) => {
		almacen.nombre = params.nombre;
		almacen.idSucursal = params.idSucursal;
		almacen.sucursal_id = params.sucursal_id,
		almacen.statusReg = "ACTIVO";
		almacen.usuarioAlta= params.usuarioAlta;
		almacen.usuarioAlta_id= params.usuarioAlta_id;
		almacen.fechaAlta= new Date();

		let posiciones = params.posiciones;

		almacen.save()
		.then(async(data)=>{
			for(let posicion of posiciones){
				PosicionModel.findOne({nombre:posicion.nombre, almacen_id:data._id})
				.then((dataPos) => {
					if(!dataPos){
						console.log(dataPos);
						Posicion.save(data._id, posicion, params.usuarioAlta_id, params.usuarioAlta);
					}
				})
			}

			res.status(200).send(data);
		})
		.catch((err)=>{
			console.log(err);
		});
	})
	.catch((error)=>{
		res.status(500).send(error);
	})
}

function _delete(req,res){
	let almacen_id = req.body.almacen_id;

	let item = {
		statusReg:"BAJA"
	}

	Almacen.updateOne({_id:almacen_id},{$set:item},(err,almacen)=>{
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
	get,
	save,
	update,
	_delete,
	validaPosicion,
	getUbicaciones
}