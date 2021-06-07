'use strict'
const mongoose = require('mongoose');
const Entrada = require('./Entrada.model');
const Producto = require('../Producto/Producto.model');
const Salida = require('../Salidas/Salida.model');
const Partida = require('../Partida/Partida.controller');
const PasilloCtr = require('../Pasillos/Pasillo.controller');
const EmbalajesController = require('../Embalaje/Embalaje.controller');
const PartidaModel = require('../Partida/Partida.model');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.model');
const Helper = require('../../services/utils/helpers');
const MovimientoInventario = require('../MovimientosInventario/MovimientoInventario.controller');
const MovimientoInventarioModel = require('../MovimientosInventario/MovimientoInventario.model');
const Interfaz_ALM_XD = require('../Interfaz_ALM_XD/Interfaz_ALM_XD.controller');
const TiempoCargaDescarga = require('../TiempoCargaDescarga/TiempoCargaDescarga.controller');
const PlantaProductora = require('../PlantaProductora/PlantaProductora.model'); 
const dateFormat = require('dateformat');

const Ticket = require('../Ticket/Ticket.model');
function getNextID() {
	return Helper.getNextID(Entrada, "idEntrada");
}

function getNextIDTicket() {
	return Helper.getNextID(Ticket, "idTicket");
}

async function get(req, res) {

	let pagination = {
		page: parseInt(req.query.page),
		limit: parseInt(req.query.limit)
	}
	console.log(pagination)
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
	console.log(_status);
	let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
	let filter ="", WaitingArrival = 0, ARRIVED = 0, APLICADA = 0, RECHAZO = 0, FINALIZADO = 0;
	var json = [];
	let iscontadores = false;
	//console.log(_tipo);
	if(_status != "FINALIZADO" && _status != null && _status !== "NINGUNO" && _status !== "isContador"){
		filter = {
			clienteFiscal_id: _idClienteFiscal,
			sucursal_id: _idSucursal,
			almacen_id: _idAlmacen,
			tipo: _tipo,
			status: _status
		};
	}
	else if(_status != null && _status !== "isContador")
	{
		//console.log(isReporte);
		if( isReporte === "true" && _status === "NINGUNO") {
			filter = {
				clienteFiscal_id: _idClienteFiscal,
				sucursal_id: _idSucursal,
				almacen_id: _idAlmacen,
				tipo: _tipo,
				status: { $in:['FINALIZADO','APLICADA']}
			};
		}
		else {
			filter = {
				clienteFiscal_id: _idClienteFiscal,
				sucursal_id: _idSucursal,
				almacen_id: _idAlmacen,
				tipo: _tipo,
				status: _status
			};
		}
		
	}
	else if(_status === "isContador"){
		console.log("test12");
		filter = {
			sucursal_id: _idSucursal,
			clienteFiscal_id: _idClienteFiscal,
			almacen_id: _idAlmacen,
			tipo: _tipo
		};
		await Entrada.find(filter)
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


	if(isReporte === "true"){
		let entradaAggregate = Entrada.aggregate([

			{
				$lookup: {
					from: "Partidas",
					localField: "partidas",    // field in the orders collection
					foreignField: "_id",  // field in the items collection
					as: "fromPartidas"
				}
			},
			{
				$lookup: {
					from: "Productos",
					localField: "fromPartidas.producto_id",
					foreignField: "_id",
					as: "fromProductos"
				}
			},
			{
				$match: {
					clienteFiscal_id: mongoose.Types.ObjectId(filter.clienteFiscal_id),
					sucursal_id: mongoose.Types.ObjectId(filter.sucursal_id),
					almacen_id: mongoose.Types.ObjectId(filter.almacen_id),
					tipo: filter.tipo,
					status: filter.status
				}
			},
			{
				$project: {
					_id: 1,
					isEmpty: 1,
					item: 1,
					tipo: 1,
					embarque: 1,
					referencia: 1,
					acuse: 1,
					proveedor: 1,
					ordenCompra: 1,
					factura: 1,
					transportista: 1,
					operador: 1,
					unidad: 1,
					remolque: 1,
					sello: 1,
					plantaOrigen: 1,
					fechaEntrada: 1,
					fechaReciboRemision: 1,
					fechaSalidaPlanta: 1,
					observaciones: 1,
					usuarioAlta_id: 1,
					nombreUsuario: 1,
					recibio: 1,
					clienteFiscal_id: 1,
					idClienteFiscal: 1,
					idSucursal: 1,
					sucursal_id: 1,
					almacen_id: 1,
					DiasTraslado: 1,
					status: 1,
					fechaAlta: 1,
					idEntrada: 1,
					folio: 1,
					stringFolio: 1,
					posiciones: "$fromPartidas.posiciones",
					__v: 1,
					cajasTotales: { $sum: "$fromPartidas.embalajesxSalir.cajas" },
					
				}
			},
			{ $sort: { fechaEntrada: -1 } }
		])

		Entrada.aggregatePaginate(entradaAggregate, pagination)
	
		then(entradas =>{
		
			entradas.docs.forEach(entrada => {
	
				let posiciones = entrada.posiciones;
				let cantidadTarimas = 0;
				posiciones.forEach(posicion => {
					//print(posicion.length)
					posicion = posicion.filter(pos => pos.isEmpty === false);
		
					cantidadTarimas = cantidadTarimas + posicion.length;
					})
		
				entrada.tarimasTotales = cantidadTarimas;
		
			})
	
				
			res.status(200).send(entradas);
				
	
		}).catch(error => res.status(500).send(error))
	
	}else{
		console.log("No es reporte");
		Entrada.find(filter).sort({ fechaEntrada: -1 })
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		}).then(entradas =>{
			
			res.status(200).send(_status === "isContador" ? json : entradas);

			}).catch(error => res.status(500).send(error))
		
	}

}

function getById(req, res) {
	
	let _id = req.query.id;
	console.log(req.query);
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
	nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
	let countEntradas=await Entrada.find({"item":nEntrada.item}).exec();

	if(countEntradas.length>0)
	{
		return res.status(203).send({error:"Numero de Control ya existe"});
	}
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
		nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);

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
	//console.log("1");
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=0; i<req.body.Pedido.length ; i++) {
		//console.log(req.body.Pedido[i]);
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined && req.body.Pedido[i].NO !== undefined)
		{
			console.log("test");
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(500).send("no existe item: "+req.body.Pedido[i].Clave);
			let fechaCaducidadTemp=req.body.Pedido[i].Caducidad.length > 8 ? req.body.Pedido[i].Caducidad.replace(/M/g, "") :req.body.Pedido[i].Caducidad;
			let fechaCaducidadRes= fechaCaducidadTemp.length == 8 ? Date.parse(fechaCaducidadTemp.slice(0, 4)+"/"+fechaCaducidadTemp.slice(4, 6)+"/"+fechaCaducidadTemp.slice(6, 8)):Date.parse(fechaCaducidadTemp.slice(0, 4)+"/"+fechaCaducidadTemp.slice(5, 7)+"/"+fechaCaducidadTemp.slice(8, 10));
			if(isNaN(fechaCaducidadRes))
	        {
	        	fechaCaducidadRes= fechaCaducidadTemp.length == 8 ? Date.parse(fechaCaducidadTemp.slice(0, 2)+"/"+fechaCaducidadTemp.slice(2, 4)+"/"+fechaCaducidadTemp.slice(4, 8)):Date.parse(fechaCaducidadTemp.slice(0, 2)+"/"+fechaCaducidadTemp.slice(3, 5)+"/"+fechaCaducidadTemp.slice(6, 10));
	        }
	        let today=new Date(Date.now()-(5*3600000));
	        fechaCaducidadRes= new Date(fechaCaducidadRes);
	        let days=(producto.garantiaFrescura ? producto.garantiaFrescura : 85)-1;
	        if(fechaCaducidadRes.getTime()<(today.getTime()+days*86400000)) 
	        	return res.status(500).send("No cumple con la fecha: "+req.body.Pedido[i].Clave); 
	        //console.log(producto.clave);
	        let indexFecha=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="FECHA/DATE");
			let fechaProducionplanta=Date.parse(req.body.Infoplanta[indexFecha+1].InfoPedido);
			fechaProducionplanta = new Date (fechaProducionplanta).getTime()-(7*3600000);
			if(fechaCaducidadRes < new Date(fechaProducionplanta+(70*3600000)))
			{
				return res.status(500).send("FechaMenor\n" + resORDENES+" ");


			}
	        console.log(req.body.Pedido[i].Caducidad);
			const data={
				producto_id:producto._id,
				clave:producto.clave,
				descripcion:producto.descripcion,
				origen:"BABEL",
				tipo: "NORMAL",
    			status: "WAITINGARRIVAL",
				embalajesEntrada: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	embalajesxSalir: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	fechaProduccion:new Date(fechaProducionplanta),
	        	fechaCaducidad: fechaCaducidadRes,
	        	lote:req.body.Pedido[i].Lote.replace(" ", "").trim(),
	        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
	        	valor:0
	        }
	        // console.log(data.InfoPedidos)
	        let countEntradas=await Entrada.find({"factura":req.body.Pedido[i].Factura}).exec();
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"referencia":req.body.Pedido[i].Factura}).exec():countEntradas;
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"item":req.body.Pedido[i].Factura}).exec():countEntradas;
	        console.log("test"+countEntradas.length)
    		if(countEntradas.length ==0)
    		{
		        if(arrPO.find(obj=> (obj.factura == req.body.Pedido[i].Factura)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.factura == req.body.Pedido[i].Factura));
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
    			resORDENES=resORDENES+req.body.Pedido[i].Factura+"\n";
    		}
	        
    	}
    	else
    	{
    		if(resORDENES =="" && req.body.Pedido[i].Clave == undefined && arrPO.length<1 && i>6)
    			return res.status(500).send("clave no existe\n" + resORDENES+" ");
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Remisiones:\n" + resORDENES+" ");
		
	}
	//console.log(arrPO);
	
	//console.log("test");
	//console.log(arrPartidas);
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
	  //  console.log(partidas);
	    //console.log(arrPartidas_id);
	    let indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="PLANTAEXPORTADORA/MANUFACTURINGPLANT");
	    console.log(indexInfopedido);
	    let planta="";

	    if(req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] == "PLANTA" && indexInfopedido != -1)
		 	planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[1] }).exec();
		else
			planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] }).exec();
		//console.log("__------------------------------------------------"+planta);
		if(planta==null)
		{
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="PLANTAEXPORTADORA");
			//console.log("AQUI----------------------------------"+req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0]);
			if(req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] == "PLANTA")
			 	planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[1] }).exec();
			else
				planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] }).exec();
		}
		console.log(req.body.Infoplanta[indexInfopedido+1].InfoPedido);
		//console.log(indexInfopedido);
		indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="FECHA/DATE");
		//console.log(Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido));
		let fechaSalidaPlanta=Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido);
		//console.log(Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido));
		let fechaesperada=Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido)+((60 * 60 * 24 * 1000)*planta.DiasTraslado+1);

		//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(fechaesperada);
			nEntrada.fechaEsperada = new Date(fechaesperada);
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
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
			await new Promise(resolve => {
					let time=(Math.random() * 5000)*10;
			        setTimeout(resolve,time );
			        //poconsole.log(time);
			    });
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			nEntrada.plantaOrigen=planta.Nombre;
			nEntrada.DiasTraslado=planta.DiasTraslado;
		 	
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			
			nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					
					//console.log(partidas);
					/*console.log(entrada);
					console.log("/------------------/")*/
				}).catch((error) => {
					console.log(error);
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			return res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			return res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			console.log(error);
	};
	return res.status(200).send("OK");
}


