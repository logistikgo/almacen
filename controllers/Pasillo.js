'use strict'

const Pasillo = require('../models/Pasillo');
const Posicion = require('../controllers/Posicion');
const PosicionModel = require('../models/Posicion');

function get(){

}

function save(almacen_id, pasillo, usuarioAlta_id, usuarioAlta){
	let nPasillo = new Pasillo();

	nPasillo.nombre = pasillo.nombre;
	nPasillo.almacen_id = almacen_id;
	nPasillo.fechaAlta = new Date();
	nPasillo.statusReg = "ACTIVO";
	nPasillo.usuarioAlta_id= usuarioAlta_id;
	nPasillo.usuarioAlta = usuarioAlta;

	let posiciones = pasillo.posiciones;
	let posicionesGuardadas = [];

	nPasillo.save()
	.then(async(data)=>{
		for(let posicion of posiciones){
			let resPosicion = await Posicion.save(data._id, almacen_id, posicion, usuarioAlta_id, usuarioAlta);
			console.log(resPosicion);

			let jPosicion = {
				"posicion_id": resPosicion._id
			}

			posicionesGuardadas.push(jPosicion);
		}
		
		data.posiciones = posicionesGuardadas;
		data.save();
	})
	.catch((err)=>{
		console.log(err);
	});

	
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