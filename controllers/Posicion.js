'use strict'

const Posicion = require('../models/Posicion');
const Pasillo = require('../models/Pasillo');
var ObjectId = (require('mongoose').Types.ObjectId);

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

				let niveles = posicion.niveles.filter((x) => {
					let producto = x.productos.filter(x => x.producto_id._id.toString() == producto_id.toString());

					if (producto.length > 0) {
						jPosicion.embalajes = producto[0].embalajes;
					}

					return producto.length > 0;
				});

				for (let nivel of niveles) {
					jPosicion.nivel = nivel.nombre;
					jPosicion.nivel_id = nivel._id;
					resPosiciones.push(jPosicion);
				}
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
					let posicion = pos.posicion_id;
					for (let nivel of posicion.niveles) {
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

module.exports = {
	get,
	getxPasillo,
	getById,
	getNivel,
	getPosicionesxProducto,
	getPosicionAutomatica,
	save,
	update,
	_delete
}