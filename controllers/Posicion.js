'use strict'

const Posicion = require('../models/Posicion');
var ObjectId = (require('mongoose').Types.ObjectId);

function get(req, res){
	let almacen_id = req.query.idAlmacen;

	Posicion.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
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

}

function save(almacen_id, posicion){
	let nPosicion = new Posicion();

	nPosicion.nombre = posicion.nombre;
	nPosicion.niveles = posicion.niveles;
	nPosicion.estatus = "DISPONIBLE";
	nPosicion.almacen_id = almacen_id;
	nPosicion.fechaAlta = new Date();
	nPosicion.statusReg = "ACTIVO";

	nPosicion.save()
	.catch(err=>console.log(err));
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
	_delete
}