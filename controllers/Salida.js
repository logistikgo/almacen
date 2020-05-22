'use strict'

const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const PartidaModel = require('../models/Partida');
const Entrada = require('../models/Entrada');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const Helper = require('../helpers');
const PrePartidaM = require("../models/PrePartida");
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const TiempoCargaDescarga = require("../controllers/TiempoCargaDescarga");

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
	nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O');

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
	console.log(req);
	let bodyParams = req.body;
	let salida_id = bodyParams.salidaid;
	console.log(bodyParams);
	bodyParams.fechaSalida = new Date(bodyParams.fechaSalida);
	bodyParams.fechaAlta = new Date();

	// for (let partida of req.body) {
	// 	Partida._put(partida);
	// }
	console.log(req.body);
	console.log("----------------------------------");
	Salida.updateOne(
		{ _id: salida_id },
		{ $set: req.body })
		.then((salida) => {
			console.log(salida);
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
	console.log("ENTRADAS ENCONTRADAS DEL ARREGLO");
	console.log(entrada_id);
	Helper.asyncForEach(entradas, async function (entrada) {
		entrada.salidas_id.push(salida_id);
		let jEdit = {
			salidas_id: entrada.salidas_id
		};

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
			nSalida.fechaAlta = new Date();
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

			nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O');

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
	var arrPartidas = [];
	var partidas = [];
	var salidas_id = [];

	Salida.find({clienteFiscal_id: req.query.clienteFiscal_id})
	.populate({
		path: 'partidas',
		model: 'Partida',
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

				var paramsSalida = {
					_id: salida._id,
					stringFolio: salida.stringFolio,
					fechaAlta: salida.fechaAlta,
					fechaSalida: salida.fechaSalida,
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
					posiciones: partida.posiciones,
					CajasPedidas: partida.CajasPedidas,
					embalajes: embalajes
				}

				arrPartidas.push(paramsSalida);

			})
		})
		res.status(200).send(arrPartidas);
	})
	.catch((error) => {
		res.status(500).send(error);
		console.log(error);
	});
}

function getExcelSalidas(req, res) {
	var arrPartidas = [];
	var partidas = [];
	var salidas_id = [];

	Salida.find({clienteFiscal_id: req.query.idClienteFiscal})
	.populate({
		path: 'partidas',
		model: 'Partida',
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

				var paramsSalida = {
					_id: salida._id,
					stringFolio: salida.stringFolio,
					fechaAlta: salida.fechaAlta,
					fechaSalida: salida.fechaSalida,
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
					posiciones: partida.posiciones,
					CajasPedidas: partida.CajasPedidas,
					embalajes: embalajes
				}

				arrPartidas.push(paramsSalida);

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
        var worksheet = workbook.addWorksheet('Partidas');
        worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
        worksheet.cell(2, 1).string('Pedido').style(headersStyle);
        worksheet.cell(2, 2).string('Lote').style(headersStyle);
        worksheet.cell(2, 3).string('Folio salida').style(headersStyle);
        worksheet.cell(2, 4).string('Item').style(headersStyle);
        worksheet.cell(2, 5).string('Clave').style(headersStyle);
		worksheet.cell(2, 6).string('Descripción').style(headersStyle);
		worksheet.cell(2, 7).string('Fecha Alta').style(headersStyle);
		worksheet.cell(2, 8).string('Fecha salida').style(headersStyle);
		worksheet.cell(2, 9).string('Pzs.').style(headersStyle);
		worksheet.cell(2, 10).string('T.').style(headersStyle);
		worksheet.cell(2, 11).string('Cjs.').style(headersStyle);
		worksheet.cell(2, 12).string('Cjs-Pedido.').style(headersStyle);
		worksheet.cell(2, 13).string('FillRate').style(headersStyle);
		worksheet.cell(2, 14).string('Transportista').style(headersStyle);
		worksheet.cell(2, 15).string('Placas trailer').style(headersStyle);
		worksheet.cell(2, 16).string('Datos Remolque').style(headersStyle);
		worksheet.cell(2, 17).string('Embarque').style(headersStyle);
		worksheet.cell(2, 18).string('Operador').style(headersStyle);
		worksheet.cell(2, 19).string('Ubicacion').style(headersStyle);
        let i=3;
        console.log("test1")
        arrPartidas.forEach(partidas => 
        {
        	worksheet.cell(i, 1).string(partidas.referencia ? partidas.referencia:"");
        	worksheet.cell(i, 2).string(partidas.lote ? partidas.lote:"");
        	worksheet.cell(i, 3).string(partidas.stringFolio ? partidas.stringFolio:"");
        	worksheet.cell(i, 4).string(partidas.item ? partidas.item:"");
        	worksheet.cell(i, 5).string(partidas.clave ? partidas.clave:"");
        	worksheet.cell(i, 6).string(partidas.descripcion ? partidas.descripcion:"");
        	worksheet.cell(i, 7).string(partidas.fechaAlta ? dateFormat(partidas.fechaAlta, "dd/mm/yyyy"):"");
			worksheet.cell(i, 8).string(partidas.fechaSalida ? dateFormat(partidas.fechaSalida, "dd/mm/yyyy"):"");
        	if(partidas.embalajes)
        		worksheet.cell(i, 9).string(partidas.embalajes.piezas ? partidas.embalajes.piezas.toString():"0");
        	else
        		worksheet.cell(i, 9).string("0")
        	if(partidas.embalajes)
        		worksheet.cell(i, 10).string(partidas.embalajes.tarimas ? partidas.embalajes.tarimas.toString():"0");
        	else
        		worksheet.cell(i, 10).string("0")
        	if(partidas.embalajes)
        		worksheet.cell(i, 11).string(partidas.embalajes.cajas ? partidas.embalajes.cajas.toString():"0");
        	else
        		worksheet.cell(i, 11).string("0")
        	if(partidas.CajasPedidas)
        		worksheet.cell(i, 12).string(partidas.CajasPedidas ? partidas.CajasPedidas.cajas.toString():"0");
        	else
        		worksheet.cell(i, 12).string("0")
        	let value = 0
        	if(partidas.CajasPedidas && partidas.embalajes)
        		value=(partidas.embalajes.cajas / partidas.CajasPedidas.cajas) ? (partidas.embalajes.cajas / (partidas.CajasPedidas.cajas)) : 0;
        	
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
        	worksheet.cell(i, 13).number(value).style(ResultStyle);
        	worksheet.cell(i, 14).string(partidas.transportista ? partidas.transportista:"");
        	worksheet.cell(i, 15).string(partidas.placasTrailer ? partidas.placasTrailer:"");
        	worksheet.cell(i, 16).string(partidas.placasRemolque ? partidas.placasRemolque:"");
            worksheet.cell(i, 17).string(partidas.embarque ? partidas.embarque:"");
            worksheet.cell(i, 18).string(partidas.operador ? partidas.operador:"");
            let res=""
            if(partidas.posiciones.length === 1) 
            	res = partidas.posiciones[0].pasillo + partidas.posiciones[0].nivel + partidas.posiciones[0].posicion;
            worksheet.cell(i, 19).string(res);
            i++;
        });
        workbook.write('ReporteSalidas'+dateFormat(Date.now(), "ddmmyyhh")+'.xlsx',res);

	})
	.catch((error) => {
		res.status(500).send(error);
		console.log(error);
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
	getExcelSalidas
}