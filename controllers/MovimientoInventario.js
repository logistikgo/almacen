'use strict'

const MovimientoInventario = require('../models/MovimientoInventario');
const Posicion = require('../models/Posicion');
const Producto = require('../models/Producto');
const Entrada = require('../models/Entrada');
const Salida = require('../models/Salida');
const Helper = require('../helpers');
const Partida = require('../models/Partida');

async function saveSalida(itemPartida, salida_id) {
	let nMovimiento = new MovimientoInventario();

	let salida = await Salida.findOne({ _id: salida_id }).exec();

	nMovimiento.producto_id = itemPartida.producto_id;
	nMovimiento.salida_id = salida_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = itemPartida.embalajesEnSalida;
	nMovimiento.signo = -1;
	if (salida.tipo != "RECHAZO") {
		nMovimiento.tipo = "SALIDA";
	} else {
		nMovimiento.tipo = "SALIDA_RECHAZO"
	}

	//DEPURACION DE CODIGO
	//nMovimiento.idClienteFiscal = salida.idClienteFiscal;

	nMovimiento.clienteFiscal_id = salida.clienteFiscal_id;
	nMovimiento.idSucursal = salida.idSucursal;
	nMovimiento.sucursal_id = salida.sucursal_id;
	nMovimiento.almacen_id = salida.almacen_id;
	
	//Verificar cual es el pedido que se va a obtener
	let referenciaPedidos = itemPartida.referenciaPedidos;
	
	let referencia = salida.referencia ? salida.referencia : "";


	if(referenciaPedidos !== undefined){
		if(referenciaPedidos.length > 0){
			referencia = referenciaPedidos.filter(pedido => pedido.referenciaPedido === salida.referencia).map(pedido => pedido.referenciaPedido)[0];
		}
	}


	nMovimiento.referencia = referencia;
	
	Helper.asyncForEach(itemPartida.embalajesEnSalidaxPosicion, async function (posicionxSalida) {

		let jsonFormatPosicion = {
			posicion_id: posicionxSalida.posicion_id,
			nivel: posicionxSalida.nivel,
			embalajes: posicionxSalida.embalajes
		};
		//console.log(itemPartida.producto_id._id);

		await updateExistenciaPosicion(-1, jsonFormatPosicion, itemPartida.producto_id);
	});

	await nMovimiento.save()
		.then(async (movimiento) => {
			let jsonFormatPartida = {
				embalajes: itemPartida.embalajesEnSalida,
				producto_id: itemPartida.producto_id,
				valor: itemPartida.valorEnSalida
			};
			if (salida.tipo != "RECHAZO") {
				await updateExistencia(-1, jsonFormatPartida, salida.fechaSalida);
			} else {
				await updateExistenciaRechazo(-1, jsonFormatPartida, salida.fechaSalida);
			}
		})
		.catch((err) => {
			console.log(err);
		})
}

async function saveSalidaMovimiento(partida, salida) {
	let nMovimiento = new MovimientoInventario();

	//let salida = await Salida.findOne({ _id: salida_id }).exec();

	let partidaFound = await Partida.findOne({_id: partida._id}).exec();

	nMovimiento.producto_id = partidaFound.producto_id;
	nMovimiento.salida_id = salida._id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = partida.embalajesEnSalida;
	nMovimiento.signo = -1;
	if (salida.tipo != "RECHAZO") {
		nMovimiento.tipo = "SALIDA";
	} else {
		nMovimiento.tipo = "SALIDA_RECHAZO"
	}

	//DEPURACION DE CODIGO
	//nMovimiento.idClienteFiscal = salida.idClienteFiscal;

	nMovimiento.clienteFiscal_id = salida.clienteFiscal_id;
	nMovimiento.idSucursal = salida.idSucursal;
	nMovimiento.sucursal_id = salida.sucursal_id;
	nMovimiento.almacen_id = salida.almacen_id;
	
	//Verificar cual es el pedido que se va a obtener
	let referenciaPedidos = partidaFound.referenciaPedidos;
	
	let referencia = salida.referencia ? salida.referencia : "";

	if(referenciaPedidos !== undefined){
		if(referenciaPedidos.length > 0){
			referencia = referenciaPedidos.filter(pedido => pedido.referenciaPedido === salida.referencia).map(pedido => pedido.referenciaPedido)[0];
		}
	}


	nMovimiento.referencia = referencia;
	
	
	for(let posicionxSalida of partida.embalajesEnSalidaxPosicion){
		
		let jsonFormatPosicion = {
			posicion_id: posicionxSalida.posicion_id,
			nivel: posicionxSalida.nivel,
			embalajes: posicionxSalida.embalajes
		};
		//console.log(itemPartida.producto_id._id);

		await updateExistenciaPosicionSalida(-1, jsonFormatPosicion, partidaFound.producto_id);
	}

	await nMovimiento.save()
		.then(async (movimiento) => {
			let jsonFormatPartida = {
				embalajes: partida.embalajesEnSalida,
				producto_id: partidaFound.producto_id,
			};
			if (salida.tipo != "RECHAZO") {
				await updateExistencia(-1, jsonFormatPartida, salida.fechaSalida,partidaFound.producto_id );
			} else {
				await updateExistenciaRechazo(-1, jsonFormatPartida, salida.fechaSalida);
			}
		})
		.catch((err) => {
			console.log(err);
		})
}

