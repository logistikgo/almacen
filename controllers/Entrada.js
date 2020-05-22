'use strict'

const Entrada = require('../models/Entrada');
const Producto = require('../models/Producto');
const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const PartidaModel = require('../models/Partida');
const Helper = require('../helpers');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const MovimientoInventarioModel = require('../models/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const TiempoCargaDescarga = require('../controllers/TiempoCargaDescarga');
const PlantaProductora = require('../models/PlantaProductora'); 
const dateFormat = require('dateformat');
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
	let filter ="";
	if(_status != "FINALIZADO"){
		filter = {
			sucursal_id: _idSucursal,
			tipo: _tipo,
			status: _status
		};
	}
	else
	{
		filter = {
			sucursal_id: _idSucursal,
			tipo: _tipo
		};
	}
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
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(bodyParams.embarque); //Valida si ya existe

	if (partidas && partidas.length > 0) {
		let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([req.body.IDClienteFiscal]);
		let arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([req.body.IDSucursal]);

		let nEntrada = new Entrada();

		nEntrada.fechaEntrada = new Date(req.body.fechaEntrada);
		nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
			return total + valor;
		});
		nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
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
				console.log(entrada);
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

async function saveEntradaBabel(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(bodyParams.embarque); //Valida si ya existe
	//console.log(req.body);
	/*var arrPartidas=[];
	for (var i=4; i<34 ; i++) {
		if(req.body.Pedido[i].Clave !== undefined)
		{
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			//console.log(producto._id)
			const data={
				producto_id:producto._id,
				clave:producto.clave,
				descripcion:producto.descripcion,
				origen:"Babel",
				tipo: "Arrival",
    			status: "NO ASIGNADA",
				embalajesEntrada: { cajas:req.body.Pedido[i].Cantidad},
	        	embalajesxSalir: { cajas:req.body.Pedido[i].Cantidad},
	        	fechaProduccion: Date.parse(req.body.Pedido[i].Caducidad),
	        	fechaCaducidad: Date.parse(req.body.Pedido[i].Caducidad),
	        	lote:req.body.Pedido[i].Lote,
	        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
	        	valor:0
	        }
	        //console.log(data.InfoPedidos)
	        arrPartidas.push(data);
    	}
	}
	//console.log("test");
	//console.log(arrPartidas);

    var arrPartidas_id = [];
    var partidas = [];
    await Helper.asyncForEach(arrPartidas, async function (partida) {
        partida.InfoPedidos[0].IDAlmacen=req.body.IdAlmacen;
        let nPartida = new PartidaModel(partida);
        //console.log(nPartida.InfoPedidos[0].IDAlmacen);
        //console.log(nPartida);
        await nPartida.save().then((partida) => {
        	partidas.push(partida)
            arrPartidas_id.push(partida._id);
        });
    });
	//console.log(arrPartidas_id)
	let planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[1].InfoPedido.split(" ")[1] }).exec();
	let fechaesperada=Date.parse(req.body.Infoplanta[3].InfoPedido)+((60 * 60 * 24 * 1000)*planta.DiasTraslado);
	//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
	if (partidas && partidas.length > 0) {
		let idCliente = req.body.IDClienteFiscal;
		let idSucursales = req.body.IDSucursal;

		let nEntrada = new Entrada();

		nEntrada.fechaEntrada = fechaesperada;
		nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
			return total + valor;
		});
		nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
		nEntrada.clienteFiscal_id = idCliente;
		nEntrada.sucursal_id = idSucursales;
		nEntrada.status = "SIN_POSICIONAR";/*repalce arrival*//*
		nEntrada.tipo = "NORMAL";
		nEntrada.partidas = partidas.map(x => x._id);
		nEntrada.nombreUsuario = "BarcelBabel";
		nEntrada.tracto = req.body.Infoplanta[13].InfoPedido;
		nEntrada.remolque = req.body.Infoplanta[11].InfoPedido;
		nEntrada.embarque = req.body.Infoplanta[23].InfoPedido;
		nEntrada.transportista = req.body.Infoplanta[17].InfoPedido;
		nEntrada.ordenCompra=req.body.Infoplanta[29].InfoPedido;
		nEntrada.fechaAlta = new Date();
		nEntrada.idEntrada = await getNextID();
		nEntrada.folio = await getNextID();
		nEntrada.plantaOrigen=planta.Nombre;
		nEntrada.DiasTraslado=planta.DiasTraslado;
		nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');
		//console.log("testEntrada");
		nEntrada.save()
			.then(async (entrada) => {
				//console.log("testpartidas");
				await Partida.asignarEntrada(partidas.map(x => x._id.toString()), entrada._id.toString());
				for (let itemPartida of partidas) {
					//console.log("testMovimientos");
					await MovimientoInventario.saveEntrada(itemPartida, entrada.id);
				}
				console.log(entrada);
				res.status(200).send(entrada);
			})
			.catch((error) => {
				res.status(500).send(error);
			});
	} else {
		console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		res.status(400).send({ message: "Se intenta generar una entrada sin partidas", error: "No se encontró pre-partidas para los IDs de pedidos indicados" });
	}*/
	res.status(200).send({ message: "Se intenta generar una entrada sin partidas", error: "No se encontró pre-partidas para los IDs de pedidos indicados" });

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
		console.log("1");
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
		for (let partida of req.body.partidasJson) {
			Partida._put(partida);
		}
	}
	// //***----begintemporal---***//
	// for (let itemPartida of req.body.partidasJson) 
	// {
	// 	if(!("_id" in itemPartida)){
	// 		console.log("movimiento");
	// 		await MovimientoInventario.saveEntrada(itemPartida, entrada_id);
	// 	}
	// }
	// let partidas = await Partida.post(req.body.partidasJson, entrada_id);
	//***----Endtemporal---***//
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

	console.log(filter.clienteFiscal_id);

	Entrada.find(filter, {partidas: 1, _id: 0, fechaAlta: 1})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio fechaEntrada DiasTraslado'
		},
		select: 'stringFolio fechaEntrada DiasTraslado'
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

