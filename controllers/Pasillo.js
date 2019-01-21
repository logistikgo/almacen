'use strict'

const Pasillo = require('../models/Pasillo');

function get(){

}

function save(almacen_id, pasillo, usuarioAlta_id, usuarioAlta){
	let nPasillo = new Pasillo();
	console.log(pasillo);

	nPasillo.nombre = pasillo.nombre;
	nPasillo.almacen_id = almacen_id;
	nPasillo.fechaAlta = new Date();
	nPasillo.statusReg = "ACTIVO";
	nPasillo.usuarioAlta_id= usuarioAlta_id;
	nPasillo.usuarioAlta = usuarioAlta;

	let posiciones = [];
	for(let posicion of pasillo.posiciones){
		let jPosicion = {
			"posicion_id": posicion
		}
		posiciones.push(jPosicion);
	}
	nPasillo.posiciones = posiciones;
	console.log(nPasillo);
	
	nPasillo.save()
	.catch(err=>console.log(err));
}

function update(){

}

function _delete(){

}

module.exports = {
	get,
	save,
	update,
	_delete
}