async function updateEntradasBabel(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);

	try{	
		
        let countEntradas=await Entrada.findOne({"referencia":req.body.Remision}).exec();
        //console.log(countEntradas);
        countEntradas= countEntradas == null ? await Entrada.findOne({"factura":req.body.Remision}).exec():countEntradas;
        //console.log(countEntradas);
        countEntradas= countEntradas == null ? await Entrada.findOne({"item":req.body.Remision}).exec():countEntradas;
        //console.log(countEntradas);
        let dataSplit=req.body.FechaPlanta.split('/');
        let fechaSalidaPlanta=new Date (dataSplit[2], dataSplit[1]-1 , dataSplit[0]); 
       //console.log(fechaSalidaPlanta.toString());
		if(countEntradas)
		{	

	    	if(countEntradas.fechaSalidaPlanta == undefined){
	    		countEntradas.fechaSalidaPlanta =fechaSalidaPlanta;
	    		countEntradas.save();
	    	}
	    	
	    		
    	} 
    	else
    		return res.status(200).send("No existe: "+req.body.Remision);
    	return res.status(200).send("OK");
	}catch(error){
			console.log(error)
			res.status(500).send(error);
			console.log(error);
	};
	//console.log("end");
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

async function getEntradasReporte(req, res) {

	let isFilter = false;

	//Verificar si el reporte contiene filtros
	if(req.body.page === undefined || req.body.limit === undefined)
		isFilter = true;

	let pagination = {
		page: parseInt(req.body.page) || 10,
		limit: parseInt(req.body.limit) || 1
	}

	var arrPartidas = [];
	var arrPartidasFilter = [];
	let clasificacion = req.body.clasificacion != undefined ? req.body.clasificacion : "";
	let subclasificacion = req.body.subclasificacion != undefined ? req.body.subclasificacion :"";
	let fechaInicio= req.body.fechaInicio != undefined ? req.body.fechaInicio !="" ? new Date(req.body.fechaInicio) :"" :"";
	let fechaFinal= req.body.fechaFinal != undefined ? req.body.fechaFinal !="" ? new Date(req.body.fechaFinal) :"" :"";
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
		status:"APLICADA",
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
			filter.fechaEntrada ={
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

		
		
		//const partidas = await PartidaModel.aggregatePaginate(partidasReporteCad, pagination )
		let partidas = [];
		let cajasPedidas = [];
		if(isFilter){
			
	Entrada.find(filter, {partidas: 1, _id: 0})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta tipo fechaAlta'
		},
		select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta tipo fechaAlta'
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto',
		}
	}).then(entradas =>{
		entradas.forEach(entrada =>{
			let partida = entrada.partidas;
			
		partida.forEach((elem) => {
			/* 
			elem.entrada_id = elem.entrada_id[0];
			elem.producto_id = elem.producto_id[0]; */
			
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

						if(isFilter){
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

						
						 
						//let fEntrada = elem.entrada_id[0].fechaEntrada.getTime();
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
				if(elem.isEmpty == false && clasificacion == "" && subclasificacion == "" && fecha == "" &&alerta1 == "" && alerta2 == "" && ageingFin =="" && ageingInit == "" && clave=="" && folio=="" && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA" || elem.tipo=="OUTMODIFICADA")  && elem.status=="ASIGNADA"){
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
					if(elem.isEmpty == false && resClasificacion == true && resSubclasificacion == true && resFecha==true && resAlerta2==true && resAlerta1==true && resAgeing == true && resClave==true  && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA" || elem.tipo=="OUTMODIFICADA") && elem.status=="ASIGNADA")
					{	
						arrPartidas.push(elem);
					}
					//console.log("4");
				}
		});

		})
		res.status(200).send(arrPartidas);
	})

		}else{

			let partidasReporteCad = PartidaModel.aggregate([

			{
				$lookup: {
					from: "Entradas",
					localField: "entrada_id",
					foreignField: "_id",
					as: "fromEntradas"
					}           
			},
			{
				$lookup: {
					from: "Productos",
					localField: "producto_id",
					foreignField: "_id",
					as: "fromProductos"
					}           
			},
			
			/* {
				$replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$fromEntradas", 0 ] }, "$$ROOT" ] } }   
				   },
				   {
				$replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$fromProductos", 0 ] }, "$$ROOT" ] } }   
				   }, */
			{$match: {"fromEntradas.isEmpty": filter.isEmpty, "fromEntradas.status": filter.status, isEmpty: false,
					"fromEntradas.clienteFiscal_id": mongoose.Types.ObjectId(filter.clienteFiscal_id),
					tipo: {$in: ["NORMAL", "AGREGADA", "MODIFICADA"]},
					status: "ASIGNADA",
					"fromEntradas.fechaEntrada": {$gte: fechaInicio, $lt: fechaFinal}}},
			{      
				$project:{
					producto_id: 1,
					clave: 1,
					descripcion: 1,
					entrada_id: 1,
					lote: 1,
					fechaProduccion: 1,
					fechaCaducidad: 1,
					valor: 1,
					salidas_id: 1,
					posiciones: 1,
					embalajesEntrada: 1,
					embalajesxSalir: 1,
					embalajesAlmacen: 1,
					CajasPedidas: 1,
					referenciaPedidos: 1,
					InfoPedidos: 1,
					isEmpty: 1,
					origen: 1,
					tipo: 1,
					status: 1,
					posicionCarga: 1,
					isExtraordinaria: 1,
					fechaEntrada: 1,
					DiasTraslado: 1,
					fechaReciboRemision: 1,
					fechaSalidaPlanta: 1,
					tipo: 1,
					fechaAlta: 1,
					garantiaFrescura: 1,
					alertaAmarilla: 1,
					alertaRoja: 1,
					vidaAnaquel: 1,
					producto_id: "$fromProductos",
					entrada_id: "$fromEntradas"
				}
			}
		])
			
			partidas = await PartidaModel.aggregatePaginate(partidasReporteCad, pagination );

			partidas.docs.forEach(elem =>{

				let producto_id = elem.producto_id[0];
				let entrada_id = elem.entrada_id[0];
				elem.entrada_id = entrada_id;
				elem.producto_id = producto_id;
				elem.alertaAmarilla = producto_id.alertaAmarilla;
				elem.alertaRoja = producto_id.alertaRoja;
				elem.garantiaFrescura = producto_id.garantiaFrescura;
				elem.vidaAnaquel = producto_id.vidaAnaquel;

				elem.fechaAlta = entrada_id.fechaAlta;
				elem.fechaEntrada = entrada_id.fechaEntrada;
				elem.fechaReciboRemision = entrada_id.fechaReciboRemision;
				elem.DiasTraslado = entrada_id.DiasTraslado;
				elem.fechaSalidaPlanta = entrada_id.fechaSalidaPlanta;
				

				if(elem.entrada_id)
				{
					if(elem.fechaCaducidad !== undefined && elem.fechaCaducidad != null && entrada_id.fechaEntrada !== undefined)
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

							elem.diff = diff;
							elem.diasAlm = diasAlm;
							elem.diasEnAlm = diasEnAlm;
							elem.Aging = Aging;
							elem.fechaFrescura = fechaFrescura;
							elem.fechaAlerta1 = fechaAlerta1;
							elem.fechaAlerta2 = fechaAlerta2;
							elem.leyenda = leyenda;

					}
						
				}
					arrPartidas.push(elem);
					});			

			partidas.docs = arrPartidas;		
			res.status(200).send(partidas);
			
		}


	
		
	

