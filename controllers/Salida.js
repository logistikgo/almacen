'use strict'

const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const PartidaModel = require('../models/Partida');
const Producto = require('../models/Producto');
const reporteModel = require('../models/backupRepoteSalidas');
const Entrada = require('../models/Entrada');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const Helper = require('../helpers');
const PrePartidaM = require("../models/PrePartida");
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const TiempoCargaDescarga = require("../controllers/TiempoCargaDescarga");
const EmbalajesController = require('../controllers/Embalaje');
const ClienteFiscal = require('../models/ClienteFiscal');
function getNextID() {
	return Helper.getNextID(Salida, "salida_id");
}

function get(req, res) {
	Salida.find({})
		.then((salidas) => {
			res.status(200).send(salidas);
		})
		.catch(error => console.log(error));
}

function getSalidasByIDs(req, res) {
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;

	let filter = {
		clienteFiscal_id: _idClienteFiscal,
		sucursal_id: _idSucursal,
		almacen_id: _idAlmacen,
		tipo: _tipo
	};

	Salida.find(filter).sort({ fechaSalida: -1 })
		.then((salidas) => {
			res.status(200).send(salidas);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getByID(req, res) {
	let _salida_id = req.params.salida_id;

	Salida.findOne({ _id: _salida_id })
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		})
		.populate({
			path: 'clienteFiscal_id',
			model: 'ClienteFiscal'
		})
		.populate({
			path: 'tiempoCarga_id',
			model: 'TiempoCargaDescarga'
		})
		.then((data) => {
			res.status(200).send(data);
		})
		.catch(error => res.status(500).send(error));
}

function getxRangoFechas(req, res) {
	let fechaInicio = new Date(req.query.fechaInicio);
	let fechaFin = new Date(req.query.fechaFin);
	let clienteFiscal_id = req.query.clienteFiscal_id;

	Salida.find({ clienteFiscal_id: clienteFiscal_id, fechaSalida: { $gte: fechaInicio, $lt: fechaFin } })
		.populate({
			path: 'partidas',
			model: 'Partida'
		})
		.then((salidas) => {
			res.status(200).send(salidas);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

async function save(req, res) {
	let nSalida = new Salida(req.body);

	nSalida.fechaSalida = new Date(req.body.fechaSalida);
	nSalida.salida_id = await getNextID();
	nSalida.folio = await getNextID();
	nSalida.fechaAlta = new Date(Date.now()-(5*3600000));
	nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O', false);

	nSalida.save()
		.then(async (salida) => {
			//si es pedido, no hace afectacion de existencias
			for (let itemPartida of req.body.jsonPartidas) {
				await MovimientoInventario.saveSalida(itemPartida, salida.id);
			}

			TiempoCargaDescarga.setStatus(salida.tiempoCarga_id, { salida_id: salida._id, status: "ASIGNADO" });

			let partidas = await Partida.put(req.body.jsonPartidas, salida._id);
			salida.partidas = partidas;
			// console.log(partidas);

			await saveSalidasEnEntrada(salida.entrada_id, salida._id);
			await Salida.updateOne({ _id: salida._id }, { $set: { partidas: partidas } }).then((updated) => {
				res.status(200).send(salida);
			});
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

async function update(req, res) {
	let bodyParams = req.body;
	let salida_id = bodyParams.salidaid;
	bodyParams.fechaSalida = new Date(bodyParams.fechaSalida);
	bodyParams.fechaAlta = new Date(Date.now()-(5*3600000));

	// for (let partida of req.body) {
	// 	Partida._put(partida);
	// }
	Salida.updateOne(
		{ _id: salida_id },
		{ $set: req.body })
		.then((salida) => {
			res.status(200).send(salida);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function isEmptyPartida(partida) {
	let contEmbalajesCero = 0;
	let tamEmbalajes = 0;
	let isPesosEmpty = false;
	let isEmbalajesEmpty = false;

	for (let embalaje in partida.embalajes) { tamEmbalajes += 1; } //Se obtiene la cantidad de embalajes
	for (let embalaje in partida.embalajes) {  //Obtiene la cantidad de embalajes con cero
		if (partida.embalajes[embalaje] < 1) contEmbalajesCero += 1;
	}

	if (partida.pesoBruto == 0 && partida.pesoNeto == 0)
		isPesosEmpty = true;
	else
		isPesosEmpty = false;
	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if (tamEmbalajes == contEmbalajesCero)
		isEmbalajesEmpty = true;
	else
		isEmbalajesEmpty = false;

	if (isEmbalajesEmpty && isPesosEmpty)
		return true;
	else
		return false;

}

function isEmptyPartidas(partidas) {
	let tamPartidas = partidas.length;
	let conPartidasCero = 0;

	partidas.forEach(function (partida) {
		if (isEmptyPartida(partida)) conPartidasCero += 1; //Obtiene la cantidad de partidas en cero
	});

	if (tamPartidas == conPartidasCero) //Si el total de partidas es igual al total de partidas con cero
		return true;
	else
		return false;
}

async function updatePartidasSalidaAPI(req, res) {
	let entrada_id = req.body.entrada_id;
	let partidasDeSalida = req.body.partidasDeSalida;

	//console.log(entrada_id);
	//console.log(partidasDeSalida);
	let entrada = await Entrada.findOne({ _id: entrada_id }).exec();
	let nuevasPartidas = [];
	//console.log(partidasDeSalida);
	entrada.partidasSalida.forEach(function (partidaDeEntrada) {
		let partidaEncontrada = partidasDeSalida.find(x => x._id.toString() == partidaDeEntrada._id.toString());
		if (partidaEncontrada != undefined) {
			for (let embalajeDeSalida in partidaEncontrada.embalajes) {
				if (partidaDeEntrada.embalajes[embalajeDeSalida] && partidaDeEntrada.embalajes[embalajeDeSalida] > 0) {
					partidaDeEntrada.embalajes[embalajeDeSalida] -= partidaEncontrada.embalajes[embalajeDeSalida];
				}
			}
			partidaDeEntrada.pesoBruto -= partidaEncontrada.pesoBruto;
			partidaDeEntrada.pesoNeto -= partidaEncontrada.pesoNeto;

			if (isEmptyPartida(partidaDeEntrada))
				partidaDeEntrada.isEmpty = true;
			else
				partidaDeEntrada.isEmpty = false;

		}
		nuevasPartidas.push(partidaDeEntrada);
	});
	let empty = false;
	empty = isEmptyPartidas(nuevasPartidas);


	let jEdit = {
		partidasSalida: nuevasPartidas,
		isEmpty: empty
	};

	Entrada.updateOne({ _id: entrada_id }, { $set: jEdit })
		.then((data) => {
			res.status(200).send(data);

		}).catch((error) => {
			res.status(500).send(error);
		});
}

async function saveSalidasEnEntrada(entrada_id, salida_id) {
	let entradas = await Entrada.find({ _id: { $in: entrada_id } }).exec();
	//console.log("ENTRADAS ENCONTRADAS DEL ARREGLO");
	//console.log(entrada_id);
	Helper.asyncForEach(entradas, async function (entrada) {
		entrada.salidas_id.push(salida_id);
		let jEdit = {
			salidas_id: entrada.salidas_id
		};
	//	console.log(jEdit);
		await Entrada.updateOne({ _id: entrada._id }, { $set: jEdit }).exec();
	});
}

async function saveSalidaAutomatica(req, res) {
	let partidas = await PartidaModel.find({ 'InfoPedidos.IDPedido': { $in: req.body.arrIDPedidos }, isEmpty: false }).lean().exec();

	if (partidas && partidas.length > 0) {

		let entradas_id = partidas.map(x => x.entrada_id.toString()).filter(Helper.distinct);
		let entradas = await Entrada.find({ "_id": { $in: entradas_id } });

		if ((entradas && entradas.length > 0)) {

			let nSalida = new Salida();
			nSalida.salida_id = await getNextID();
			nSalida.fechaAlta = new Date(Date.now()-(5*3600000));
			nSalida.fechaSalida = new Date(req.body.fechaSalida);
			nSalida.usuarioAlta_id = req.body.usuarioAlta_id;
			nSalida.nombreUsuario = req.body.nombreUsuario;
			nSalida.folio = await getNextID();

			nSalida.partidas = partidas.map(x => x._id);
			nSalida.transportista = req.body.transportista;
			nSalida.placasRemolque = req.body.placasRemolque;
			nSalida.placasTrailer = req.body.placasTrailer;
			nSalida.operador = req.body.operador;
			nSalida.entrada_id = entradas_id;



			nSalida.idClienteFiscal = entradas[0].idClienteFiscal;
			nSalida.idSucursal = entradas[0].idSucursal;
			nSalida.sucursal_id = entradas[0].sucursal_id;
			nSalida.almacen_id = entradas[0].almacen_id;
			nSalida.embarco = entradas[0].embarque;
			nSalida.referencia = entradas[0].referencia;
			nSalida.valor = entradas[0].valor;
			nSalida.clienteFiscal_id = entradas[0].clienteFiscal_id;
			nSalida.item = entradas[0].item;
			nSalida.tipo = entradas[0].tipo;//NORMAL

			nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O', false);

			nSalida.save()
				.then(async (salida) => {
					let partidasEdited = await Partida.updateForSalidaAutomatica(partidas, req.body.arrIDPedidos, salida._id);

					for (let itemPartida of partidasEdited) {
						await MovimientoInventario.saveSalida(itemPartida, salida.id);
					}

					await saveSalidasEnEntrada(salida.entrada_id, salida._id);

					res.status(200).send(salida);
				})
				.catch((error) => {
					res.status(500).send(error);
				});
		} else {
			res.status(400).send("Se trata de generar una salida sin entrada o esta vacia");
		}

	} else {
		res.status(400).send("Se trata de generar una salida sin partidas");
	}
}

function getPartidasDeEntrada(partidasDeEntrada, partidasDeSalida) {
	let IDSPartida = partidasDeSalida.map(x => x._id.toString());

	let partidas = [];
	partidasDeEntrada.forEach(function (partidaDeEntrada) {

		if (IDSPartida.includes(partidaDeEntrada._id.toString()) && !partidaDeEntrada.isEmpty) {
			partidas.push(partidaDeEntrada);
		}
	});
	return partidas;
}

function getReportePartidas(req, res) {
	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let fecha=req.query.fecha != undefined ? req.query.fecha : "";
	//console.log(req.query);
	var arrPartidas = [];
	var partidas = [];
	let Infull=req.query.inFull ? req.query.inFull :"";
	let InfullInit=req.query.inFull ? req.query.inFull.inicio != undefined ? req.query.inFull.inicio : "":"";
	let InfullFin=req.query.inFull ? req.query.inFull.fin != undefined ? req.query.inFull.fin : "":"";
	let clasificacion = req.query.clasificacion != undefined ? req.query.clasificacion : "";
	let subclasificacion = req.query.subclasificacion != undefined ? req.query.subclasificacion :"";
	let clave=req.query.producto_id != undefined ? req.query.producto_id : "";
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let valorontime=req.query.onTime ? req.query.onTime : "";
	let value = 0
	let fRecibo = "";
    let fSalida = "";
    let ontime = "";
    let resontime="";
	var salidas_id = [];
	let filter = {
		clienteFiscal_id: req.query.clienteFiscal_id
	}

	if(fechaInicio != "" &&  fechaFinal != ""){
		if(fecha == "fechaAlta")
		{
			filter.fechaAlta={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
		if(fecha == "fechaSalida")
		{
			filter.fechaSalida={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
	}
	//console.log(filter);
	if(folio != "")
	{
		filter.stringFolio=folio;
	}
	Salida.find(filter)
	.populate({
		path: 'partidas',
		model: 'Partida'
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto'
		}
	})
	.then((salidas) => {
		salidas.forEach(salida => {
			
			partidas = salida.partidas;

			partidas.forEach((partida) => {
				let embalajes;
				salidas_id = partida.salidas_id;

				salidas_id.forEach(elem => {
					let elemId = elem.salida_id;
					let paramId = salida._id;
					if(JSON.stringify(elemId) == JSON.stringify(paramId)) {
						embalajes = elem.embalajes;
					}
				})
				//console.log(partida);
				var paramsSalida = {
					_id: salida._id,
					stringFolio: salida.stringFolio,
					fechaAlta: salida.fechaAlta,
					fechaSalida: salida.fechaSalida,
					fechaCaducidad: partida.fechaCaducidad,
					transportista: salida.transportista,
					placas: salida.placas,
					placasRemolque: salida.placasRemolque,
					placasTrailer: salida.placasTrailer,
					embarco: salida.embarco,
					operador: salida.operador,
					referencia: salida.referencia,
					item: salida.item,
					clave: partida.clave,
					lote: partida.lote,
					descripcion: partida.descripcion,
					subclasificacion: partida.producto_id.subclasificacion,
					posiciones: partida.posiciones,
					CajasPedidas: partida.CajasPedidas,
					embalajes: embalajes,
					fechaReciboRemision: salida.fechaReciboRemision ? salida.fechaReciboRemision : "SIN ASIGNAR",
					producto_id:partida.producto_id,
					horaSello: salida.horaSello
				}
				if( Infull =="" && clave=="" && folio=="" && valorontime =="" && clasificacion == "" && subclasificacion == "" && paramsSalida.embalajes!= undefined){
					arrPartidas.push(paramsSalida);
					//console.log("in")
				}
				else
				{	
					let resClasificacion=true;
					let resSubclasificacion=true;
					let value = 0
		        	if(paramsSalida.CajasPedidas && paramsSalida.embalajes)
		        		value=(  paramsSalida.embalajes.cajas/paramsSalida.CajasPedidas.cajas) ? (paramsSalida.embalajes.cajas/(paramsSalida.CajasPedidas.cajas)) : 0;
					let resFull=true;
					let resClave=true;
					let resResontime=true;
					ontime=0;
					resontime="SIN ASIGNAR";
					if (paramsSalida.fechaReciboRemision !== "SIN ASIGNAR" && paramsSalida.fechaSalida) {
						fRecibo = paramsSalida.fechaReciboRemision.getTime();
					    fSalida = paramsSalida.fechaSalida.getTime();
					    ontime = Math.abs(Math.floor((fRecibo- fSalida)/86400000));
						if (ontime < 0)
			                resontime = "RETRASO"

			            else
			                resontime = "ATIEMPO";
		        	}
					if(clasificacion != "" && partida.producto_id.statusReg == "ACTIVO")
					{
						resClasificacion=partida.producto_id.clasificacion_id.toString() == clasificacion.toString() ;
					}
					if(subclasificacion != "" && partida.producto_id.statusReg == "ACTIVO")
					{
						resSubclasificacion=partida.producto_id.subclasificacion_id.toString() === subclasificacion.toString();
					}
					//console.log(valorontime + "==" + resontime )
					if(resontime != valorontime && valorontime !="")
					{
						resResontime =false;
					}
					if(clave != "" && partida.producto_id._id.toString() != clave.toString())
					{
						resClave=false;
					}
					if(Infull!="")
					{
						//console.log(InfullInit +"-"+(value*100)+"-"+InfullFin)
						if(InfullInit != "" && InfullFin!= "" && InfullFin!= "x")
						{
							if(value*100 >= parseInt(InfullInit) && value*100 <= parseInt(InfullFin))
							{
								resFull=true;
							}
							else
								resFull=false;
						}
						if(InfullInit != "" && InfullFin == "x")
						{
							if(value*100 >= parseInt(InfullInit) && value*100 <= parseInt(InfullFin))
							{
								resFull=true;
							}
							else
								resFull=false;
						}
					}
					//console.log(resFull);
					//console.log(resFull+" == true && "+resClasificacion+" == true && "+resSubclasificacion+" == true && "+resClave+"==true && "+resResontime+"==true")
					if(resFull == true && resClasificacion == true && resSubclasificacion == true && resClave==true && resResontime==true && paramsSalida.embalajes!= undefined)
					{
						arrPartidas.push(paramsSalida);
					}
				}
				

			})
		})
		res.status(200).send(arrPartidas);
	})
	.catch((error) => {
		res.status(500).send(error);
		console.log(error);
	});
}

async function getExcelSalidas(req, res) {
	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let fecha=req.query.fecha != undefined ? req.query.fecha : "";
	//console.log(req.query);
	var arrPartidas = [];
	var partidas = [];
	let Infull=req.query.inFull ? req.query.inFull :"";
	let InfullInit=req.query.inFull ? req.query.inFull.inicio != undefined ? req.query.inFull.inicio : "":"";
	let InfullFin=req.query.inFull ? req.query.inFull.fin != undefined ? req.query.inFull.fin : "":"";
	let clasificacion = req.query.clasificacion != undefined ? req.query.clasificacion : "";
	let subclasificacion = req.query.subclasificacion != undefined ? req.query.subclasificacion :"";
	let clave=req.query.producto_id != undefined ? req.query.producto_id : "";
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let valorontime=req.query.onTime ? req.query.onTime : "";
	let tipoUsuario = req.query.tipoUsuario != undefined ? req.query.tipoUsuario : "";
	let value = 0
	let fRecibo = "";
    let fSalida = "";
    let ontime = "";
    let resontime="";
	var salidas_id = [];
	let filter = {
		clienteFiscal_id: req.query.clienteFiscal_id
	}

	if(fechaInicio != "" &&  fechaFinal != ""){
		if(fecha == "fechaAlta")
		{
			filter.fechaAlta={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
		if(fecha == "fechaSalida")
		{
			filter.fechaSalida={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
	}
	//console.log(filter);
	if(folio != "")
	{
		filter.stringFolio=folio;
	}
	Salida.find(filter)
	.populate({
		path: 'partidas',
		model: 'Partida'
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto'
		}
	})
	.then(async (salidas) => {
		salidas.forEach(salida => {
			
			partidas = salida.partidas;

			partidas.forEach((partida) => {
				let embalajes;
				salidas_id = partida.salidas_id;

				salidas_id.forEach(elem => {
					let elemId = elem.salida_id;
					let paramId = salida._id;
					if(JSON.stringify(elemId) == JSON.stringify(paramId)) {
						embalajes = elem.embalajes;
					}
				})
				//console.log(partida);
				var paramsSalida = {
					_id: salida._id,
					stringFolio: salida.stringFolio,
					fechaAlta: salida.fechaAlta,
					fechaSalida: salida.fechaSalida,
					fechaCaducidad: partida.fechaCaducidad,
					transportista: salida.transportista,
					placas: salida.placas,
					placasRemolque: salida.placasRemolque,
					placasTrailer: salida.placasTrailer,
					embarco: salida.embarco,
					operador: salida.operador,
					referencia: salida.referencia,
					item: salida.item,
					clave: partida.clave,
					lote: partida.lote,
					descripcion: partida.descripcion,
					subclasificacion: partida.producto_id.subclasificacion,
					posiciones: partida.posiciones,
					CajasPedidas: partida.CajasPedidas,
					embalajes: embalajes,
					fechaReciboRemision: salida.fechaReciboRemision ? salida.fechaReciboRemision : "SIN ASIGNAR",
					producto_id:partida.producto_id,
					horaSello: salida.horaSello
				}
				if( Infull =="" && clave=="" && folio=="" && valorontime =="" && clasificacion == "" && subclasificacion == "" && paramsSalida.embalajes!= undefined){
					arrPartidas.push(paramsSalida);
					//console.log("in")
				}
				else
				{	
					let resClasificacion=true;
					let resSubclasificacion=true;
					let value = 0
		        	if(paramsSalida.CajasPedidas && paramsSalida.embalajes)
		        		value=(  paramsSalida.embalajes.cajas/paramsSalida.CajasPedidas.cajas) ? (paramsSalida.embalajes.cajas/(paramsSalida.CajasPedidas.cajas)) : 0;
					let resFull=true;
					let resClave=true;
					let resResontime=true;
					ontime=0;
					resontime="SIN ASIGNAR";
					if (paramsSalida.fechaReciboRemision !== "SIN ASIGNAR" && paramsSalida.fechaSalida) {
						fRecibo = paramsSalida.fechaReciboRemision.getTime();
					    fSalida = paramsSalida.fechaSalida.getTime();
					    ontime = Math.abs(Math.floor((fRecibo- fSalida)/86400000));
						if (ontime < 0)
			                resontime = "RETRASO"

			            else
			                resontime = "ATIEMPO";
		        	}
					if(clasificacion != "" && partida.producto_id.statusReg == "ACTIVO")
					{
						resClasificacion=partida.producto_id.clasificacion_id.toString() == clasificacion.toString() ;
					}
					if(subclasificacion != "" && partida.producto_id.statusReg == "ACTIVO")
					{
						resSubclasificacion=partida.producto_id.subclasificacion_id.toString() === subclasificacion.toString();
					}
					//console.log(valorontime + "==" + resontime )
					if(resontime != valorontime && valorontime !="")
					{
						resResontime =false;
					}
					if(clave != "" && partida.producto_id._id.toString() != clave.toString())
					{
						resClave=false;
					}
					if(Infull!="")
					{
						//console.log(InfullInit +"-"+(value*100)+"-"+InfullFin)
						if(InfullInit != "" && InfullFin!= "" && InfullFin!= "x")
						{
							if(value*100 >= parseInt(InfullInit) && value*100 <= parseInt(InfullFin))
							{
								resFull=true;
							}
							else
								resFull=false;
						}
						if(InfullInit != "" && InfullFin == "x")
						{
							if(value*100 >= parseInt(InfullInit) && value*100 <= parseInt(InfullFin))
							{
								resFull=true;
							}
							else
								resFull=false;
						}
					}
					//console.log(resFull);
					//console.log(resFull+" == true && "+resClasificacion+" == true && "+resSubclasificacion+" == true && "+resClave+"==true && "+resResontime+"==true")
					if(resFull == true && resClasificacion == true && resSubclasificacion == true && resClave==true && resResontime==true && paramsSalida.embalajes!= undefined)
					{
						arrPartidas.push(paramsSalida);
					}
				}
				

			})
		})
		var excel = require('excel4node');
        var dateFormat = require('dateformat');
        var workbook = new excel.Workbook();
        var tituloStyle = workbook.createStyle({
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'center',
          },
        });
        var ResultStyle = workbook.createStyle({
          numberFormat: '#.0%; -#.0%; -',
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'center',
          },
          fill: {
		    type: 'pattern',
		    patternType: 'solid',
		    bgColor: '#FF0000',
		    fgColor: '#FF0000',
		  },
        });
        var OntimeStyle= workbook.createStyle({
          numberFormat: '#.0%; -#.0%; -',
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'center',
          },
          fill: {
		    type: 'pattern',
		    patternType: 'solid',
		    bgColor: '#FF0000',
		    fgColor: '#FF0000',
		  },
        });
        var headersStyle = workbook.createStyle({
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'left',
          },
        });
        var porcentajeStyle = workbook.createStyle({
            numberFormat: '#.0%; -#.0%; -'
        });
        var fitcellStyle = workbook.createStyle({
            alignment: {
                wrapText: true,
            },
        });

		let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
		let formatofecha=(clientefiscal._id == "5e33420d22b5651aecafe934" && tipoUsuario == "CLIENTE ADMINISTRADOR USA") ? "mm/dd/yyyy" : "dd/mm/yyyy";
		let formatofechaHora=(clientefiscal._id == "5e33420d22b5651aecafe934" && tipoUsuario == "CLIENTE ADMINISTRADOR USA") ? "mm/dd/yy H:M" : "dd/mm/yy H:M";
        let headercajas=clientefiscal._id == "5e33420d22b5651aecafe934" ? "Corrugado Despachados " : "cajas";
        let headerCajaspedido=clientefiscal._id == "5e33420d22b5651aecafe934" ? "Corrugado Solicitados" : "cajas Pedidas";
      	
        let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
        let ArrayEmbalaje = await EmbalajesController.getArrayEmbalajes();

        var worksheet = workbook.addWorksheet('Partidas');
        worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
        worksheet.cell(2, 1).string('Pedido').style(headersStyle);
        worksheet.cell(2, 2).string('Lote').style(headersStyle);
        worksheet.cell(2, 3).string('Folio salida').style(headersStyle);
        worksheet.cell(2, 4).string('Item').style(headersStyle);
        worksheet.cell(2, 5).string('Clave').style(headersStyle);
		worksheet.cell(2, 6).string('Descripción').style(headersStyle);
		worksheet.cell(2, 7).string('Subclasificacion').style(headersStyle);
		worksheet.cell(2, 8).string('Fecha Entrada en Sistema').style(headersStyle);
		

		let indexheaders=9;
		
		clienteEmbalaje.forEach(Embalaje=>{ 
            let index=ArrayEmbalaje.findIndex(obj=> (obj.clave == Embalaje));
                if(ArrayEmbalaje[index].clave== "cajas" && clientefiscal._id == "5e33420d22b5651aecafe934")
                    worksheet.cell(2, indexheaders).string(headercajas).style(headersStyle);
                else
                    worksheet.cell(2, indexheaders).string(ArrayEmbalaje[index].nombre).style(headersStyle);
                indexheaders++;
            
        });
		worksheet.cell(2, indexheaders).string(headerCajaspedido).style(headersStyle);
		worksheet.cell(2, indexheaders+1).string('In Full').style(headersStyle);
		worksheet.cell(2, indexheaders+2).string('Fecha Carga Programada').style(headersStyle);
		worksheet.cell(2, indexheaders+3).string('Fecha Salida').style(headersStyle);
		worksheet.cell(2, indexheaders+4).string('Fecha/Hora Sello').style(headersStyle);
		worksheet.cell(2, indexheaders+5).string('Fecha Caducidad').style(headersStyle);
		worksheet.cell(2, indexheaders+6).string('Retraso').style(headersStyle);
		worksheet.cell(2, indexheaders+7).string('On Time').style(headersStyle);
		worksheet.cell(2, indexheaders+8).string('Datos Tracto');
		worksheet.cell(2, indexheaders+9).string('Datos Remolque');
		worksheet.cell(2, indexheaders+10).string('Ubicacion').style(headersStyle);
        let i=3;
        //console.log("test1")
        arrPartidas.sort(function(a, b) {
		    a = new Date(a.fechaSalida);
		    b = new Date(b.fechaSalida);
		    return a>b ? -1 : a<b ? 1 : 0;
		});
        arrPartidas.forEach(partidas => 
        {
        	worksheet.cell(i, 1).string(partidas.referencia ? partidas.referencia:"");
        	worksheet.cell(i, 2).string(partidas.lote ? partidas.lote:"");
        	worksheet.cell(i, 3).string(partidas.stringFolio ? partidas.stringFolio:"");
        	worksheet.cell(i, 4).string(partidas.item ? partidas.item:"");
        	worksheet.cell(i, 5).string(partidas.clave ? partidas.clave:"");
        	worksheet.cell(i, 6).string(partidas.descripcion ? partidas.descripcion:"");
        	worksheet.cell(i, 7).string(partidas.subclasificacion ? partidas.subclasificacion:"");
        	worksheet.cell(i, 8).string(partidas.fechaAlta ? dateFormat(partidas.fechaAlta, formatofecha):"");
			let indexbody=9;
           	clienteEmbalaje.forEach(emb=>
           	{	
           		let tarimas =0
           		  //console.log(partidas)
           		if (emb == 'tarimas' && partidas.producto_id != undefined && partidas.producto_id.arrEquivalencias.length > 0) {
	                let band = false;

	                partidas.producto_id.arrEquivalencias.forEach(function (equivalencia) {

	                	//console.log(equivalencia);
	                    if (equivalencia.embalaje === "Tarima" && equivalencia.embalajeEquivalencia === "Caja") {

	                        tarimas = partidas.embalajes.cajas / equivalencia.cantidadEquivalencia ? (partidas.embalajes.cajas / equivalencia.cantidadEquivalencia).toFixed(1) : 0;
	                        band = true;
	                    }
	                });
	                if (band !== true){
	                    tarimas = partidas.embalajes.tarimas ? partidas.embalajes.tarimas : 0;
	                	
	                }
	                worksheet.cell(i, indexbody).number(parseInt(tarimas));
	            }
	            else {
	            	if(partidas.embalajes != undefined){
	                worksheet.cell(i, indexbody).number(partidas.embalajes[emb] ? parseInt(partidas.embalajes[emb]):0);
	            	}
	            	else
	            		worksheet.cell(i, indexbody).number(0);
	            }
           		indexbody++;
           	});
        	if(partidas.CajasPedidas)
        		worksheet.cell(i, indexbody).string(partidas.CajasPedidas ? partidas.CajasPedidas.cajas.toString():"0");
        	else
        		worksheet.cell(i, indexbody).string("0")
        	let value = 0
        	if(partidas.CajasPedidas && partidas.embalajes)
        		value=( partidas.embalajes.cajas/partidas.CajasPedidas.cajas) ? (partidas.embalajes.cajas/(partidas.CajasPedidas.cajas)) : 0;
        	
        	if (value*100 >= 100)
        	{
           		ResultStyle = workbook.createStyle({
           		  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#008000',
				    fgColor: '#008000',
				  },
		        });
       		}
       		else{
       			
       			ResultStyle = workbook.createStyle({
       			  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#FF0000',
				    fgColor: '#FF0000',
				  },
	        	});
       		}

       		//console.log("Test");
       		//console.log(value);
       		if(value != Infinity)
        		worksheet.cell(i, indexbody+1).number(value).style(ResultStyle);
        	//console.log(partidas.fechaReciboRemision);
        	worksheet.cell(i, indexbody+2).string(partidas.fechaReciboRemision ? partidas.fechaReciboRemision!="SIN ASIGNAR" ? dateFormat(new Date(partidas.fechaReciboRemision), formatofecha):"SIN ASIGNAR":"");
			worksheet.cell(i, indexbody+3).string(partidas.fechaSalida ? dateFormat(partidas.fechaSalida, formatofecha):"");
			worksheet.cell(i, indexbody+4).string(partidas.horaSello ? dateFormat(partidas.horaSello, formatofechaHora):"SIN ASIGNAR");
			worksheet.cell(i, indexbody+5).string(partidas.fechaCaducidad ? dateFormat(partidas.fechaCaducidad, formatofecha): "");
        	ontime =0;
			if (partidas.fechaReciboRemision !== "SIN ASIGNAR" && partidas.fechaSalida) {
			    fRecibo = partidas.fechaReciboRemision.getTime();
			    fSalida = partidas.fechaSalida.getTime();
			    ontime = Math.abs(Math.floor((fRecibo- fSalida)/86400000));
			}
			let resontime="";
			if (ontime < 0){
                resontime = "RETRASO";
                OntimeStyle = workbook.createStyle({
       			  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#FF0000',
				    fgColor: '#FF0000',
				  },
	        	});
			}
            else{
                resontime = "A TIEMPO";
                OntimeStyle = workbook.createStyle({
           		  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#008000',
				    fgColor: '#008000',
				  },
		        });
            }
			worksheet.cell(i, indexbody+6).number(ontime);
           	worksheet.cell(i, indexbody+7).string(resontime).style(OntimeStyle);
			worksheet.cell(i, indexbody+8).string(partidas.placasTrailer? partidas.placasTrailer : "SIN ASIGNAR");
			worksheet.cell(i, indexbody+9).string(partidas.placasRemolque? partidas.placasRemolque : "SIN ASIGNAR");
           
            let res=""
            if(partidas.posiciones.length === 1) 
            	res = partidas.posiciones[0].pasillo + partidas.posiciones[0].nivel + partidas.posiciones[0].posicion;
            worksheet.cell(i, indexbody+10).string(res);
			
            i++;
        });
        workbook.write('ReporteSali'+dateFormat(new Date(Date.now()-(5*3600000)), formatofecha)+'.xlsx',res);

	})
	.catch((error) => {
		console.log(error);
		res.status(500).send(error);
		
	});
}

async function getExcelSalidasBarcel(req, res) {
	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let fecha=req.query.fecha != undefined ? req.query.fecha : "";
	//console.log(req.query);
	var arrPartidas = [];
	var partidas = [];
	let Infull=req.query.inFull ? req.query.inFull :"";
	let InfullInit=req.query.inFull ? req.query.inFull.inicio != undefined ? req.query.inFull.inicio : "":"";
	let InfullFin=req.query.inFull ? req.query.inFull.fin != undefined ? req.query.inFull.fin : "":"";
	let clasificacion = req.query.clasificacion != undefined ? req.query.clasificacion : "";
	let subclasificacion = req.query.subclasificacion != undefined ? req.query.subclasificacion :"";
	let clave=req.query.producto_id != undefined ? req.query.producto_id : "";
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let valorontime=req.query.onTime ? req.query.onTime : "";
	let tipoUsuario = req.query.tipoUsuario != undefined ? req.query.tipoUsuario : "";
	let value = 0
	let fRecibo = "";
    let fSalida = "";
    let ontime = "";
    let resontime="";
	var salidas_id = [];
	let fechaInicio2= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal2= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let quickfix=false;
	let filter2={};
	var arrPartidas2 = [];
	let filter = {
		clienteFiscal_id: req.query.clienteFiscal_id
	}

	if(fechaInicio != "" &&  fechaFinal != ""){
		//console.log("test"+fechaInicio)
		//console.log(fechaInicio.toString());
		if(new Date(fechaInicio)<new Date("08/1/2020")){

			fechaInicio=new Date("08/1/2020");
			quickfix=true;
			fechaFinal2=new Date("08/1/2020");
		//	console.log(fechaInicio.toString())
		}
		if(fecha == "fechaAlta")
		{
			filter.fechaAlta={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		    filter2.fechaAlta=
		    {
		    	$gte:fechaInicio2,
		        $lt: fechaFinal2
		    };
		}
		if(fecha == "fechaSalida")
		{
			filter.fechaSalida={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		    filter2.fechaSalida=
		    {
		    	$gte:fechaInicio2,
		        $lt: fechaFinal2
		    };
		}
	}
	else
	{
		filter.fechaSalida={
			$gte: new Date("08/01/2020")
		}
		quickfix=true;
	}
	//console.log(quickfix);
	if(quickfix==true)
	{

		var Repo=await reporteModel.find().then(async (reporte) => {
			await Helper.asyncForEach(reporte,async function (repo){
			//console.log("repo")
			var paramsSalida = {
					pedido: repo.pedido,
					lote: repo.lote,
					item: repo.item,
					stringFolio: repo.stringFolio,
					clave: repo.clave,
					descripcion: repo.descripcion,
					subclasificacion: repo.Subclasificacion,
					fechaAlta:repo.fechaAlta,
					tarima:repo.tarima,
					despacho: repo.despacho,
					solicitados: repo.solicitados,
					infull:repo.infull,
					FechaCargaProgramada: repo.FechaCargaProgramada,
					fechaSalida: repo.fechaSalida,
					horaSello: repo.horaSello,
					fechaCaducidad: repo.fechaCaducidad,
					retraso: repo.retraso,
					onTime: repo.onTime,
					placasTrailer: repo.placasTrailer,
					placasRemolque: repo.placasRemolque,
					ubicacion: repo.ubicacion
				}
				//console.log(paramsSalida);
				arrPartidas2.push(paramsSalida);
				//console.log(arrPartidas2)
				
			});	
		});

	}/*
	console.log(arrPartidas2);
	//console.log("test")
	console.log(fechaInicio.toString());*/
	if(folio != "")
	{
		filter.stringFolio=folio;
	}
	//console.log(filter);
	Salida.find(filter)
	.populate({
		path: 'partidas',
		model: 'Partida'
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto'
		}
	})
	.then(async (salidas) => {
		salidas.forEach(salida => {
			
			partidas = salida.partidas;

			partidas.forEach((partida) => {
				let embalajes;
				salidas_id = partida.salidas_id;

				salidas_id.forEach(elem => {
					let elemId = elem.salida_id;
					let paramId = salida._id;
					if(JSON.stringify(elemId) == JSON.stringify(paramId)) {
						embalajes = elem.embalajes;
					}
				})
				//console.log(partida);
				var paramsSalida = {
					_id: salida._id,
					stringFolio: salida.stringFolio,
					fechaAlta: salida.fechaAlta,
					fechaSalida: salida.fechaSalida,
					fechaCaducidad: partida.fechaCaducidad,
					transportista: salida.transportista,
					placas: salida.placas,
					placasRemolque: salida.placasRemolque,
					placasTrailer: salida.placasTrailer,
					embarco: salida.embarco,
					operador: salida.operador,
					referencia: salida.referencia,
					item: salida.item,
					clave: partida.clave,
					lote: partida.lote,
					descripcion: partida.descripcion,
					subclasificacion: partida.producto_id.subclasificacion,
					posiciones: partida.posiciones,
					CajasPedidas: partida.CajasPedidas,
					embalajes: embalajes,
					fechaReciboRemision: salida.fechaReciboRemision ? salida.fechaReciboRemision : "SIN ASIGNAR",
					producto_id:partida.producto_id,
					horaSello: salida.horaSello
				}
				if( Infull =="" && clave=="" && folio=="" && valorontime =="" && clasificacion == "" && subclasificacion == "" && paramsSalida.embalajes!= undefined){
					arrPartidas.push(paramsSalida);
					//console.log("in")
				}
				else
				{	
					let resClasificacion=true;
					let resSubclasificacion=true;
					let value = 0
		        	if(paramsSalida.CajasPedidas && paramsSalida.embalajes)
		        		value=(  paramsSalida.embalajes.cajas/paramsSalida.CajasPedidas.cajas) ? (paramsSalida.embalajes.cajas/(paramsSalida.CajasPedidas.cajas)) : 0;
					let resFull=true;
					let resClave=true;
					let resResontime=true;
					ontime=0;
					resontime="SIN ASIGNAR";
					if (paramsSalida.fechaReciboRemision !== "SIN ASIGNAR" && paramsSalida.fechaSalida) {
						fRecibo = paramsSalida.fechaReciboRemision.getTime();
					    fSalida = paramsSalida.fechaSalida.getTime();
					    ontime = Math.abs(Math.floor((fRecibo- fSalida)/86400000));
						if (ontime < 0)
			                resontime = "RETRASO"

			            else
			                resontime = "ATIEMPO";
		        	}
					if(clasificacion != "" && partida.producto_id.statusReg == "ACTIVO")
					{
						resClasificacion=partida.producto_id.clasificacion_id.toString() == clasificacion.toString() ;
					}
					if(subclasificacion != "" && partida.producto_id.statusReg == "ACTIVO")
					{
						resSubclasificacion=partida.producto_id.subclasificacion_id.toString() === subclasificacion.toString();
					}
					//console.log(valorontime + "==" + resontime )
					if(resontime != valorontime && valorontime !="")
					{
						resResontime =false;
					}
					if(clave != "" && partida.producto_id._id.toString() != clave.toString())
					{
						resClave=false;
					}
					if(Infull!="")
					{
						//console.log(InfullInit +"-"+(value*100)+"-"+InfullFin)
						if(InfullInit != "" && InfullFin!= "" && InfullFin!= "x")
						{
							if(value*100 >= parseInt(InfullInit) && value*100 <= parseInt(InfullFin))
							{
								resFull=true;
							}
							else
								resFull=false;
						}
						if(InfullInit != "" && InfullFin == "x")
						{
							if(value*100 >= parseInt(InfullInit) && value*100 <= parseInt(InfullFin))
							{
								resFull=true;
							}
							else
								resFull=false;
						}
					}
					//console.log(resFull);
					//console.log(resFull+" == true && "+resClasificacion+" == true && "+resSubclasificacion+" == true && "+resClave+"==true && "+resResontime+"==true")
					if(resFull == true && resClasificacion == true && resSubclasificacion == true && resClave==true && resResontime==true && paramsSalida.embalajes!= undefined)
					{
						arrPartidas.push(paramsSalida);
					}
				}
				

			})
		})
		var excel = require('excel4node');
        var dateFormat = require('dateformat');
        var workbook = new excel.Workbook();
        var tituloStyle = workbook.createStyle({
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'center',
          },
        });
        var ResultStyle = workbook.createStyle({
          numberFormat: '#.0%; -#.0%; -',
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'center',
          },
          fill: {
		    type: 'pattern',
		    patternType: 'solid',
		    bgColor: '#FF0000',
		    fgColor: '#FF0000',
		  },
        });
        var OntimeStyle= workbook.createStyle({
          numberFormat: '#.0%; -#.0%; -',
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'center',
          },
          fill: {
		    type: 'pattern',
		    patternType: 'solid',
		    bgColor: '#FF0000',
		    fgColor: '#FF0000',
		  },
        });
        var headersStyle = workbook.createStyle({
          font: {
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: 'left',
          },
        });
        var porcentajeStyle = workbook.createStyle({
            numberFormat: '#.0%; -#.0%; -'
        });
        var fitcellStyle = workbook.createStyle({
            alignment: {
                wrapText: true,
            },
        });

		let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
		let formatofecha=(clientefiscal._id == "5e33420d22b5651aecafe934" && tipoUsuario == "CLIENTE ADMINISTRADOR USA") ? "mm/dd/yyyy" : "dd/mm/yyyy";
		let formatofechaHora=(clientefiscal._id == "5e33420d22b5651aecafe934" && tipoUsuario == "CLIENTE ADMINISTRADOR USA") ? "mm/dd/yy H:M" : "dd/mm/yy H:M";
        let headercajas=clientefiscal._id == "5e33420d22b5651aecafe934" ? "Corrugado Despachados " : "cajas";
        let headerCajaspedido=clientefiscal._id == "5e33420d22b5651aecafe934" ? "Corrugado Solicitados" : "cajas Pedidas";
      	let indexbody=0
        let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
        let ArrayEmbalaje = await EmbalajesController.getArrayEmbalajes();

        var worksheet = workbook.addWorksheet('Partidas');
        worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
        worksheet.cell(2, 1).string('Pedido').style(headersStyle);
        worksheet.cell(2, 2).string('Lote').style(headersStyle);
        worksheet.cell(2, 3).string('Folio salida').style(headersStyle);
        worksheet.cell(2, 4).string('Item').style(headersStyle);
        worksheet.cell(2, 5).string('Clave').style(headersStyle);
		worksheet.cell(2, 6).string('Descripción').style(headersStyle);
		worksheet.cell(2, 7).string('Subclasificacion').style(headersStyle);
		worksheet.cell(2, 8).string('Fecha Entrada en Sistema').style(headersStyle);
		

		let indexheaders=9;
		
		clienteEmbalaje.forEach(Embalaje=>{ 
            let index=ArrayEmbalaje.findIndex(obj=> (obj.clave == Embalaje));
                if(ArrayEmbalaje[index].clave== "cajas" && clientefiscal._id == "5e33420d22b5651aecafe934")
                    worksheet.cell(2, indexheaders).string(headercajas).style(headersStyle);
                else
                    worksheet.cell(2, indexheaders).string(ArrayEmbalaje[index].nombre).style(headersStyle);
                indexheaders++;
            
        });
		worksheet.cell(2, indexheaders).string(headerCajaspedido).style(headersStyle);
		worksheet.cell(2, indexheaders+1).string('In Full').style(headersStyle);
		worksheet.cell(2, indexheaders+2).string('Fecha Carga Programada').style(headersStyle);
		worksheet.cell(2, indexheaders+3).string('Fecha Salida').style(headersStyle);
		worksheet.cell(2, indexheaders+4).string('Fecha/Hora Sello').style(headersStyle);
		worksheet.cell(2, indexheaders+5).string('Fecha Caducidad').style(headersStyle);
		worksheet.cell(2, indexheaders+6).string('Retraso').style(headersStyle);
		worksheet.cell(2, indexheaders+7).string('On Time').style(headersStyle);
		worksheet.cell(2, indexheaders+8).string('Datos Tracto');
		worksheet.cell(2, indexheaders+9).string('Datos Remolque');
		worksheet.cell(2, indexheaders+10).string('Ubicacion').style(headersStyle);
        let i=3;
        //console.log("test1")
        arrPartidas.sort(function(a, b) {
		    a = new Date(a.fechaSalida);
		    b = new Date(b.fechaSalida);
		    return a>b ? -1 : a<b ? 1 : 0;
		});
		
		
        arrPartidas.forEach(partidas => 
        {
        	worksheet.cell(i, 1).string(partidas.referencia ? partidas.referencia:"");
        	worksheet.cell(i, 2).string(partidas.lote ? partidas.lote:"");
        	worksheet.cell(i, 3).string(partidas.stringFolio ? partidas.stringFolio:"");
        	worksheet.cell(i, 4).string(partidas.item ? partidas.item:"");
        	worksheet.cell(i, 5).string(partidas.clave ? partidas.clave:"");
        	worksheet.cell(i, 6).string(partidas.descripcion ? partidas.descripcion:"");
        	worksheet.cell(i, 7).string(partidas.subclasificacion ? partidas.subclasificacion:"");
        	worksheet.cell(i, 8).string(partidas.fechaAlta ? dateFormat(partidas.fechaAlta, formatofecha):"");
			indexbody=9;
           	clienteEmbalaje.forEach(emb=>
           	{	
           		let tarimas =0
           		  //console.log(partidas)
           		if (emb == 'tarimas' && partidas.producto_id != undefined && partidas.producto_id.arrEquivalencias.length > 0) {
	                let band = false;

	                partidas.producto_id.arrEquivalencias.forEach(function (equivalencia) {

	                	//console.log(equivalencia);
	                    if (equivalencia.embalaje === "Tarima" && equivalencia.embalajeEquivalencia === "Caja") {

	                        tarimas = partidas.embalajes.cajas / equivalencia.cantidadEquivalencia ? (partidas.embalajes.cajas / equivalencia.cantidadEquivalencia).toFixed(1) : 0;
	                        band = true;
	                    }
	                });
	                if (band !== true){
	                    tarimas = partidas.embalajes.tarimas ? partidas.embalajes.tarimas : 0;
	                	
	                }
	                worksheet.cell(i, indexbody).number(parseInt(tarimas));
	            }
	            else {
	            	if(partidas.embalajes != undefined){
	                worksheet.cell(i, indexbody).number(partidas.embalajes[emb] ? parseInt(partidas.embalajes[emb]):0);
	            	}
	            	else
	            		worksheet.cell(i, indexbody).number(0);
	            }
           		indexbody++;
           	});
        	if(partidas.CajasPedidas)
        		worksheet.cell(i, indexbody).string(partidas.CajasPedidas ? partidas.CajasPedidas.cajas.toString():"0");
        	else
        		worksheet.cell(i, indexbody).string("0")
        	let value = 0
        	if(partidas.CajasPedidas && partidas.embalajes)
        		value=( partidas.embalajes.cajas/partidas.CajasPedidas.cajas) ? (partidas.embalajes.cajas/(partidas.CajasPedidas.cajas)) : 0;
        	
        	if (value*100 >= 100)
        	{
           		ResultStyle = workbook.createStyle({
           		  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#008000',
				    fgColor: '#008000',
				  },
		        });
       		}
       		else{
       			
       			ResultStyle = workbook.createStyle({
       			  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#FF0000',
				    fgColor: '#FF0000',
				  },
	        	});
       		}

       		//console.log("Test");
       		//console.log(value);
       		if(value != Infinity)
        		worksheet.cell(i, indexbody+1).number(value).style(ResultStyle);
        	//console.log(partidas.fechaReciboRemision);
        	worksheet.cell(i, indexbody+2).string(partidas.fechaReciboRemision ? partidas.fechaReciboRemision!="SIN ASIGNAR" ? dateFormat(new Date(partidas.fechaReciboRemision), formatofecha):"SIN ASIGNAR":"");
			worksheet.cell(i, indexbody+3).string(partidas.fechaSalida ? dateFormat(partidas.fechaSalida, formatofecha):"");
			worksheet.cell(i, indexbody+4).string(partidas.horaSello ? dateFormat(partidas.horaSello, formatofechaHora):"SIN ASIGNAR");
			worksheet.cell(i, indexbody+5).string(partidas.fechaCaducidad ? dateFormat(partidas.fechaCaducidad, formatofecha): "");
        	ontime =0;
			if (partidas.fechaReciboRemision !== "SIN ASIGNAR" && partidas.fechaSalida) {
			    fRecibo = partidas.fechaReciboRemision.getTime();
			    fSalida = partidas.fechaSalida.getTime();
			    ontime = Math.abs(Math.floor((fRecibo- fSalida)/86400000));
			}
			let resontime="";
			if (ontime < 0){
                resontime = "RETRASO";
                OntimeStyle = workbook.createStyle({
       			  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#FF0000',
				    fgColor: '#FF0000',
				  },
	        	});
			}
            else{
                resontime = "A TIEMPO";
                OntimeStyle = workbook.createStyle({
           		  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#008000',
				    fgColor: '#008000',
				  },
		        });
            }
			worksheet.cell(i, indexbody+6).number(ontime);
           	worksheet.cell(i, indexbody+7).string(resontime).style(OntimeStyle);
			worksheet.cell(i, indexbody+8).string(partidas.placasTrailer? partidas.placasTrailer : "SIN ASIGNAR");
			worksheet.cell(i, indexbody+9).string(partidas.placasRemolque? partidas.placasRemolque : "SIN ASIGNAR");
           
            let res=""
            if(partidas.posiciones.length === 1) 
            	res = partidas.posiciones[0].pasillo + partidas.posiciones[0].nivel + partidas.posiciones[0].posicion;
            worksheet.cell(i, indexbody+10).string(res);
			
            i++;
        });
		arrPartidas2.forEach(partidas => 
        {
        	//console.log("ter");
        	worksheet.cell(i, 1).string(partidas.pedido ? partidas.pedido:"");
        	worksheet.cell(i, 2).string(partidas.lote ? partidas.lote:"");
        	worksheet.cell(i, 3).string(partidas.stringFolio ? partidas.stringFolio:"");
        	worksheet.cell(i, 4).string(partidas.item ? partidas.item:"");
        	worksheet.cell(i, 5).string(partidas.clave ? partidas.clave:"");
        	worksheet.cell(i, 6).string(partidas.descripcion ? partidas.descripcion:"");
        	worksheet.cell(i, 7).string(partidas.subclasificacion ? partidas.subclasificacion:"");
        	worksheet.cell(i, 8).string(partidas.fechaAlta ? dateFormat(partidas.fechaAlta, formatofecha):"");
			worksheet.cell(i, 9).number(partidas.tarima);
			worksheet.cell(i, 10).number(partidas.despacho);
			indexbody=11;
	        worksheet.cell(i, 11).string(partidas.solicitados ? partidas.solicitados.toString():"0");
        	
        	let value = partidas.infull
        	
        	if (value*100 >= 100)
        	{
           		ResultStyle = workbook.createStyle({
           		  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#008000',
				    fgColor: '#008000',
				  },
		        });
       		}
       		else{
       			
       			ResultStyle = workbook.createStyle({
       			  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#FF0000',
				    fgColor: '#FF0000',
				  },
	        	});
       		}

       		//console.log("Test");
       		//console.log(value);
       		if(value != Infinity)
        		worksheet.cell(i, indexbody+1).number(value).style(ResultStyle);
        	//console.log(partidas.fechaReciboRemision);
        	worksheet.cell(i, indexbody+2).string(partidas.fechaReciboRemision ? partidas.fechaReciboRemision!="SIN ASIGNAR" ? dateFormat(new Date(partidas.fechaReciboRemision), formatofecha):"SIN ASIGNAR":"");
			worksheet.cell(i, indexbody+3).string(partidas.fechaSalida ? dateFormat(partidas.fechaSalida, formatofecha):"");
			worksheet.cell(i, indexbody+4).string(partidas.horaSello ? dateFormat(partidas.horaSello, formatofechaHora):"SIN ASIGNAR");
			worksheet.cell(i, indexbody+5).string(partidas.fechaCaducidad ? dateFormat(partidas.fechaCaducidad, formatofecha): "");
        	ontime =0;
			
			
			if ("RETRASO"== partidas.onTime){
                resontime = "RETRASO";
                OntimeStyle = workbook.createStyle({
       			  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#FF0000',
				    fgColor: '#FF0000',
				  },
	        	});
			}
            else{
                resontime = "A TIEMPO";
                OntimeStyle = workbook.createStyle({
           		  numberFormat: '#.0%; -#.0%; -',
		          font: {
		            bold: true,
		          },
		          alignment: {
		            wrapText: true,
		            horizontal: 'center',
		          },
		          fill: {
				    type: 'pattern',
				    patternType: 'solid',
				    bgColor: '#008000',
				    fgColor: '#008000',
				  },
		        });
            }
			worksheet.cell(i, indexbody+6).number(partidas.retraso);
           	worksheet.cell(i, indexbody+7).string(resontime).style(OntimeStyle);
			worksheet.cell(i, indexbody+8).string(partidas.placasTrailer? partidas.placasTrailer : "SIN ASIGNAR");
			worksheet.cell(i, indexbody+9).string(partidas.placasRemolque? partidas.placasRemolque : "SIN ASIGNAR");
            worksheet.cell(i, indexbody+10).string(partidas.ubicacion?partidas.ubicacion:"" );
			
            i++;
        });
      //console.log("end")
        workbook.write('ReporteSali'+dateFormat(new Date(Date.now()-(5*3600000)), formatofecha)+'.xlsx',res);

	})
	.catch((error) => {
		console.log(error);
		res.status(500).send(error);
		
	});
}

