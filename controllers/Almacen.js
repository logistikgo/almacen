'use strict'

const Almacen = require('../models/Almacen');
const Helpers = require('../helpers');
const MovimientoInventario = require('../models/MovimientoInventario');

const Posicion = require('../controllers/Posicion');
const PosicionModel = require('../models/Posicion');

const Pasillo = require('../controllers/Pasillo');
const PasilloModel = require('../models/Pasillo');

const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');

var ObjectId = (require('mongoose').Types.ObjectId);

async function getNextID() {
	return await Helpers.getNextID(Almacen, "idAlmacen");
}

function getAlmacenesFull(req, res) {
	Almacen.find({ statusReg: "ACTIVO" }).
		then((almacenes) => {
			res.status(200).send(almacenes)
		}).catch((error) => {
			res.status(500).send(error);
		});
}

function getAlmacen(req, res) {
	let _idAlmacen = req.params.idAlmacen;

	Almacen.find({ idAlmacen: _idAlmacen, statusReg: "ACTIVO" })
		.then((almacen) => {
			res.status(200).send(almacen);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getById(req, res) {
	let _idAlmacen = req.query.idAlmacen;

	Almacen.findOne({ _id: _idAlmacen })
		.then((almacen) => {
			res.status(200).send(almacen);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		});
}

function getCatalogo(req, res) {
	let _arrSucursales = req.query.arrSucursales;

	let filtro = {
		statusReg: "ACTIVO"
	};

	if (_arrSucursales != undefined && _arrSucursales.length > 0)
		filtro.sucursal_id = { $in: _arrSucursales };

	Almacen.find(filtro)
		// .populate({
		// 	path: 'sucursal_id',
		// 	model: 'Sucursal'
		// })
		.then(async (almacenes) => {
			let resAlmacenes = [];

			for (let almacen of almacenes) {
				let jAlmacen = JSON.parse(JSON.stringify(almacen));

				let cantPasillos = await PasilloModel.find({ "almacen_id": new ObjectId(almacen._id) }).count();
				let cantPosiciones = await PosicionModel.find({ "almacen_id": new ObjectId(almacen._id) }).count();

				jAlmacen['pasillos_count'] = cantPasillos;
				jAlmacen['posiciones_count'] = cantPosiciones;

				resAlmacenes.push(jAlmacen);
			}

			res.status(200).send(resAlmacenes);
		})
		.catch((error) => {
			return res.status(500).send({
				message: error
			});
		});
}

function get(req, res) {
	let _arrSucursales = req.query.arrSucursales;

	Almacen.find({
		sucursal_id: { $in: _arrSucursales },
		statusReg: "ACTIVO"
	}, (err, almacenes) => {
		if (err)
			return res.status(500).send(err);

		res.status(200).send(almacenes);
	});
}

function getUbicaciones(req, res) {
	let _almacen_id = req.query.almacen_id;
	let _idClienteFiscal = req.query.idClienteFiscal;

	MovimientoInventario.find({ almacen_id: _almacen_id, idClienteFiscal: _idClienteFiscal, posicion: { $ne: null } })
		.populate({
			path: 'producto_id'
		})
		.populate({
			path: 'posicion_id'
		})
		.then((data) => {
			let arrPosiciones = data.map((x) => {
				return ({
					posicion: x.posicion_id.nombre,
					nivel: x.nivel,
					clave: x.producto_id.clave,
					descripcion: x.producto_id.descripcion
				})
			});

			res.status(200).send(arrPosiciones);
		})
		.catch((error) => {

		});
}

async function save(req, res) {
	let pasillos = req.body.pasillos;
	let nAlmacen = new Almacen(req.body);
	let counterPosiciones = 0;

	pasillos.forEach(function (element) {
		counterPosiciones += element.posiciones.length;
	});

	nAlmacen.save()
		.then((data) => {
			for (let pasillo of pasillos) {
				PasilloModel.findOne({ nombre: pasillo.nombre, almacen_id: data._id })
					.then(async (dataPas) => {
						if (!dataPas) {
							await Pasillo.save(data._id, pasillo, req.body.usuarioAlta_id, req.body.usuarioAlta);
						}
					});
			}
			let jAlmacen = JSON.parse(JSON.stringify(nAlmacen));
			jAlmacen['pasillos_count'] = pasillos.length;
			jAlmacen['posiciones_count'] = counterPosiciones;

			res.status(200).send(jAlmacen);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function update(req, res) {
	let params = req.body;
	let _idAlmacen = params.idAlmacen;
	let pasillos = params.pasillos;

	Almacen.updateOne({ _id: _idAlmacen }, { $set: req.body })
		.then(async (data) => {
			for (let pasillo of pasillos) {
				PasilloModel.findOne({ nombre: pasillo.nombre, almacen_id: _idAlmacen })
					.populate({
						path: 'posiciones.posicion_id'
					})
					.then(async (dataPas) => {
						if (!dataPas) {
							await Pasillo.save(_idAlmacen, pasillo, params.usuarioAlta_id, params.usuarioAlta);
						}
						else {
							let posiciones = pasillo.posiciones;
							let posicionesGuardadas = [];

							for (let posicion of posiciones) {
								if (posicion.posicion_id != null || posicion.posicion_id != undefined) {
									posicion = posicion.posicion_id;
								}

								let resPosicion = await Posicion.save(dataPas._id, _idAlmacen, posicion, params.usuarioAlta_id, params.usuarioAlta);
								let jPosicion = {
									"posicion_id": resPosicion._id
								}

								posicionesGuardadas.push(jPosicion);
							}
							dataPas.posiciones = posicionesGuardadas;
							dataPas.save();
						}
					});
			}
			res.status(200).send(data);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function _delete(req, res) {
	let almacen_id = req.body.almacen_id;

	let item = {
		statusReg: "BAJA"
	}

	Almacen.updateOne({ _id: almacen_id }, { $set: item })
		.then((almacen) => {
			res.status(200).send(almacen);
		}).catch((err) => {
			res.status(500).send({ message: "Error al eliminar" });
		});
}

function validaPosicion(req, res) {
	let _posicion = req.params.posicion;
	let _nivel = req.params.nivel;
	let _almacen = req.params.almacen_id;

	// console.log(_posicion);
	// console.log(_nivel);

	MovimientoInventario.find({ posicion: _posicion, nivel: _nivel, almacen_id: _almacen })
		.then((data) => {
			//console.log(data);
			if (data.length === 0) {
				return res.status(200).send(true);
			}
			else
				return res.status(200).send(false);
		})
		.catch((error) => {
			res.status(500).send(error);
		})
}

async function getBySurcursalClienteXD(req, res) {
	let _arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([req.query.IDSucursal]);
	let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([req.query.IDClienteFiscal]);
	let filtro={
		sucursal_id: { $in: _arrSucursales },
		statusReg: "ACTIVO"
	};
	//if (arrClientes != undefined && arrClientes.length > 0)
     //   filtro.arrClientes = { $in: arrClientes };

	Almacen.find(filtro, (err, almacenes) => {
		if (err)
			return res.status(500).send(err);

		res.status(200).send(almacenes);
	});
}

module.exports = {
	getAlmacenesFull,
	getAlmacen,
	getById,
	get,
	getCatalogo,
	save,
	update,
	_delete,
	validaPosicion,
	getUbicaciones,
	getBySurcursalClienteXD
}