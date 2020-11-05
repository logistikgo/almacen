'use strict'

const Pasillo = require('../models/Pasillo');
const Posicion = require('../controllers/Posicion');
const PosicionModel = require('../models/Posicion');
const Producto = require('../models/Producto');
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
						let namenivel=nivel.nombre;
						//console.log(almacen_id);
						if(almacen_id=='5e33437422b5651aecafea70'){
							namenivel=namenivel.charCodeAt(0) - 64
							if (namenivel.toString().length < 2)
                        		namenivel = "0" + namenivel.toString()
							//console.log(namenivel);
						}
						let posicionNomenclatura = {
							nombre: pasillo.nombre.replace(/\./g, '')+"-" + posicion.nombre+"-" +namenivel,
							pasillo_id: posicion.pasillo_id._id,
							posicion_id: posicion._id,
							nivel: nivel.nombre
						};
						if(almacen_id!='5e33437422b5651aecafea70' || (pasillo.familia == "CADUCADO" || pasillo.familia == "frios" ) )
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

async function getDisponibles(req, res) {
	let almacen_id = req.query.almacen_id;
	let producto_id = req.query.prod_id;
	let pasilloId =req.query.pasilloId
	let query = {
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	}
	//console.log(producto_id)
	if(producto_id)
	{
		let producto =await Producto.findOne({'_id': producto_id }).exec();
		//console.log(producto)
		if(producto.subclasificacion == "Confiteria" ){
			query.familia={$in:["frios","STAGING","CADUCADO"]};
		}
		if(producto.subclasificacion == "Botana" ){
			query.familia={$in:["secos","STAGING","CADUCADO"]};
		}
	}
	//console.log(query);
	Pasillo.find(query)
		.populate({
			path: 'posiciones.posicion_id'
		}).sort({nombre:1})
		.then(async(data) => {
			let disponibles = [];

			for (let pasillo of data) {
				for (let pos of pasillo.posiciones) {
					let posicion = pos.posicion_id;
					if (posicion.niveles.find(x => x.isCandadoDisponibilidad == false && x.productos.length == 0 || posicion.familia=="CADUCADO") != undefined) {
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
//console.log(disponibles)
			if(pasilloId)
			{
				console.log("test");
				console.log(disponibles.findIndex(obj=> (obj._id.toString() == pasilloId)));
				if(disponibles.findIndex(obj=> (obj._id.toString() == pasilloId)) <0){
					let pasilloaux = await Pasillo.findOne({ _id: new ObjectId(pasilloId)});
					disponibles.push(pasilloaux);
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
		

		for ( let i = 0; i <= 10 ; i++ )
		{
			await Helper.asyncForEach(pasillos, async function (pasillo) 
			{
			
				if(pasillo.familia == Family.nombre){
					/*console.log(pasillo.nombre);
					console.log(pasillo.familia);*/
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
	    					/*console.log(posicion._id);
	    					console.log(posicion.niveles[i].prioridad);
	    					console.log(posicion.nombre+"::"+posicion.niveles[i].nombre);*/
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
		//console.log("none");
		for (let famPri=Family.prioridad; famPri <=5 && need>0; famPri++)
		{
			let pasillos = await Pasillo.find({
			almacen_id: new ObjectId(almacen_id),
			statusReg: "ACTIVO"
			})
			for ( let i = 0; i <= 10 ; i++ )
			{
				await Helper.asyncForEach(pasillos, async function (pasillo) 
				{
				
					if(pasillo.familia == "NONE"){
						/*console.log(pasillo.nombre);
						console.log(pasillo.familia);*/
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
		    					/*console.log(posicion._id);
		    					console.log(posicion.niveles[i].prioridad);
		    					console.log(posicion.nombre+"::"+posicion.niveles[i].nombre);*/
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

async function countDisponibles(almacen_id) {
	//console.log("asdas")
	//console.log(almacen_id)
	let pasillos = await Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	})
	let respuesta=0;
	//console.log(pasillos)
	await Helper.asyncForEach(pasillos, async function (pasillo) 
	{
		let posiciones = await PosicionModel.find({
				pasillo_id: new ObjectId(pasillo._id),
				estatus: "DISPONIBLE"
		})
				//console.log(posiciones);
				//console.log(posiciones)
		await Helper.asyncForEach(posiciones, async function (posicion) 
		{
			//console.log(posicion);
        	await Helper.asyncForEach(posicion.niveles, async function (nivel) 
			{
				//console.log(nivel);
				if( nivel.isCandadoDisponibilidad == false && nivel.apartado == false)
					respuesta++;
			});
			
		});
	});
	//console.log(respuesta);
	return respuesta;
		
}

module.exports = {
	get,
	getById,
	getPosiciones,
	getDisponibles,
	save,
	update,
	getPocionesAuto,
	countDisponibles,
	_delete
}