async function importsalidas(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	//console.log(req.body);
	try{
		await Helper.asyncForEach(req.body.Partidas,async function (partida){
				var producto=await Salida.findOne({'stringFolio': partida.stringFolio }).exec();
				const data={
					pedido: partida.pedido,
					lote:partida.lote,
					stringFolio: partida.stringFolio,
					item: partida.item,
					clave:partida.clave,
					descripcion:partida.descripcion,
					Subclasificacion: partida.Subclasificacion,
					fechaAlta:  new Date(partida.fechaAlta.split('/')[0]+"/"+partida.fechaAlta.split('/')[1]+"/"+partida.fechaAlta.split('/')[2]),
					tarima:parseInt(partida.tarima),
					despacho: parseInt(partida.despacho),
					solicitados: parseInt(partida.solicitados),
					infull:parseInt(partida.infull),
					FechaCargaProgramada: partida.FechaCargaProgramada != "SIN ASIGNAR" ? new Date(partida.FechaCargaProgramada.split('/')[0]+"/"+partida.FechaCargaProgramada.split('/')[1]+"/"+partida.FechaCargaProgramada.split('/')[2]):undefined,
					fechaSalida: new Date(partida.fechaSalida.split('/')[0]+"/"+partida.fechaSalida.split('/')[1]+"/"+partida.fechaSalida.split('/')[2]),
					horaSello: partida.horaSello != "SIN ASIGNAR" ? new Date(partida.horaSello.split('/')[0]+"/"+partida.horaSello.split('/')[1]+"/"+partida.horaSello.split('/')[2]):undefined,
					fechaCaducidad: new Date(partida.fechaCaducidad.split('/')[0]+"/"+partida.fechaCaducidad.split('/')[1]+"/"+partida.fechaCaducidad.split('/')[2]),
					retraso: partida.retraso,
					onTime: partida.onTime,
					placasTrailer: partida.placasTrailer ? partida.placasTrailer :producto.placasTrailer,
					placasRemolque: partida.placasRemolque? partida.placasRemolque :producto.placasRemolque,
					ubicacion:partida.ubicacion
		        }
		        //console.log(data);
		        
		        let nPartida = new reporteModel(data);
		        //console.log(nPartida);
		        //return res.status(200).send("no existe item: "+partida.clave);
		        await nPartida.save();
	    	
	    });

		
	}catch(error)
	{
			console.log(error);
			res.status(500).send("error");
	};

}


