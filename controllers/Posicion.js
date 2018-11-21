'use strict'

const Posicion = require('../models/Posicion');

function get(req, res){
	let almacen_id = req.query.almacen_id;

	Posicion.find({
		almacen_id: almacen_id,
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

async function save(req, res){
	let nPosicion = new Posicion();
	let params = req.body;

	nPosicion.nombre = params.nombre;
	nPosicion.niveles = params.niveles;
	nPosicion.estatus = "DISPONIBLE";
	nPosicion.almacen_id = params.almacen_id;
	nPosicion.fechaAlta = new Date();
	nPosicion.usuario_id = params.usuario_id;
	nPosicion.statusReg = "ACTIVO";

	nPosicion.save()
	.then((posicion)=>{
		res.status(200).send({posicion});
	})
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