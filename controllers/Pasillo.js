'use strict'

const Pasillo = require('../models/Pasillo');
const Posicion = require('../controllers/Posicion');
const PosicionModel = require('../models/Posicion');
const Helper = require('../helpers');
var ObjectId = (require('mongoose').Types.ObjectId);

function get(req, res) {
	let almacen_id = req.query.idAlmacen;

	Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	}).sort({ nombre: 1 })
		.populate({
			path: 'posiciones.posicion_id'
		})
		.then((pasillos) => {
			res.status(200).send(pasillos);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		});
}

function getById(req, res) {
	let psillo_id = req.query.idPasillo;

	Pasillo.findOne({ _id: psillo_id })
		.then(async (pasillo) => {

			res.status(200).send(pasillo);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		})
}

//Posiciones x Pasillo
function getPosiciones(req, res) {
	let almacen_id = req.query.idAlmacen;

	Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	})
		.populate({
			path: 'posiciones.posicion_id'
		})
		.then((data) => {
			let posiciones = [];

			for (let pasillo of data) {
				for (let pos of pasillo.posiciones) {
					let posicion = pos.posicion_id;
					for (let nivel of posicion.niveles) {
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
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		})
}

function getDisponibles(req, res) {
	let almacen_id = req.query.almacen_id;

	Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	})
		.populate({
			path: 'posiciones.posicion_id'
		})
		.then((data) => {
			let disponibles = [];

			for (let pasillo of data) {
				for (let pos of pasillo.posiciones) {
					let posicion = pos.posicion_id;
					if (posicion.niveles.find(x => x.isCandadoDisponibilidad == false || x.productos.length == 0) != undefined) {
						if (disponibles.find(x => x == pasillo) == undefined)
							disponibles.push(pasillo);
						else
							break;
					}
					// for (let nivel of posicion.niveles) {
					// 	if (nivel.isCandadoDisponibilidad == false || nivel.productos.length == 0) {
					// 		if (disponibles.find(x => x == pasillo) == undefined)
					// 			disponibles.push(pasillo);
					// 		else
					// 			break;
					// 	}
					// }
				}
			}

			res.status(200).send(disponibles);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function save(almacen_id, pasillo, usuarioAlta_id, usuarioAlta) {
	let nPasillo = new Pasillo();

	nPasillo.nombre = pasillo.nombre;
	nPasillo.almacen_id = almacen_id;
	nPasillo.prioridad = pasillo.prioridad;
	nPasillo.fechaAlta = new Date();
	nPasillo.statusReg = "ACTIVO";
	nPasillo.usuarioAlta_id = usuarioAlta_id;
	nPasillo.usuarioAlta = usuarioAlta;

	let posiciones = pasillo.posiciones;
	let posicionesGuardadas = [];

	nPasillo.save()
		.then(async (data) => {
			for (let posicion of posiciones) {
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
		.catch((err) => {
			console.log(err);
		});
}


async function getPocionesAuto(Family,almacen_id)
{
	let need=Family.needed;
	let resarray=[]
	for (let famPri=Family.prioridad; famPri <=5 && need>0; famPri++)
	{
		let pasillos = await Pasillo.find({
			almacen_id: new ObjectId(almacen_id),
			statusReg: "ACTIVO"
		})
		

		for ( let i = 0; i <= 5 ; i++ )
		{
			await Helper.asyncForEach(pasillos, async function (pasillo) 
			{
			
				if(pasillo.familia == Family.nombre){
					console.log(pasillo.nombre);
					console.log(pasillo.familia);
					let posiciones = await PosicionModel.find({
						pasillo_id: new ObjectId(pasillo._id),
						estatus: "DISPONIBLE"
					}).sort( { nombre: 1 } )
					//console.log(posiciones);
					
		        	await Helper.asyncForEach(posiciones, async function (posicion) 
					{

		        		if(posicion.niveles.length>i)
		        		if(famPri == posicion.niveles[i].prioridad && need > 0 && posicion.niveles[i].isCandadoDisponibilidad == false && posicion.niveles[i].apartado == false)
	    				{
	    					console.log(posicion._id);
	    					console.log(posicion.niveles[i].prioridad);
	    					console.log(posicion.nombre+"::"+posicion.niveles[i].nombre);
	    					need-=1;
	    					posicion.niveles[i].isCandadoDisponibilidad = true; 
	    					posicion.niveles[i].apartado = true;
	    					await posicion.save();
	    					resarray.push({pocision_id:posicion._id,nivelIndex:i});
	    				}
		    				
		    				
					});
				}

			});
		}
	}
	if(need>0)
	{
		console.log("none");
		for (let famPri=Family.prioridad; famPri <=5 && need>0; famPri++)
		{
			let pasillos = await Pasillo.find({
			almacen_id: new ObjectId(almacen_id),
			statusReg: "ACTIVO"
			})
			for ( let i = 0; i <= 5 ; i++ )
			{
				await Helper.asyncForEach(pasillos, async function (pasillo) 
				{
				
					if(pasillo.familia == "NONE"){
						console.log(pasillo.nombre);
						console.log(pasillo.familia);
						let posiciones = await PosicionModel.find({
							pasillo_id: new ObjectId(pasillo._id),
							estatus: "DISPONIBLE"
						}).sort( { nombre: 1 } )
						//console.log(posiciones);
					
						await Helper.asyncForEach(posiciones, async function (posicion) 
						{
			        		if(posicion.niveles.length>i)
			        		if(famPri == posicion.niveles[i].prioridad && need > 0 && posicion.niveles[i].isCandadoDisponibilidad == false && posicion.niveles[i].apartado == false)
		    				{
		    					console.log(posicion._id);
		    					console.log(posicion.niveles[i].prioridad);
		    					console.log(posicion.nombre+"::"+posicion.niveles[i].nombre);
		    					need-=1;
		    					posicion.niveles[i].isCandadoDisponibilidad = true; 
		    					posicion.niveles[i].apartado = true;
		    					posicion.save();
		    					resarray.push({pocision_id:posicion._id,nivelIndex:i});
		    				}
			    				
			    				
						});
					}

				});
			}
		}
	}
	
	return resarray;
}

function update() {

}

function _delete() {

}

module.exports = {
	get,
	getById,
	getPosiciones,
	getDisponibles,
	save,
	update,
	getPocionesAuto,
	_delete
}