async function saveEntrada(itemPartida, entrada_id) {
	//console.log(itemPartida);
	//Nueva instancia del modelo Movimiento
	let nMovimiento = new MovimientoInventario();

	//Se encuentra la entrada
	let entrada = await Entrada.findOne({ _id: entrada_id }).exec();

	nMovimiento.producto_id = itemPartida.producto_id;
	nMovimiento.entrada_id = entrada_id;
	nMovimiento.clienteFiscal_id = entrada.clienteFiscal_id;
	nMovimiento.idSucursal = entrada.idSucursal;
	nMovimiento.sucursal_id = entrada.sucursal_id;
	nMovimiento.almacen_id = entrada.almacen_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = itemPartida.embalajesEntrada;
	nMovimiento.signo = 1;

	//DEPURACION DE CODIGO
	//nMovimiento.idClienteFiscal = entrada.idClienteFiscal;

	if (entrada.tipo != "RECHAZO") {
		nMovimiento.tipo = "ENTRADA";
	} else {
		nMovimiento.tipo = "ENTRADA_RECHAZO"
	}

	nMovimiento.referencia = entrada.referencia ? entrada.referencia : "";
	//console.log(itemPartida);
	if (entrada.status != "SIN_POSICIONAR") {
		
		await Helper.asyncForEach(itemPartida.posiciones, async function (posicionxPartida) {
			let jsonFormatPosicion = {
				posicion_id: posicionxPartida.posicion_id,
				nivel: posicionxPartida.nivel,
				embalajes: posicionxPartida.embalajesEntrada,
				pesoBruto: posicionxPartida.pesoBruto,
				pesoNeto: posicionxPartida.pesoNeto
			};
			//console.log(posicionxPartida);
			await updateExistenciaPosicion(1, jsonFormatPosicion, itemPartida.producto_id);
		});
	}

	await nMovimiento.save()
		.then(async (movimiento) => {
			let jsonFormatPartida = {
				embalajes: itemPartida.embalajesEntrada,
				producto_id: itemPartida.producto_id,
				valor: itemPartida.valor
			};
			if (entrada.tipo != "RECHAZO") {
				await updateExistencia(1, jsonFormatPartida, entrada.fechaEntrada);
			} else {
				await updateExistenciaRechazo(1, jsonFormatPartida, entrada.fechaEntrada);
			}

		})
		.catch((err) => {
			console.log(err);
		});
}

async function saveAjuste(req, res) {
	let bodyParams = req.body;
	//console.log(bodyParams);
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = bodyParams.producto_id;
	nMovimiento.sucursal_id = bodyParams.sucursal_id;
	nMovimiento.almacen_id = bodyParams.almacen_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = bodyParams.embalajes;
	nMovimiento.pesoBruto = bodyParams.pesoBruto;
	nMovimiento.pesoNeto = bodyParams.pesoNeto;
	nMovimiento.signo = bodyParams.signo;
	nMovimiento.tipo = "AJUSTE";
	nMovimiento.posicion = bodyParams.posicion;
	nMovimiento.posicion_id = bodyParams.posicion_id;
	nMovimiento.nivel = bodyParams.nivel;

	//DEPURACION DE CODIGO	
	//nMovimiento.idClienteFiscal = bodyParams.idClienteFiscal;

	let item = {
		producto_id: bodyParams.producto_id,
		embalajes: bodyParams.embalajes,
		pesoNeto: bodyParams.pesoNeto,
		pesoBruto: bodyParams.pesoBruto,
		nivel: bodyParams.nivel,
		posicion_id: bodyParams.posicion_id,
		valor: 0
	}

	await updateExistenciaPosicion(bodyParams.signo, item);

	await nMovimiento.save()
		.then(async (movimiento) => {
			await updateExistencia(bodyParams.signo, item, nMovimiento.fechaMovimiento);
			res.status(200).send(movimiento);
		})
		.catch((err) => {
			console.log(err);
			res.status(500).send(err);
		});
}

