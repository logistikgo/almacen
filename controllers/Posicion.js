'use strict'

const Posicion = require('../models/Posicion');

function get(req, res){

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
	.then((sucursal)=>{
		res.status(200).send({sucursal});
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