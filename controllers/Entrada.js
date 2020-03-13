'use strict'

const Entrada = require('../models/Entrada');
const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const PartidaModel = require('../models/Partida');
const Helper = require('../helpers');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const MovimientoInventarioModel = require('../models/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const TiempoCargaDescarga = require('../controllers/TiempoCargaDescarga');

function getNextID() {
	return Helper.getNextID(Entrada, "idEntrada");
}

async function get(req, res) {
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;
	let _status = req.query.status;
	let _interfaz = req.query.interfaz;

	let filter = {
		sucursal_id: _idSucursal,
		tipo: _tipo,
		status: _status
	};

	if (!_interfaz) { //Esta condicion determina si la funcion esta siendo usa de la interfaz o de la aplicacion
		if (_status == "APLICADA" || _status == "FINALIZADO") //si tiene status entonces su estatus es SIN_POSICIONAR, por lo tanto no se requiere almacen_id
		{
			filter["clienteFiscal_id"] = _idClienteFiscal;
			filter["almacen_id"] = _idAlmacen;
		}
	}
	else {
		let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([_idClienteFiscal]);
		let arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([_idSucursal]);
		filter.clienteFiscal_id = arrClientes[0];
		filter.sucursal_id = arrSucursales[0];
	}

	Entrada.find(filter).sort({ fechaEntrada: -1 })
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		}).then((entradas) => {
			res.status(200).send(entradas);
		}).catch((error) => {
			res.status(500).send(error);
		});
}

