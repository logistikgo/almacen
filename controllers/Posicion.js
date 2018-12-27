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

function getById(req, res){
	let idPosicion = req.query.idPosicion;

	Posicion.findOne({_id:idPosicion})
	.then((posicion) => {
		res.status(200).send(posicion);
	})
	.catch((error) => {
		return res.status(500).send({message: error});
	});
}

function save(almacen_id, posicion, usuarioAlta_id, usuarioAlta){
	let nPosicion = new Posicion();

	nPosicion.nombre = posicion.nombre;
	nPosicion.estatus = "DISPONIBLE";
	nPosicion.almacen_id = almacen_id;
	nPosicion.fechaAlta = new Date();
	nPosicion.statusReg = "ACTIVO";
	nPosicion.usuarioAlta_id= usuarioAlta_id;
	nPosicion.usuarioAlta = usuarioAlta;

	let niveles = [];
	for(let nivel of posicion.niveles){
		let jNivel = {
			"nombre": nivel,
			"productos":[]
		}
		niveles.push(jNivel);
	}
	nPosicion.niveles = niveles;


	nPosicion.save()
	.catch(err=>console.log(err));
}

function getPosicionesByProducto(req, res){
	let producto_id = req.query.producto_id;
	let almacen_id = req.query.almacen_id;

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
	_delete,
	getPosicionesByProducto
}