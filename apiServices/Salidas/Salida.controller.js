'use strict'
const mongoose = require('mongoose');
const Salida = require('../Salidas/Salida.model');
const Partida = require('../Partida/Partida.controller');
const PartidaModel = require('../Partida/Partida.model');
const Producto = require('../Producto/Producto.model');
const reporteModel = require('../BackupReporteSalidas/backupRepoteSalidas.model');
const Entrada = require('../Entradas/Entrada.model');
const MovimientoInventario = require('../MovimientosInventario/MovimientoInventario.controller');
const Helper = require('../../services/utils/helpers');
const PrePartidaM = require("../PrePartida/PrePartida.model");
const Interfaz_ALM_XD = require('../Interfaz_ALM_XD/Interfaz_ALM_XD.controller');
const TiempoCargaDescarga = require("../TiempoCargaDescarga/TiempoCargaDescarga.controller");
const EmbalajesController = require('../Embalaje/Embalaje.controller');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.model');
const SalidaBabelModel = require('../SalidasBabel/SalidasBabel.model');
const ReenvioPedidosBitacora = require('../ReenvioPedidosBitacora/RenvioPedidosBitacora.model');
const bodyMailTemplate = require('../../services/email/templateCreator');
const mailer = require('../../services/email/mailer');
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
	let refpedido=nSalida.referencia;
	nSalida.save()
		.then(async (salida) => {
			//si es pedido, no hace afectacion de existencias
			console.log(req.body.jsonPartidas);
			for (let itemPartida of req.body.jsonPartidas) {
				await MovimientoInventario.saveSalida(itemPartida, salida.id);
			}


			//Esconder salida que se encuentra en FORSHIPPING y reiniciar sus partidas
			let salidaEnForShipping = await Salida.find({referencia: refpedido, tipo: "FORSHIPPING"}).exec();

			if(salidaEnForShipping.length >= 1){
				await eliminarPedidoParaRenviar(refpedido);
				salidaEnForShipping[0].tipo = "PENDINGFORSHIPPING"
				await salidaEnForShipping[0].save();
			}


			TiempoCargaDescarga.setStatus(salida.tiempoCarga_id, { salida_id: salida._id, status: "ASIGNADO" });

			let partidas = await Partida.put(req.body.jsonPartidas, salida._id);
			salida.partidas = partidas;
			// console.log(partidas);

			await saveSalidasEnEntrada(salida.entrada_id, salida._id);
			await Salida.updateOne({ _id: salida._id }, { $set: { partidas: partidas } }).then(async(updated) => {
				let parRes = await PartidaModel.find({'status':'ASIGNADA', 'pedido':true,'refpedido':{$regex: refpedido}}).exec(); 
				await Helper.asyncForEach(parRes,async function (par) {

					//nSalida.statusPedido="INCOMPLETO";
					var partidaaux=await PartidaModel.findOne({_id:par._id}).exec();
					partidaaux.CajasPedidas={cajas:0};//talves se cambie a info pedidos

	            	partidaaux.pedido=false;
	            	partidaaux.refpedido="SIN_ASIGNAR";
	            	partidaaux.statusPedido="SIN_ASIGNAR";
	            	//nSalida.statusPedido="INCOMPLETO";
	            	//respuestacomplete="INCOMPLETO";
	            	await partidaaux.save();
				})
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

async function getReportePartidas(req, res) {


	let isFilter = false;

	//Verificar si el reporte contiene filtros
	if(req.query.page === undefined || req.query.limit === undefined)
		isFilter = true;

	let pagination = {
		page: parseInt(req.query.page) || 10,
		limit: parseInt(req.query.limit) || 1
	}

	let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio) :"" :"";
	let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal):"" :"";
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


	if(isFilter){
		
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
	}else{

		let partidasSalidasAggregate = PartidaModel.aggregate([

			{ $lookup: { from: "Salidas", localField: "salidas_id.salida_id", foreignField: "_id", as: "fromSalidas" } },
			
			{ $lookup: { from: "Productos", localField: "producto_id", foreignField: "_id", as: "fromProductos"} },

			{$match: {"fromSalidas.clienteFiscal_id": mongoose.Types.ObjectId(filter.clienteFiscal_id),
					  "fromSalidas.fechaSalida": {$gte: fechaInicio, $lt: fechaFinal}}}, 

		]);


		
		let arrPartidas = [];
		let partidasSalidasPaguinate = await PartidaModel.aggregatePaginate(partidasSalidasAggregate, pagination);

		partidasSalidasPaguinate.docs.forEach((partida) =>{


			let salida = partida.fromSalidas[0];
			partida.producto_id = partida.fromProductos[0];
			//let salidas_id = partida.fromSalidas;

			let embalajes = partida.salidas_id[0].embalajes

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

			arrPartidas.push(paramsSalida);
		})
		partidasSalidasPaguinate.docs = arrPartidas;
		res.status(200).send(partidasSalidasPaguinate);

	}


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
		worksheet.cell(2, 8).string('Fecha Captura en Sistema').style(headersStyle);
		

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
		worksheet.cell(2, indexheaders+3).string('Fecha Salida Fisica').style(headersStyle);
		worksheet.cell(2, indexheaders+4).string('Fecha/Hora Sello').style(headersStyle);
		worksheet.cell(2, indexheaders+5).string('Fecha Caducidad').style(headersStyle);
		worksheet.cell(2, indexheaders+6).string('Retraso').style(headersStyle);
		worksheet.cell(2, indexheaders+7).string('On Time').style(headersStyle);
		worksheet.cell(2, indexheaders+8).string('Destinatario').style(headersStyle);
		worksheet.cell(2, indexheaders+9).string('Datos Tracto');
		worksheet.cell(2, indexheaders+10).string('Datos Remolque');
		worksheet.cell(2, indexheaders+11).string('Ubicacion').style(headersStyle);
        let i=3;


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
					destinatario:salida.destinatario,
					CajasPedidas: partida.CajasPedidas,
					embalajes: embalajes,
					fechaReciboRemision: salida.fechaReciboRemision ? salida.fechaReciboRemision : "SIN ASIGNAR",
					producto_id:partida.producto_id,
					horaSello: salida.horaSello
				}
				if( Infull =="" && clave=="" && folio=="" && valorontime =="" && clasificacion == "" && subclasificacion == "" && paramsSalida.embalajes!= undefined){
					arrPartidas.push(paramsSalida);
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
		
        //console.log("test1")
       /* arrPartidas.sort(function(a, b) {
		    a = new Date(a.fechaSalida);
		    b = new Date(b.fechaSalida);
		    return a>b ? -1 : a<b ? 1 : 0;
		});*/
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
           	worksheet.cell(i, indexbody+8).string(partidas.destinatario? partidas.destinatario : "SIN ASIGNAR");
			worksheet.cell(i, indexbody+9).string(partidas.placasTrailer? partidas.placasTrailer : "SIN ASIGNAR");
			worksheet.cell(i, indexbody+10).string(partidas.placasRemolque? partidas.placasRemolque : "SIN ASIGNAR");
           
            let res=""
            if(partidas.posiciones.length === 1) 
            	res = partidas.posiciones[0].pasillo + partidas.posiciones[0].nivel + partidas.posiciones[0].posicion;
            worksheet.cell(i, indexbody+11).string(res);
			
            i++;
        });
        workbook.write('ReporteSali'+dateFormat(new Date(Date.now()-(5*3600000)), formatofecha)+'.xlsx',res);
        console.log("END")
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
		worksheet.cell(2, indexheaders+8).string('Destinatario').style(headersStyle);
		worksheet.cell(2, indexheaders+9).string('Datos Tracto');
		worksheet.cell(2, indexheaders+10).string('Datos Remolque');
		worksheet.cell(2, indexheaders+11).string('Ubicacion').style(headersStyle);
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
//Elimianar pedido para realizar la modificacion al mismo
async function ingresarPedidoConModificacion(pedido){

	let partidasABuscar = pedido[0].partidas;
	let pedidoAEliminar = pedido[0].referencia;

	let partidasPedido = await PartidaModel.find({_id: {$in: partidasABuscar}}).exec();
	

	await Helper.asyncForEach(partidasPedido, async function(partida){

		let referenciaPedidos = partida.referenciaPedidos.filter(pedido => pedido.referenciaPedido !== pedidoAEliminar);


		if(referenciaPedidos.length > 0){
			partida.refpedido = referenciaPedidos[0].referenciaPedido;
			partida.pedido = referenciaPedidos[0].pedido;
			partida.statusPedido = "COMPLETO";
			partida.CajasPedidas.cajas = referenciaPedidos[0].CajasPedidas.cajas;
		}else{
			partida.refpedido = "SIN_ASIGNAR";
			partida.pedido = false;
			partida.statusPedido = "SIN_ASIGNAR";
			partida.CajasPedidas.cajas = 0;
		}
		
		partida.referenciaPedidos = referenciaPedidos;
		await partida.save();
		
		console.log("Partida Liberada");
	})

	
	Salida.deleteOne({"referencia": pedidoAEliminar}, function(err){
		if(err) return handleError(err);
	   console.log("El pedido "+pedidoAEliminar+" ha sido eliminado, para remplazarlo")
	});

}

//Elimianar pedido para realizar la modificacion al mismo
async function eliminarPedidoParaRenviar(referencia){

	
	let salida = await Salida.find({"referencia": referencia, tipo: "FORSHIPPING"}).exec();

	const partidas_id = salida[0].partidas;
	let partidasPedido;
	
	if(partidas_id.length !== 0){
		partidasPedido = await PartidaModel.find({_id: {$in: partidas_id}}).exec()
	}else{
		partidasPedido = await PartidaModel.find({"referenciaPedidos.referenciaPedido": referencia,
												"referenciaPedidos.pedido": true,
												pedido: true }).exec();
	}

	await Helper.asyncForEach(partidasPedido, async function(partida){

		const partidaSinPedido = desasiganarPedidoEnPartida(partida, referencia);

		console.log(partidaSinPedido);

		await partidaSinPedido.save();

	})

	salida[0].partidas = [];
	salida[0].entrada_id = [];

	await salida[0].save();

	return salida;


}

function desasiganarPedidoEnPartida(partida, referencia){


	let referenciaPedidos = partida.referenciaPedidos.filter(pedido => pedido.referenciaPedido !== referencia);


		if(referenciaPedidos.length > 0){
			partida.refpedido = referenciaPedidos[0].referenciaPedido;
			partida.pedido = referenciaPedidos[0].pedido;
			partida.statusPedido = "COMPLETO";
			partida.CajasPedidas.cajas = referenciaPedidos[0].CajasPedidas.cajas;
		}else{
			partida.refpedido = "SIN_ASIGNAR";
			partida.pedido = false;
			partida.statusPedido = "SIN_ASIGNAR";
			partida.CajasPedidas.cajas = 0;
		}

		partida.referenciaPedidos = referenciaPedidos;

		return partida;
}

async function reloadPedidosBabel(req, res){

	let salidasActuales;

	const referencia = req.query?.referencia ? req.query.referencia : null;

	if(referencia !== null){
		salidasActuales = await Salida.find({"referencia": referencia, tipo: "FORSHIPPING" }).exec();
	}else{
		salidasActuales = await Salida.find({tipo: "FORSHIPPING" }).sort({fechaAlta: 1}).exec();
	}
	
	let referencias = [];
	let detallePedidoTeplate = "";
	let detallesPedidosArray = [];
	await Helper.asyncForEach(salidasActuales, async function(salidaActual){
			
			detallePedidoTeplate = "";
			let salidaAReenviar = await eliminarPedidoParaRenviar(salidaActual.referencia);
	
			referencias.push(salidaActual.referencia);
	
			let salidaBabel = await SalidaBabelModel.findById({_id: salidaAReenviar[0].salidaBabel_id}).exec();

			salidaBabel.productosDetalle.forEach(productoDetalle => {

				const {No, producto, Clave, Cantidad} = productoDetalle;
				
				detallePedidoTeplate += `<tr>
												<td>${No}</td>
												<td>${Clave}</td>
												<td>${producto}</td>
												<td>${Cantidad}</td>
												<td>${salidaActual.referencia}</td>
											</tr>
				`

			})
			
			detallesPedidosArray.push({
				template: detallePedidoTeplate,
				pedido: salidaActual.referencia
			});

			let {partidas_id, entradas_id} = await reasignarPartidasDisponiblesEnPedidos(salidaBabel);
	
			salidaActual.partidas = partidas_id.map(partida => partida._id);
			partidas_id = partidas_id.map(partida => partida._id);
			
			await Salida.updateOne({_id: salidaActual._id}, 
									{ $set: { partidas: partidas_id, 
											entrada_id: entradas_id,
											tipo: "FORSHIPPING" } });
			
			const reenvioPedidosBitacoraJson = {
				sucursal_id: salidaActual.sucursal_id,
				almacen_id: salidaActual.almacen_id,
				clienteFiscal_id: salidaActual.clienteFiscal_id,
				salida_id: salidaActual._id,
				descripcion: "Se ha reenviado el pedido con exito",
				tipo: "SALIDA",
				nombreUsuario: "BABEL",
				status: "ACTIVO",
			}
	
			const reenvioPedidosBitacora = new ReenvioPedidosBitacora(reenvioPedidosBitacoraJson);
	
			await reenvioPedidosBitacora.save()								

	})


	//Crear bitacora para controlar las veces que se resuben los pedidos
	//adicional a eso, crear funcionalidad para enviar un correo para verificar que se subio el pedido	
	let detallesPedidosTemplates = generateTablePedidosTempate(detallesPedidosArray);

	let bodyHtmlMail = bodyMailTemplate.bodyHtml(detallesPedidosTemplates);
	
	mailer.sendEmail({body: bodyHtmlMail}, "[LGKGO] Notificacion Reenvio Pedidos")
	.then(response =>{
		console.log("Se ha enviado el mensaje con exito");
	});
	res.status(200).send({"statusCode": 200, "response": "Se han resubido los pedidos"});

}

//`<h4>Pedido: ${pedido}</h4>
function generateTablePedidosTempate(detallesPedidosArray) {
	let detallePedidoTemplates = "";
	detallesPedidosArray.forEach(detallePedido => {
		const {template, pedido } = detallePedido
		detallePedidoTemplates += 
		
		`<table>
			<th>Numero</th>
			<th>Item</th>
			<th style="width: 70%;">Descripcion</th>
			<th>Cantidad</th>
			<th>Pedido</th>
			${template}
		</table>`;		
	})
	return detallePedidoTemplates

}

async function reasignarPartidasDisponiblesEnPedidos(salidaBabel){

	let totalpartidas =0;
	let refitem=salidaBabel.referencia.trim();
	
	let hoy=new Date(Date.now()-(5*3600000));
	let parRes=[];
	var pedidoCompleto = true;
	var bandcompleto=true;
	let pedidoNuevo = true;
	var pedidoCompleto = true;

	await Helper.asyncForEach(salidaBabel.productosDetalle,async function (par) {
		//console.log("----partida: "+par.Clave+ "----");
		let producto =await Producto.findOne({'clave': par.Clave }).exec();
		//console.log(producto.clave);
		//console.log(par.Cantidad);
		//console.log(producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia);
		let equivalencia =producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia;
		
		let needed=Math.round(par.Cantidad/equivalencia);
		let isEstiba = producto.isEstiba;
		console.log("test: "+needed);
		totalpartidas+=needed;

		
		//console.log(".0.0.0.0.0.0.0.0.");
		
		//console.log(partidas.length)/*
		
		let cantidadneeded= parseInt(par.Cantidad);
		let cantidadPedida=0;
		let bandcp=true; //bandera temporal para salir del ciclo en caso de que no se encuentren partidas 
		while(cantidadneeded>0&&bandcp==true)
		{
			console.log("-------------asdasd-------------"+"clave: "+producto.clave+"equivalencia: "+equivalencia)
			//console.log(cantidadneeded);
			console.log("cantidadneeded "+cantidadneeded);
			

			console.log("buscar: "+cantidadPedida)
			console.log("beforeleft: "+cantidadneeded);
			let embalajesEntrada={cajas:cantidadPedida};
			//let partidas=await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'isEmpty':false,/*'embalajesxSalir.cajas':{$gte: embalajesEntrada.cajas}*/fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec();
			let partidas = await PartidaModel.find({'status':'ASIGNADA', 
								origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
								'clave':par.Clave,
								'isEmpty':false,
								pedido: false,
								 'embalajesxSalir.cajas': {$nin: [0]},
								fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
							.exec();

			partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
			

			const sortPartidasWithPositionAndDaysForExpire = ((a, b) =>{
				let pasilloA = a.posiciones[0].pasillo.replace(".", "");
						let pasilloB = b.posiciones[0].pasillo.replace(".", "");
						let posicionA = (parseInt(a.posiciones[0].posicion));
						let posicionB = (parseInt(b.posiciones[0].posicion));
						let nivelA = a.posiciones[0].nivel;
						let nivelB = b.posiciones[0].nivel;
						let posicionCompletaA = pasilloA + posicionA + nivelA;
						let posicionCompletaB = pasilloB + posicionB + nivelB;

						let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);								
						let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
							
							
							if(DiasrestantesA >= DiasrestantesB && posicionCompletaA >= posicionCompletaB){
								return 1;
							}	

							if(DiasrestantesA <= DiasrestantesB && posicionCompletaA <= posicionCompletaB){
								return -1;
							}
			});

			if(cantidadneeded % equivalencia === 0){
				console.log("Completa la equivalencia");
				partidas = await PartidaModel.find({'status':'ASIGNADA', pedido: false, origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
				
				
				if(isEstiba !== true){
				
					partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

					//partidas = partidas.sort(Helper.sortPartidasByLevel);
					
				}else{
					partidas = await PartidaModel.find({'status':'ASIGNADA',origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']}, pedido: false, 'clave':par.Clave, 'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
					partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

				}
			}
			partidas = Helper.deletePartidasWithNegativeExpireDays(partidas, producto, hoy);

			partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
			

			console.log("totalpartidas: "+partidas.length)
			let count=0;
			bandcp=false;
			for (let i = 0; i < partidas.length; i++) //&& count<1
			{	
				cantidadPedida=cantidadneeded >= equivalencia ? equivalencia : cantidadneeded;
				let cantidadRestante = cantidadneeded;
				let partidaSeleccionada = partidas[i];

				if(partidas[i].embalajesxSalir.cajas === cantidadPedida * 2 && isEstiba === true && cantidadPedida === equivalencia && equivalencia !== cantidadneeded){
					cantidadPedida = equivalencia * 2;
					cantidadRestante = partidaSeleccionada.embalajesxSalir.cajas;
				}

				if(isEstiba === true && partidas[i].embalajesxSalir.cajas === (equivalencia / 2)){
					cantidadPedida = partidas[i].embalajesxSalir.cajas;
				}

				if(cantidadneeded < cantidadRestante){
					cantidadPedida = cantidadneeded;
				}
				
				let isPartidaPickeada = false;
				let refPedidoPartida = refitem.trim();
				let refPedidoDocument = {};
				let refPedidos =[];
				//let cantidadRestante = cantidadneeded;
				let Diasrestantes; 


				if(cantidadneeded <= 0){
					break;
				}

				//let referenciaPedidos = partidaSeleccionada.referenciaPedidos.map(ref => ref.CajasPedidas.cajas);
				//let cantidadApartada = referenciaPedidos.reduce((val, acc) => val += acc);



				//console.log(i);
				//fechaFrescura = new Date(fCaducidad - (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
				const DIAS_ANTICIPADOS = 0;
				//let fechaFrescura = new Date(partidas[i].fechaCaducidad.getTime() - (producto.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)); ///se cambio por fecha de alerta amarilla
				//let fechaAlerta1 = new Date(partidas[i].fechaCaducidad.getTime() - (producto.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000*10)); 
				
				if(Helper.isPicking(equivalencia, cantidadPedida, isEstiba)){
					console.log("Completa la equivalencia");
				}else{
					console.log("Es picking")

					let partidasPick = await PartidaModel.find({'status':'ASIGNADA', 
								origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
								'clave':par.Clave,
								'isEmpty':false,
								 'embalajesxSalir.cajas': {$nin: [0]},
								fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
							.exec();
						partidasPick = Helper.deletePartidasWithNegativeExpireDays(partidasPick, producto, hoy);

					let partidaPickeada = partidasPick.filter(partida => {
						let diasrestantes = Helper.getDaysForExpire(partida, producto, hoy);

						if(partida.fechaCaducidad.getTime() > hoy && diasrestantes >= DIAS_ANTICIPADOS){
							if(partida.embalajesxSalir.cajas !== equivalencia || partida.embalajesxSalir.cajas !== (equivalencia * 2)){
								return true;
							}else{
								return false;
							}	
						}else{
							return false;
						}	
					});
					
					if(partidaPickeada.length !== 0){
						
						const sortPartidasByDaysForExpire = (a, b) => {
							
							let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);
							
							let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
							
							let embalajesxSalirA = a.embalajesxSalir.cajas
							let embalajesxSalirB = b.embalajesxSalir.cajas;
							
							if(DiasrestantesA >= DiasrestantesB && embalajesxSalirA >= embalajesxSalirB){
								return 1;
							}	

							if(DiasrestantesA <= DiasrestantesB && embalajesxSalirA <= embalajesxSalirB){
								return -1;
							}
						};


						let partidasPickeadasOrdenadas = partidaPickeada.sort(sortPartidasByDaysForExpire)
						
						const arrayDiasRestantes = partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy));

						if(Helper.allElementAreEqualsInArray(arrayDiasRestantes) === true){
							partidasPickeadasOrdenadas = partidasPickeadasOrdenadas.sort(Helper.sortPartidasByEmbalajesxSalir);
					}
					
					console.table({
						"partidasPickeadas": partidaPickeada.map(partida => partida.embalajesxSalir.cajas),
						"diasRestantesPartidas": partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy)),
						"partidasPickeadasOrdenadas": partidasPickeadasOrdenadas.map(partida => partida.embalajesxSalir.cajas)
					})
					isPartidaPickeada = true;
				
					//Buscar una partida pickeada y seleccionar la primera que encuentra
					const {partidaSeleccionadaPick, cantidadParcialPick} = holdPartidaPick(partidasPickeadasOrdenadas, cantidadneeded, parRes);
					cantidadPedida = cantidadParcialPick;
					cantidadRestante = cantidadPedida;
					partidaSeleccionada = partidaSeleccionadaPick;
					
				}
			}
				
				//Verificar que la partida con picking aun tenga la cantidad que le corresponde
				
					if(isPartidaPickeada && partidaSeleccionada !== undefined){
						
							console.log("Paso al pedido")
							refPedidoDocument.referenciaPedido = refPedidoPartida;
							refPedidoDocument.CajasPedidas = {cajas: cantidadPedida};
							refPedidoDocument.pedido = true;
							partidaSeleccionada.referenciaPedidos.push(refPedidoDocument);	
					}

				if(partidaSeleccionada !== undefined){
					Diasrestantes = Helper.getDaysForExpire(partidaSeleccionada, producto, hoy);
					console.log("Dias Para perder frescura"+ Diasrestantes);
					if(cantidadRestante >= cantidadPedida && partidaSeleccionada.embalajesxSalir.cajas >= cantidadPedida && partidaSeleccionada.fechaCaducidad.getTime() > hoy && Diasrestantes >= DIAS_ANTICIPADOS)
					{	
						//Prioridad buscar tarimas incompletas (Picking)

						console.log("Embalaje Cajas:",partidaSeleccionada.embalajesxSalir.cajas );
						let numpedido=Math.floor(partidaSeleccionada.embalajesxSalir.cajas/cantidadPedida);
							var partidaaux=await PartidaModel.findOne({_id:partidaSeleccionada._id}).exec();
							//let pedidoTotal=cantidadPedida*numpedido<=cantidadneeded ? cantidadPedida*numpedido : cantidadPedida
							
							if(partidaaux.pedido==false && partidaaux.referenciaPedidos.length === 0)
							{
								
								refPedidoDocument.referenciaPedido = refPedidoPartida;
								refPedidoDocument.CajasPedidas = {cajas: cantidadPedida}
								refPedidoDocument.pedido = true;
								refPedidos.push(refPedidoDocument);
								
								partidaaux.referenciaPedidos=refPedidos;//talves se cambie a info pedidos
								partidaaux.CajasPedidas = {cajas: cantidadPedida};
								partidaaux.pedido=true;
								partidaaux.refpedido=refPedidoPartida;	
							}
							else{
								if(isPartidaPickeada){
									partidaaux.referenciaPedidos.push(refPedidoDocument);
								}
							}
							
							partidaaux.CajasPedidas = partidaaux.referenciaPedidos[0].CajasPedidas;


							partidaaux.statusPedido="COMPLETO";
							await partidaaux.save();
							parRes.push(partidaaux);
							
								//console.log(partidaaux);
							console.log("--------------");
							count++;
							cantidadneeded-=(cantidadPedida);
							bandcp=true;

					}

				}else{
					console.log("Se trata de generar una salida sin partidas suficientes");
					pedidoCompleto = false;
				}

				
			}
		}
		bandcompleto=bandcompleto==false?bandcompleto:bandcp;
	});

	let entradas_id = parRes.map(x => x.entrada_id.toString()).filter(Helper.distinct);

	return {"partidas_id":parRes, "entradas_id": entradas_id};

	//console.log("********************"+totalpartidas+"=="+parRes.length+"********************");


}

async function saveSalidaBabel(req, res) {
	console.log("----------------------------------------------------------------------start-HOLD------------------------------------------------------")
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
	var bandcompleto=true;
	let pedidoNuevo = true;
	var pedidoCompleto = true;
	
	const pedidoDetalle = Helper.createPedidoJSONForHold(req.body);
	
	try{
		console.log(req.body.Pedido.length)
		let index=0;

		let pedidoAGuardar = req.body.Pedido[1].Pedido;
		let pedidoCadena = req.body.Pedido[1].Pedido;
		let validarModificacionDePedido = new RegExp("rev");

		if(validarModificacionDePedido.test(pedidoAGuardar) && pedidoNuevo === true){
			let pedidoABuscar = pedidoAGuardar.split(" ");
			pedidoCadena = "";
			for(let i = 0; i <= 2; i++){
				pedidoCadena += pedidoABuscar[i]+" ";	
			}
			let countEntradas=await Salida.find({"referencia":pedidoCadena.trim()}).exec();

			if(countEntradas.length > 0){
				await ingresarPedidoConModificacion(countEntradas);
				pedidoNuevo = false;
			}else{
				pedidoNuevo = false;
			}
		}

		await Helper.asyncForEach(req.body.Pedido,async function (Pedido) {
			// Preparar pedido para apartar las partidas y crearlas apartir de lo solicitado
			if(Pedido.NO && index > 13 && Pedido.Clave && Pedido.Cantidad)
			{
				console.log(Pedido);
				var producto=await Producto.findOne({ 'clave':Pedido.Clave }).exec();
				if(producto==undefined)
					return res.status(400).send("no existe item: "+Pedido.Clave);
				
				

				let countEntradas=await Salida.find({"po":pedidoAGuardar}).exec();			

				
				console.log("total: "+countEntradas.length)
		        countEntradas= countEntradas.length<1 ? await Salida.find({"referencia":req.body.Pedido[1].Pedido}).exec():countEntradas;
		        console.log("total2: "+countEntradas.length)
				if(countEntradas.length>0){
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
			let refitem=pedidoCadena.trim();
			let refDesti=Pedido.destinatario;
			console.log(pedidoCadena);
			console.log(Pedido.arrPartidas.length);
			
			await Helper.asyncForEach(Pedido.arrPartidas,async function (par) {
				//console.log("----partida: "+par.Clave+ "----");
				let producto =await Producto.findOne({'clave': par.Clave }).exec();
				//console.log(producto.clave);
				//console.log(par.Cantidad);
				//console.log(producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia);
				let equivalencia =producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia;
				
				let needed=Math.round(par.Cantidad/equivalencia);
				let isEstiba = producto.isEstiba;
				console.log("test: "+needed);
				totalpartidas+=needed;

				
				//console.log(".0.0.0.0.0.0.0.0.");
				
				//console.log(partidas.length)/*
				
				let cantidadneeded=par.Cantidad;
				let cantidadPedida=0;
				let bandcp=true; //bandera temporal para salir del ciclo en caso de que no se encuentren partidas 
				while(cantidadneeded>0&&bandcp==true)
				{
					console.log("-------------asdasd-------------"+"clave: "+producto.clave+"equivalencia: "+equivalencia)
					//console.log(cantidadneeded);
					console.log("cantidadneeded "+cantidadneeded);
		            

		            console.log("buscar: "+cantidadPedida)
		            console.log("beforeleft: "+cantidadneeded);
		            let embalajesEntrada={cajas:cantidadPedida};
		            //let partidas=await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'isEmpty':false,/*'embalajesxSalir.cajas':{$gte: embalajesEntrada.cajas}*/fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec();
					let partidas = await PartidaModel.find({'status':'ASIGNADA', 
										origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
										'clave':par.Clave,
										'isEmpty':false,
										 'embalajesxSalir.cajas': {$nin: [0]},
										fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
									.exec();

					partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
					

					const sortPartidasWithPositionAndDaysForExpire = ((a, b) =>{
						let pasilloA = a.posiciones[0].pasillo.replace(".", "");
								let pasilloB = b.posiciones[0].pasillo.replace(".", "");
								let posicionA = (parseInt(a.posiciones[0].posicion));
								let posicionB = (parseInt(b.posiciones[0].posicion));
								let nivelA = a.posiciones[0].nivel;
								let nivelB = b.posiciones[0].nivel;
								let posicionCompletaA = pasilloA + posicionA + nivelA;
								let posicionCompletaB = pasilloB + posicionB + nivelB;

								let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);								
								let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
									
									
									if(DiasrestantesA >= DiasrestantesB && posicionCompletaA >= posicionCompletaB){
										return 1;
									}	

									if(DiasrestantesA <= DiasrestantesB && posicionCompletaA <= posicionCompletaB){
										return -1;
									}
					});

					if(cantidadneeded % equivalencia === 0){
						console.log("Completa la equivalencia");
						partidas = await PartidaModel.find({'status':'ASIGNADA', pedido: false, origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
						
						
						if(isEstiba !== true){
						
							partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

							//partidas = partidas.sort(Helper.sortPartidasByLevel);
							
						}else{
							partidas = await PartidaModel.find({'status':'ASIGNADA',origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']}, pedido: false, 'clave':par.Clave, 'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
							partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

						}
					}
					partidas = Helper.deletePartidasWithNegativeExpireDays(partidas, producto, hoy);


					partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
					

					console.log("totalpartidas: "+partidas.length)
					let count=0;
					bandcp=false;

					for (let i = 0; i < partidas.length; i++) //&& count<1
					{	
						cantidadPedida=cantidadneeded >= equivalencia ? equivalencia : cantidadneeded;
						let cantidadRestante = cantidadneeded;
						let partidaSeleccionada = partidas[i];

						if(partidas[i].embalajesxSalir.cajas === cantidadPedida * 2 && isEstiba === true && cantidadPedida === equivalencia && equivalencia !== cantidadneeded){
							cantidadPedida = equivalencia * 2;
							cantidadRestante = partidaSeleccionada.embalajesxSalir.cajas;
						}

						if(isEstiba === true && partidas[i].embalajesxSalir.cajas === (equivalencia / 2)){
							cantidadPedida = partidas[i].embalajesxSalir.cajas;
						}

						let isPartidaPickeada = false;
						let refPedidoPartida = pedidoCadena.trim();
						let refPedidoDocument = {};
						let refPedidos =[];
						//let cantidadRestante = cantidadneeded;
						let Diasrestantes; 


						if(cantidadneeded <= 0){
							break;
						}

						//console.log(i);
						//fechaFrescura = new Date(fCaducidad - (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
						const DIAS_ANTICIPADOS = 0;
						//let fechaFrescura = new Date(partidas[i].fechaCaducidad.getTime() - (producto.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)); ///se cambio por fecha de alerta amarilla
			            let fechaAlerta1 = new Date(partidas[i].fechaCaducidad.getTime() - (producto.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000*10)); 
						
						if(Helper.isPicking(equivalencia, cantidadPedida, isEstiba)){
							console.log("Completa la equivalencia");
						}else{
							console.log("Es picking")

							let partidasPick = await PartidaModel.find({'status':'ASIGNADA', 
								origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
								'clave':par.Clave,
								'isEmpty':false,
								 'embalajesxSalir.cajas': {$nin: [0]},
								fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
							.exec();

							let partidaPickeada = partidasPick.filter(partida => {
								let diasrestantes = Helper.getDaysForExpire(partida, producto, hoy);

								if(partida.fechaCaducidad.getTime() > hoy && diasrestantes >= DIAS_ANTICIPADOS){
									if(partida.embalajesxSalir.cajas !== equivalencia || partida.embalajesxSalir.cajas !== (equivalencia * 2)){
										return true;
									}else{
										return false;
									}	
								}else{
									return false;
								}	
							});
							
							if(partidaPickeada.length !== 0){
								
								const sortPartidasByDaysForExpire = (a, b) => {
									
									let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);
									
									let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
									
									let embalajesxSalirA = a.embalajesxSalir.cajas
									let embalajesxSalirB = b.embalajesxSalir.cajas;
									
									if(DiasrestantesA >= DiasrestantesB && embalajesxSalirA >= embalajesxSalirB){
										return 1;
									}	

									if(DiasrestantesA <= DiasrestantesB && embalajesxSalirA <= embalajesxSalirB){
										return -1;
									}
								};


								let partidasPickeadasOrdenadas = partidaPickeada.sort(sortPartidasByDaysForExpire)
								
								const arrayDiasRestantes = partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy));

								if(Helper.allElementAreEqualsInArray(arrayDiasRestantes) === true){
									partidasPickeadasOrdenadas = partidasPickeadasOrdenadas.sort(Helper.sortPartidasByEmbalajesxSalir);
							}
						    
							console.table({
								"partidasPickeadas": partidaPickeada.map(partida => partida.embalajesxSalir.cajas),
								"diasRestantesPartidas": partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy)),
								"partidasPickeadasOrdenadas": partidasPickeadasOrdenadas.map(partida => partida.embalajesxSalir.cajas)
							})
							isPartidaPickeada = true;
						
							//Buscar una partida pickeada y seleccionar la primera que encuentra
							const {partidaSeleccionadaPick, cantidadParcialPick} = holdPartidaPick(partidasPickeadasOrdenadas, cantidadneeded, parRes);
							cantidadPedida = cantidadParcialPick;
							cantidadRestante = cantidadPedida;
							partidaSeleccionada = partidaSeleccionadaPick;
							
						}
					}
						
						//Verificar que la partida con picking aun tenga la cantidad que le corresponde
						
							if(isPartidaPickeada && partidaSeleccionada !== undefined){
								
									console.log("Paso al pedido")
									refPedidoDocument.referenciaPedido = refPedidoPartida;
									refPedidoDocument.CajasPedidas = {cajas: cantidadPedida};
									refPedidoDocument.pedido = true;
									partidaSeleccionada.referenciaPedidos.push(refPedidoDocument);	
							}

						if(partidaSeleccionada !== undefined){
							Diasrestantes = Helper.getDaysForExpire(partidaSeleccionada, producto, hoy);
							console.log("Dias Para perder frescura"+ Diasrestantes);
							if((cantidadRestante >= cantidadPedida && partidaSeleccionada.embalajesxSalir.cajas >= cantidadPedida && partidaSeleccionada.fechaCaducidad.getTime() > hoy && Diasrestantes >= DIAS_ANTICIPADOS))
							{	
								//Prioridad buscar tarimas incompletas (Picking)
	
								console.log("Embalaje Cajas:",partidaSeleccionada.embalajesxSalir.cajas );
								let numpedido=Math.floor(partidaSeleccionada.embalajesxSalir.cajas/cantidadPedida);
									var partidaaux=await PartidaModel.findOne({_id:partidaSeleccionada._id}).exec();
									//let pedidoTotal=cantidadPedida*numpedido<=cantidadneeded ? cantidadPedida*numpedido : cantidadPedida
									
									if(partidaaux.pedido==false)
									{
										
										refPedidoDocument.referenciaPedido = refPedidoPartida;
										refPedidoDocument.CajasPedidas = {cajas: cantidadPedida}
										refPedidoDocument.pedido = true;
										refPedidos.push(refPedidoDocument);
										
										partidaaux.referenciaPedidos=refPedidos;//talves se cambie a info pedidos
										partidaaux.CajasPedidas = {cajas: cantidadPedida};
										partidaaux.pedido=true;
										partidaaux.refpedido=refPedidoPartida;	
									}
									else{
										if(isPartidaPickeada){
											partidaaux.referenciaPedidos.push(refPedidoDocument);
										}
									}

									partidaaux.CajasPedidas = partidaaux.referenciaPedidos[0].CajasPedidas;

							
									partidaaux.statusPedido="COMPLETO";
									await partidaaux.save();
									parRes.push(partidaaux);
									
										//console.log(partidaaux);
									console.log("--------------");
									count++;
									cantidadneeded-=(cantidadPedida);
									bandcp=true;
	
							}

						}else{
							console.log("Se trata de generar una salida sin partidas suficientes");
							pedidoCompleto = false;
						}

						
			        }
				}
				bandcompleto=bandcompleto==false?bandcompleto:bandcp;
			});

			console.log("********************"+totalpartidas+"=="+parRes.length+"********************");
			
			if (parRes && parRes.length) {
				//console.log(parRes);
				let entradas_id = parRes.map(x => x.entrada_id.toString()).filter(Helper.distinct);
				let entradas = await Entrada.find({ "_id": { $in: entradas_id } });

				if ((entradas && entradas.length > 0)) {
					//Obtener referencia del detalle de la slaida de babel
					pedidoDetalle.referencia.split("rev")[0].trim();
					const salidaBabelModel = new SalidaBabelModel(pedidoDetalle);
					let salidaBabel;
					let salidaBabel_id;
					salidaBabelModel.save(async function (err) {
						if (err) return handleError(err);
						// saved!
						salidaBabel = await SalidaBabelModel.find({referencia: refitem}).exec();
						salidaBabel_id = salidaBabel[0]._id.toString();
					  });


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
					nSalida.salidaBabel_id = salidaBabel_id
					nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O', false);
					console.log("******************************************--------------------**********************")
					console.log(nSalida);
					console.log("******************************************--------------------**********************")
					
					if( bandcompleto ==false){
						await Helper.asyncForEach(parRes,async function (par) {

							nSalida.statusPedido="INCOMPLETO";
							var partidaaux=await PartidaModel.findOne({_id:par._id}).exec();
			            	nSalida.statusPedido="INCOMPLETO";
			            	respuestacomplete="INCOMPLETO";
			            	await partidaaux.save();
						})
					}
					//saveSalida
					
					

					nSalida.save(); //salida guarda 
				} else {
					return res.status(400).send("Se trata de generar una salida sin entrada o esta vacia");
				}
				
			} else {
				console.log("Se trata de generar una salida sin partidas suficientes");
				//Enviar correo a sistemas, Barcel, Inventarios

				mailer.sendEmail({body: `Se ha intentado 
										generar una salida sin 
										partidas suficientes
										para el pedido: ${refitem}`})
										.then(response =>{
											console.log("Se ha enviado el mensaje con exito");
										});

				return res.status(400).send({statusCode: 400, body: "Se trata de generar una salida sin partidas suficientes en el pedido "+ refitem});
				//return res.status(400).send("Se trata de generar una salida sin partidas suficientes");
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


function holdPartidaPick(partidasOrdenadas, cantidadPedida, partidasParciales){

	let cantidadRestante;
	let isPartidaHold = false;
	let partidaSeleccionadaPick;
	let cantidadParcialPick = cantidadPedida;
	let cantidadApartada;
	let i = 0;
	let partidasParcialesCopy = partidasParciales.slice();

	
	while(isPartidaHold === false && i < partidasOrdenadas.length){
		cantidadRestante = partidasOrdenadas[i].embalajesxSalir.cajas;
			
			let index = partidasParcialesCopy.findIndex(partida => partida._id.toString() === partidasOrdenadas[i]._id.toString());

			if(index !== -1){
				let indexParcial = partidasOrdenadas.findIndex(partida => partida._id.toString() === partidasParcialesCopy[index]._id.toString());
				partidasOrdenadas.splice(indexParcial, 1);
				partidasOrdenadas.unshift(partidasParcialesCopy[index]);
				partidasParcialesCopy.splice(index, 1);
			}
			if(partidasOrdenadas[i].referenciaPedidos.length >= 1){
			let cantidadCajasPedidasArray = partidasOrdenadas[i].referenciaPedidos.filter(pedido => pedido.pedido === true).map(partida => partida.CajasPedidas.cajas);
			if(cantidadCajasPedidasArray.length > 0){
				cantidadApartada = cantidadCajasPedidasArray.reduce((val, acc) => val += acc);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
				cantidadRestante = (partidasOrdenadas[i].embalajesxSalir.cajas - cantidadApartada);
			}
			
			console.log("Cantidad de cajas Pedidas", cantidadCajasPedidasArray);
			console.log("Cantidad de cajas apartadas", cantidadApartada);
		}
		
		console.log("Cantidad restantes", cantidadRestante);
		
		if(cantidadRestante >= cantidadPedida && cantidadRestante !== 0){
			isPartidaHold = true;
			partidaSeleccionadaPick = partidasOrdenadas[i];
			i = partidasOrdenadas.length;

		}else{

			if(cantidadRestante !== 0){

				isPartidaHold = true;
				cantidadParcialPick = cantidadRestante; 
				partidaSeleccionadaPick = partidasOrdenadas[i];
				i = partidasOrdenadas.length;
			}
		}
		i++;
	}

	return {partidaSeleccionadaPick, cantidadParcialPick};
}
					

function updateStatusSalidas(req, res) {
	let _id = req.body.salida_id;
	let newStatus = req.body.status;
	console.log(_id);

	let today = new Date(Date.now()-(5*3600000));
	let datos ={ tipo: newStatus}
	if(newStatus=="FORPICKING")
	{
		datos.fechaSalida=today
	}

	Salida.updateOne({_id: _id}, { $set: datos}).then((data) => {
		console.log(datos);
		res.status(200).send(data);
	})
}
async function removefromSalidaId(req, res) {

	let _id = req.body.Salida_id;
	let partida_id = req.body.partida_id;
	let salida= await Salida.findOne({ _id: _id }).exec();
	let referenciaPedido = salida.referencia;
	if(salida){
		let indexpartida= salida.partidas.findIndex(obj=> (obj.toString() == partida_id)); 
		console.log(indexpartida)
		salida.partidas.splice(indexpartida, 1);
		  
	//	console.log(data);
		var partidaaux= await PartidaModel.findOne({_id:partida_id}).exec();
		let referenciaActual = partidaaux.refpedido;
		//let salida = await Salida.find({partidas: {$in: [partidaaux._id]}});
		
		let referenciaPedidos = partidaaux.referenciaPedidos.filter(pedido => pedido.referenciaPedido !== referenciaPedido);

		let pedidos = referenciaPedidos.map(pedido => pedido.pedido);
		let allElementsAreEquals = false;
		
		for(let i = 0; i < pedidos.length; i++){
			if(pedidos[i] === false){
				break;
			}
			else{
				allElementsAreEquals = true;
			}
		}
		
		if(allElementsAreEquals === true || referenciaPedidos.length === 0){
			partidaaux.CajasPedidas={cajas:0};
			partidaaux.pedido=false;
			partidaaux.refpedido="SIN_ASIGNAR";
			partidaaux.statusPedido="SIN_ASIGNAR";
		}
		//Asignar el pedido actual, si el pedido corresponde con la referencia original
		if(referenciaActual === referenciaPedido && referenciaPedidos.length > 1){
			let referenciaPedidoARemplazar = referenciaPedidos.filter(pedido => pedido.pedido === true);
			partidaaux.refpedido = referenciaPedidoARemplazar[0].referenciaPedido;
			partidaaux.CajasPedidas={cajas:referenciaPedidoARemplazar[0].CajasPedidas.cajas};
		}else{
			partidaaux.referenciaPedidos.pop();
		}       

		partidaaux.referenciaPedidos = referenciaPedidos;
		partidaaux.save();
		 salida.save().then(async(data) => {

			res.status(200).send(data);
			
		})
		.catch((error) => {
			console.log(error);
			res.status(500).send(error);
		}); 
		
	}
}

async function agregarPartidaASalidaId(salida_id, partida_id, embalajes, isPicking = false){


	try{

		let salida= await Salida.findOne({ _id: salida_id }).exec();
		let referenciaPedido = salida.referencia;
		let partidaaux=await PartidaModel.findOne({_id:partida_id}).exec();
		let cajas = embalajes;
		let embalajesCajas = partidaaux.embalajesxSalir.cajas;

		salida.partidas.push(partidaaux._id);
		if(salida.entrada_id.find(x => x == partidaaux.entrada_id) == undefined)
			salida.entrada_id.push(partidaaux.entrada_id)
			let pedidoHold = {
				"referenciaPedido": referenciaPedido,
				"pedido": true,
				"CajasPedidas": {
					
				}
			}

			if(isPicking === false){
				pedidoHold["CajasPedidas"][embalajes] = embalajesCajas;
				partidaaux.CajasPedidas={cajas:parseInt(embalajesCajas)};
			}else{
				pedidoHold["CajasPedidas"].cajas = embalajes;
				partidaaux.CajasPedidas={cajas:parseInt(embalajes)};
			}

			if(partidaaux.referenciaPedidos.length > 0 && isPicking === false){
				let referencia_pedido_a_cambiar = partidaaux.referenciaPedidos[0].referenciaPedido;
				let salida_referencia = await Salida.findOne({referencia:  referencia_pedido_a_cambiar}).exec();
				
				if(salida_referencia){
					
					let indexpartida= salida_referencia.partidas.findIndex(obj=> (obj.toString() == partida_id)); 
					console.log(indexpartida)
					salida_referencia.partidas.splice(indexpartida, 1);
					partidaaux.referenciaPedidos.pop();
					await salida_referencia.save();
				}

			}

			partidaaux.referenciaPedidos.push(pedidoHold);
	    	partidaaux.pedido=true;
	    	partidaaux.refpedido=salida.referencia;
			partidaaux.statusPedido=salida.statusPedido;
			partidaaux.save();

			const saveSalida = await salida.save();

			return saveSalida;

	}catch(error){
		console.log(error);
	}


}


async function agregarPartidaSalidaId(req, res) {
	let _id = req.body.Salida_id;
	let partidas_id = req.body.partidas_id;
	let embalajes = req.body.embalajes;
	let isPicking = req.body.isPicking !== undefined ? req.body.isPicking : false;

	//console.log(_id);
	try{
		let salida= await Salida.findOne({ _id: _id }).exec();
		

		if(isPicking === false){
			await Helper.asyncForEach(partidas_id, async function(partida){
				await agregarPartidaASalidaId(_id, partida, embalajes);
			})
		}else{
			await agregarPartidaASalidaId(_id, partidas_id, req.body.embalajes, isPicking);
		}

		salida.save().then(async (data) => {

			res.status(200).send(data);
		}) 
		 .catch((error) => {
			console.log(error);
			res.status(500).send(error);
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};
}

async function saveDashboard(req, res) {
	try{
	let nSalida = await Salida.findOne({ _id: req.body.id }).exec();
	
	//nSalida.fechaSalida = new Date(req.body.fechaSalida);
	nSalida.usuarioAlta_id= req.body.usuarioAlta_id;
    nSalida.nombreUsuario= req.body.nombreUsuario;
    nSalida.recibio= req.body.recibio;
	nSalida.tipo="NORMAL"
	nSalida.fechaAlta = new Date(Date.now()-(5*3600000));
	let refpedido=nSalida.referencia;
	await nSalida.save().then(async (salida) => {
			for (let itemPartida of req.body.jsonPartidas) {
				await MovimientoInventario.saveSalida(itemPartida, salida.id);
			}

			TiempoCargaDescarga.setStatus(salida.tiempoCarga_id, { salida_id: salida._id, status: "ASIGNADO" });

			let partidas = await Partida.put(req.body.jsonPartidas, salida._id);
			salida.partidas = partidas;

			await saveSalidasEnEntrada(salida.entrada_id, salida._id);
			await Salida.updateOne({ _id: salida._id }, { $set: { partidas: partidas } }).then(async(updated) => {
				let parRes = await PartidaModel.find({'status':'ASIGNADA', 'pedido':true,'referenciaPedidos.referenciaPedido':{$regex: refpedido}}).exec(); 
				await Helper.asyncForEach(parRes,async function (par) {
					
					let referenciaPedidos = par.referenciaPedidos;

					for(let i = 0; i < referenciaPedidos.length; i++){
						if(referenciaPedidos[i].referenciaPedido === refpedido){
							referenciaPedidos[i].pedido = false;
							break;
						}
					}
					let pedidos = referenciaPedidos.map(pedido => pedido.pedido);
					let allElementsAreEquals = false;
					
					for(let i = 0; i < pedidos.length; i++){
						if(pedidos[i].pedido === false){
							break;
						}
						else{
							allElementsAreEquals = true;
						}
					}
					
					if(allElementsAreEquals === true){
						par.pedido=false;
						par.refpedido = "SIN_ASIGNAR",
						par.statusPedido = "SIN_ASIGNAR";
						par.CajasPedidas.cajas = 0;
					}

					par.save(function (err) {
						if (err) return handleError(err);
						// saved!
						console.log("La partida ha sido editada correctamente ", par)
					  });

				})
				res.status(200).send(salida);

			});
		})
		.catch((error) => {
			console.log(error)
			res.status(500).send(error);
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};
	console.log("error");
}

async function getContadoresSalidas(req, res){
	
	
	try {
		let mongoose = require("mongoose");
		const clienteFiscal_id = req.query.idClienteFiscal !== undefined ? req.query.idClienteFiscal : undefined;
		const almacen_id = req.query.idAlmacen !== undefined ? req.query.idAlmacen : undefined;
		const tiposEstadosSalidas = ["NORMAL", "FORPICKING", "FORSHIPPING", "DEVOLUCION", "RECHAZO"];
		
		const contadoresJson = { };

		const contadores = await Salida.aggregate([
			{$match: {"clienteFiscal_id": mongoose.Types.ObjectId(clienteFiscal_id),
					"almacen_id": mongoose.Types.ObjectId(almacen_id)}},
			{$group: {_id: "$tipo", cantidad: {$sum: 1}}}
		]).exec();
	
		if(contadores){


			const tipoContadores = contadores.map(contador => contador._id);

			tiposEstadosSalidas.forEach(tipoSalida =>{

				if(!tipoContadores.includes(tipoSalida)){
					console.log(tipoSalida);
					const tipoSalidaSinExistencia = {
						_id: tipoSalida,
						cantidad: 0
					}
					
				contadores.push(tipoSalidaSinExistencia);
				}

				
			})

			contadores.forEach(contador =>{
				const { _id, cantidad } = contador;

				contadoresJson[_id] = cantidad;

			})
			res.status(200).send(contadoresJson);
		}
		
	} catch (error) {
		res.status(404).send(error);
	}

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
	updateStatusSalidas,
	removefromSalidaId,
	agregarPartidaSalidaId,
	saveDashboard,
	getContadoresSalidas,
	reloadPedidosBabel
}