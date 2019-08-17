'use strict'

const Pasillo = require('../models/Pasillo');
const Posicion = require('../controllers/Posicion');
const PosicionModel = require('../models/Posicion');
var ObjectId = (require('mongoose').Types.ObjectId);

function get(req, res){
	let almacen_id = req.query.idAlmacen;

	Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	}).sort({nombre: 1})
	.populate({
		path:'posiciones.posicion_id'
	})
	.then((pasillos)=>{
		res.status(200).send(pasillos);
	})
	.catch((error)=>{
		return res.status(500).send({
			message: error
		});
	});
}

function getById(req, res){
	let psillo_id = req.query.idPasillo;

	Pasillo.findOne({_id:psillo_id})
	.then(async (pasillo)=>{
		
		res.status(200).send(pasillo);
	})
	.catch((error)=>{
		return res.status(500).send({
			message: error
		});
	})
}

//Posiciones x Pasillo
function getPosiciones(req, res){
	let almacen_id = req.query.idAlmacen;

	Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	})
	.populate({
		path:'posiciones.posicion_id'
	})
	.then((data)=>{
		let posiciones = [];

		for(let pasillo of data){
			for(let pos of pasillo.posiciones){
				let posicion = pos.posicion_id;
				for(let nivel of posicion.niveles){
					let posicionNomenclatura = {
						nombre: pasillo.nombre + nivel.nombre + posicion.nombre,
						pasillo_id: posicion.pasillo_id._id,
						posicion_id: posicion._id,
						nivel: nivel.nombre
					};

					posiciones.push(posicionNomenclatura);
				}
			}
		}

		res.status(200).send(posiciones);
	})
	.catch((error)=>{
		return res.status(500).send({
			message: error
		});
	})
}

function save(almacen_id, pasillo, usuarioAlta_id, usuarioAlta){
	let nPasillo = new Pasillo();

	nPasillo.nombre = pasillo.nombre;
	nPasillo.almacen_id = almacen_id;
	nPasillo.prioridad = pasillo.prioridad;
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

			let jPosicion = {
				"posicion_id": resPosicion._id,
				"prioridad": posicion.prioridad
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
	getById,
	getPosiciones,
	save,
	update,
	_delete
}