async function saveSalidaBabel(req, res) {
	console.log("----------------------------------------------------------------------start------------------------------------------------------")
	var mongoose = require('mongoose');
	var respuestacomplete="";
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	var IdAlmacen= req.body.IdAlmacen;
  	var IDClienteFiscal= req.body.IDClienteFiscal;
  	var IDSucursal= req.body.IDSucursal;
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
		console.log(req.body.Pedido.length)
		let index=0;
		await Helper.asyncForEach(req.body.Pedido,async function (Pedido) {
			
			if(Pedido.NO && index > 13 && Pedido.Clave && Pedido.Cantidad)
			{
				console.log(Pedido);
				var producto=await Producto.findOne({ 'clave':Pedido.Clave }).exec();
				if(producto==undefined)
					return res.status(400).send("no existe item: "+Pedido.Clave);
				let countEntradas=await Salida.find({"po":req.body.Pedido[1].Pedido}).exec();
				console.log("total: "+countEntradas.length)
		        countEntradas= countEntradas.length<1 ? await Salida.find({"referencia":req.body.Pedido[1].Pedido}).exec():countEntradas;
				if(countEntradas>0){
					console.log("Ya existe el pedido "+ req.body.Pedido[1].Pedido)
					return res.status(400).send("Ya existe el pedido:\n" + req.body.Pedido[1].Pedido+" ");
				}
				if(arrPO.find(obj=> (obj.pedido == req.body.Pedido[1].Pedido)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.pedido == req.body.Pedido[1].Pedido));
	    			const data={
	    				Clave:Pedido.Clave,
	    				Cantidad: parseInt(Pedido.Cantidad.toString()),
	    				equivalencia: Pedido.equivalencia
	    			};
	    			arrPO[index].arrPartidas.push(data)
		    	}
		        else
		        {
		        	const data={
	    				Clave:Pedido.Clave,
	    				Cantidad: parseInt(Pedido.Cantidad.toString()),
	    				equivalencia: Pedido.equivalencia
	    			};
		        	const PO={
		        	pedido:req.body.Pedido[1].Pedido,
					destinatario: req.body.Pedido[9].producto,
					Cliente: req.body.Pedido[4].Cliente,
					Domicilio: req.body.Pedido[5].Cliente,
		        	arrPartidas:[]
		        	}
		        	PO.arrPartidas.push(data)
	    			arrPO.push(PO);
	    			
	    		}
			}		
			index++;		
		});
		console.log(arrPO);
		
		let hoy=new Date(Date.now()-(5*3600000));

		await Helper.asyncForEach(arrPO,async function (Pedido) {
			let parRes=[];
			//console.log("----------------------------");
			//console.log(Pedido.arrPartidas.length)
			let totalpartidas =0;
			let refitem=Pedido.pedido;
			let refDesti=Pedido.destinatario;
			console.log(Pedido.pedido);
			console.log(Pedido.arrPartidas.length);
			
			await Helper.asyncForEach(Pedido.arrPartidas,async function (par) {
				//console.log("----partida: "+par.Clave+ "----");
				let producto =await Producto.findOne({'clave': par.Clave }).exec();
				//console.log(producto.clave);
				//console.log(par.Cantidad);
				//console.log(producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia);
				let equivalencia =producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia;
				
				let needed=Math.round(par.Cantidad/equivalencia);
				console.log("test: "+needed);
				totalpartidas+=needed;

				
				
				//console.log(".0.0.0.0.0.0.0.0.");
				
				//console.log(partidas.length)/*
				
				let cantidadneeded=par.Cantidad;
				while(cantidadneeded>0)
				{
					console.log("-------------asdasd-------------"+"clave: "+producto.clave+"equivalencia: "+equivalencia)
					//console.log(cantidadneeded);
					console.log("cantidadneeded "+cantidadneeded);
		            let cantidadPedida=cantidadneeded >= equivalencia ? equivalencia : cantidadneeded;
		            cantidadneeded-=equivalencia;

		            console.log("buscar: "+cantidadPedida)
		            console.log("beforeleft: "+cantidadneeded);
		            let embalajesEntrada={cajas:cantidadPedida};
		            let partidas=await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'pedido':false,'isEmpty':false,'embalajesxSalir':embalajesEntrada,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec();
					partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'pedido':false,'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
					console.log("totalpartidas: "+partidas.length)
					let count=0;
					for (let i = 0; i < partidas.length && count<1; i++)
					{
						//console.log(i);
						let fechaFrescura = new Date(partidas[i].fechaCaducidad.getTime() - (producto.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
			            //console.log(par)
			            if(partidas[i].embalajesxSalir.cajas>=cantidadPedida && fechaFrescura.getTime()>hoy.getTime())
			            {
			            	var partidaaux=await PartidaModel.findOne({_id:partidas[i]._id}).exec();
			            	if(partidaaux.pedido==false)
			            	{
				            	partidaaux.CajasPedidas={cajas:cantidadPedida};//talves se cambie a info pedidos

				            	partidaaux.pedido=true;
				            	partidaaux.refpedido=req.body.Pedido[1].Pedido;
				            	partidaaux.statusPedido="COMPLETO";
				            	await partidaaux.save();
				            	parRes.push(partidas[i]);
				            	//console.log(partidaaux);
				            	console.log("--------------");
				            	count++;
				            }
			            }
			        }
				}
			});
			console.log("********************"+totalpartidas+"=="+parRes.length+"********************");
			
			if (parRes && parRes.length > 0  ) {
				//console.log(parRes);
				let entradas_id = parRes.map(x => x.entrada_id.toString()).filter(Helper.distinct);
				let entradas = await Entrada.find({ "_id": { $in: entradas_id } });

				if ((entradas && entradas.length > 0)) {

					let nSalida = new Salida();
					nSalida.salida_id = await getNextID();
					nSalida.fechaAlta = new Date(Date.now()-(5*3600000));
					nSalida.fechaSalida = new Date(Date.now()-(5*3600000));
					nSalida.nombreUsuario = "BABELSALIDA";
					nSalida.folio = await getNextID();
					//console.log(nSalida.folio);
					nSalida.partidas = parRes.map(x => x._id);
					nSalida.entrada_id = entradas_id;

					nSalida.almacen_id = IdAlmacen;
					nSalida.clienteFiscal_id = IDClienteFiscal;
					nSalida.sucursal_id = IDSucursal;
					//console.log(nSalida.clienteFiscal_id);
					nSalida.destinatario=refDesti;
					nSalida.referencia = refitem;
					nSalida.item = refitem;
					nSalida.tipo = "FORSHIPPING";//NORMAL
					//console.log(nSalida);
					nSalida.statusPedido="COMPLETO";
					nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O', false);
					console.log("******************************************--------------------**********************")
					console.log(nSalida);
					console.log("******************************************--------------------**********************")
					
					if( parRes.length!=totalpartidas){
						await Helper.asyncForEach(parRes,async function (par) {

							nSalida.statusPedido="INCOMPLETO";
							var partidaaux=await PartidaModel.findOne({_id:par._id}).exec();
			            	nSalida.statusPedido="INCOMPLETO";
			            	respuestacomplete="INCOMPLETO";
			            	await partidaaux.save();
						})
					}
					//saveSalida

					//nSalida.save();
				} else {
					return res.status(400).send("Se trata de generar una salida sin entrada o esta vacia");
				}
				
			} else {
				console.log("Se trata de generar una salida sin partidas suficientes");
				return res.status(400).send("Se trata de generar una salida sin partidas suficientes");
			}
			console.log(parRes)
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};

	return res.status(200).send("MAYBEOK"+respuestacomplete);
}



function updateStatusSalidas(req, res) {
	let _id = req.body.salida_id;
	let newStatus = req.body.status;
	console.log(_id);

	let today = new Date(Date.now()-(5*3600000));
	let datos ={ tipo: newStatus}
	if(newStatus=="FORPICKING")
	{
		datos.fechaEntrada=today
	}

	Salida.updateOne({_id: _id}, { $set: datos}).then((data) => {
		console.log(datos);
		res.status(200).send(data);
	})
	.catch((error) => {
		console.log(error);
		res.status(500).send(error);
	});
}

module.exports = {
	get,
	getByID,
	getxRangoFechas,
	save,
	update,
	getSalidasByIDs,
	saveSalidaAutomatica,
	updatePartidasSalidaAPI,
	getReportePartidas,
	getExcelSalidas,
	importsalidas,
	getExcelSalidasBarcel,
	saveSalidaBabel,
	updateStatusSalidas
}