function saveExistenciaInicial(producto_id, embalajes, pesoBruto, pesoNeto, clienteFiscal_id, sucursal_id, almacen_id) {
	let nMovimiento = new MovimientoInventario();
	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = embalajes;
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL";
	nMovimiento.clienteFiscal_id = clienteFiscal_id;
	nMovimiento.sucursal_id = sucursal_id;
	nMovimiento.almacen_id = almacen_id;

	//DEPURACION DE CODIGO	
	//nMovimiento.idClienteFiscal = idClienteFiscal;

	nMovimiento.save();
}

async function updateExistencia(signo, itemPartida, fechaMovimiento, producto_id = null) {
	/**
	 * Esta funcion afecta la existencia de los embalajes del producto recibido
	 * como parametro dentro del objeto itemPartida
	 */

	if(producto_id !== null)
		itemPartida.producto_id = producto_id;

	let producto = await Producto.findOne({ _id: itemPartida.producto_id }).exec();

	if (itemPartida.embalajes) {
		for (let embajalePartida in itemPartida.embalajes) {

			if (producto.embalajes[embajalePartida]) {
				producto.embalajes[embajalePartida] += (signo * itemPartida.embalajes[embajalePartida]);
			} else if (signo > 0) {
				producto.embalajes[embajalePartida] = (signo * itemPartida.embalajes[embajalePartida]);
			}
		}
	}

	if (itemPartida.valor && itemPartida.valor != null) {
		producto.valor += (signo * itemPartida.valor);
	}
	else {
		producto.valor = 0;
	}

	if (signo == 1) {
		producto.fechaUltimaEntrada = new Date(fechaMovimiento);
	}
	else {
		producto.fechaUltimaSalida = new Date(fechaMovimiento);
	}

	let item = {
		embalajes: producto.embalajes,
		valor: producto.valor,
		fechaUltimaEntrada: producto.fechaUltimaEntrada,
		fechaUltimaSalida: producto.fechaUltimaSalida,
		existenciaPesoBruto: producto.existenciaPesoBruto,
		existenciaPesoNeto: producto.existenciaPesoNeto
	};

	producto.save();

	await Producto.updateOne({ _id: itemPartida.producto_id }, { $set: item });
}

async function updateExistenciaPosicion(signo, posicionxPartida, producto_id) {
	/**
	 * Esta funcion actualiza las existencias en las posiciones dentro del almacen
	 */
	console.log("TEST"+signo);
	console.log(posicionxPartida);
	let _producto_id= producto_id._id!=undefined? producto_id._id:producto_id
	Posicion.findOne({ _id: posicionxPartida.posicion_id }).exec()
			.then(posicion => {
				let nivel = posicion.niveles.find(x => x.nombre == posicionxPartida.nivel);
				//console.log(nivel);
				//console.log(nivel.productos.find((x) => {
				//	console.log(x.producto_id.toString());
				//	console.log(producto_id.toString());
				//	console.log(x.producto_id.toString() == producto_id.toString());
			
				//	x.producto_id.toString() == producto_id.toString()
				//}));
				console.log(_producto_id);
				console.log("service:"+nivel.productos.length +"> 0 && "+nivel.productos+" == "+_producto_id.toString())
				if (nivel.productos.length > 0 && nivel.productos.find(x => x.producto_id.toString() == _producto_id.toString()) != undefined) {
					let producto = nivel.productos.find(x => x.producto_id.toString() == _producto_id.toString());
					let flagEmbalajes = 0;
			
					for (let embalaje in posicionxPartida.embalajes) {
						if (producto.embalajes[embalaje] == undefined) {
							producto.embalajes[embalaje] = 0;
						}
						// console.log(signo * posicionxPartida.embalajes[embalaje]);
						producto.embalajes[embalaje] += (signo * posicionxPartida.embalajes[embalaje]);
						 console.log("left"+producto.embalajes[embalaje]);
						flagEmbalajes = producto.embalajes[embalaje] > 0 ? ++flagEmbalajes : flagEmbalajes;
						console.log("flag"+flagEmbalajes);
					}
			
					if (flagEmbalajes == 0 && signo < 0) {
						console.log("Flag is 0");
						let index = nivel.productos.indexOf(producto);
						nivel.productos.splice(index, 1);
						nivel.isCandadoDisponibilidad = false;
						nivel.apartado = false;
					}
				}
				else if (signo > 0) {
					console.log("No hay producto igual");
					nivel.productos.push({
						producto_id: _producto_id,
						embalajes: posicionxPartida.embalajes
					});
					nivel.isCandadoDisponibilidad = true;
					nivel.apartado = true;
				}
			
				//console.log(posicion.niveles);
			
				let item = {
					niveles: posicion.niveles
				};
			
				Posicion.updateOne({ _id: posicionxPartida.posicion_id }, { $set: item }, function(err){
					if(err) return handleError(err);
				   console.log("la posicion ha sido liberada correctamente: "+ item);
				});
			});
}