function getExcelCaducidades(req, res) {
	var mongoose = require('mongoose');
	var arrPartidas = [];
	var arrPartidasFilter = [];
	let clasificacion = req.body.clasificacion;
	
	let subclasificacion = req.body.subclasificacion;
	let reporte = 0;

	let filter = {
		clienteFiscal_id: mongoose.Types.ObjectId(req.query.idClienteFiscal),
		isEmpty: false
	}

console.log(filter)
	Entrada.find(filter, {partidas: 1, _id: 0, fechaAlta: 1})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio fechaEntrada DiasTraslado'
		},
		select: 'stringFolio fechaEntrada DiasTraslado'
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
			partida.forEach(elem => {
				if(elem.isEmpty == false)
					arrPartidas.push(elem);
			})		
		});

		var excel = require('excel4node');
        
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
        worksheet.cell(2, 1).string('Lote').style(headersStyle);
		worksheet.cell(2, 2).string('Folio entrada').style(headersStyle);
		worksheet.cell(2, 3).string('Clave').style(headersStyle);
		worksheet.cell(2, 4).string('Descripción').style(headersStyle);
		worksheet.cell(2, 5).string('Pzs.').style(headersStyle);
		worksheet.cell(2, 6).string('Cjs.').style(headersStyle);
		worksheet.cell(2, 7).string('T.').style(headersStyle);
		worksheet.cell(2, 8).string('Fecha Producción').style(headersStyle);
		worksheet.cell(2, 9).string('Fecha Caducidad').style(headersStyle);
		worksheet.cell(2, 10).string('Dias Anaquel Original').style(headersStyle);
		worksheet.cell(2, 11).string('Dias Traslado Original').style(headersStyle);
		worksheet.cell(2, 12).string('Fecha Esperada Recibo').style(headersStyle);
		worksheet.cell(2, 13).string('Dias Anaquel Real').style(headersStyle);
		worksheet.cell(2, 14).string('Dias Traslado Real').style(headersStyle);
		worksheet.cell(2, 15).string('Fecha de Recibo').style(headersStyle);
		worksheet.cell(2, 16).string('Aging Report').style(headersStyle);
		worksheet.cell(2, 17).string('Garantia Frescura').style(headersStyle);
		worksheet.cell(2, 18).string('Fecha Garantia Frescura').style(headersStyle);
		worksheet.cell(2, 19).string('Dias Alerta 1').style(headersStyle);
		worksheet.cell(2, 20).string('Alerta 1').style(headersStyle);
		worksheet.cell(2, 21).string('Fecha Alerta 1').style(headersStyle);
		worksheet.cell(2, 22).string('Dias Alerta 2').style(headersStyle);
		worksheet.cell(2, 23).string('Alerta 2').style(headersStyle);
		worksheet.cell(2, 24).string('Fecha Alerta 2').style(headersStyle);
		worksheet.cell(2, 25).string('Ubicacion').style(headersStyle);
        let i=3;
        console.log("test1")
        arrPartidas.forEach(partidas => 
        {
        	
        	let fechaEspRecibo="";
        	let leyenda=0;
        	let diasAlm=0;
        	let diasEnAlm=0;
        	let strleyenda="A TIEMPO";
        	let fechaFrescura =0;
        	let fechaAlerta1="";
        	let fechaAlerta2="";
        	let fCaducidad=0;
        	var diff=0;
        	let hoy=Date.now();
           	let Aging=0;
        	if(partidas.fechaCaducidad !== undefined && partidas.fechaCaducidad != null)
        	{
        		console.log(partidas.fechaCaducidad);

        		fCaducidad = partidas.fechaCaducidad.getTime();
                diff = Math.abs(fCaducidad - partidas.entrada_id.fechaEntrada.getTime());
                diasAlm=Math.floor((hoy - fCaducidad)/ 86400000);
            	diasEnAlm = Math.floor(diff / 86400000);
            	Aging=Math.floor((hoy-partidas.entrada_id.fechaEntrada.getTime())/ 86400000);
        		let fEntrada = partidas.entrada_id.fechaEntrada.getTime();
                if(partidas.producto_id.garantiaFrescura)
                fechaFrescura = dateFormat(new Date(fCaducidad - (partidas.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)), "dd/mm/yyyy");
                if(partidas.producto_id.alertaAmarilla)
                fechaAlerta1 = dateFormat(new Date(fCaducidad - (partidas.producto_id.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000)), "dd/mm/yyyy");
            	if(partidas.producto_id.alertaRoja)
            	fechaAlerta2 = dateFormat(new Date(fCaducidad - (partidas.producto_id.alertaRoja * 86400000)- (60 * 60 * 24 * 1000)), "dd/mm/yyyy");
            	if(partidas.producto_id.vidaAnaquel)
            	leyenda = partidas.producto_id.vidaAnaquel- diasEnAlm - 1
        		}
        	if (partidas.fechaCaducidad !== undefined && partidas.entrada_id.DiasTraslado !== undefined) {
                let tiempoTraslado = partidas.producto_id.vidaAnaquel - partidas.entrada_id.DiasTraslado-1;
                let fechaRecibo = new Date(fCaducidad - tiempoTraslado * 86400000);
                fechaEspRecibo =dateFormat(fechaRecibo, "dd/mm/yyyy");
            }

            worksheet.cell(i, 1).string(partidas.lote ? partidas.lote:"");
            worksheet.cell(i, 2).string(partidas.entrada_id.stringFolio  ? partidas.entrada_id.stringFolio :"");
           	worksheet.cell(i, 3).string(partidas.clave ? partidas.clave:"");
           	worksheet.cell(i, 4).string(partidas.descripcion ? partidas.descripcion:"");
           	worksheet.cell(i, 5).number(partidas.embalajesxSalir.piezas ? partidas.embalajesxSalir.piezas:0);
           	worksheet.cell(i, 6).number(partidas.embalajesxSalir.cajas ? partidas.embalajesxSalir.cajas:0);
           	worksheet.cell(i, 7).number(partidas.embalajesxSalir.tarimas ? partidas.embalajesxSalir.tarimas:0);
           	worksheet.cell(i, 8).string(partidas.fechaProduccion ? dateFormat(new Date(partidas.fechaProduccion.getTime()), "dd/mm/yyyy"):"");
           	worksheet.cell(i, 9).string(partidas.fechaCaducidad ? dateFormat(new Date(partidas.fechaCaducidad.getTime()), "dd/mm/yyyy"):"");
           	worksheet.cell(i, 10).number(partidas.producto_id.vidaAnaquel ? partidas.producto_id.vidaAnaquel:0);
           	worksheet.cell(i, 11).number(partidas.entrada_id.DiasTraslado ? partidas.entrada_id.DiasTraslado:0);
           	worksheet.cell(i, 12).string(fechaEspRecibo);
           	worksheet.cell(i, 13).number(1+diasEnAlm);
           	worksheet.cell(i, 14).number(leyenda);
           	worksheet.cell(i, 15).string(partidas.entrada_id.fechaEntrada ? dateFormat(partidas.entrada_id.fechaEntrada, "dd/mm/yyyy"):"");
           	worksheet.cell(i, 16).number(Math.abs(Aging));
           	worksheet.cell(i, 17).number(partidas.producto_id.garantiaFrescura ? partidas.producto_id.garantiaFrescura:0);
           	worksheet.cell(i, 18).string(fechaFrescura ? fechaFrescura:"");
           	worksheet.cell(i, 19).number(partidas.producto_id.alertaAmarilla ? partidas.producto_id.alertaAmarilla:0);
           	if (Math.abs(diasAlm) <= partidas.producto_id.alertaAmarilla) {
           		strleyenda = "RETRASO";
           		ResultStyle = workbook.createStyle({
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
       			strleyenda="A TIEMPO";
       			ResultStyle = workbook.createStyle({
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
       		worksheet.cell(i, 20).string(strleyenda).style(ResultStyle);
           	worksheet.cell(i, 21).string(fechaAlerta1);
           	worksheet.cell(i, 22).number(partidas.producto_id.alertaRoja ? partidas.producto_id.alertaRoja:0);
           	if (Math.abs(diasAlm) <= partidas.producto_id.alertaRoja) {
           		strleyenda = "RETRASO";
           		ResultStyle = workbook.createStyle({
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
       			strleyenda="A TIEMPO";
       			ResultStyle = workbook.createStyle({
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
           	worksheet.cell(i, 23).string(strleyenda).style(ResultStyle);
           	worksheet.cell(i, 24).string(fechaAlerta2);
           	let res="";
           	if(partidas.posiciones.length === 1) 
            	res = partidas.posiciones[0].pasillo + partidas.posiciones[0].nivel + partidas.posiciones[0].posicion;
           	worksheet.cell(i, 25).string(res);
            i++;
        });
        workbook.write('ReporteCaducidad'+dateFormat(Date.now(), "ddmmyyhh")+'.xlsx',res);

	})
	.catch((error) => {
		res.status(500).send(error);
	})
}

async function getExcelEntradas(req, res) {
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;
	let _status = req.query.status;
	let _interfaz = req.query.interfaz;
	let filter ="";
	if(_status != "FINALIZADO"){
		filter = {
			sucursal_id: _idSucursal,
			tipo: _tipo,
			status: _status
		};
	}
	else
	{
		filter = {
			sucursal_id: _idSucursal,
			tipo: _tipo
		};
	}
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

			var excel = require('excel4node');
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
	        worksheet.cell(2, 1).string('Folio').style(headersStyle);
			worksheet.cell(2, 2).string('Item').style(headersStyle);
			worksheet.cell(2, 3).string('Fecha Alta').style(headersStyle);
			worksheet.cell(2, 4).string('Embarque').style(headersStyle);
			worksheet.cell(2, 5).string('Recibió').style(headersStyle);
			worksheet.cell(2, 6).string('Fecha Entrada').style(headersStyle);
			worksheet.cell(2, 7).string('Pedimento').style(headersStyle);
			worksheet.cell(2, 8).string('Proveedor').style(headersStyle);
			worksheet.cell(2, 9).string('Orden de compra').style(headersStyle);
			worksheet.cell(2, 10).string('Factura').style(headersStyle);
			worksheet.cell(2, 11).string('Tracto').style(headersStyle);
			worksheet.cell(2, 12).string('Remolque').style(headersStyle);
			worksheet.cell(2, 13).string('Transportista').style(headersStyle);
			worksheet.cell(2, 14).string('Unidad').style(headersStyle);
			worksheet.cell(2, 15).string('Referencia').style(headersStyle);
			worksheet.cell(2, 16).string('Valor').style(headersStyle);
			worksheet.cell(2, 17).string('Estatus').style(headersStyle);
	        let i=3;
	        entradas.forEach(entrada => 
	        {
	            worksheet.cell(i, 1).string(entrada.stringFolio ? entrada.stringFolio:"");
	            worksheet.cell(i, 2).string(entrada.item  ? entrada.item :"");
	            worksheet.cell(i, 3).string(entrada.fechaAlta ? dateFormat(entrada.fechaAlta, "dd/mm/yyyy") :"");
	            worksheet.cell(i, 4).string(entrada.embarque ? entrada.embarque :"");
	            worksheet.cell(i, 5).string(entrada.recibio ? entrada.recibio:"");    
	            worksheet.cell(i, 6).string(entrada.fechaEntrada ? dateFormat(entrada.fechaEntrada, "dd/mm/yyyy") :"");
	            worksheet.cell(i, 7).string(entrada.acuse ? entrada.acuse:"");
	            worksheet.cell(i, 8).string(entrada.proveedor ? entrada.proveedor : "");
	            worksheet.cell(i, 9).string(entrada.ordenCompra ? entrada.ordenCompra : "");   
	            worksheet.cell(i, 10).string(entrada.factura ? entrada.factura : "");
	            worksheet.cell(i, 11).string(entrada.tracto ? entrada.tracto : "");
	            worksheet.cell(i, 12).string(entrada.remolque ? entrada.remolque : "");
	            worksheet.cell(i, 13).string(entrada.transportista ? entrada.transportista : "");
	            worksheet.cell(i, 14).string(entrada.unidad ? entrada.unidad : "");
	            worksheet.cell(i, 15).string(entrada.referencia ? entrada.referencia : "");
	            worksheet.cell(i, 16).string(entrada.valor ? entrada.valor : "");
	            worksheet.cell(i, 17).string(entrada.status ? entrada.status : "");
	            console.log(i);
	            i++;
	        });
	        workbook.write('ReporteEntradas'+dateFormat(Date.now(), "ddmmyyhh")+'.xlsx',res);
			
		}).catch((error) => {
			res.status(500).send(error);
		});
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
	getEntradasReporte,
	getExcelEntradas,
	getExcelCaducidades,
	saveEntradaBabel
	// getPartidaById,
}