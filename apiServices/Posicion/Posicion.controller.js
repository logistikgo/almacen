'use strict'

const Posicion = require('../Posicion/Posicion.model');
const Pasillo = require('../Pasillos/Pasillo.model');
var ObjectId = (require('mongoose').Types.ObjectId);
const EmbalajesModel = require('../Embalaje/Embalaje.model');
const Producto = require('../Producto/Producto.model');
function get(req, res) {
	let almacen_id = req.query.idAlmacen;

	Posicion.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	}).sort({ nombre: 1 })
		.then((posiciones) => {
			res.status(200).send(posiciones);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		})
}

function getxPasillo(req, res) {
	let pasillo_id = req.query.idPasillo;

	Posicion.find({
		pasillo_id: new ObjectId(pasillo_id),
		statusReg: "ACTIVO"
	}).sort({ nombre: 1 })
		.populate({
			path: 'niveles.productos.producto_id',
			model: 'Producto'
		})
		.then((posiciones) => {
			res.status(200).send(posiciones);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		})
}

async function getxPasilloDisponibles(req, res) {
	let pasillo_id = req.query.pasillo_id;
	var ismod =req.query.ismod != undefined ? req.query.ismod :false
	let producto_id = req.query.prod_id;
	var isdoble=false;
	
	console.log(req.query);
	try{
		if(producto_id)
		{
			let producto =await Producto.findOne({'_id': producto_id }).exec();
			
			isdoble=producto.isEstiba!=undefined ? producto.isEstiba : false;
		}

		let currentPasillo = await Pasillo.findOne({_id: pasillo_id}).exec();

		if(currentPasillo.familia === "CADUCADO"){

			let posiciones = currentPasillo.posiciones.map(posicion => posicion.posicion_id)

			const posicionesEnCaducado = await Posicion.find({_id: {$in: posiciones}}).exec();

				res.status(200).send(posicionesEnCaducado);

		}else{
			Posicion.find({
				pasillo_id: new ObjectId(pasillo_id),
				statusReg: "ACTIVO"
			})
				.sort({ nombre: 1 })
				.then((posiciones) => {
					let disponibles = [];
					for (let pos of posiciones) {
						for(let niv of pos.niveles) {
	
						
							if (niv.isCandadoDisponibilidad == false && niv.productos.length == 0 || (isdoble==true && niv.productos.length<=1 )) {
								if (disponibles.find(x => x == pos) == undefined){
									
									if(niv.productos.length==0 && niv.isCandadoDisponibilidad == false){
										console.log(pos)
										disponibles.push(pos);}
									else
										if(niv.productos.length==1 && isdoble==true && niv.productos[0].producto_id.toString()==producto_id)
										{
											console.log(pos);
											disponibles.push(pos);
										}
								}
								else
									break;
							}
							else{
								if(currentPasillo.familia=="CADUCADO"){
									console.log(pos)
											disponibles.push(pos);
								}
								if(ismod=="true")
								{
									//console.log(req.query.posicion_id+"/"+pos._id.toString())
									if(req.query.posicion_id == pos._id.toString())
									{
									//	console.log(pos);
										if (disponibles.find(x => x == pos) == undefined)
											disponibles.push(pos);
									}
								}
							}
	
							// for (let nivel of pos.niveles) {
							// 	if (nivel.isCandadoDisponibilidad == false || nivel.productos.length == 0) {
							// 		if (disponibles.find(x => x == pos) == undefined)
							// 			disponibles.push(pos);
							// 		else
							// 			break;
							// 	}
							// }
						}
					}
					//console.log(disponibles);
					res.status(200).send(disponibles);
				})
				.catch((error) => {
					console.log(error);
					res.status(500).send(error);
				})

		}


		}catch (error) {
		console.log(error);
        return res.status(500).send(error);
        
    }
}

function getById(req, res) {
	let idPosicion = req.query.idPosicion;

	Posicion.findOne({ _id: idPosicion })
		.populate({
			path: 'niveles.productos.producto_id',
			model: 'Producto'
		})
		.then((posicion) => {
			res.status(200).send(posicion);
		})
		.catch((error) => {
			return res.status(500).send({ message: error });
		});
}

function getNivel(req, res) {
	let idPosicion = req.query.idPosicion;
	let nivel = req.query.nivel;

	Posicion.findOne({ _id: idPosicion })
		.populate({
			path: 'niveles.productos.producto_id',
			model: 'Producto'
		})
		.then((posicion) => {
			let resNivel = posicion.niveles.find(x => x.nombre == nivel);
			res.status(200).send(resNivel);
		})
		.catch((error) => {
			return res.status(500).send({ message: error });
		});
}

//GET de productos por todas las posiciones de un Almacen
function getPosicionesxProducto(req, res) {
	let almacen_id = req.params.almacen_id;
	let producto_id = req.params.producto_id;

	Posicion.find({
		almacen_id: new ObjectId(almacen_id),
		"niveles.productos.producto_id": new ObjectId(producto_id),
		statusReg: "ACTIVO"
	})
		.populate({
			path: 'pasillo_id'
		})
		.populate({
			path: 'niveles.productos.producto_id'
		})
		.then((posiciones) => {
			let resPosiciones = [];

			for (let posicion of posiciones) {
				let jPosicion = {
					pasillo: posicion.pasillo_id.nombre,
					pasillo_id: posicion.pasillo_id._id,
					posicion: posicion.nombre,
					posicion_id: posicion._id,
				};

				jPosicion.embalajes = new Object();

				let niveles = posicion.niveles.filter(async (x) => {
					let producto = x.productos.filter((p) => {
						if (p.producto_id != null)
							return p.producto_id._id.toString() == producto_id.toString();
						return false;
					});

					if (producto.length > 0) {
						for (let embalaje of Object.keys(producto[0].embalajes)) {
							if (!Object.prototype.hasOwnProperty.call(jPosicion.embalajes, embalaje))
								jPosicion.embalajes[embalaje] = producto[0].embalajes[embalaje];
							else
								jPosicion.embalajes[embalaje] += producto[0].embalajes[embalaje];

							// console.log(jPosicion.embalajes);
						}
					}

					return producto.length > 0;
				});

				for (let nivel of niveles) {
					jPosicion.nivel = nivel.nombre;
					jPosicion.nivel_id = nivel._id;
				}
				resPosiciones.push(jPosicion);
			}

			res.status(200).send(resPosiciones);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		})
}