async function updateExistenciaPosicionSalida(signo, posicionxPartida, producto_id){


	try {
		let _producto_id= producto_id._id!=undefined ? producto_id._id:producto_id
		let posicion_id = posicionxPartida.posicion_id;

		let PosicionDocument = await Posicion.findOne({_id: posicion_id}).exec();
		let cantidadAModificar = posicionxPartida.embalajes.cajas;
		
	if(PosicionDocument !== null){

		let nivel = PosicionDocument.niveles.find(nivel => nivel.nombre === posicionxPartida.nivel);

				if(nivel.productos.length > 0){
					let productoIndex = nivel.productos.findIndex(producto => producto.producto_id.toString() === _producto_id.toString());
					let productoActual = nivel.productos[productoIndex];
					
					let embalajes = productoActual.embalajes;

					for (let embalaje in embalajes){

						if(embalaje !== undefined){
							let embalajesParaModificar = posicionxPartida.embalajes[embalaje];
							productoActual.embalajes[embalaje] += (signo * embalajesParaModificar);

							if(productoActual.embalajes[embalaje] === 0){
								nivel.productos.splice(productoIndex, 1);
								console.log(nivel.productos);
							}
						}
						
					}

				}
				//Cambiar candados de la posicion, para poder liberarla
				if(nivel.productos.length === 0){
					nivel.apartado = false;
					nivel.isCandadoDisponibilidad = false;
				}

				let item = {
					niveles: PosicionDocument.niveles
				};
			
				await Posicion.updateOne({ _id: posicionxPartida.posicion_id }, { $set: item }, function(err){
				   console.log("la posicion ha sido liberada correctamente: "+ posicionxPartida);
				});
	}
	} catch (error) {
		console.log(error);
	}

}

async function updateExistenciaRechazo(signo, itemPartida, fechaMovimiento) {
	let producto = await Producto.findOne({ _id: itemPartida.producto_id }).exec();
	if (itemPartida.embalajes) {
		for (let embajalePartida in itemPartida.embalajes) {

			if (producto.embalajesRechazo[embajalePartida]) {
				producto.embalajesRechazo[embajalePartida] += (signo * itemPartida.embalajes[embajalePartida]);
			} else if (signo > 0) {
				producto.embalajesRechazo[embajalePartida] = (signo * itemPartida.embalajes[embajalePartida]);
			}

		}
	}

	producto.pesoNetoRechazo += (signo * itemPartida.pesoNeto);
	producto.pesoBrutoRechazo += (signo * itemPartida.pesoBruto);

	if (signo == 1) {
		producto.fechaUltimaEntradaRechazo = new Date(fechaMovimiento);
	}
	else {
		producto.fechaUltimaSalidaRechazo = new Date(fechaMovimiento);
	}

	let item = {
		embalajesRechazo: producto.embalajesRechazo,
		fechaUltimaEntradaRechazo: producto.fechaUltimaEntradaRechazo,
		fechaUltimaSalidaRechazo: producto.fechaUltimaSalidaRechazo,
		pesoBrutoRechazo: producto.pesoBrutoRechazo,
		pesoNetoRechazo: producto.pesoNetoRechazo
	};

	producto.save();

	await Producto.updateOne({ _id: itemPartida.producto_id }, { $set: item })
		.then((productoUpdated) => {

		})
		.catch((err) => {

		});
}

function getByProducto(req, res) {
	let _producto_id = req.query.producto_id;
	let _arrTipo = req.query.arrTipo;

	MovimientoInventario.find({ producto_id: _producto_id, tipo: { $in: _arrTipo } }).sort({ fechaMovimiento: -1 })
		.populate({
			path: 'producto_id'
		})
		.populate({
			path: 'entrada_id',
			model: 'Entrada',
			match: { 'status': {$in:["APLICADA","FINALIZADO"]} }
		})
		.populate({
			path: 'salida_id',
			model: 'Salida',
			match:{"tipo" : "NORMAL"}
			
		})
		.populate({
			path: 'posicion_id'
		})
		.then((movimientos) => {
			res.status(200).send(movimientos);
		})
		.catch(err => console.log(err));
}

