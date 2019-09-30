'use strict'

const Entrada = require('../models/Entrada');
const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const MovimientoInventarioModel = require('../models/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const PrePartidaM = require('../models/PrePartida'); //modelo 
const PrePartidaC = require('../controllers/PrePartida'); //controller
const Pasillo = require('../models/Pasillo');


//METODOS NUEVOS CON LA ESTRUCTURA
function get1(req, res) {
	//Entrada.
}

//FIN METODOS NUEVOS CON LA ESTRUCTURA

function getNextID() {
	return Helper.getNextID(Entrada, "idEntrada");
}

function get(req, res) {
	Entrada.find({})
		.populate({
			path: 'partidas',
			model: 'Partida'
		})
		.populate({
			path: 'partidas',
			populate: {
				path: 'producto_id'
			}
		})
		.then((entradas) => {
			res.status(200).send(entradas);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
};

async function getEntradasByIDs(req, res) {
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;
	let _status = req.query.status;
	let _interfaz = req.query.interfaz;

	let filter = {
		sucursal_id: _idSucursal,
		tipo: _tipo
	};

	if (!_interfaz) { //Esta condicion determina si la funcion esta siendo usa de la interfaz o de la aplicacion
		if (!_status) //si tiene status entonces su estatus es SIN_POSICIONAR, por lo tanto no se requiere almacen_id
		{
			filter["clienteFiscal_id"] = _idClienteFiscal;
			filter["almacen_id"] = _idAlmacen;
			filter["status"] = "APLICADA";
		} else {
			filter["status"] = _status;
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

function getEntradaByID(req, res) {

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
		.then((entrada) => {
			res.status(200).send(entrada);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getPartidaById(req, res) {
	let params = req.query;
	let entrada_id = params.entrada_id;
	let clave_partida = params.clave_partida;

	Entrada.findOne({ _id: entrada_id })
		.populate({
			path: 'partidas',
			model: 'Partida'
		})
		.populate({
			path: 'partidas',
			populate: {
				path: 'producto_id'
			}
		})
		.then((entrada) => {
			let partida = entrada.partidas.find(x => x.clave_partida == clave_partida);

			res.status(200).send(partida);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getSalidasByEntradaID(req, res) {
	let _id = req.query.entrada_id;
	console.log(_id);
	Salida.find({ entrada_id: _id })
		.then((salidas) => {
			//console.log(salidas);
			res.status(200).send(salidas);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

async function save(req, res) {

	/**
	 * Guarda una nueva entrada en la base de datos
	 * Asi mismo, guarda cada una de las partidas y un movimiento de inventario
	 */

	let nEntrada = new Entrada(req.body);

	nEntrada.fechaAlta = new Date();
	nEntrada.fechaEntrada = new Date(req.body.fechaEntrada);
	nEntrada.idEntrada = await getNextID();
	nEntrada.folio = await getNextID();
	nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');

	nEntrada.save()
		.then(async (entrada) => {

			for (let itemPartida of req.body.partidasJson) {
				await MovimientoInventario.saveEntrada(itemPartida, entrada.id);
			}

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
	let bodyParams = req.body;
	let arrIDPedido = bodyParams.arrIDPedido;
	let partidas = await PrePartidaM.find({ IDPedido: { $in: arrIDPedido } }).exec();
	let isEntrada = await validaEntradaDuplicado(bodyParams.embarque); //Valida si ya existe

	if (!isEntrada) {
		if (partidas && partidas.length > 0) {
			let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([bodyParams.IDClienteFiscal]);
			let arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([bodyParams.IDSucursal]);

			let nEntrada = new Entrada(req.body);

			nEntrada.fechaEntrada = new Date(bodyParams.fechaEntrada + 'T' + bodyParams.horaEntrada);
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});//Si lo trae
			if (arrClientes.length > 0) {
				nEntrada.clienteFiscal_id = arrClientes[0];  //Interfaz ALM_XD Clientes	
			}
			nEntrada.sucursal_id = arrSucursales[0]; //Interfaz ALM_XD Sucursales
			nEntrada.status = "SIN_POSICIONAR"; //SIN_POSICION
			nEntrada.tipo = "NORMAL";//NORMAL
			nEntrada.partidas = partidas; //Pre partidas
			nEntrada.partidasSalida = partidas; //Pre partidas
			nEntrada.isEmpty = false;

			nEntrada.fechaAlta = new Date();
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');
			nEntrada.isEmpty = false;

			nEntrada.save()
				.then(async (entrada) => {
					//await PrePartidaC.updateToAsignado(partidas);

					for (let itemPartida of entrada.partidas) {

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
	} else {
		console.log("No se puede generar la entrada, esta ya existe");
		res.status(400).send({ message: "Se intenta generar una entrada de un T1 que ya generó una entrada", error: "Se intenta generar una entrada de un T1 que ya generó una entrada" });
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

	req.body.fechaEntrada = new Date(bodyParams.strFechaIngreso);

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

	//console.log(jUpdate.partidas);

	if (req.body.status == "SIN_POSICIONAR") {
		//console.log("Estatus: SIN POSICIONAR");
		let pasilloBahia = await Pasillo.findOne({
			isBahia: true,
			statusReg: "ACTIVO"
		})
			.populate({
				path: 'posiciones.posicion_id'
			}).exec();
		//console.log(pasilloBahia);

		let posicionBahia = pasilloBahia.posiciones[0].posicion_id;
		//console.log(posicionBahia);

		for (let partida of req.body.partidas) {
			//console.log(partida);

			let clave_partida = partida.clave_partida;
			let partidaSalida = req.body.partidasSalida.find(x => x.clave_partida == clave_partida);

			if (partida.pasillo_id == undefined || partida.pasillo == undefined || partida.posicion == undefined || partida.posicion_id == undefined || partida.nivel == undefined) {
				let jParamsposition = {
					pasillo: pasilloBahia.nombre,
					pasillo_id: pasilloBahia._id,
					posicion: posicionBahia.nombre,
					posicion_id: posicionBahia._id,
					nivel: "PISO",
					embalajes: partida.embalajes,
					pesoBruto: partida.pesoBruto,
					pesoNeto: partida.pesoNeto
				};

				//console.log(jParamsposition);

				//await updatePartidaPosicion(partida, partidaSalida, jParamsposition);

				//let res = await updateMovimiento(entrada_id, clave_partida, jParamsposition);

				console.log("UPDATE MOVIMIENTO");
				console.log(res);
			}
		}
	}

	// //Validacion de cambio de status
	let partidasPosicionadas = (req.body.partidas).filter(function (x) {
		return x.pasillo_id != undefined && x.pasillo != undefined && x.posicion != undefined && x.posicion_id != undefined && x.nivel != undefined;
	});

	if (partidasPosicionadas.length == req.body.partidas.length && req.body.item != undefined && req.body.item != null && req.body.item != "") {
		req.body.status = "APLICADA";
	}

	Entrada.updateOne(
		{ _id: entrada_id },
		{ $set: req.body })
		.then((entrada) => {
			res.status(200).send(entrada);
		})
		.catch((error) => {
			res.status(500).send(error);
		})
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

module.exports = {
	get,
	getEntradaByID,
	save,
	update,
	getEntradasByIDs,
	getPartidaById,
	validaEntrada,
	saveEntradaAutomatica,
	getSalidasByEntradaID
}