function getPosicionAutomatica(req, res) {
	let cantidad = req.query.cantidad;
	let almacen_id = req.query.almacen_id;
	//console.log(almacen_id);
	Pasillo.find({
		almacen_id: new ObjectId(almacen_id),
		statusReg: "ACTIVO"
	})
		.sort({ prioridad: 1 })
		.populate({
			path: 'posiciones.posicion_id'
		})
		.then((data) => {
			let posiciones = [];

			for (let pasillo of data) {
				//Se ordenas las posiciones por prioridad
				let posicionesPasillo = pasillo.posiciones.sort(function (a, b) {
					if (a.prioridad > b.prioridad) {
						return 1;
					}
					if (a.prioridad < b.prioridad) {
						return -1;
					}
					// a must be equal to b
					return 0;
				});

				for (let pos of posicionesPasillo) {
					//console.log(pos);
					let posicion = pos.posicion_id;
					for (let nivel of posicion.niveles) {
						//console.log(pos._id);
						//console.log(posicion);
						let posicionNomenclatura = {
							ubicacion: pasillo.nombre + nivel.nombre + posicion.nombre,
							pasillo_id: posicion.pasillo_id._id,
							pasillo: pasillo.nombre,
							posicion_id: posicion._id,
							posicion: posicion.nombre,
							nivel_id: nivel._id,
							nivel: nivel.nombre
						};

						if (posiciones.length < cantidad)
							if(nivel.isCandadoDisponibilidad!=undefined) {
								if(nivel.isCandadoDisponibilidad ==false)
									posiciones.push(posicionNomenclatura);
							}
							else
								posiciones.push(posicionNomenclatura);
						else
							break;
					}
				}
			}

			if (posiciones.length == cantidad) {
				res.status(200).send(posiciones);
			}
			else {
				res.status(200).send([]);
			}
		})
		.catch((error) => {
			console.log(error);
			return res.status(500).send({

				message: error
			});
		});
}

async function save(pasillo_id, almacen_id, posicion, usuarioAlta_id, usuarioAlta) {
	let nPosicion;
	if (posicion._id != undefined || posicion._id != null) {
		nPosicion = await Posicion.findOne({ _id: posicion._id });
	}
	else {
		nPosicion = new Posicion();
	}

	nPosicion.nombre = posicion.nombre;
	nPosicion.estatus = "DISPONIBLE";
	nPosicion.almacen_id = almacen_id;
	nPosicion.fechaAlta = new Date();
	nPosicion.statusReg = "ACTIVO";
	nPosicion.usuarioAlta_id = usuarioAlta_id;
	nPosicion.usuarioAlta = usuarioAlta;
	nPosicion.pasillo_id = pasillo_id;

	let niveles = [];
	for (let nivel of posicion.niveles) {
		if (typeof nivel == "string") {
			let jNivel = {
				"nombre": nivel,
				"productos": []
			}
			niveles.push(jNivel);
		}
	}

	if (posicion._id == undefined || posicion._id == null) {
		nPosicion.niveles = niveles;
	}

	let posicionStored = await nPosicion.save();
	return posicionStored;
}

function update(req, res) {

}

function _delete(req, res) {

}

/* Esta funcion actualiza las existencias en las posiciones dentro del almacen */
async function updateExistencia(signo, posicionxPartida, producto_id) {
	// console.log(posicionxPartida);
	let posicion = await Posicion.findOne({ _id: posicionxPartida.posicion_id }).exec();
	let nivel = posicion.niveles.find(x => x.nombre == posicionxPartida.nivel);

	if (nivel.productos.length > 0 && nivel.productos.find(x => x.producto_id.toString() == producto_id.toString()) != undefined) {
		let producto = nivel.productos.find(x => x.producto_id.toString() == producto_id.toString());
		let flagEmbalajes = 0;

		for (let embalaje in posicionxPartida.embalajesEntrada) {
			if (producto.embalajes[embalaje] == undefined) {
				producto.embalajes[embalaje] = 0;
			}
			producto.embalajes[embalaje] += (signo * posicionxPartida.embalajesEntrada[embalaje]);

			flagEmbalajes = producto.embalajes[embalaje] > 0 ? flagEmbalajes++ : flagEmbalajes;
		}

		if (flagEmbalajes == 0) {
			// let index = posicion.niveles.productos.indexOf(producto);
			// posicion.niveles.productos.splice(index, 1);
		}
	}
	else {
		nivel.productos.push({
			producto_id: producto_id,
			embalajes: posicionxPartida.embalajesEntrada
		});
	}

	let item = {
		niveles: posicion.niveles
	};

	await Posicion.updateOne({ _id: posicionxPartida.posicion_id }, { $set: item });
}

module.exports = {
	get,
	getxPasillo,
	getxPasilloDisponibles,
	getById,
	getNivel,
	getPosicionesxProducto,
	getPosicionAutomatica,
	save,
	update,
	_delete,
	updateExistencia
}