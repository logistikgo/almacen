'use strict'

const Posicion = require('../models/Posicion');
var ObjectId = (require('mongoose').Types.ObjectId);

function get(req, res){
	let almacen_id = req.query.idAlmacen;

	Posicion.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	}).sort({nombre: 1})
	.then((posiciones)=>{
		res.status(200).send(posiciones);
	})
	.catch((error)=>{
		return res.status(500).send({
			message: error
		});
	})
}

function getxPasillo(req, res){
	let pasillo_id = req.query.idPasillo;

	Posicion.find({
		pasillo_id: new ObjectId(pasillo_id),
		statusReg: "ACTIVO"
	}).sort({nombre: 1})
	.populate({
		path:'niveles.productos.producto_id',
		model: 'Producto'
	})
	.then((posiciones)=>{
		res.status(200).send(posiciones);
	})
	.catch((error)=>{
		return res.status(500).send({
			message: error
		});
	})
}

function getById(req, res){
	let idPosicion = req.query.idPosicion;

	Posicion.findOne({_id:idPosicion})
	.populate({
		path:'niveles.productos.producto_id',
		model: 'Producto'
	})
	.then((posicion) => {
		res.status(200).send(posicion);
	})
	.catch((error) => {
		return res.status(500).send({message: error});
	});
}

function getNivel(req, res){
	let idPosicion = req.query.idPosicion;
	let nivel = req.query.nivel;

	Posicion.findOne({_id:idPosicion})
	.populate({
		path:'niveles.productos.producto_id',
		model: 'Producto'
	})
	.then((posicion) => {
		let resNivel = posicion.niveles.find(x=>x.nombre==nivel);
		res.status(200).send(resNivel);
	})
	.catch((error) => {
		return res.status(500).send({message: error});
	});
}

async function save(pasillo_id, almacen_id, posicion, usuarioAlta_id, usuarioAlta){
	let nPosicion = new Posicion();

	nPosicion.nombre = posicion.nombre;
	nPosicion.estatus = "DISPONIBLE";
	nPosicion.almacen_id = almacen_id;
	nPosicion.fechaAlta = new Date();
	nPosicion.statusReg = "ACTIVO";
	nPosicion.usuarioAlta_id= usuarioAlta_id;
	nPosicion.usuarioAlta = usuarioAlta;
	nPosicion.pasillo_id = pasillo_id;

	let niveles = [];
	for(let nivel of posicion.niveles){
		let jNivel = {
			"nombre": nivel,
			"productos":[]
		}
		niveles.push(jNivel);
	}
	nPosicion.niveles = niveles;

	let posicionStored = await nPosicion.save();
	return posicionStored;
}

function update(req, res){

}

function _delete(req, res){

}

module.exports = {
	get,
	getxPasillo,
	getById,
	getNivel,
	save,
	update,
	_delete
}