function getPosicionesByProducto(req, res) {
	let _producto_id = req.query.producto_id;
	let _almacen_id = req.query.almacen_id;

	MovimientoInventario.find({
		producto_id: _producto_id,
		almacen_id: _almacen_id,
		tipo: { $in: ["ENTRADA", "ENTRADA_RECHAZO"] }
	}, { posicion_id: "" })
		.populate({
			path: 'posicion_id'
		})
		.then((posiciones) => {
			posiciones = Array.from(new Set(posiciones.map(x => x.posicion_id)));
			res.status(200).send(posiciones);
		})
		.catch(err => console.log(err));
}

function get(req, res) {

	MovimientoInventario.find({})
		.populate({
			path: 'producto_id'
		})
		.populate({
			path: 'entrada_id'
		})
		.populate({
			path: 'salida_id'
		})
		.populate({
			path: 'almacen_id'
		})
		.populate({
			path: 'posicion_id'
		})
		.then((movimientos) => {
			res.status(200).send(movimientos);
		})
		.catch(err => console.log(err));
}

async function getByIDs_cte_suc_alm(req, res) {
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let fechaI = req.query.fechaInicio;
	let fechaF = req.query.fechaFinal;
	let tipo = req.query.tipo;

	let boolNull = !_arrClientesFiscales.includes(null) && !_arrSucursales.includes(null) && !_arrAlmacenes.includes(null);
	let boolEmtpy = !_arrClientesFiscales.includes("") && !_arrSucursales.includes("") && !_arrAlmacenes.includes("");

	if (boolEmtpy && boolNull) {

		let filtro = {
			clienteFiscal_id: { $in: _arrClientesFiscales },
			sucursal_id: { $in: _arrSucursales },
			almacen_id: { $in: _arrAlmacenes },
			tipo: { $nin: ["SALIDA_RECHAZO", "ENTRADA_RECHAZO"] }
		};
		if (tipo != null && tipo != "TODOS") {
			filtro["tipo"] = tipo;
		}
		let filtroEntrada = {
			clienteFiscal_id: { $in: _arrClientesFiscales },
			sucursal_id: { $in: _arrSucursales },
			almacen_id: { $in: _arrAlmacenes }
		};
		let filtroSalida = {
			clienteFiscal_id: { $in: _arrClientesFiscales },
			sucursal_id: { $in: _arrSucursales },
			almacen_id: { $in: _arrAlmacenes }
		};
		if (fechaI != null && fechaI != fechaF) {
			let rango = {
				$gte: new Date(fechaI), //grater than
				$lt: new Date(fechaF) //less than
			};
			filtroEntrada["fechaEntrada"] = rango;
			filtroSalida["fechaSalida"] = rango;

			let entradas = await Entrada.find(filtroEntrada).exec();
			let salidas = await Salida.find(filtroSalida).exec();


			let arrEntradas = entradas.map(x => x._id);
			let arrSalidas = salidas.map(x => x._id);


			if (tipo == "ENTRADA") {
				filtro = {
					entrada_id: { $in: arrEntradas }
				};
			} else if (tipo == "SALIDA") {
				filtro = {
					salida_id: { $in: arrSalidas }
				};
			} else {
				filtro = {
					$or: [
						{ entrada_id: { $in: arrEntradas } },
						{ salida_id: { $in: arrSalidas } }
					]
				};
			}
		}

		MovimientoInventario.find(filtro)
			.populate({
				path: 'producto_id'
			})
			.populate({
				path: 'entrada_id'
			})
			.populate({
				path: 'salida_id'
			})
			.populate({
				path: 'almacen_id'
			})
			.populate({
				path: 'clienteFiscal_id'
			})
			.populate({
				path: 'posicion_id'
			})
			.then((movimientos) => {
				res.status(200).send(movimientos);
			})
			.catch((err) => {
				res.status(500).send(err);
			});

	}
}

async function updateMovimientos(idEntrada,fechaEntrada)
{
	let movimientos = await MovimientoInventario.find({entrada_id:idEntrada});
	await Helper.asyncForEach(movimientos,async function (movimiento) {
		await MovimientoInventario.updateOne({_id: movimiento._id}, { $set: { fechaEntrada: fechaEntrada }});

	});
}

module.exports = {
	get,
	getByIDs_cte_suc_alm,
	getByProducto,
	getPosicionesByProducto,
	saveSalida,
	saveEntrada,
	saveAjuste,
	saveExistenciaInicial,
	updateExistenciaPosicion,
	updateExistencia,
	updateMovimientos,
	saveSalidaMovimiento,
	updateExistenciaPosicionSalida
}