function getById(req, res) {
	let _id = req.query.id;

	Entrada.findOne({ _id: _id })
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		})
		.populate({
			path: 'partidasSalida.producto_id',
			model: 'Producto'
		})
		.populate({
			path: 'clienteFiscal_id',
			model: 'ClienteFiscal'
		})
		.populate({
			path: 'tiempoDescarga_id',
			model: 'TiempoCargaDescarga'
		})
		.then((entrada) => {
			res.status(200).send(entrada);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getSalidasByEntradaID(req, res) {
	let _id = req.query.entrada_id;

	Salida.find({ entrada_id: _id })
		.then((salidas) => {
			//console.log(salidas);
			res.status(200).send(salidas);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getxRangoFechas(req, res) {
	let fechaInicio = new Date(req.query.fechaInicio);
	let fechaFin = new Date(req.query.fechaFin);
	let clienteFiscal_id = req.query.clienteFiscal_id;

	Entrada.find({ clienteFiscal_id: clienteFiscal_id, fechaEntrada: { $gte: fechaInicio, $lt: fechaFin } })
		.populate({
			path: 'partidas',
			model: 'Partida'
		})
		.then((entradas) => {
			res.status(200).send(entradas);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

/**
 * Guarda una nueva entrada en la base de datos
 * Asi mismo, guarda cada una de las partidas y un movimiento de inventario
 */
async function save(req, res) {
	let nEntrada = new Entrada(req.body);

	nEntrada.fechaEntrada = new Date(req.body.fechaEntrada);
	nEntrada.idEntrada = await getNextID();
	nEntrada.folio = await getNextID();
	nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');

	nEntrada.save()
		.then(async (entrada) => {
			for (let itemPartida of req.body.partidasJson) {
				await MovimientoInventario.saveEntrada(itemPartida, entrada.id);
			}

			TiempoCargaDescarga.setStatus(entrada.tiempoDescarga_id, { entrada_id: entrada._id, status: "ASIGNADO" });

			let partidas = await Partida.post(req.body.partidasJson, entrada._id);
			entrada.partidas = partidas;

			await Entrada.updateOne({ _id: entrada._id }, { $set: { partidas: partidas } }).then((updated) => {
				res.status(200).send(entrada);
			});
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

async function saveEntradaAutomatica(req, res) {
	let partidas = await PartidaModel.find({ 'InfoPedidos.IDPedido': { $in: req.body.arrIDPedidos } }).lean().exec();

	//let isEntrada = await validaEntradaDuplicado(bodyParams.embarque); //Valida si ya existe

	if (partidas && partidas.length > 0) {
		let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([req.body.IDClienteFiscal]);
		let arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([req.body.IDSucursal]);

		let nEntrada = new Entrada();

		nEntrada.fechaEntrada = new Date(req.body.fechaEntrada);
		nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
			return total + valor;
		});
		nEntrada.clienteFiscal_id = arrClientes[0];
		nEntrada.sucursal_id = arrSucursales[0];
		nEntrada.status = "SIN_POSICIONAR";
		nEntrada.tipo = "NORMAL";
		nEntrada.partidas = partidas.map(x => x._id);
		nEntrada.nombreUsuario = req.body.nombreUsuario;
		nEntrada.tracto = req.body.placasTrailer;
		nEntrada.remolque = req.body.placasRemolque;
		nEntrada.embarque = req.body.embarque;
		nEntrada.transportista = req.body.transportista;
		nEntrada.fechaAlta = new Date();
		nEntrada.idEntrada = await getNextID();
		nEntrada.folio = await getNextID();
		nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');

		nEntrada.save()
			.then(async (entrada) => {

				await Partida.asignarEntrada(partidas.map(x => x._id.toString()), entrada._id.toString());
				for (let itemPartida of partidas) {
					await MovimientoInventario.saveEntrada(itemPartida, entrada.id);
				}
				res.status(200).send(entrada);
			})
			.catch((error) => {
				res.status(500).send(error);
			});
	} else {
		console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		res.status(400).send({ message: "Se intenta generar una entrada sin partidas", error: "No se encontró pre-partidas para los IDs de pedidos indicados" });
	}
}

//Valida que la entrada ya existe o no, devolviendo true o false
async function validaEntradaDuplicado(embarque) {
	let entradas = await Entrada.find({ embarque: embarque }).exec();
	//console.log(entradas);
	if (entradas.length > 0) {
		return true;
	} else {
		return false;
	}
}

async function update(req, res) {
	let bodyParams = req.body;
	let entrada_id = bodyParams.entrada_id;

	req.body.fechaEntrada = new Date(bodyParams.fechaEntrada);
	req.body.fechaAlta = new Date();

	if (req.body.status == "SIN_POSICIONAR") {
		Partida.posicionar(req.body.partidasJson, bodyParams.almacen_id);

		//Updatea los movimientos de esta entrada, les asigna el campo almacen_id y clienteFiscal_id
		MovimientoInventarioModel.find({ entrada_id: entrada_id })
			.then((movimientos) => {
				movimientos.forEach(function (movimiento) {
					movimiento.almacen_id = req.body.almacen_id;
					movimiento.clienteFiscal_id = req.body.clienteFiscal_id;
					//console.log(movimiento);
					movimiento.save();
				});
			});

		//Validacion de cambio de status
		let partidasPosicionadas = (req.body.partidasJson).filter(x => x.posiciones.length > 0);

		if (partidasPosicionadas.length == req.body.partidasJson.length && req.body.item != undefined && req.body.item != null && req.body.item != "")
			req.body.status = "APLICADA";
	}
	else {
		console.log("EDIT PARTIDA");
		for (let partida of req.body.partidasJson) {
			Partida._put(partida);
		}
	}

	Entrada.updateOne(
		{ _id: entrada_id },
		{ $set: req.body })
		.then((entrada) => {
			res.status(200).send(entrada);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

//CHRONOS
async function validaEntrada(req, res) {
	let bodyParams = req.body;
	let _idEntrada = bodyParams.idEntrada;
	let _partidas = bodyParams.partidas;
	var arrPartidas = [];
	let _entrada = await Entrada.findOne({ idEntrada: _idEntrada })
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		}).exec();

	_entrada.partidas.forEach(function (itemPartida) {
		let itemBodyPartidas = _partidas.find(function (itemBodyPartidas) {
			return itemBodyPartidas.clave === itemPartida.producto_id.clave;
		});
		if (itemBodyPartidas != null) {
			let newPartida = {
				_id: itemPartida.id,
				producto_id: itemPartida.producto_id,
				tarimas: itemPartida.tarimas,
				piezas: itemBodyPartidas.cantidad,
				cajas: itemPartida.cajas,
				posicion: itemBodyPartidas.posicion,
				nivel: itemBodyPartidas.nivel

			}

			arrPartidas.push(newPartida);
		}
	});

	//----------------------------------------------
	if (arrPartidas.length == _entrada.partidas.length) {
		let cambios = {
			status: "APLICADA",
			partidas: arrPartidas
		}

		Entrada.updateOne({ idEntrada: _idEntrada }, { $set: cambios }, (err, entrada) => {
			if (err)
				return res.status(500).send({ message: "Error" });
			for (let itemPartida of arrPartidas) {
				MovimientoInventario.saveEntrada(itemPartida.producto_id, entrada.id, itemPartida.piezas, itemPartida.cajas, itemPartida.tarimas,
					_entrada.idClienteFiscal, _entrada.idSucursal, _entrada.almacen_id, itemPartida.posicion, itemPartida.nivel);
			}
			res.status(200).send(entrada);
		});

	} else {
		res.status(500).send({ message: "Error en Json EndPoint" });
	}
}

function getEntradasReporte(req, res) {
	var arrPartidas = [];
	var arrPartidasFilter = [];
	let clasificacion = req.body.clasificacion;
	let subclasificacion = req.body.subclasificacion;
	let reporte = 0;

	let filter = {
		clienteFiscal_id: req.body.clienteFiscal_id,
		isEmpty: false
	}


	Entrada.find(filter, {partidas: 1, _id: 0, fechaAlta: 1})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio'
		}
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto',
		}
	})
	.then((entradas) => {
		entradas.forEach(entrada => {
			var partida = entrada.partidas;
			//console.log(partida);
			partida.forEach(elem => {
				if(elem.isEmpty == false)
					arrPartidas.push(elem);
			})		
		});
		if(clasificacion != undefined && subclasificacion != undefined) {
			reporte = 1;
			arrPartidas.forEach(element => {
				if(element.producto_id.clasificacion_id == clasificacion && element.producto_id.subclasificacion_id == subclasificacion) {
					arrPartidasFilter.push(element);
				}
			});
		}
		res.status(200).send(reporte == 1 ? arrPartidasFilter : arrPartidas);
	})
	.catch((error) => {
		res.status(500).send(error);
	})
}

/////////////// D E P U R A C I O N   D E   C O D I G O ///////////////

//METODOS NUEVOS CON LA ESTRUCTURA
// function get1(req, res) {
// 	//Entrada.
// }

//FIN METODOS NUEVOS CON LA ESTRUCTURA

// function get(req, res) {
// 	Entrada.find({})
// 		.populate({
// 			path: 'partidas',
// 			model: 'Partida'
// 		})
// 		.populate({
// 			path: 'partidas',
// 			populate: {
// 				path: 'producto_id'
// 			}
// 		})
// 		.then((entradas) => {
// 			res.status(200).send(entradas);
// 		})
// 		.catch((error) => {
// 			res.status(500).send(error);
// 		});
// };

// function getPartidaById(req, res) {
// 	let params = req.query;
// 	let entrada_id = params.entrada_id;
// 	let clave_partida = params.clave_partida;

// 	Entrada.findOne({ _id: entrada_id })
// 		.populate({
// 			path: 'partidas',
// 			model: 'Partida'
// 		})
// 		.populate({
// 			path: 'partidas',
// 			populate: {
// 				path: 'producto_id'
// 			}
// 		})
// 		.then((entrada) => {
// 			let partida = entrada.partidas.find(x => x.clave_partida == clave_partida);

// 			res.status(200).send(partida);
// 		})
// 		.catch((error) => {
// 			res.status(500).send(error);
// 		});
// }

module.exports = {
	get,
	getById,
	getxRangoFechas,
	save,
	update,
	validaEntrada,
	saveEntradaAutomatica,
	getSalidasByEntradaID,
	getEntradasReporte
	// getPartidaById,
}