/* 
	Entrada.find(filter, {partidas: 1, _id: 0})
	.populate({
		path: 'partidas',
		populate: {
			path: 'entrada_id',
			model: 'Entrada',
			select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta tipo fechaAlta'
		},
		select: 'stringFolio fechaEntrada DiasTraslado fechaReciboRemision fechaSalidaPlanta tipo fechaAlta'
	})
	.populate({
		path: 'partidas',
		populate: {
			path: 'producto_id',
			model: 'Producto',
		}
	}) */
	
}

async function getExcelCaducidades(req, res) {
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
	let Diasrestantes =0;
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
	let isFilter = req.query.filter === "true" ? true : false;
	let filter = {
		"entrada_id.clienteFiscal_id": mongoose.Types.ObjectId(req.query.clienteFiscal_id),
		//"producto_id.arrClientesFiscales_id": {$in: [mongoose.Types.ObjectId(req.query.clienteFiscal_id)]},
		"entrada_id.status":{$in:["APLICADA","FINALIZADO"]},
		/* "tipo": {$in: ["NORMAL", "AGREGADA", "MODIFICADA"]},
    	"status": "ASIGNADA", */ 
		isEmpty: false
	}
	if(folio != "")
	{
		filter["entrada_id.stringFolio"]=folio;
	}
	let reporte = 0;
	console.log(filter);
	PartidaModel.aggregate([{$lookup: {from: "Entradas", localField: "entrada_id", foreignField: "_id", as: "entrada_id"}},
        					   {$lookup: {from: "Productos", localField: "producto_id", foreignField: "_id", as: "producto_id"}},
								{$match: filter}
								

		]).then (async (partida)=> {
		//console.log("test");
			//console.log("entradas");
			
			await Helper.asyncForEach(partida, async function (elem, index) {
				//console.log("partidas");
				//console.log(elem);
				if(elem){
				
				

				let resFecha=true;
				let resAlerta1=true;
				let resAlerta2=true;
				if(fecha == "fechaEntrada")
				{
					if(elem.entrada_id[0].fechaEntrada)
						resFecha = new Date(elem.entrada_id[0].fechaEntrada)>new Date(fechaInicio) && new Date(elem.entrada_id[0].fechaEntrada)<new Date(fechaFinal);
					else
						resFecha = false;
				}

				if(fecha == "fechaAlta")
				{
					if(elem.entrada_id[0].fechaAlta)
						resFecha = new Date(elem.entrada_id[0].fechaAlta)>new Date(fechaInicio) && new Date(elem.entrada_id[0].fechaAlta)<new Date(fechaFinal);
					else
						resFecha = false;
				}
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
				if(elem.entrada_id[0])
				{
					if(elem.fechaCaducidad !== undefined && elem.fechaCaducidad != null && elem.entrada_id[0].fechaEntrada !== undefined)
					{

		        		fCaducidad = elem.fechaCaducidad.getTime();
		                diff = Math.abs(fCaducidad - elem.entrada_id[0].fechaEntrada.getTime());
		                diasAlm=Math.floor((hoy - fCaducidad)/ 86400000);
		            	diasEnAlm = Math.floor(diff / 86400000);
		            	Aging=Math.floor((hoy-elem.entrada_id[0].fechaEntrada.getTime())/ 86400000);
		        		let fEntrada = elem.entrada_id[0].fechaEntrada.getTime();
		                if(elem.producto_id[0].garantiaFrescura)
		                	fechaFrescura = new Date(fCaducidad - (elem.producto_id[0].garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
		                if(elem.producto_id[0].alertaAmarilla)
		                	fechaAlerta1 = dateFormat(new Date(fCaducidad - (elem.producto_id[0].alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000)), "mm/dd/yyyy");
		            	if(elem.producto_id[0].alertaRoja)
		            		fechaAlerta2 = dateFormat(new Date(fCaducidad - (elem.producto_id[0].alertaRoja * 86400000)- (60 * 60 * 24 * 1000)), "mm/dd/yyyy");
		            	if(elem.producto_id[0].vidaAnaquel)
		            		leyenda = elem.producto_id[0].vidaAnaquel- diasEnAlm - 1
		            	
		            	
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
				if(elem.isEmpty == false && clasificacion == "" && subclasificacion == "" && fecha == "" &&alerta1 == "" && alerta2 == "" && ageingFin =="" && ageingInit == "" && clave=="" && folio==""  && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA" || elem.tipo=="OUTMODIFICADA") && elem.status=="ASIGNADA"){
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
					if(clave != "" && elem.producto_id[0].id.toString() != clave.toString())
					{
						resClave=false;
					}
					if(alerta1 !="" && fechaAlerta1 != "")
					{
						if(diasAlm < 0)
							if(Math.abs(diasAlm) >= elem.producto_id[0].alertaAmarilla)
								resAlerta1= alerta1 == "ATIEMPO";
							else
								resAlerta1= alerta1 == "RECHAZO";
						else
							resAlerta1= alerta1 == "RECHAZO" ;
					
					}
					if(alerta2 !="" && fechaAlerta2 != "")
					{
						if(diasAlm < 0)
							if(Math.abs(diasAlm) >= elem.producto_id[0].alertaRoja)
								resAlerta2= alerta1 == "ATIEMPO";
							else
								resAlerta2= alerta1 == "RECHAZO";
						else
							resAlerta2= alerta1 == "RECHAZO" ;
					}
					if(clasificacion != "" && elem.producto_id[0].statusReg == "ACTIVO")
					{
						resClasificacion=elem.producto_id[0].clasificacion_id.toString() == clasificacion.toString() ;
					}
					if(subclasificacion != "" && elem.producto_id[0].statusReg == "ACTIVO")
					{
						resSubclasificacion=elem.producto_id[0].subclasificacion_id.toString() == subclasificacion.toString();
					}
					//console.log(elem.isEmpty +"== false &&"+ resClasificacion+ "== true &&"+ resSubclasificacion +"== true &&"+ resFecha+"==true &&" +resAlerta2+"==true &&"+ resAlerta1+"==true &&"+ resAgeing+" == true && "+resClave+"==true")
					if(elem.isEmpty == false && resClasificacion == true && resSubclasificacion == true && resFecha==true && resAlerta2==true && resAlerta1==true && resAgeing == true && resClave==true  && (elem.tipo=="NORMAL" || elem.tipo=="AGREGADA" || elem.tipo=="MODIFICADA" || elem.tipo=="OUTMODIFICADA") && elem.status=="ASIGNADA")
					{	

						arrPartidas.push(elem);
						
					}
				}

				if(!isFilter){
					if(elem.referenciaPedidos !== undefined && elem.referenciaPedidos.length !== 0){
						if(elem.referenciaPedidos.length > 1){
							let partidaPickeada = arrPartidas.find(partida => partida === elem)
							
							if(partidaPickeada !== undefined){
								partidaPickeada.isPicking = true;
	
								let referenciasPedidos = elem.referenciaPedidos;
								let embalajeTemporal = 0;
								for(let i = 0; i < referenciasPedidos.length; i++){
									let copyInformacionPartida =  JSON.parse(JSON.stringify(elem))
									copyInformacionPartida.refpedido = referenciasPedidos[i].referenciaPedido;
									copyInformacionPartida.CajasPedidas = referenciasPedidos[i].CajasPedidas;
								 
									copyInformacionPartida.isPicking = true;
									copyInformacionPartida.fechaCaducidad = new Date(copyInformacionPartida.fechaCaducidad);
									copyInformacionPartida.fechaProduccion = new Date(copyInformacionPartida.fechaProduccion);
									copyInformacionPartida.entrada_id[0].fechaAlta = new Date(copyInformacionPartida.entrada_id[0].fechaAlta);
									copyInformacionPartida.entrada_id[0].fechaEntrada = new Date(copyInformacionPartida.entrada_id[0].fechaEntrada);
									copyInformacionPartida.entrada_id[0].fechaReciboRemision = new Date(copyInformacionPartida.entrada_id[0].fechaReciboRemision);
									copyInformacionPartida.entrada_id[0].fechaSalidaPlanta = new Date(copyInformacionPartida.entrada_id[0].fechaSalidaPlanta);
									
									if(i > 0){
		
										if(embalajeTemporal === 0){
											copyInformacionPartida.embalajesxSalir.cajas -= referenciasPedidos[i].CajasPedidas.cajas;
											embalajeTemporal = copyInformacionPartida.embalajesxSalir.cajas;
										}else{
			
											copyInformacionPartida.embalajesxSalir.cajas = embalajeTemporal;
											
											embalajeTemporal -= referenciasPedidos[i].CajasPedidas.cajas;
										}
		
										arrPartidas.push(copyInformacionPartida);
									}else{
										embalajeTemporal = copyInformacionPartida.embalajesxSalir.cajas - referenciasPedidos[i].CajasPedidas.cajas;
									}
		
									if(i === referenciasPedidos.length - 1){
										copyInformacionPartida.isPicking = false;
									}
		
								}
	
							}
							
							
						}
				}
				}




			}
			})		
		//console.log("beginexcel");
		var excel = require('excel4node');
        
        var workbook = new excel.Workbook();
        var warningstyle = workbook.createStyle({
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
								    bgColor: '#FFA500',
								    fgColor: '#FFA500',
								  },
						        });
		var bookedStyle = workbook.createStyle({
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
					bgColor: '#FFFE33',
					fgColor: '#FFFE33',
				},
				});						

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
		worksheet.cell(2, 3).string('Tipo').style(headersStyle);
		worksheet.cell(2, 4).string('Clave').style(headersStyle);
		worksheet.cell(2, 5).string('Descripción').style(headersStyle);
		let indexheaders=6;
		clienteEmbalaje.forEach(Embalaje=>{ 
			let index=ArrayEmbalaje.findIndex(obj=> (obj.clave == Embalaje));
				if(ArrayEmbalaje[index].clave== "cajas" && clientefiscal._id == "5e33420d22b5651aecafe934")
					worksheet.cell(2, indexheaders).string("Corrugados").style(headersStyle);
				else
					worksheet.cell(2, indexheaders).string(ArrayEmbalaje[index].nombre).style(headersStyle);
				indexheaders++;
			
		});
		worksheet.cell(2, indexheaders).string('HOLD').style(headersStyle);
		worksheet.cell(2, indexheaders+1).string('Disponible').style(headersStyle);
		worksheet.cell(2, indexheaders+2).string('Pedido').style(headersStyle);
		worksheet.cell(2, indexheaders+3).string('Status').style(headersStyle);
		worksheet.cell(2, indexheaders+4).string('Fecha Producción').style(headersStyle);
		worksheet.cell(2, indexheaders+5).string('Fecha Caducidad').style(headersStyle);
		worksheet.cell(2, indexheaders+6).string('Fecha Embarque Calculada a 2 dias despues').style(headersStyle);
		worksheet.cell(2, indexheaders+7).string('Garantia Frescura a Fecha de Embarque').style(headersStyle);
		worksheet.cell(2, indexheaders+8).string('Garantia Frescura').style(headersStyle);
		worksheet.cell(2, indexheaders+9).string('Dias Anaquel Original de Planta').style(headersStyle);
		worksheet.cell(2, indexheaders+10).string('Dias Traslado Programado').style(headersStyle);
		worksheet.cell(2, indexheaders+11).string('Fecha Salida Planta').style(headersStyle);
		worksheet.cell(2, indexheaders+12).string('Fecha Esperada Recibo').style(headersStyle);
		worksheet.cell(2, indexheaders+13).string('Dias Anaquel en Llegada').style(headersStyle);
		worksheet.cell(2, indexheaders+14).string('Dias Traslado Real').style(headersStyle);
		worksheet.cell(2, indexheaders+15).string('Fecha de Recibo Cedis').style(headersStyle);
		worksheet.cell(2, indexheaders+16).string('Fecha de Alta LKGO').style(headersStyle);
		worksheet.cell(2, indexheaders+17).string('Aging Report').style(headersStyle);
		worksheet.cell(2, indexheaders+18).string('Fecha Garantia Frescura').style(headersStyle);
		worksheet.cell(2, indexheaders+19).string('Dias Alerta 1').style(headersStyle);
		worksheet.cell(2, indexheaders+20).string('Alerta 1').style(headersStyle);
		worksheet.cell(2, indexheaders+21).string('Fecha Alerta 1').style(headersStyle);
		worksheet.cell(2, indexheaders+22).string('Dias Alerta 2').style(headersStyle);
		worksheet.cell(2, indexheaders+23).string('Alerta 2').style(headersStyle);
		worksheet.cell(2, indexheaders+24).string('Fecha Alerta 2').style(headersStyle);
		worksheet.cell(2, indexheaders+25).string('Ubicacion').style(headersStyle);
		worksheet.cell(2, indexheaders+26).string('Hoy').style(headersStyle);
		worksheet.cell(2, indexheaders+27).string('Fecha que pierde frescura').style(headersStyle);
		worksheet.cell(2, indexheaders+28).string('Dias para perder frecura').style(headersStyle);
		
        let i=3;
        //console.log(arrPartidas);
        console.log("/**excel ciclo**/");
        await Helper.asyncForEach(arrPartidas, async function (partidas) 
        {
			//console.log(partidas);
			
			try{

        	fechaEspRecibo="";
			Diasrestantes=0;
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
           	let resshippingdays="";
           	let shipingdaysstyle=workbook.createStyle({
	          font: {
	            bold: true,
	          },
	          alignment: {
	            wrapText: true,
	            horizontal: 'left',
	          },
	        });

           	if(partidas.entrada_id[0])
           	{
	        	if(partidas.fechaCaducidad !== undefined && partidas.fechaCaducidad != null && partidas.entrada_id[0].fechaEntrada != undefined)
	        	{
	        		fCaducidad = partidas.fechaCaducidad.getTime();
	                diff = Math.abs(fCaducidad - partidas.entrada_id[0].fechaEntrada.getTime());
	                diasAlm=Math.floor((hoy - fCaducidad)/ 86400000);
	            	diasEnAlm = Math.floor(diff / 86400000);
	            	Aging=Math.floor((hoy-partidas.entrada_id[0].fechaEntrada.getTime())/ 86400000);
	        		let fEntrada = partidas.entrada_id[0].fechaEntrada.getTime();
	        		if(partidas.producto_id[0].garantiaFrescura){
	                	fechaFrescura = dateFormat(new Date(fCaducidad - (partidas.producto_id[0].garantiaFrescura * 86400000)), formatofecha);
						Diasrestantes = Math.round((fCaducidad - (partidas.producto_id[0].garantiaFrescura * 86400000) -hoy)/ 86400000);
	                }
	                if(partidas.producto_id[0].alertaAmarilla)
	                	fechaAlerta1 = dateFormat(new Date(fCaducidad - (partidas.producto_id[0].alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000)), formatofecha);
	            	if(partidas.producto_id[0].alertaRoja)
	            		fechaAlerta2 = dateFormat(new Date(fCaducidad - (partidas.producto_id[0].alertaRoja * 86400000)- (60 * 60 * 24 * 1000)), formatofecha);
	            	if(partidas.producto_id[0].vidaAnaquel)
	            		leyenda = partidas.producto_id[0].vidaAnaquel- diasEnAlm - 1
	            	if(partidas.entrada_id[0].fechaSalidaPlanta != undefined && partidas.entrada_id[0].DiasTraslado !== undefined){
	            		orginalshippingdays=Math.abs(Math.floor((partidas.entrada_id[0].fechaEntrada.getTime()-partidas.entrada_id[0].fechaSalidaPlanta.getTime())/ 86400000))
	            		resshippingdays=partidas.entrada_id.DiasTraslado - orginalshippingdays;
						if(resshippingdays <0)
			           	{
			           		shipingdaysstyle = workbook.createStyle({
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
			           	else
			           	{
			           		shipingdaysstyle = workbook.createStyle({
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
	        	if (partidas.fechaCaducidad !== undefined && partidas.entrada_id[0].DiasTraslado !== undefined && partidas.entrada_id[0].fechaSalidaPlanta != undefined) {
	                let tiempoTraslado = partidas.entrada_id[0].DiasTraslado;
	                let fechaRecibo = new Date(partidas.entrada_id[0].fechaSalidaPlanta.getTime() + tiempoTraslado * 86400000);
	                fechaEspRecibo =dateFormat(fechaRecibo, formatofecha);
	            }
	        
            if (partidas.entrada_id[0].fechaReciboRemision !== undefined) 
            {
                tempx= new Date(partidas.entrada_id[0].fechaReciboRemision).getTime() + 2 * 86400000;
                fechacalculada2Dias = dateFormat(tempx, formatofecha);
                    
            }
			if (partidas.entrada_id[0].fechaReciboRemision !== undefined && partidas.fechaCaducidad !== undefined) {
			    tempx = new Date(partidas.entrada_id[0].fechaReciboRemision.getTime() + 2 * 86400000);
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
			    else if (GarFresFecha < partidas.producto_id[0].garantiaFrescura){
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
			    else if (GarFresFecha > partidas.producto_id[0].garantiaFrescura){
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
            worksheet.cell(i, 2).string(partidas.entrada_id[0] ? partidas.entrada_id[0].stringFolio  ? partidas.entrada_id[0].stringFolio :"":"");
            worksheet.cell(i, 3).string(partidas.entrada_id[0] ? partidas.entrada_id[0].tipo  ? partidas.entrada_id[0].tipo :"":"");
           	worksheet.cell(i, 4).string(partidas.clave ? partidas.clave:"");
           	worksheet.cell(i, 5).string(partidas.descripcion ? partidas.descripcion:"");
           	let indexbody=6;
           	
           	clienteEmbalaje.forEach(emb=>
           	{	
           		let tarimas =0
           		if (emb == 'tarimas' && partidas.producto_id[0] !=undefined && partidas.producto_id[0].arrEquivalencias.length > 0) {
	                let band = false;
	                partidas.producto_id[0].arrEquivalencias.forEach(function (equivalencia) {
	                    if (equivalencia.embalaje === "Tarima" && equivalencia.embalajeEquivalencia === "Caja") {
	                    	
	                        tarimas = partidas.embalajesxSalir.cajas / equivalencia.cantidadEquivalencia ? Math.round(partidas.embalajesxSalir.cajas / equivalencia.cantidadEquivalencia) : 0;
	                        band = true;
	                    }
	                    else if(equivalencia.embalaje === "Tarima" && equivalencia.embalajeEquivalencia === "Saco") {

	                        tarimas = partidas.embalajesxSalir.sacos / equivalencia.cantidadEquivalencia ? Math.round(partidas.embalajesxSalir.sacos / equivalencia.cantidadEquivalencia): 0;
	                        band = true;
	                    }
	                });
	                if (band !== true){
	                    tarimas = partidas.embalajesxSalir.tarimas ? partidas.embalajesxSalir.tarimas : 0;
	                	
	                }
	                worksheet.cell(i, indexbody).number(parseInt(tarimas));
	            }
	            else {
	            	//console.log(partidas)
	                worksheet.cell(i, indexbody).number(partidas.embalajesxSalir[emb] ? parseInt(partidas.embalajesxSalir[emb]):0);
	            }
           		indexbody++;
           	});
           	if(partidas.pedido && partidas.CajasPedidas )
           	{
	           	if(partidas.pedido == false){
	            	worksheet.cell(i, indexbody).number(partidas.pedido!=undefined ? partidas.pedido == false ? 0: parseInt(partidas.CajasPedidas.cajas):0 );
	            }else
	            	worksheet.cell(i, indexbody).number(partidas.pedido!=undefined ? partidas.pedido == false ? 0: parseInt(partidas.CajasPedidas.cajas):0 ).style(warningstyle);
            }
            else
            {
            	worksheet.cell(i, indexbody).number(0);
            }
			let disponible = partidas.embalajesxSalir?.cajas-partidas?.CajasPedidas?.cajas;

			if(partidas.isPicking === true){
				worksheet.cell(i, indexbody+1).string("").style(bookedStyle);
			}else{
				worksheet.cell(i, indexbody+1).number(partidas.CajasPedidas!=undefined ? partidas.pedido == false ?  parseInt(partidas.embalajesxSalir.cajas) : partidas.embalajesxSalir.cajas-partidas.CajasPedidas.cajas :parseInt(partidas.embalajesxSalir.cajas) );
			}

			//worksheet.cell(i, indexbody+1).string(partidas.CajasPedidas!=undefined ? partidas.pedido == false ?  parseInt(partidas.embalajesxSalir.cajas) : partidas.embalajesxSalir.cajas-partidas.CajasPedidas.cajas :parseInt(partidas.embalajesxSalir.cajas) );
           	worksheet.cell(i, indexbody+2).string(partidas.refpedido ?partidas.refpedido:"SIN_ASIGNAR"); 
           	worksheet.cell(i, indexbody+3).string(partidas.statusPedido ?partidas.statusPedido:"SIN_ASIGNAR");       
           	worksheet.cell(i, indexbody+4).string(partidas.fechaProduccion ? dateFormat(new Date(partidas.fechaProduccion.getTime()), formatofecha):"");
           	let fechaCaducidad = new Date(partidas.fechaCaducidad);
			const IDENTIFICADOR_HORAS = 19;
			
			if(fechaCaducidad.getHours() === IDENTIFICADOR_HORAS)
				fechaCaducidad = new Date(fechaCaducidad).addDays(1);
			
			worksheet.cell(i, indexbody+5).string(fechaCaducidad ? dateFormat( fechaCaducidad, formatofecha):"");
           	worksheet.cell(i, indexbody+6).string(fechacalculada2Dias);
           	worksheet.cell(i, indexbody+7).number(GarFresFecha).style(GarFresFechaStyle);
           	worksheet.cell(i, indexbody+8).number(partidas.producto_id[0].garantiaFrescura ? partidas.producto_id[0].garantiaFrescura:0);
           	worksheet.cell(i, indexbody+9).number(partidas.producto_id[0].vidaAnaquel ? partidas.producto_id[0].vidaAnaquel:0);
           	worksheet.cell(i, indexbody+10).number(partidas.entrada_id[0] ? partidas.entrada_id[0].DiasTraslado ? partidas.entrada_id[0].DiasTraslado:0:0);
           	worksheet.cell(i, indexbody+11).string(partidas.entrada_id[0] ? partidas.entrada_id[0].fechaSalidaPlanta  ? dateFormat(new Date(partidas.entrada_id[0].fechaSalidaPlanta.getTime()), formatofecha) :"":"");
           	worksheet.cell(i, indexbody+12).string(fechaEspRecibo);
           	worksheet.cell(i, indexbody+13).number(1+diasEnAlm);
           	worksheet.cell(i, indexbody+14).number(orginalshippingdays).style(shipingdaysstyle);
           	worksheet.cell(i, indexbody+15).string(partidas.entrada_id[0] ? partidas.entrada_id[0].fechaEntrada ? dateFormat(partidas.entrada_id[0].fechaEntrada, formatofecha):"":"");
           	worksheet.cell(i, indexbody+16).string(partidas.entrada_id[0] ? partidas.entrada_id[0].fechaAlta  ? dateFormat(new Date(partidas.entrada_id[0].fechaAlta.getTime()), formatofecha) :"":"");
           	worksheet.cell(i, indexbody+17).number(Math.abs(Aging));
           	worksheet.cell(i, indexbody+18).number(partidas.producto_id[0].garantiaFrescura ? partidas.producto_id[0].garantiaFrescura:0);
           	
           	worksheet.cell(i, indexbody+19).number(partidas.producto_id[0].alertaAmarilla ? partidas.producto_id[0].alertaAmarilla:0);
           	
           	if(diasAlm<0)
           	{
	           	if (Math.abs(diasAlm) <= partidas.producto_id[0].alertaAmarilla) {
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
       		worksheet.cell(i, indexbody+20).string(strleyenda).style(ResultStyle);
           	worksheet.cell(i, indexbody+21).string(fechaAlerta1);
           	worksheet.cell(i, indexbody+22).number(partidas.producto_id[0].alertaRoja ? partidas.producto_id[0].alertaRoja:0);
           	console.log(partidas._id)
           	if(diasAlm<0)
           	{
	           	if (Math.abs(diasAlm) <= partidas.producto_id[0].alertaRoja) {
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
           	worksheet.cell(i, indexbody+23).string(strleyenda).style(ResultStyle);
           	worksheet.cell(i, indexbody+24).string(fechaAlerta2);
           	let res="";
           	if(partidas.posiciones.length === 1) 
           	{
           		let namenivel=partidas.posiciones[0].nivel;
           		if(req.query.clienteFiscal_id=='5e33420d22b5651aecafe934'){
					namenivel=namenivel.charCodeAt(0) - 64;
					//console.log(namenivel);
				}
            	res = partidas.posiciones[0].pasillo  + partidas.posiciones[0].posicion+ namenivel;
           	}
           	let styledias = workbook.createStyle({
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
           	if(Diasrestantes>=12 && Diasrestantes<=21)
           	{
           		styledias = workbook.createStyle({
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
					    bgColor: '#FFFF00',
					    fgColor: '#FFFF00',
					  },
			        });

           	}	
       		if(Diasrestantes>=1 && Diasrestantes<=11) 
       		{
       			styledias = workbook.createStyle({
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
					    bgColor: '#ffa31a',
					    fgColor: '#ffa31a',
					  },
			        });
       		}
       		if(Diasrestantes<1) 
       		{
       			styledias = workbook.createStyle({
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
					    bgColor: '#ff0000',
					    fgColor: '#ff0000',
					  },
			        });
       		}

           	worksheet.cell(i, indexbody+25).string(res);
           	worksheet.cell(i, indexbody+26).string(hoy ? dateFormat(hoy, formatofecha):"");
           	worksheet.cell(i, indexbody+27).string(fechaFrescura ? fechaFrescura:"");
           	worksheet.cell(i, indexbody+28).number(Diasrestantes ? Diasrestantes:0).style(styledias);
			i++;
		}catch(error){
			console.log(error);
		}
        });
        workbook.write('ReporteCaducidad'+dateFormat(new Date(Date.now()-(5*3600000)), formatofecha)+'.xlsx',res);
	

	})
	.catch((error) => {
		console.log(error);
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
	console.log("posicionar________________________________________");
	let _id = req.body.id;
	console.log(req.url);
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
			console.log("No hay suficientes posiciones")
	    	res.status(200).send("No hay suficientes posiciones");
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
		    	console.log("No hay suficientes posiciones en familias");
		    	res.status(200).send("No hay suficientes posiciones en familias");
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
		    entrada.usuarioAlta_id= req.body.usuarioAlta_id;
            entrada.nombreUsuario= req.body.nombreUsuario;
            entrada.recibio= req.body.recibio;
		    entrada.status="APLICADA";
		    entrada.partidas=resultpartidas; 
		    entrada.fechaAlta=new Date(Date.now()-(5*3600000));
			await entrada.save().then(async (entrada) => {
					console.log("testpartidas");
					console.log(resultpartidas);
					console.log("/------------------/");
					for (let itemPartida of reOrderPartidas) {
						//console.log("testMovimientos");
						let partidait = await PartidaModel.findOne({ _id: itemPartida._id });
						//console.log(partidait.posiciones);
						await MovimientoInventario.saveEntrada(	partidait, entrada.id);
					}
			});
			console.log("testREturn")
		    if(respuesta<1){
		    	console.log(entrada.stringFolio);
				 res.status(200).send(entrada);
			}
			else
				 res.status(500).send("not");
		}
	}catch (error) {
		console.log(error);
        return res.status(500).send(error);
        
    }
    console.log("END_________________________________")
}

async function posicionarManual(req, res) {
	//console.log("posicionar________________________________________");
	let _id = req.body.id;
	//console.log(req.url);
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
	    
	    entrada.usuarioAlta_id= req.body.usuarioAlta_id;
        entrada.nombreUsuario= req.body.nombreUsuario;
        entrada.recibio= req.body.recibio;
	    entrada.status="APLICADA";
	    entrada.partidas=resultpartidas; 
	    entrada.fechaAlta=new Date(Date.now()-(5*3600000));
		await entrada.save().then(async (entrada) => {
				//console.log("testpartidas");
				//console.log(resultpartidas);
				//console.log("/------------------/");
				for (let itemPartida of reOrderPartidas) {
					//console.log("testMovimientos");
					let partidait = await PartidaModel.findOne({ _id: itemPartida._id });
					//console.log(partidait.posiciones);
					await MovimientoInventario.saveEntrada(	partidait, entrada.id);
				}
		});
		res.status(200).send(entrada);
		
	}catch (error) {
		console.log(error);
        return res.status(500).send(error);
        
    }
    console.log("END_________________________________")
}

/* Actualiza entrada y agrega partida dashboard */
function updateRemision(req, res) {
	let entrada_id = req.body.entrada_id;
	let clienteFiscal_id = req.body.clienteFiscal_id;
	var infoPartida = req.body.partida;
	let newPartida = new PartidaModel(infoPartida);
	//console.log(clienteFiscal_id);
	//console.log("testTicket")
	newPartida.save().then(async function(partida) {
		let ticket = new Ticket();
		ticket.idTicket = await getNextIDTicket();
		//console.log(ticket);
		ticket.stringFolio = await Helper.getStringFolio(ticket.idTicket, clienteFiscal_id, false, true);
		ticket.partida_id = partida._id;
		ticket.entrada_id = entrada_id;
		ticket.status = "PENDIENTE";
		ticket.tipo = "AGREGAR"
		ticket.save();
		
		var arrPartidas = [];
		//console.log("test");
		Entrada.findOne({_id: entrada_id}).then((entrada) => {

			arrPartidas = entrada.partidas;
			arrPartidas.push(newPartida._id);

			Entrada.updateOne({_id: entrada_id}, { $set: { partidas: arrPartidas }}).then((entrada) => {
				res.status(200).send(infoPartida);
			})
			.catch((error) => {
				console.log(error);
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

	let today = new Date(Date.now()-(5*3600000));
	let datos ={ status: newStatus}
	if(newStatus=="ARRIVED")
	{
		datos.fechaEntrada=today
	}
	Entrada.updateOne({_id: _id}, { $set: datos}).then((data) => {
		res.status(200).send(data);
	})
	.catch((error) => {
		console.log(error);
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

async function saveEntradaEDI(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	let finish="OK"
	//console.log(req.body);
	try{
		await Helper.asyncForEach(req.body.respuestaJson,async function (Entradas) {
			var arrPartidas_id = [];
			var partidas = [];
			//console.log(Entradas)
			let countEntradas=await Entrada.find({"ordenCompra":Entradas.Entrada.ordenCompra,"item":Entrada.item}).exec();
			//console.log(countEntradas.length);
			if(countEntradas.length <1)
			{
				//console.log("test");
				await Helper.asyncForEach(Entradas.Partidas,async function (EDIpartida){
					//console.log(EDIpartida);
					if(EDIpartida.partida !== undefined && EDIpartida.partida.clave !== undefined)
					{
					
						var producto=await Producto.findOne({ 'clave':EDIpartida.partida.clave }).exec();
						if(producto==undefined)
							return res.status(400).send("no existe item: "+EDIpartida.partida.clave);
						let fechaProduccion = EDIpartida.partida.fechaProduccion;
						let fechaCaducidad = EDIpartida.partida.fechaCaducidad;
				        //console.log(new Date(fechaProduccion) );
						const data={
							producto_id:producto._id,
							clave:producto.clave,
							descripcion:producto.descripcion,
							origen:"BABEL",
							tipo: "NORMAL",
			    			status: "WAITINGARRIVAL",
							embalajesEntrada: { cajas:parseInt(EDIpartida.partida.CantidadxEmbalaje)},
				        	embalajesxSalir: { cajas:parseInt(EDIpartida.partida.CantidadxEmbalaje)},
				        	fechaProduccion:new Date(fechaProduccion),
				        	fechaCaducidad: new Date(fechaCaducidad),
				        	lote:EDIpartida.partida.lote,
				        	InfoPedidos:[{ "IDAlmacen": Entradas.Entrada.IdAlmacen}],
				        	valor:0
				        }
				        //console.log(data);
				        data.InfoPedidos[0].IDAlmacen=Entradas.Entrada.IdAlmacen;
				        let nPartida = new PartidaModel(data);
				        await nPartida.save().then((partida) => {
				        	partidas.push(partida)
				            arrPartidas_id.push(partida._id);
				        });
			    	}
			    });

				if (partidas && partidas.length > 0) {
					let idCliente = Entradas.Entrada.IDClienteFiscal;
					let idSucursales = Entradas.Entrada.IDSucursal;
					let idAlmacen = Entradas.Entrada.IdAlmacen;

					let nEntrada = new Entrada();

					nEntrada.fechaEntrada = new Date(Entradas.Entrada.fechaEsperada);
					nEntrada.fechaEsperada= new Date(Entradas.Entrada.fechaEsperada);
					nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
					nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
						return total + valor;
					});
					nEntrada.almacen_id=idAlmacen;
					nEntrada.clienteFiscal_id = idCliente;
					nEntrada.sucursal_id = idSucursales;
					nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
					nEntrada.tipo = "NORMAL";
					nEntrada.partidas = partidas.map(x => x._id);
					nEntrada.nombreUsuario = "NiagaraBabel";
					
					nEntrada.referencia = Entradas.Entrada.referencia;
					nEntrada.factura = Entradas.Entrada.item;
					nEntrada.item = Entradas.Entrada.item;
					nEntrada.transportista = Entradas.transportista;
					nEntrada.ordenCompra=Entradas.Entrada.ordenCompra;
					nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
					nEntrada.idEntrada = await getNextID();
					nEntrada.folio = await getNextID();
					nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
					//nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
					//if()
					//nEntrada.stringFolio = 
					//
					//console.log("testEntrada");
					await nEntrada.save()
						.then(async (entrada) => {
							//console.log("testpartidas");
							finish="done";
							await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
							//console.log(partidas);
							/*console.log(entrada);
							console.log("/------------------/")*/
						}).catch((error) => {
							reserror=error
						});
				}else {
					console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
					return res.status(500).send("error");
				}
			}
			else{
				errores="Ya existe la ordenCompra: "+Entradas.Entrada.ordenCompra
				console.log(errores);
			}
		});


	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			//console.log(error);
	};	
	if(errores!=="")
	{
		console.log("error")
		return res.status(200).send(errores);
	}
	else
		return res.status(200).send(finish);
	return res.status(200).send(finish);
}

async function saveEntradaChevron(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	//console.log(req.body);
	try{
		var arrPartidas_id = [];
		var partidas = [];
		//console.log("test");
		await Helper.asyncForEach(req.body.Partidas,async function (partida){
			//console.log(EDIpartida);
			if(partida !== undefined && partida.clave !== undefined)
			{
				
				var producto=await Producto.findOne({'clave':partida.clave }).exec();
				//console.log(producto._id);
				if(producto == undefined){
					//console.log("testst")
					return res.status(200).send("no existe item: "+partida.clave);
				}
		        //console.log(new Date(fechaProduccion) );
		        let resultjson=[]
		        let embalaje={}
		        embalaje[partida.EMBALAJE.toLowerCase()]=partida.CantidadxEmbalaje;
		        //resultjson.push(embalaje);
		        embalaje=JSON.parse(JSON.stringify( embalaje ))
				const data={
					producto_id:producto._id,
					clave:producto.clave,
					descripcion:producto.descripcion,
					origen:"BABEL",
					tipo: "NORMAL",
	    			status: "WAITINGARRIVAL",
					embalajesEntrada: embalaje,
		        	embalajesxSalir: embalaje,
		        	fechaProduccion:new Date(Date.now()-(5*3600000)),
		        	fechaCaducidad: new Date(Date.now()-(5*3600000)),
		        	lote:"",
		        	InfoPedidos:[{ "IDAlmacen": "5ec3f773bfef980cf488b731"}],
		        	valor:0
		        }
		        //console.log(data);
		        
		        data.InfoPedidos[0].IDAlmacen="5ec3f773bfef980cf488b731";
		        let nPartida = new PartidaModel(data);
		        //console.log(nPartida);
		        //return res.status(200).send("no existe item: "+partida.clave);
		        await nPartida.save().then((partida) => {
		        	partidas.push(partida)
		            arrPartidas_id.push(partida._id);
		        });
	    	}
	    });

		if (partidas && partidas.length > 0) {
			let idCliente = "5ec3f839bfef980cf488b737";
			let idSucursales = "5e3342f322b5651aecafea05";

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(Date.now()-(5*3600000));
			nEntrada.fechaEsperada= new Date(Date.now()-(5*3600000))
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BabelChevron";
			
			nEntrada.referencia ="Entrada INICIAL";
			nEntrada.factura = "Entrada INICIAL";
			nEntrada.item = "Entrada INICIAL";
			nEntrada.transportista = "";
			nEntrada.ordenCompra="";
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			let stringTemp=await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//if()
			nEntrada.stringFolio =await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
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
			res.status(500).send("error");
		}
	}	
	catch(error){
			console.log(error)
			res.status(500).send(error);
			//console.log(error);
	};	
	if(errores!=="")
	{
		console.log("error")
		return res.status(200).send(errores);
	}
	else
		return res.status(200).send("OK");
}


async function saveEntradaPisa(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	//console.log(req.body);
	try{
		var arrPartidas_id = [];
		var partidas = [];
		//console.log("test");
		await Helper.asyncForEach(req.body.Partidas,async function (partida){
			//console.log(EDIpartida);
			if(partida !== undefined && partida.clave !== undefined)
			{
				
				var producto=await Producto.findOne({'clave':partida.clave }).exec();
				//console.log(producto._id);
				if(producto == undefined){
					//console.log("testst")
					return res.status(200).send("no existe item: "+partida.clave);
				}
		        //console.log(new Date(fechaProduccion) );
		        let resultjson=[]
		        let embalaje={}
		        embalaje[partida.EMBALAJE.toLowerCase()]=parseInt(partida.CantidadxEmbalaje);
		        //resultjson.push(embalaje);
		        embalaje=JSON.parse(JSON.stringify( embalaje ))
				const data={
					producto_id:producto._id,
					clave:producto.clave,
					descripcion:producto.descripcion,
					origen:"BABEL",
					tipo: "NORMAL",
	    			status: "WAITINGARRIVAL",
					embalajesEntrada: embalaje,
		        	embalajesxSalir: embalaje,
		        	fechaProduccion:new Date(Date.now()-(5*3600000)),
		        	fechaCaducidad: new Date(Date.now()-(5*3600000)),
		        	lote:partida.lote,
		        	InfoPedidos:[{ "IDAlmacen": "5e680205a616fe231416025f"}],
		        	valor:0
		        }
		        //console.log(data);
		        
		        data.InfoPedidos[0].IDAlmacen="5e680205a616fe231416025f";
		        let nPartida = new PartidaModel(data);
		        //console.log(nPartida);
		        //return res.status(200).send("no existe item: "+partida.clave);
		       // console.log("beforepartidas")
		        await nPartida.save().then((partida) => {
		        	partidas.push(partida)
		            arrPartidas_id.push(partida._id);
		        });
		        //console.log("partidas")
	    	}
	    });

		if (partidas && partidas.length > 0) {
			let idCliente = "5f199a1f437d0b3a3c7d98c9";
			let idSucursales = "5d123ed1a5ec7398c4fc2c45";

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(Date.now()-(5*3600000));
			nEntrada.fechaEsperada= new Date(Date.now()-(5*3600000))
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BabelPISA";
			
			nEntrada.referencia ="1325320,1325239,1325081,1325085,1325086,1325080,1325087,1325082,1325083,1325084";
			nEntrada.factura = "1325320,1325239,1325081,1325085,1325086,1325080,1325087,1325082,1325083,1325084";
			nEntrada.item = "1325320,1325239,1325081,1325085,1325086,1325080,1325087,1325082,1325083,1325084";
			nEntrada.transportista = "";
			nEntrada.ordenCompra="";
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			let stringTemp=await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//if()
			nEntrada.stringFolio =await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
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
			res.status(500).send("error");
		}
	}	
	catch(error){
			console.log(error)
			res.status(500).send(error);
			//console.log(error);
	};	
	if(errores!=="")
	{
		console.log("error")
		return res.status(200).send(errores);
	}
	else
		return res.status(200).send("OK");
}


async function getbodycorreo(req, res) {
	var _id=req.body.entrada_id;
	var respuesta="";
	//console.log(req.body);
	//var entrada=await Entrada.findOne({ _id: _id }).exec();

	var ticket=await Ticket.find({ entrada_id: _id}).exec();
	await Helper.asyncForEach(ticket,async function (tk){
		//console.log(tk.tipo)
		if(tk.tipo=="MODIFICAR")
		{
			respuesta+="<br>---- Modificaciones de Partida-----"
			var partida=await PartidaModel.findOne({ _id: tk.partida_id }).exec();
			//console.log(tk);
			//console.log("__________________");
			//console.log(partida);
			//console.log(tk.producto_id.toString()!=partida.producto_id.toString());
			if(tk.producto_id.toString()!=partida.producto_id.toString())
			{

				var producto=await Producto.findOne({ _id: tk.producto_id }).exec(); 
				respuesta+="<br><br>Se realizara un cambio del item "+partida.clave +" por : "+producto.clave;
				//console.log(respuesta);
			}
			if(tk.lote!==partida.lote)
			{
				//var producto=await Producto.findOne({ _id: tk.producto_id }).exec(); 
				respuesta+="<br><br>Se realizara un cambio de lote "+partida.lote +" por : "+tk.lote;
			}
			if(tk.embalajesEntrada.cajas != partida.embalajesEntrada.cajas)
			{
				//var producto=await Producto.findOne({ _id: tk.producto_id }).exec(); 
				respuesta+="<br><br>Se realizara un cambio la cantidad "+partida.embalajesEntrada.cajas +" por : "+tk.embalajesEntrada.cajas;
			}
			if(tk.fechaCaducidad != partida.fechaCaducidad)
			{
				//var producto=await Producto.findOne({ _id: tk.producto_id }).exec(); 
				respuesta+="<br><br>Se realizara un cambio la fecha Caducidad "+partida.fechaCaducidad +" por : "+tk.fechaCaducidad;
			}
			respuesta+="<br>-----------------------------------------------------------------"
		}
		if(tk.tipo=="AGREGAR")
		{
			var partida=await PartidaModel.findOne({ _id: tk.partida_id }).exec();
			var producto=await Producto.findOne({ _id: partida.producto_id }).exec();
			respuesta+="<br>---- se agrego una Partida-----"
			 
			respuesta+="<br><br>Item "+producto.clave;
			//console.log(respuesta);
			respuesta+="<br><br>lote "+partida.lote;
			respuesta+="<br><br>Cantidad "+partida.embalajesEntrada.cajas;
			respuesta+="<br><br>fecha Caducidad "+partida.fechaCaducidad;
			respuesta+="<br>-----------------------------------------------------------------"
		

		}
		if(tk.tipo=="OMITIR")
		{
			respuesta+="<br>---- se Omitio una Partida-----"
			var partida=await PartidaModel.findOne({ _id: tk.partida_id }).exec();
			var producto=await Producto.findOne({ _id: partida.producto_id }).exec();
			respuesta+="<br><br>Item "+producto.clave;
			//console.log(respuesta);
			respuesta+="<br><br>lote "+tk.lote;
			respuesta+="<br><br>Cantidad "+partida.embalajesEntrada.cajas;
			respuesta+="<br><br>Fecha Caducidad "+partida.fechaCaducidad;
			respuesta+="<br>-----------------------------------------------------------------"
		}
	});
	//console.log("");
	//console.log(respuesta);
	if(respuesta=="")
	{
		return res.status(200).send({"respuesta":respuesta,"error":true});
	}
	return res.status(200).send({"respuesta":respuesta,"error":false});
}

async function getTarimasAndCajasEntradas(entrada_id){
	
	//console.log(entrada_id)
	let tarimas = 0;
	let cajas = 0;

	 try {
		
		const entrada = await Entrada.findById(entrada_id).exec();
		const partidas = entrada.partidas
		tarimas = partidas.length;

	await Helper.asyncForEach(partidas,async function (partida_id){
		const partidaDetalle = await PartidaModel.find({_id: partida_id}).exec();
		if(partidaDetalle[0].embalajesxSalir !== undefined){
			cajas += await partidaDetalle[0].embalajesxSalir.cajas;
		}else{
			cajas += 0;
		}	
			
	});
		const respuesta = {"tarimas": tarimas, "cajas": cajas}
		//res.status(200).json({"respuesta": respuesta, "statusCode": res.statusCode})
		return respuesta;
	} catch (error) {
		console.log(error)
	}		
 
}

async function getTarimasAndCajas(req, res){
	
	const entrada_id = req.body.entrada_id;
	//console.log(entrada_id)
	let tarimas = 0;
	let cajas = 0;

	 try {
		
		const entrada = await Entrada.findById(entrada_id).exec();
		const partidas = entrada.partidas
		tarimas = partidas.length;

	await Helper.asyncForEach(partidas,async function (partida_id){
		const partidaDetalle = await PartidaModel.find({_id: partida_id}).exec();
		if(partidaDetalle[0].embalajesxSalir !== undefined){
			cajas += await partidaDetalle[0].embalajesxSalir.cajas;
		}else{
			cajas += 0;
		}	
			
	});
		const respuesta = {"tarimas": tarimas, "cajas": cajas}
		res.status(200).json({"respuesta": respuesta, "statusCode": res.statusCode})

	} catch (error) {
		console.log(error)
	}		
 
}

async function saveEntradaCPD(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	console.log("1");
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=0; i<req.body.Pedido.length ; i++) {
		//console.log(req.body.Pedido[i]);
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined )
		{
			//console.log("test");
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(500).send("no existe item: "+req.body.Pedido[i].Clave);
	        //console.log(producto.clave);
	        let fechaProducionplanta=Date.parse(req.body.Pedido[i].Caducidad.slice(6, 10)+"/"+req.body.Pedido[i].Caducidad.slice(3, 5)+"/"+req.body.Pedido[i].Caducidad.slice(0, 2));
				//console.log(fechaProducionplanta);
				let fechaSalidaPla=new Date (fechaProducionplanta);
			fechaProducionplanta = new Date (fechaProducionplanta).getTime()-(7*86400000);
			const data={
				producto_id:producto._id,
				clave:producto.clave,
				descripcion:producto.descripcion,
				origen:"BABEL",
				tipo: "NORMAL",
    			status: "WAITINGARRIVAL",
				embalajesEntrada: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	embalajesxSalir: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	fechaProduccion:fechaProducionplanta,
	        	//fechaCaducidad: fechaCaducidadRes,
	        	//lote:req.body.Pedido[i].Lote,
	        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
	        	valor:0
	        }
	       // console.log(data.InfoPedidos)
	        let countEntradas=await Entrada.find({"factura":req.body.Pedido[i].Factura}).exec();
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"referencia":req.body.Pedido[i].Factura}).exec():countEntradas;
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"item":req.body.Pedido[i].Factura}).exec():countEntradas;
	        //console.log("test"+countEntradas.length)
    		if(countEntradas.length ==0)
    		{
		        if(arrPO.find(obj=> (obj.factura == req.body.Pedido[i].Factura)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.factura == req.body.Pedido[i].Factura));
	    			arrPO[index].arrPartidas.push(data)
		    	}
		        else{
		        	//console.log("NO");
		        	
			        	arrPartidas.push(data);
			        	const PO={
						po:req.body.Pedido[i].NoOrden,
						fechasalida:fechaSalidaPla,
						factura:req.body.Pedido[i].Factura,
						trailer:req.body.Pedido[i].trailer,
						sello:req.body.Pedido[i].sello,
						chofer:req.body.Pedido[i].chofer,
						transportista:req.body.Pedido[i].transporte,
			        	arrPartidas:[]
			        	}
			        	PO.arrPartidas.push(data)
		    			arrPO.push(PO);
		    		}
		    		
	    	} 
    		if(countEntradas.length >0)
    		{
    			resORDENES=resORDENES+req.body.Pedido[i].Factura+"\n";
    		}
	        
    	}
    	else
    	{
    		if(resORDENES =="" && req.body.Pedido[i].Clave == undefined && arrPO.length<1 && i>6)
    			return res.status(500).send("clave no existe\n" + resORDENES+" ");
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Remisiones:\n" + resORDENES+" ");
		
	}
	//console.log(arrPO);
	
	//console.log("test");
	//console.log(arrPartidas);
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
	   //console.log(partidas);
	    //console.log(noOrden.fechasalida.toString());
	    
		let fechaSalidaPlanta=Date.parse(noOrden.fechasalida);
		let fechaesperada=Date.parse(noOrden.fechasalida)+((60 * 60 * 24 * 1000)*7+1);

		//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();
			//console.log(fechaesperada.toString())
			nEntrada.fechaEntrada = new Date(fechaesperada);
			nEntrada.fechaEsperada = new Date(fechaesperada);
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
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
			nEntrada.tracto = noOrden.trailer;			
			nEntrada.referencia = noOrden.factura;
			nEntrada.factura = noOrden.factura;
			nEntrada.item = noOrden.factura;
			nEntrada.transportista = noOrden.transportista;
			nEntrada.operador = noOrden.chofer;
			nEntrada.sello=noOrden.sello;
			await new Promise(resolve => {
					let time=(Math.random() * 5000)*10;
			        setTimeout(resolve,time );
			        //poconsole.log(time);
			    });
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
		 	
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			
			nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					
					//console.log(partidas);
					console.log(entrada.factura);
					console.log("/--------end----------/")
				}).catch((error) => {
					console.log(error);
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			return res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			return res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			console.log(error);
	};
	console.log("ok");
	return res.status(200).send("OK");
}

async function saveEntradaBLO(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	console.log("begin");
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=0; i<req.body.Pedido.length ; i++) {
		//console.log(req.body.Pedido[i]);
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined )
		{
			//console.log("test");
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(500).send("no existe item: "+req.body.Pedido[i].Clave);
			if(producto.arrEquivalencias.length<1)
				return res.status(500).send("no existe equivalencia: "+req.body.Pedido[i].Clave);
	        //console.log(producto.clave);
	        let equivalencia=parseInt(producto.arrEquivalencias[0].cantidadEquivalencia);
	        let cantidadleft=(req.body.Pedido[i].Cantidad*-1)
	        //console.log("totalneed"+cantidadleft)
	        while(cantidadleft>0){
		        let fechaProducionplanta=Date.parse(req.body.Pedido[i].Caducidad);
					//console.log(fechaProducionplanta);
					let fechaSalidaPla=new Date (fechaProducionplanta);
				fechaProducionplanta = new Date (fechaProducionplanta).getTime()-(7*86400000);

				 let cantidadllegada=cantidadleft >= equivalencia ? equivalencia : cantidadleft;
		            cantidadleft-=equivalencia;
		            //console.log("left"+cantidadleft);
				const data={
					producto_id:producto._id,
					clave:producto.clave,
					descripcion:producto.descripcion,
					origen:"BABEL",
					tipo: "NORMAL",
	    			status: "WAITINGARRIVAL",
					embalajesEntrada: { cajas:cantidadllegada},
		        	embalajesxSalir: { cajas:cantidadllegada},
		        	fechaProduccion:new Date (fechaProducionplanta),
		        	//fechaCaducidad: fechaCaducidadRes,
		        	//lote:req.body.Pedido[i].Lote,
		        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
		        	valor:0
		        }
		        //console.log(data.fechaProduccion.toString())
		        let countEntradas=0;
		        /*countEntradas= countEntradas.length<1 ? await Entrada.find({"referencia":req.body.Pedido[i].Factura}).exec():countEntradas;
		        countEntradas= countEntradas.length<1 ? await Entrada.find({"item":req.body.Pedido[i].Factura}).exec():countEntradas;*/
		       //console.log("test"+countEntradas)
		       let NoOrder=req.body.Pedido[i].NoOrden.split(".")[0]
		      // console.log(NoOrder);
	    		if(countEntradas ==0)
	    		{
	    			console.log("testdome")
			        if(arrPO.find(obj=> (obj.po == NoOrder)))
		    		{
		    			//console.log("yes");
		    			let index=arrPO.findIndex(obj=> (obj.po == NoOrder));
		    			arrPO[index].arrPartidas.push(data)
			    	}
			        else{
			        	//console.log("NO");
			        		//console.log(data)
				        	arrPartidas.push(data);
				        	const PO={
							po:NoOrder,
							fechasalida:fechaSalidaPla,
							factura:req.body.Pedido[i].Factura,
							trailer:req.body.Pedido[i].trailer,
							sello:req.body.Pedido[i].sello,
							chofer:req.body.Pedido[i].chofer,
							transportista:req.body.Pedido[i].transporte,
				        	arrPartidas:[]
				        	}
				        	PO.arrPartidas.push(data)
				        //	console.log(PO);
			    			arrPO.push(PO);
			    		}
			    		
		    	} 
	    		if(countEntradas >0)
	    		{
	    			resORDENES=resORDENES+req.body.Pedido[i].Factura+"\n";
	    		}
	        }
    	}
    	else
    	{
    		if(resORDENES =="" && req.body.Pedido[i].Clave == undefined && arrPO.length<1 && i>6)
    			return res.status(500).send("clave no existe\n" + resORDENES+" ");
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Remisiones:\n" + resORDENES+" ");
		
	}
	//console.log(arrPO);
	
	//console.log("test");
	//console.log(arrPartidas);
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
	   //console.log(partidas);
	    //console.log(noOrden.fechasalida.toString());
	    
		let fechaSalidaPlanta=Date.parse(noOrden.fechasalida);
		let fechaesperada=Date.parse(noOrden.fechasalida)+((60 * 60 * 24 * 1000)*7+1);

		//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();
			console.log(fechaesperada.toString())
			nEntrada.fechaEntrada = new Date(fechaesperada);
			nEntrada.fechaEsperada = new Date(fechaesperada);
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
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
			nEntrada.tracto = noOrden.trailer;			
			nEntrada.referencia = noOrden.factura;
			nEntrada.factura = noOrden.factura;
			nEntrada.item = noOrden.factura;
			nEntrada.transportista = noOrden.transportista;
			nEntrada.operador = noOrden.chofer;
			nEntrada.sello=noOrden.sello;
			await new Promise(resolve => {
					let time=(Math.random() * 5000)*10;
			        setTimeout(resolve,time );
			        //poconsole.log(time);
			    });
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
		 	
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			
			nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					
					//console.log(partidas);
					//console.log(entrada);
					console.log("/--------end----------/")
				}).catch((error) => {
					console.log(error);
					reserror=error
				});

		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			return res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			return res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			console.log(error);
	};
	console.log("ok");
	return res.status(200).send("OK");
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
	updateEntradasBabel,
	updateById,
	posicionarPrioridades,
	posicionarManual,
	updateRemision,
	updateStatus,
	updateFecha,
	saveEntradaEDI,
	saveEntradaChevron,
	saveEntradaPisa,
	getbodycorreo,
	getTarimasAndCajas,
	saveEntradaCPD,
	saveEntradaBLO
	// getPartidaById,
}