'use strict'

const Entrada = require('../models/Entrada');
const Producto = require('../models/Producto');
const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const PasilloCtr = require('../controllers/Pasillo');
const EmbalajesController = require('../controllers/Embalaje');
const PartidaModel = require('../models/Partida');
const ClienteFiscal = require('../models/ClienteFiscal');
const Helper = require('../helpers');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const MovimientoInventarioModel = require('../models/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const TiempoCargaDescarga = require('../controllers/TiempoCargaDescarga');
const PlantaProductora = require('../models/PlantaProductora'); 
const dateFormat = require('dateformat');
const Ticket = require('../models/Ticket');
function getNextID() {
	return Helper.getNextID(Entrada, "idEntrada");
}

async function get(req, res) {
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;
	let _status = req.query.status != ""? req.query.status : null;
	let _interfaz = req.query.interfaz;
	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let fecha=req.query.fecha != undefined ? req.query.fecha : "";
	let isReporte=req.query.isReporte != undefined ? req.query.isReporte: "";
	//console.log(_status);
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let filter ="", WaitingArrival = 0, ARRIVED = 0, APLICADA = 0, RECHAZO = 0, FINALIZADO = 0;
	var json = [];
	console.log(_tipo);
	if(_status != "FINALIZADO" && _status != null && _status !== "NINGUNO"){
		filter = {
			sucursal_id: _idSucursal,
			tipo: _tipo,
			status: _status
		};
	}
	else if(_status != null)
	{
		//console.log(isReporte);
		if( isReporte === "true" && _status === "NINGUNO") {
			filter = {
				sucursal_id: _idSucursal,
				tipo: _tipo,
				status: { $in:['FINALIZADO','APLICADA']}
			};
		}
		else {
			filter = {
				sucursal_id: _idSucursal,
				tipo: _tipo,
				status: _status
			};
		}
	}
	else if(_status === null){
		filter = {
			sucursal_id: _idSucursal,
			clienteFiscal_id: _idClienteFiscal,
			almacen_id: _idAlmacen,
			tipo: _tipo
		};
		Entrada.find(filter)
		.then((entradasByStatus) => {
			entradasByStatus.forEach(resp => {
				if(resp.status == "WAITINGARRIVAL")
					WaitingArrival++;
				if(resp.status == "ARRIVED")
					ARRIVED++;
				if(resp.status == "APLICADA")
					APLICADA++;
				if(resp.tipo == "RECHAZO")
					RECHAZO++;
				if(resp.status == "FINALIZADO")
					FINALIZADO++;
			});
			var jsonResponse = {
				WaitingArrival: WaitingArrival,
				Arrived: ARRIVED,
				Aplicada: APLICADA,
				Rechazo: RECHAZO,
				Finalizado: FINALIZADO
			};
			json = jsonResponse;
		})
		.catch((error) => {
			console.log(error);
		});
		
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
	if(fechaInicio != "" &&  fechaFinal != ""){
		if(fecha == "fechaAlta")
		{
			filter.fechaAlta={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
		if(fecha == "fechaEntrada")
		{
			filter.fechaEntrada={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
	}
	if(folio != "")
	{
		filter.stringFolio=folio;
	}
	Entrada.find(filter).sort({ fechaEntrada: -1 })
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		}).then((entradas) => {
			res.status(200).send(_status == null ? json : entradas);
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
	nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
	nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');

	await nEntrada.save()
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
		nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
		nEntrada.idEntrada = await getNextID();
		nEntrada.folio = await getNextID();
		nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');

		nEntrada.save()
			.then(async (entrada) => {

				await Partida.asignarEntrada(partidas.map(x => x._id.toString()), entrada._id.toString());
				for (let itemPartida of partidas) {
					await MovimientoInventario.saveEntrada(itemPartida, entrada.id);
				}
				//console.log(entrada);
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
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=4; i<34 ; i++) {
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined)
		{
		
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(200).send("no existe item: "+req.body.Pedido[i].Clave);
			//console.log(req.body.Pedido[i].Clave)
			let fechaCaducidadTemp= req.body.Pedido[i].Caducidad.length == 8 ? Date.parse(req.body.Pedido[i].Caducidad.slice(0, 4)+"/"+req.body.Pedido[i].Caducidad.slice(4, 6)+"/"+req.body.Pedido[i].Caducidad.slice(6, 8)):Date.parse(req.body.Pedido[i].Caducidad.slice(0, 4)+"/"+req.body.Pedido[i].Caducidad.slice(5, 7)+"/"+req.body.Pedido[i].Caducidad.slice(8, 10));
	        if(isNaN(fechaCaducidadTemp))
	        {
	        	fechaCaducidadTemp= req.body.Pedido[i].Caducidad.length == 8 ? Date.parse(req.body.Pedido[i].Caducidad.slice(0, 2)+"/"+req.body.Pedido[i].Caducidad.slice(2, 4)+"/"+req.body.Pedido[i].Caducidad.slice(4, 8)):Date.parse(req.body.Pedido[i].Caducidad.slice(0, 2)+"/"+req.body.Pedido[i].Caducidad.slice(3, 5)+"/"+req.body.Pedido[i].Caducidad.slice(6, 10));
	        
	        }
	        console.log(fechaCaducidadTemp);
			const data={
				producto_id:producto._id,
				clave:producto.clave,
				descripcion:producto.descripcion,
				origen:"BABEL",
				tipo: "NORMAL",
    			status: "WAITINGARRIVAL",
				embalajesEntrada: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	embalajesxSalir: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	fechaCaducidad: fechaCaducidadTemp,
	        	lote:req.body.Pedido[i].Lote,
	        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
	        	valor:0
	        }
	       // console.log(data.InfoPedidos)
	       let countEntradas=await Entrada.find({"ordenCompra":req.body.Pedido[i].NoOrden,"factura":req.body.Pedido[i].Factura}).exec();
    		if(countEntradas.length <1)
    		{
		        if(arrPO.find(obj=> (obj.po == req.body.Pedido[i].NoOrden && obj.factura == req.body.Pedido[i].Factura)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.po == req.body.Pedido[i].NoOrden && obj.factura == req.body.Pedido[i].Factura));
	    			arrPO[index].arrPartidas.push(data)
		    	}
		        else{
		        	//console.log("NO");
		        	
			        	arrPartidas.push(data);
			        	const PO={
						po:req.body.Pedido[i].NoOrden,
						factura:req.body.Pedido[i].Factura,
			        	arrPartidas:[]
			        	}
			        	PO.arrPartidas.push(data)
		    			arrPO.push(PO);
		    		}
		    		
	    		} 
    		if(countEntradas.length >0)
    		{
    			resORDENES=resORDENES+req.body.Pedido[i].NoOrden+"\n";
    		}
	        
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Ordenes:\n" + resORDENES);
		
	}
	/*console.log(arrPO);
	
	console.log("test");
	console.log(arrPartidas);*/
	let reserror="";
    var arrPartidas_id = [];
    var partidas = [];
	await Helper.asyncForEach(arrPO,async function (noOrden) {
		arrPartidas_id = [];
    	partidas = [];
	    await Helper.asyncForEach(noOrden.arrPartidas, async function (partida) {
	        partida.InfoPedidos[0].IDAlmacen=req.body.IdAlmacen;
	        let nPartida = new PartidaModel(partida);
	        //console.log(nPartida.InfoPedidos[0].IDAlmacen);
	        //console.log(nPartida);
	        await nPartida.save().then((partida) => {
	        	partidas.push(partida)
	            arrPartidas_id.push(partida._id);
	        });
	    });
	    /*console.log(partidas);
	    console.log(arrPartidas_id);*/
	    let indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="PLANTAEXPORTADORA/MANUFACTURINGPLANT");
	    //console.log(indexInfopedido);
		let planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[1] }).exec();
		if(planta==null)
		{
			 indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="PLANTAEXPORTADORA");
			 planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[1] }).exec();
		}
		indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="FECHA/DATE");
		let fechaSalidaPlanta=Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido);
		//console.log(req.body.Infoplanta[indexInfopedido+1].InfoPedido);
		let fechaesperada=Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido)+((60 * 60 * 24 * 1000)*planta.DiasTraslado+1);

		console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(dateFormat(fechaesperada, "dd/mm/yyyy"));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BarcelBabel";
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRACTOR-PLACAS/TRUCK-NUMBERPLATE");
			if(indexInfopedido==-1)
				indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRACTOR/TRAILER");
			nEntrada.tracto = req.body.Infoplanta[indexInfopedido+1].InfoPedido;

			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="CONTENEDOR/TRAILER");
			if(indexInfopedido==-1)
				indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="CONTENEDOR/CONTAINER");
			nEntrada.remolque = req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			
			nEntrada.referencia = noOrden.factura;
			nEntrada.factura = noOrden.factura;
			nEntrada.item = noOrden.factura;
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRANSPORTISTA/CARRIER");
			if(indexInfopedido==-1)
				indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRANSPORTISTA/CARGOLINE");
			nEntrada.transportista = req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="CONDUCTOR/DRIVER");
			nEntrada.operador = req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="SELLOS/SEALS");
			nEntrada.sello=req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			nEntrada.plantaOrigen=planta.Nombre;
			nEntrada.DiasTraslado=planta.DiasTraslado;
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I');
			nEntrada.fechaSalidaPlanta = new Date(dateFormat(fechaSalidaPlanta, "dd/mm/yyyy"));;
			//console.log("testEntrada");
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");
					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					//console.log(partidas);
					/*console.log(entrada);
					console.log("/------------------/")*/
				}).catch((error) => {
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			res.status(500).send(error);
			console.log(error);
	};
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
	req.body.fechaAlta = new Date(Date.now()-(5*3600000));

	if (req.body.status == "SIN_POSICIONAR") {
		//console.log("1");
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
	//console.log(req.body.fechaInicio)
	var arrPartidas = [];
	var arrPartidasFilter = [];
	let clasificacion = req.body.clasificacion != undefined ? req.body.clasificacion : "";
	let subclasificacion = req.body.subclasificacion != undefined ? req.body.subclasificacion :"";
	let fechaInicio= req.body.fechaInicio != undefined ? req.body.fechaInicio !="" ? new Date(req.body.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.body.fechaFinal != undefined ? req.body.fechaFinal !="" ? new Date(req.body.fechaFinal).toISOString() :"" :"";
	let fecha=req.body.fecha != undefined ? req.body.fecha : "";
	let alerta1=req.body.alerta1 != undefined ? req.body.alerta1 : "";
	let alerta2=req.body.alerta2 != undefined ? req.body.alerta2 : "";
	let ageingInit=req.body.aging ? req.body.aging.inicio != undefined ? req.body.aging.inicio : "":"";
	let ageingFin=req.body.aging ? req.body.aging.fin != undefined ? req.body.aging.fin : "":"";
	let clave=req.body.producto_id != undefined ? req.body.producto_id : "";
	let folio=req.body.stringFolio != undefined ? req.body.stringFolio : "";
	let fechaEntrada="";
	let fechaFrescura="";
	let fechaAlerta1="";
	let fechaAlerta2="";
	let fechaProduccion="";
	let fechaCaducidad="";
	let range=1;
	let fechaEspRecibo="";
	let leyenda=0;
	let diasAlm=0;
	let diasEnAlm=0;
	let fCaducidad=0;
	var diff=0;
	let hoy=new Date(Date.now()-(5*3600000));
   	let Aging=0;
	let filter = {
		clienteFiscal_id: req.body.clienteFiscal_id,
		isEmpty: false
	}
	if(fechaInicio != "" &&  fechaFinal != ""){
		if(fecha == "fechaAlta")
		{
			filter.fechaAlta={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
		if(fecha == "fechaEntrada")
		{
			filter.fechaEntrada={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
	}
	if(folio != "")
	{
		filter.stringFolio=folio;
	}
	let reporte = 0;
	
	Entrada.find(filter, {partidas: 1, _id: 0})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta'
		},
		select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta'
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
				//console.log("1");
				let resFecha=true;
				let resAlerta1=true;
				let resAlerta2=true;
				if(fecha== "fechaProduccion")
				{
					if(elem.fechaProduccion)
						resFecha = new Date(elem.fechaProduccion)>new Date(fechaInicio) && new Date(elem.fechaProduccion)<new Date(fechaFinal);
					else
						resFecha = false;
				}
				if(fecha == "fechaCaducidad")
				{
					if(elem.fechaProduccion)
						resFecha = new Date(elem.fechaCaducidad)>new Date(fechaInicio) && new Date(elem.fechaCaducidad)<new Date(fechaFinal);
					else
						resFecha = false;
				}
				if(elem.entrada_id)
				{
					if(elem.fechaCaducidad !== undefined && elem.fechaCaducidad != null && elem.entrada_id.fechaEntrada !== undefined)
		        	{
		        		fCaducidad = elem.fechaCaducidad.getTime();
		                diff = Math.abs(fCaducidad - elem.entrada_id.fechaEntrada.getTime());
		                diasAlm=Math.floor((hoy - fCaducidad)/ 86400000);
		            	diasEnAlm = Math.floor(diff / 86400000);
		            	Aging=Math.floor((hoy-elem.entrada_id.fechaEntrada.getTime())/ 86400000);
		        		let fEntrada = elem.entrada_id.fechaEntrada.getTime();
		        		
		                if(elem.producto_id.garantiaFrescura)
		                	fechaFrescura = new Date(fCaducidad - (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
		                if(elem.producto_id.alertaAmarilla)
		                	fechaAlerta1 = dateFormat(new Date(fCaducidad - (elem.producto_id.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000)), "mm/dd/yyyy");
		            	
		            	if(elem.producto_id.alertaRoja)
		            		fechaAlerta2 = dateFormat(new Date(fCaducidad - (elem.producto_id.alertaRoja * 86400000)- (60 * 60 * 24 * 1000)), "mm/dd/yyyy");
		            	if(elem.producto_id.vidaAnaquel)
		            		leyenda = elem.producto_id.vidaAnaquel- diasEnAlm - 1
		            	
		            	
		        	}
		        	else{
	        			if(fecha == "fechaFrescura" || fecha == "fechaAlerta1" || fecha == "fechaAlerta2")
	        				resFecha=false;
	        		}
        		}
        		//console.log("2");
				if(fecha == "fechaFrescura" && fechaFrescura != "")
				{
					resFecha = new Date(fechaFrescura)>=new Date(dateFormat(req.body.fechaInicio, "mm/dd/yyyy")) && new Date(fechaFrescura)<new Date(dateFormat(req.body.fechaFinal, "mm/dd/yyyy"));
				}
				if(fecha == "fechaAlerta1" && fechaAlerta1 != "")
				{	
						
					resFecha = new Date(fechaAlerta1)>=new Date(dateFormat(req.body.fechaInicio, "mm/dd/yyyy")) && new Date(fechaAlerta1)<new Date(dateFormat(req.body.fechaFinal, "mm/dd/yyyy"));
					
				}
				if(fecha == "fechaAlerta2" && fechaAlerta2 != "")
				{
					resFecha = new Date(fechaAlerta2)>=new Date(dateFormat(req.body.fechaInicio, "mm/dd/yyyy")) && new Date(fechaAlerta2)<new Date(dateFormat(req.body.fechaFinal, "mm/dd/yyyy"));
				}
				if(elem.isEmpty == false && clasificacion == "" && subclasificacion == "" && fecha == "" &&alerta1 == "" && alerta2 == "" && ageingFin =="" && ageingInit == "" && clave=="" && folio=="" && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA")  && elem.status=="ASIGNADA"){
					arrPartidas.push(elem);
				}
				else{
					//console.log("3");
					let resClasificacion=true;
					let resSubclasificacion=true;
					let resAlerta1=true;
					let resAlerta2=true;
					let resAgeing=true;
					let resClave=true;
					if(ageingInit != "" && ageingFin!= "")
					{
						if(Aging >= parseInt(ageingInit) && Aging <= parseInt(ageingFin))
						{
							resAgeing=true;
						}
						else
							resAgeing=false;
					}
					if(clave != "" && elem.producto_id.id.toString() !== clave.toString())
					{
						resClave=false;
					}
					if(alerta1 !="" && fechaAlerta1 != "")
					{
						if(diasAlm < 0)
							if(Math.abs(diasAlm) >= elem.producto_id.alertaAmarilla)
								resAlerta1= alerta1 == "ATIEMPO";
							else
								resAlerta1= alerta1 == "RECHAZO";
						else
							resAlerta1= alerta1 == "RECHAZO" ;
					
					}
					if(alerta2 !="" && fechaAlerta2 != "")
					{
						if(diasAlm < 0)
							if(Math.abs(diasAlm) >= elem.producto_id.alertaRoja)
								resAlerta2= alerta1 == "ATIEMPO";
							else
								resAlerta2= alerta1 == "RECHAZO";
						else
							resAlerta2= alerta1 == "RECHAZO" ;
					}

					if(clasificacion != "" && elem.producto_id.statusReg == "ACTIVO")
					{
						resClasificacion=elem.producto_id.clasificacion_id.toString() === clasificacion.toString() ;
					}
					if(subclasificacion != "" && elem.producto_id.statusReg == "ACTIVO")
					{
						resSubclasificacion=elem.producto_id.subclasificacion_id.toString() === subclasificacion.toString();
					}
					if(elem.isEmpty == false && resClasificacion == true && resSubclasificacion == true && resFecha==true && resAlerta2==true && resAlerta1==true && resAgeing == true && resClave==true  && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA") && elem.status=="ASIGNADA")
					{	
						arrPartidas.push(elem);
					}
					//console.log("4");
				}
			})		
		});
		res.status(200).send(arrPartidas);
	})
	.catch((error) => {
		res.status(500).send(error);
	})
}

function getExcelCaducidades(req, res) {
	var arrPartidas = [];
	var arrPartidasFilter = [];
	let clasificacion = req.query.clasificacion != undefined ? req.query.clasificacion : "";
	let subclasificacion = req.query.subclasificacion != undefined ? req.query.subclasificacion :"";
	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let fecha=req.query.fecha != undefined ? req.query.fecha : "";
	let alerta1=req.query.alerta1 != undefined ? req.query.alerta1 : "";
	let alerta2=req.query.alerta2 != undefined ? req.query.alerta2 : "";
	let ageingInit=req.query.aging ? req.query.aging.inicio != undefined ? req.query.aging.inicio : "":"";
	let ageingFin=req.query.aging ? req.query.aging.fin != undefined ? req.query.aging.fin : "":"";
	let clave=req.query.producto_id != undefined ? req.query.producto_id : "";
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let tipoUsuario = req.query.tipoUsuario != undefined ? req.query.tipoUsuario : "";
	let fechaEntrada="";
	let fechaFrescura="";
	let fechaAlerta1="";
	let fechaAlerta2="";
	let fechaProduccion="";
	let fechaCaducidad="";
	let range=1;
	let fechaEspRecibo="";
	let leyenda=0;
	let diasAlm=0;
	let diasEnAlm=0;
	let fCaducidad=0;
	var diff=0;
	let hoy=new Date(Date.now()-(5*3600000));
   	let Aging=0;
	let filter = {
		clienteFiscal_id: req.query.clienteFiscal_id,
		isEmpty: false
	}
	if(fechaInicio != "" &&  fechaFinal != ""){
		if(fecha == "fechaAlta")
		{
			filter.fechaAlta={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
		if(fecha == "fechaEntrada")
		{
			filter.fechaEntrada={
		        $gte:fechaInicio,
		        $lt: fechaFinal
		    };
		}
	}
	if(folio != "")
	{
		filter.stringFolio=folio;
	}
	let reporte = 0;

	Entrada.find(filter, {partidas: 1, _id: 0})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta'
		},
		select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta'
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto',
		}
	})
	.then(async(entradas) => {
		entradas.forEach(entrada => {
			var partida = entrada.partidas;
			partida.forEach(elem => {
				
				let resFecha=true;
				let resAlerta1=true;
				let resAlerta2=true;
				if(fecha== "fechaProduccion")
				{
					if(elem.fechaProduccion)
						resFecha = new Date(elem.fechaProduccion)>new Date(fechaInicio) && new Date(elem.fechaProduccion)<new Date(fechaFinal);
					else
						resFecha = false;
				}
				if(fecha == "fechaCaducidad")
				{
					if(elem.fechaProduccion)
						resFecha = new Date(elem.fechaCaducidad)>new Date(fechaInicio) && new Date(elem.fechaCaducidad)<new Date(fechaFinal);
					else
						resFecha = false;
				}
				if(elem.entrada_id)
				{
					if(elem.fechaCaducidad !== undefined && elem.fechaCaducidad != null && elem.entrada_id.fechaEntrada !== undefined)
					{

		        		fCaducidad = elem.fechaCaducidad.getTime();
		                diff = Math.abs(fCaducidad - elem.entrada_id.fechaEntrada.getTime());
		                diasAlm=Math.floor((hoy - fCaducidad)/ 86400000);
		            	diasEnAlm = Math.floor(diff / 86400000);
		            	Aging=Math.floor((hoy-elem.entrada_id.fechaEntrada.getTime())/ 86400000);
		        		let fEntrada = elem.entrada_id.fechaEntrada.getTime();
		                if(elem.producto_id.garantiaFrescura)
		                	fechaFrescura = new Date(fCaducidad - (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
		                if(elem.producto_id.alertaAmarilla)
		                	fechaAlerta1 = dateFormat(new Date(fCaducidad - (elem.producto_id.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000)), "mm/dd/yyyy");
		            	if(elem.producto_id.alertaRoja)
		            		fechaAlerta2 = dateFormat(new Date(fCaducidad - (elem.producto_id.alertaRoja * 86400000)- (60 * 60 * 24 * 1000)), "mm/dd/yyyy");
		            	if(elem.producto_id.vidaAnaquel)
		            		leyenda = elem.producto_id.vidaAnaquel- diasEnAlm - 1
		            	
		            	
		        	}
		        	else{
	        			if(fecha == "fechaFrescura" || fecha == "fechaAlerta1" || fecha == "fechaAlerta2")
	        				resFecha=false;
	        		}
        		}
				if(fecha == "fechaFrescura" && fechaFrescura != "")
				{
					resFecha = new Date(dateFormat(fechaFrescura, "mm/dd/yyyy"))>=new Date(dateFormat(req.query.fechaInicio, "mm/dd/yyyy")) && new Date(dateFormat(fechaFrescura, "mm/dd/yyyy"))<new Date(dateFormat(req.query.fechaFinal, "mm/dd/yyyy"));
				}
				if(fecha == "fechaAlerta1" && fechaAlerta1 != "")
				{	
					//console.log(new Date(dateFormat(fechaAlerta1, "mm/dd/yyyy"))+">="+new Date(dateFormat(req.query.fechaInicio, "mm/dd/yyyy"))+" && "+new Date(dateFormat(fechaAlerta1, "mm/dd/yyyy"))+"<"+new Date(dateFormat(req.query.fechaFinal, "mm/dd/yyyy")));
					resFecha = new Date(dateFormat(fechaAlerta1, "mm/dd/yyyy"))>=new Date(dateFormat(req.query.fechaInicio, "mm/dd/yyyy")) && new Date(dateFormat(fechaAlerta1, "mm/dd/yyyy"))<new Date(dateFormat(req.query.fechaFinal, "mm/dd/yyyy"));
					
				}
				if(fecha == "fechaAlerta2" && fechaAlerta2 != "")
				{
					resFecha = new Date(dateFormat(fechaAlerta2, "mm/dd/yyyy"))>=new Date(dateFormat(req.query.fechaInicio, "mm/dd/yyyy")) && new Date(dateFormat(fechaAlerta2, "mm/dd/yyyy"))<new Date(dateFormat(req.query.fechaFinal, "mm/dd/yyyy"));
				}
				if(elem.isEmpty == false && clasificacion == "" && subclasificacion == "" && fecha == "" &&alerta1 == "" && alerta2 == "" && ageingFin =="" && ageingInit == "" && clave=="" && folio==""  && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA") && elem.status=="ASIGNADA"){
					arrPartidas.push(elem);
				}
				else{
					let resClasificacion=true;
					let resSubclasificacion=true;
					let resAlerta1=true;
					let resAlerta2=true;
					let resAgeing=true;
					let resClave=true;
					if(ageingInit != "" && ageingFin!= "")
					{
						if(Aging >= parseInt(ageingInit) && Aging <= parseInt(ageingFin))
						{
							resAgeing=true;
						}
						else
							resAgeing=false;
					}
					if(clave != "" && elem.producto_id.id.toString() != clave.toString())
					{
						resClave=false;
					}
					if(alerta1 !="" && fechaAlerta1 != "")
					{
						if(diasAlm < 0)
							if(Math.abs(diasAlm) >= elem.producto_id.alertaAmarilla)
								resAlerta1= alerta1 == "ATIEMPO";
							else
								resAlerta1= alerta1 == "RECHAZO";
						else
							resAlerta1= alerta1 == "RECHAZO" ;
					
					}
					if(alerta2 !="" && fechaAlerta2 != "")
					{
						if(diasAlm < 0)
							if(Math.abs(diasAlm) >= elem.producto_id.alertaRoja)
								resAlerta2= alerta1 == "ATIEMPO";
							else
								resAlerta2= alerta1 == "RECHAZO";
						else
							resAlerta2= alerta1 == "RECHAZO" ;
					}
					if(clasificacion != "" && elem.producto_id.statusReg == "ACTIVO")
					{
						resClasificacion=elem.producto_id.clasificacion_id.toString() == clasificacion.toString() ;
					}
					if(subclasificacion != "" && elem.producto_id.statusReg == "ACTIVO")
					{
						resSubclasificacion=elem.producto_id.subclasificacion_id.toString() == subclasificacion.toString();
					}
					//console.log(elem.isEmpty +"== false &&"+ resClasificacion+ "== true &&"+ resSubclasificacion +"== true &&"+ resFecha+"==true &&" +resAlerta2+"==true &&"+ resAlerta1+"==true &&"+ resAgeing+" == true && "+resClave+"==true")
					if(elem.isEmpty == false && resClasificacion == true && resSubclasificacion == true && resFecha==true && resAlerta2==true && resAlerta1==true && resAgeing == true && resClave==true  && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA") && elem.status=="ASIGNADA")
					{	
						arrPartidas.push(elem);
					}
				}
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
        let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
        let formatofecha=(clientefiscal._id == "5e33420d22b5651aecafe934" && tipoUsuario == "CLIENTE ADMINISTRADOR USA") ? "mm/dd/yyyy" : "dd/mm/yyyy";
      
        let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
        let ArrayEmbalaje = await EmbalajesController.getArrayEmbalajes();
        
         
        var worksheet = workbook.addWorksheet('Partidas');
        worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
        worksheet.cell(2, 1).string('Lote').style(headersStyle);
		worksheet.cell(2, 2).string('Folio entrada').style(headersStyle);
		worksheet.cell(2, 3).string('Clave').style(headersStyle);
		worksheet.cell(2, 4).string('Descripción').style(headersStyle);
		let indexheaders=5;
		clienteEmbalaje.forEach(Embalaje=>{ 
			let index=ArrayEmbalaje.findIndex(obj=> (obj.clave == Embalaje));
				if(ArrayEmbalaje[index].clave== "cajas" && clientefiscal._id == "5e33420d22b5651aecafe934")
					worksheet.cell(2, indexheaders).string("Corrugados").style(headersStyle);
				else
					worksheet.cell(2, indexheaders).string(ArrayEmbalaje[index].nombre).style(headersStyle);
				indexheaders++;
			
		});

		worksheet.cell(2, indexheaders).string('Fecha Producción').style(headersStyle);
		worksheet.cell(2, indexheaders+1).string('Fecha Caducidad').style(headersStyle);
		worksheet.cell(2, indexheaders+2).string('Fecha Embarque Calculada a 2 dias despues').style(headersStyle);
		worksheet.cell(2, indexheaders+3).string('Garantia Frescura a Fecha de Embarque').style(headersStyle);
		worksheet.cell(2, indexheaders+4).string('Garantia Frescura').style(headersStyle);
		worksheet.cell(2, indexheaders+5).string('Dias Anaquel Original de Planta').style(headersStyle);
		worksheet.cell(2, indexheaders+6).string('Dias Traslado Programado').style(headersStyle);
		worksheet.cell(2, indexheaders+7).string('Fecha Esperada Recibo').style(headersStyle);
		worksheet.cell(2, indexheaders+8).string('Dias Anaquel en Llegada').style(headersStyle);
		worksheet.cell(2, indexheaders+9).string('Dias Traslado Real').style(headersStyle);
		worksheet.cell(2, indexheaders+10).string('Fecha de Recibo Cedis').style(headersStyle);
		worksheet.cell(2, indexheaders+11).string('Aging Report').style(headersStyle);
		worksheet.cell(2, indexheaders+12).string('Dias Alerta 1').style(headersStyle);
		worksheet.cell(2, indexheaders+13).string('Alerta 1').style(headersStyle);
		worksheet.cell(2, indexheaders+14).string('Fecha Alerta 1').style(headersStyle);
		worksheet.cell(2, indexheaders+15).string('Dias Alerta 2').style(headersStyle);
		worksheet.cell(2, indexheaders+16).string('Alerta 2').style(headersStyle);
		worksheet.cell(2, indexheaders+17).string('Fecha Alerta 2').style(headersStyle);
		worksheet.cell(2, indexheaders+18).string('Ubicacion').style(headersStyle);
		
        let i=3;
        //console.log(arrPartidas);
        arrPartidas.forEach(partidas => 
        {
        	
        	fechaEspRecibo="";
        	leyenda=0;
        	diasAlm=0;
        	diasEnAlm=0;
        	let strleyenda="A TIEMPO";
        	let fechacalculada2Dias="";
			let tempx ="";
			let GarFresFecha=0;
			let orginalshippingdays=0;
			let GarFresFechaStyle = workbook.createStyle({
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
        	fechaFrescura =0;
        	fechaAlerta1="";
        	fechaAlerta2="";
        	fCaducidad=0;
        	diff=0;
        	hoy=new Date(Date.now()-(5*3600000));
           	Aging=0;

           	if(partidas.entrada_id)
           	{
	        	if(partidas.fechaCaducidad !== undefined && partidas.fechaCaducidad != null && partidas.entrada_id.fechaEntrada != undefined)
	        	{
	        		fCaducidad = partidas.fechaCaducidad.getTime();
	                diff = Math.abs(fCaducidad - partidas.entrada_id.fechaEntrada.getTime());
	                diasAlm=Math.floor((hoy - fCaducidad)/ 86400000);
	            	diasEnAlm = Math.floor(diff / 86400000);
	            	Aging=Math.floor((hoy-partidas.entrada_id.fechaEntrada.getTime())/ 86400000);
	        		let fEntrada = partidas.entrada_id.fechaEntrada.getTime();
	                if(partidas.producto_id.garantiaFrescura)
	                	fechaFrescura = dateFormat(new Date(fCaducidad - (partidas.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)), formatofecha);
	                if(partidas.producto_id.alertaAmarilla)
	                	fechaAlerta1 = dateFormat(new Date(fCaducidad - (partidas.producto_id.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000)), formatofecha);
	            	if(partidas.producto_id.alertaRoja)
	            		fechaAlerta2 = dateFormat(new Date(fCaducidad - (partidas.producto_id.alertaRoja * 86400000)- (60 * 60 * 24 * 1000)), formatofecha);
	            	if(partidas.producto_id.vidaAnaquel)
	            		leyenda = partidas.producto_id.vidaAnaquel- diasEnAlm - 1
	            	if(partidas.entrada_id.fechaSalidaPlanta != undefined)
	            		orginalshippingdays=Math.abs(Math.floor((partidas.entrada_id.fechaSalidaPlanta.getTime()-partidas.entrada_id.fechaEntrada.getTime())/ 86400000)-1)
	        	}
	        	if (partidas.fechaCaducidad !== undefined && partidas.entrada_id.DiasTraslado !== undefined) {
	                let tiempoTraslado = partidas.producto_id.vidaAnaquel - partidas.entrada_id.DiasTraslado-1;
	                let fechaRecibo = new Date(fCaducidad - tiempoTraslado * 86400000);
	                fechaEspRecibo =dateFormat(fechaRecibo, formatofecha);
	            }
	        
            if (partidas.entrada_id.fechaReciboRemision !== undefined) 
            {
                tempx= new Date(partidas.entrada_id.fechaReciboRemision).getTime() + 2 * 86400000;
                fechacalculada2Dias = dateFormat(tempx, formatofecha);
                    
            }
			if (partidas.entrada_id.fechaReciboRemision !== undefined && partidas.fechaCaducidad !== undefined) {
			    tempx = new Date(partidas.entrada_id.fechaReciboRemision.getTime() + 2 * 86400000);
			    fCaducidad = partidas.fechaCaducidad.getTime();
			    GarFresFecha = Math.round((Math.floor(fCaducidad - tempx.getTime()))/ 86400000);
			    if (GarFresFecha <= 0){
			    	GarFresFechaStyle = workbook.createStyle({
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
			    else if (GarFresFecha < partidas.producto_id.garantiaFrescura){
			    	GarFresFechaStyle = workbook.createStyle({
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
					    bgColor: '#FFC300',
					    fgColor: '#FFC300',
					  },
			        });
			    }
			    else if (GarFresFecha > partidas.producto_id.garantiaFrescura){
			        GarFresFechaStyle = workbook.createStyle({
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
				}
			}
            worksheet.cell(i, 1).string(partidas.lote ? partidas.lote:"");
            worksheet.cell(i, 2).string(partidas.entrada_id ? partidas.entrada_id.stringFolio  ? partidas.entrada_id.stringFolio :"":"");
           	worksheet.cell(i, 3).string(partidas.clave ? partidas.clave:"");
           	worksheet.cell(i, 4).string(partidas.descripcion ? partidas.descripcion:"");
           	let indexbody=5;
           	clienteEmbalaje.forEach(emb=>
           	{	
           		let tarimas =0
           		if (emb == 'tarimas' && partidas.producto_id.arrEquivalencias.length > 0) {
	                let band = false;
	                partidas.producto_id.arrEquivalencias.forEach(function (equivalencia) {
	                    if (equivalencia.embalaje === "Tarima" && equivalencia.embalajeEquivalencia === "Caja") {

	                        tarimas = partidas.embalajesxSalir.cajas / equivalencia.cantidadEquivalencia ? (partidas.embalajesxSalir.cajas / equivalencia.cantidadEquivalencia).toFixed(1) : 0;
	                        band = true;
	                    }
	                });
	                if (band !== true){
	                    tarimas = partidas.embalajesxSalir.tarimas ? partidas.embalajesxSalir.tarimas : 0;
	                	
	                }
	                worksheet.cell(i, indexbody).number(parseInt(tarimas));
	            }
	            else {
	                worksheet.cell(i, indexbody).number(partidas.embalajesxSalir[emb] ? parseInt(partidas.embalajesxSalir[emb]):0);
	            }
           		indexbody++;
           	});
           	worksheet.cell(i, indexbody).string(partidas.fechaProduccion ? dateFormat(new Date(partidas.fechaProduccion.getTime()), formatofecha):"");
           	worksheet.cell(i, indexbody+1).string(partidas.fechaCaducidad ? dateFormat(new Date(partidas.fechaCaducidad.getTime()), formatofecha):"");
           	worksheet.cell(i, indexbody+2).string(fechacalculada2Dias);
           	worksheet.cell(i, indexbody+3).number(GarFresFecha).style(GarFresFechaStyle);
           	worksheet.cell(i, indexbody+4).number(partidas.producto_id.garantiaFrescura ? partidas.producto_id.garantiaFrescura:0);
           	worksheet.cell(i, indexbody+5).number(partidas.producto_id.vidaAnaquel ? partidas.producto_id.vidaAnaquel:0);
           	worksheet.cell(i, indexbody+6).number(partidas.entrada_id ? partidas.entrada_id.DiasTraslado ? partidas.entrada_id.DiasTraslado:0:0);
           	worksheet.cell(i, indexbody+7).string(fechaEspRecibo);
           	worksheet.cell(i, indexbody+8).number(1+diasEnAlm);
           	worksheet.cell(i, indexbody+9).number(orginalshippingdays);
           	worksheet.cell(i, indexbody+10).string(partidas.entrada_id ? partidas.entrada_id.fechaEntrada ? dateFormat(partidas.entrada_id.fechaEntrada, formatofecha):"":"");
           	worksheet.cell(i, indexbody+11).number(Math.abs(Aging));
           	//worksheet.cell(i, indexbody+11).number(partidas.producto_id.garantiaFrescura ? partidas.producto_id.garantiaFrescura:0);
           	//worksheet.cell(i, indexbody+12).string(fechaFrescura ? fechaFrescura:"");
           	worksheet.cell(i, indexbody+12).number(partidas.producto_id.alertaAmarilla ? partidas.producto_id.alertaAmarilla:0);
           	
           	if(diasAlm<0)
           	{
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
       		}else
       		{
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
       		worksheet.cell(i, indexbody+13).string(strleyenda).style(ResultStyle);
           	worksheet.cell(i, indexbody+14).string(fechaAlerta1);
           	worksheet.cell(i, indexbody+15).number(partidas.producto_id.alertaRoja ? partidas.producto_id.alertaRoja:0);
           	if(diasAlm<0)
           	{
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
       		}
       		else
       		{
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
           	worksheet.cell(i, indexbody+16).string(strleyenda).style(ResultStyle);
           	worksheet.cell(i, indexbody+17).string(fechaAlerta2);
           	let res="";
           	if(partidas.posiciones.length === 1) 
            	res = partidas.posiciones[0].pasillo + partidas.posiciones[0].nivel + partidas.posiciones[0].posicion;
           	worksheet.cell(i, indexbody+18).string(res);
            i++;
        });
        workbook.write('ReporteCaducidad'+dateFormat(new Date(Date.now()-(5*3600000)), formatofecha)+'.xlsx',res);


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
	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
	let fecha=req.query.fecha != undefined ? req.query.fecha : "";
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let filter ="";
	if(_status != "NINGUNO"){
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



	filter = {
			sucursal_id: _idSucursal,
			clienteFiscal_id: _idClienteFiscal,
			almacen_id: _idAlmacen,
			tipo: _tipo
		};
		if(fechaInicio != "" &&  fechaFinal != ""){
			if(fecha == "fechaAlta")
			{
				filter.fechaAlta={
			        $gte:fechaInicio,
			        $lt: fechaFinal
			    };
			}
			if(fecha == "fechaEntrada")
			{
				filter.fechaEntrada={
			        $gte:fechaInicio,
			        $lt: fechaFinal
			    };
			}
		}
		if(folio != "")
		{
			filter.stringFolio=folio;
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
	            i++;
	        });
	        workbook.write('ReporteEntradas'+dateFormat(new Date(Date.now()-(5*3600000)), "ddmmyyhh")+'.xlsx',res);
			
		}).catch((error) => {
			res.status(500).send(error);
		});
}
/*change status to arrived*/
async function updateById(req, res) {

	let _id = req.query.id;
	let entrada = await Entrada.findOne({ _id: _id });
	entrada.status="ARRIVED";
	entrada.save().then((entrada) => {
		entrada.partidas.forEach(async id_partidas => 
        {
        	let partida = await PartidaModel.findOne({ _id: id_partidas });
        	partida.status="ARRIVED";
			partida.save();

        });
		res.status(200).send(entrada);
	})
	.catch((error) => {
		res.status(500).send(error);
	});
}

async function posicionarPrioridades(req, res) {
	let _id = req.body.id;
	//console.log(_id);
	let entrada = await Entrada.findOne({ _id: _id });
	//console.log(entrada);
	//console.log(req.body);
	let arrayFamilias=[];
	var reOrderPartidas=[];
	/*when to order by date???*/
	let array=req.body.nPartidas;
	let resultpartidas=[];
	try 
	{
		//console.log("testbegin");
		let freePosicions=await PasilloCtr.countDisponibles(entrada.almacen_id);
		//console.log(freePosicions+"+<"+ entrada.partidas.length )
		//console.log("test");
		if(freePosicions < array.length){
	    	return res.status(200).send("No hay suficientes posiciones");
		}
		else{
			await Helper.asyncForEach(entrada.partidas, async function (id_partidas) {
				//console.log(id_partidas in array.find(element => element =id_partidas))
				
			    	let partida = await PartidaModel.findOne({ _id: id_partidas });
			    	//console.log("-------------------------------");
			    	//console.log(partida.descripcion);
			    	//console.log(dateFormat(partida.fechaCaducidad, "dd/mm/yyyy"));
			    if(array.find(element => element == id_partidas)){	
			    	let producto = await Producto.findOne({ _id: partida.producto_id });
			    	//console.log("-------------------------------");
			 		//console.log(producto.prioridad)
			    	partida.status="ASIGNADA";
					partida.save();
			    	if(producto.familia)
			    	{
			    		if(arrayFamilias.find(obj=> (obj.nombre == producto.familia  && obj.prioridad == producto.prioridad && obj.fechaCaducidad == dateFormat(partida.fechaCaducidad, "dd/mm/yyyy"))))
			    		{
			    			//console.log("yes");
			    			let index=arrayFamilias.findIndex(obj=> (obj.nombre == producto.familia && obj.prioridad == producto.prioridad && obj.fechaCaducidad == dateFormat(partida.fechaCaducidad, "dd/mm/yyyy")));
			    			arrayFamilias[index].needed=1+arrayFamilias[index].needed;
				    	}
				        else{
				        	//console.log("NO");
				        	const data={
							nombre:producto.familia,
							prioridad: producto.prioridad,
							descripcion:producto.descripcion,
				        	needed:1,
				        	fechaCaducidad:dateFormat(partida.fechaCaducidad, "dd/mm/yyyy"),
				        	arrayPosiciones:[]
				        	}
			    			arrayFamilias.push(data)  
				        
			    		}  	
			    	}
			    	reOrderPartidas.push(partida)
			    	resultpartidas.push(partida._id)
			    }
			    else
			    {
			    	partida.status="REMOVED";
			    	partida.entrada_id=undefined;
					partida.save();
			    }
		    });
		    
		    arrayFamilias=arrayFamilias.sort(function(a, b) {
		    	return b.prioridad - a.prioridad;
			});
		    arrayFamilias=arrayFamilias.sort(function(a, b) {
			    a = a.fechaCaducidad;
			    b = b.fechaCaducidad;
			    return a<b ? -1 : a>b ? 1 : 0;
			});
		    

			/*reOrderPartidas.sort(function(a, b) {
			    a = new Date(dateFormat(a.fechaCaducidad, "dd/mm/yyyy"));
			    b = new Date(dateFormat(b.fechaCaducidad, "dd/mm/yyyy"));
			    return a<b ? -1 : a>b ? 1 : 0;
			});*/
			let respuesta=0;
			//console.log(arrayFamilias);
			await Helper.asyncForEach(arrayFamilias, async function (familia) 
			{
		    	//console.log("_________"+familia.nombre+"-"+familia.prioridad+"-"+familia.needed+"-"+familia.fechaCaducidad+"_________");
		    	familia.arrayPosiciones=await PasilloCtr.getPocionesAuto(familia,entrada.almacen_id);
		    	//console.log("----result----");
		    	//console.log(familia.arrayPosiciones);
		    	//console.log("_________");
		    	respuesta+=familia.arrayPosiciones.length;
		    });
		  //  console.log(respuesta+" < "+entrada.partidas.length)
		    if(respuesta < 0){
		    	return res.status(200).send("No hay suficientes posiciones en familias");
		    }
		   // console.log("endGET");

		   
		    //console.log("Start");
			await Helper.asyncForEach(reOrderPartidas, async function (repartidas) {
				if(array.find(element => element == repartidas._id)){
			    	let partida = await PartidaModel.findOne({ _id: repartidas._id });
			    	///console.log("-------------------------------");
			    	//console.log(partida.descripcion);
			    	//console.log(dateFormat(partida.fechaCaducidad, "dd/mm/yyyy"));
			    	
			    	let producto = await Producto.findOne({ _id: partida.producto_id });
			    	//console.log("-------------------------------");
			 		//console.log(producto.prioridad)
			 	 	respuesta=0;
		 	 	
			    	if(producto.familia)
			    	{
			    		if(arrayFamilias.find(obj=> (obj.nombre == producto.familia &&  obj.prioridad == producto.prioridad && obj.fechaCaducidad == dateFormat(partida.fechaCaducidad, "dd/mm/yyyy"))))
			    		{
			    			let index=arrayFamilias.findIndex(obj=> (obj.nombre == producto.familia && obj.prioridad == producto.prioridad && obj.fechaCaducidad == dateFormat(partida.fechaCaducidad, "dd/mm/yyyy")));
			    			
			    			if(arrayFamilias[index].needed>0){
			    				//console.log(arrayFamilias[index].arrayPosiciones[0]);
			    				await Partida.posicionarAuto(arrayFamilias[index].arrayPosiciones[0].pocision_id,repartidas._id,arrayFamilias[index].arrayPosiciones[0].nivelIndex);
			    				arrayFamilias[index].arrayPosiciones.shift();
			    			}
			    			else
			    			{
			    				respuesta+=arrayFamilias[index].needed;
			    			}
			    			arrayFamilias[index].needed-=1;
			    			

			    		}

			    	}
			    }
		    });
		    entrada.status="APLICADA";
		    entrada.partidas=resultpartidas; 
		    entrada.fechaEntrada=new Date(Date.now()-(5*3600000));
			await entrada.save().then(async (entrada) => {
					/*console.log("testpartidas");
					console.log(resultpartidas);
					console.log("/------------------/");*/
					for (let itemPartida of reOrderPartidas) {
						//console.log("testMovimientos");
						let partidait = await PartidaModel.findOne({ _id: itemPartida._id });
						//console.log(partidait.posiciones);
						await MovimientoInventario.saveEntrada(	partidait, entrada.id);
					}
					/*console.log(entrada);*/
			});
		    if(respuesta<1)
				return res.status(200).send(entrada);
			else
				return res.status(500).send("not");
		}
	}catch (error) {
		console.log(error);
        return res.status(500).send(error);
        
    }
}

/* Actualiza entrada y agrega partida dashboard */
function updateRemision(req, res) {
	let entrada_id = req.body.entrada_id;
	var infoPartida = req.body.partida;
	let newPartida = new PartidaModel(infoPartida);

	newPartida.save().then((partida) => {
		let ticket = new Ticket();
		ticket.partida_id = partida._id;
		ticket.entrada_id = entrada_id;
		
		ticket.save().then((resTicket) => {
			console.log(resTicket._id);
		});
		
		var arrPartidas = [];
		Entrada.findOne({_id: entrada_id}).then((entrada) => {
			arrPartidas = entrada.partidas;
			arrPartidas.push(newPartida._id);

			Entrada.updateOne({_id: entrada_id}, { $set: { partidas: arrPartidas }}).then((entrada) => {
				res.status(200).send(infoPartida);
			})
			.catch((error) => {
				res.status(500).send(error);
			});
		});
	});
}

/* Cambiar el status de una entrada */
function updateStatus(req, res) {
	let _id = req.body.entrada_id;
	let newStatus = req.body.status;
	//console.log(newStatus);
	
	Entrada.updateOne({_id: _id}, { $set: { status: newStatus }}).then((data) => {
		res.status(200).send(data);
	})
	.catch((error) => {
		//console.log(error);
		res.status(500).send(error);
	});
}

async function updateFecha(idEntrada)
{
	var today=new Date(Date.now()-(5*3600000));
	Entrada.updateOne({_id: idEntrada}, { $set: { fechaEntrada: today }}).then(async (data) => {
		await MovimientoInventario.updateMovimientos(idEntrada,today);
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
	getEntradasReporte,
	getExcelEntradas,
	getExcelCaducidades,
	saveEntradaBabel,
	updateById,
	posicionarPrioridades,
	updateRemision,
	updateStatus,
	updateFecha
	// getPartidaById,
}








 
