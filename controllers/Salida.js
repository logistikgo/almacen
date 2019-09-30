'use strict'

const Salida = require('../models/Salida');
const Partida = require('../controllers/Partida');
const PartidaModel = require('../models/Partida');
const Entrada = require('../models/Entrada');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const Helper = require('../helpers');
const PrePartidaM = require("../models/PrePartida");
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');

function getNextID(){
	return Helper.getNextID(Salida,"salida_id");
}

function get(req,res) {
	Salida.find({})
	.then((salidas)=>{
		res.status(200).send(salidas);
	})
	.catch(error=>console.log(error));
}

function getSalidasByIDs(req,res){
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;

	let filter = {
		clienteFiscal_id: _idClienteFiscal,
		sucursal_id:_idSucursal,
		almacen_id:_idAlmacen,
		tipo:_tipo
	};

	Salida.find(filter).sort({fechaSalida:-1})
	.then((salidas)=>{
		res.status(200).send(salidas);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function getByID(req,res) {
	let _salida_id = req.params.salida_id;

	Salida.findOne({_id:_salida_id})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	})
	.populate({
		path:'clienteFiscal_id',
		model:'ClienteFiscal'
	})		
	.then((data)=>{
		res.status(200).send(data);
	})
	.catch(error=>res.status(500).send(error));
}


async function save(req, res) {
	let nSalida = new Salida(req.body);
	nSalida.fechaAlta = new Date();
	nSalida.fechaSalida = new Date(req.body.fechaSalida);
	nSalida.salida_id = await getNextID();
	nSalida.folio = await getNextID();
	nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio,nSalida.clienteFiscal_id,'O');

	nSalida.save()
	.then(async(salida)=>{
		for(let itemPartida of req.body.jsonPartidas){
			await MovimientoInventario.saveSalida(itemPartida,salida.id);
		}
		
		let partidas = await Partida.put(req.body.jsonPartidas,salida._id);
		salida.partidas = partidas;
		console.log(partidas);
		await saveSalidasEnEntrada(salida.entrada_id,salida._id);
		await Salida.updateOne({_id: salida._id},{$set:{partidas:partidas}}).then((updated)=>{			
			res.status(200).send(salida);
		});
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}


function isEmptyPartida(partida){
	let contEmbalajesCero = 0;
	let tamEmbalajes = 0;
	let isPesosEmpty = false;
	let isEmbalajesEmpty = false;

	for(let embalaje in partida.embalajes){tamEmbalajes+=1;} //Se obtiene la cantidad de embalajes
	for(let embalaje in partida.embalajes){  //Obtiene la cantidad de embalajes con cero
		if(partida.embalajes[embalaje]==0) contEmbalajesCero+=1; 
	}

	if(partida.pesoBruto == 0 && partida.pesoNeto == 0) 
		isPesosEmpty = true;
	else
		isPesosEmpty = false;
	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if(tamEmbalajes == contEmbalajesCero) 
		isEmbalajesEmpty = true; 
	else
		isEmbalajesEmpty = false;

	if(isEmbalajesEmpty && isPesosEmpty)
		return true;
	else
		return false;

}

function isEmptyPartidas(partidas){
	let tamPartidas = partidas.length;
	let conPartidasCero = 0;

	partidas.forEach(function(partida){
		if(isEmptyPartida(partida)) conPartidasCero+=1; //Obtiene la cantidad de partidas en cero
	});

	if (tamPartidas == conPartidasCero) //Si el total de partidas es igual al total de partidas con cero
		return true;
	else
		return false;
}

async function updatePartidasSalidaAPI(req,res){
	let entrada_id = req.body.entrada_id;
	let partidasDeSalida = req.body.partidasDeSalida;
	
	//console.log(entrada_id);
	//console.log(partidasDeSalida);
	let entrada = await Entrada.findOne({_id:entrada_id}).exec();
	let nuevasPartidas = [];
	//console.log(partidasDeSalida);
	entrada.partidasSalida.forEach(function(partidaDeEntrada){
		let partidaEncontrada = partidasDeSalida.find(x=>x._id.toString()==partidaDeEntrada._id.toString());
		if(partidaEncontrada!=undefined){
			for(let embalajeDeSalida in partidaEncontrada.embalajes){
				if(partidaDeEntrada.embalajes[embalajeDeSalida]){
					partidaDeEntrada.embalajes[embalajeDeSalida]-= partidaEncontrada.embalajes[embalajeDeSalida];
				}
			}
			partidaDeEntrada.pesoBruto-=partidaEncontrada.pesoBruto;
			partidaDeEntrada.pesoNeto-=partidaEncontrada.pesoNeto;

			if(isEmptyPartida(partidaDeEntrada)) 
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
		isEmpty:empty
	};

	Entrada.updateOne({_id:entrada_id},{$set:jEdit})
	.then((data)=>{
		res.status(200).send(data);
		
	}).catch((error)=>{
		res.status(500).send(error);
	});
	

}

async function saveSalidasEnEntrada(entrada_id,salida_id){
	
	let entradas = await Entrada.find({_id:{$in:entrada_id}}).exec();
	console.log("ENTRADAS ENCONTRADAS DEL ARREGLO");
	console.log(entrada_id);
	Helper.asyncForEach(entradas,async function(entrada){
		entrada.salidas_id.push(salida_id);
		let jEdit = {
			salidas_id:entrada.salidas_id
		};

		await Entrada.updateOne({_id : entrada._id},{$set:jEdit}).exec();
	});
	
}

async function saveSalidaAutomatica(req,res){
	
	let partidas = await PartidaModel.find({'InfoPedidos.IDPedido' : {$in : req.body.arrIDPedidos}}).lean().exec();
	//console.log(partidas);
	if(partidas && partidas.length>0){
		let entradas_id = partidas.map(x=> x.entrada_id.toString()).filter(Helper.distinct);
		let entradas = await Entrada.find({"_id": {$in : entradas_id } });
		
		//ACTUALIZACION PARTIDA INICIO
		//Englobar este codigo en una funcion del controller de la partida
		
		await Helper.asyncForEach(partidas,async function(partida){
			let infoPedidosActual = partida.InfoPedidos.filter(x=> req.body.arrIDPedidos.includes(x.IDPedido) && x.status == "PENDIENTE");
			
			//Se debera sumar la cantidad
			let embalajesTotales = {};
			let embalajesxPosicion = [];
			infoPedidosActual.forEach(function(infoPedido){
				infoPedido.status = "COMPLETO";
				embalajesxPosicion = embalajesxPosicion.concat(infoPedido.embalajesEnSalidasxPosicion);
				for(let x in infoPedido.embalajes){
					if(embalajesTotales[x] == undefined) embalajesTotales[x] = 0;
					embalajesTotales[x] += infoPedido.embalajes[x];
				}
			});
			//y se deberan unificar las posiciones
			let ubicacionesDistintas = [];
			let posicionesDistintas = [];
			embalajesxPosicion.forEach(function(element){
				element.ubicacion = element.pasillo + element.posicion + element.nivel;
				ubicacionesDistintas.push(element.ubicacion);
				ubicacionesDistintas = ubicacionesDistintas.filter(Helper.distinct);
			});

			ubicacionesDistintas.forEach(function(ubicacion){
				let posiciones = embalajesxPosicion.filter(x=> x.ubicacion.toString() == ubicacion);
				let posicionFinal = {
					embalajes: {},
					posicion_id: posiciones[0].posicion_id,
					posicion: posiciones[0].posicion,
					pasillo_id : posiciones[0].pasillo_id,
					pasillo:posiciones[0].pasillo,
					nivel_id: posiciones[0].nivel_id,
					nivel:posiciones[0].nivel_id
				};
				posiciones.forEach(function(posicion){
					for(let x in posicion.embalajes){
						if(posicionFinal.embalajes[x] == undefined) posicionFinal.embalajes[x] = 0;
						posicionFinal.embalajes[x] += posicion.embalajes[x];
					}
				});
				posicionesDistintas.push(posicionFinal);
			});
			let  salida_id = {
				salida_id : "_id",
				embalajes: embalajesTotales,
				salidaxPosiciones : posicionesDistintas
			};
			partida.salidas_id.push(salida_id);

			//Actualiza embalajesAlmacen
			for(let x in partida.embalajesAlmacen){
				partida.embalajesAlmacen[x] -= embalajesTotales[x];
			}
			let PartidaFound = await PartidaModel.findOne({_id : partida._id}).exec();
			
			if(Helper.Compare(partida.embalajesxSalir,partida.embalajesAlmacen)){
				delete partida.embalajesAlmacen;
				PartidaFound.embalajesAlmacen = undefined;
			} 
			PartidaFound.salidas_id = partida.salidas_id;
			PartidaFound.InfoPedidos = partida.InfoPedidos;
			console.log(PartidaFound);
			await PartidaFound.save();
			
		});

		//ACTUALIZACION PARTIDA FIN
		
		//console.log(infoPedidos);
		if((entradas && entradas.length > 0)){

			let nSalida = new Salida();
			nSalida.salida_id = await getNextID();
			nSalida.fechaAlta = new Date();
			nSalida.fechaSalida = new Date(req.body.fechaSalida);
			nSalida.usuarioAlta_id = req.body.usuarioAlta_id;
			nSalida.nombreUsuario = req.body.nombreUsuario;
			nSalida.folio = await getNextID();
			nSalida.partidas = partidas.map(x=> x._id);
			nSalida.transportista = req.body.transportista;
			nSalida.placasRemolque = req.body.placasRemolque;
			nSalida.placasTrailer = req.body.placasTrailer;
			nSalida.operador = req.body.operador;
			nSalida.entrada_id = entradas_id;

			//console.log(nSalida);
			
			// nSalida.idClienteFiscal = entrada.idClienteFiscal;
			// nSalida.idSucursal = entrada.idSucursal;
			// nSalida.sucursal_id = entrada.sucursal_id;
			// nSalida.almacen_id = entrada.almacen_id;
			// nSalida.embarco = req.body.embarco;
			// nSalida.referencia = entrada.referencia;
			// nSalida.valor = entrada.valor;
			// nSalida.clienteFiscal_id = entrada.clienteFiscal_id;
			// nSalida.item = entrada.item;
			// nSalida.tipo = entrada.tipo;//NORMAL
			

			
			// nSalida.save()
			// .then(async(salida)=>{
			// 	for(let itemPartida of salida.partidas){
			// 			await MovimientoInventario.saveSalida(itemPartida,salida.id);
			// 	}
			// 	await saveSalidasEnEntrada(salida.entrada_id,salida._id);
			// 	res.status(200).send(salida);
			// })
			// .catch((error)=>{
			// 	res.status(500).send(error);
			// });

			res.status(200).send(partidas);
		}else
		{
			res.status(400).send("Se trata de generar una salida sin entrada o esta vacia");
		}
		
	}else
	{
		res.status(400).send("Se trata de generar una salida sin partidas");
	}
}



function getPartidasDeEntrada(partidasDeEntrada,partidasDeSalida){
	let IDSPartida = partidasDeSalida.map(x=> x._id.toString());
	
	let partidas = [];
	partidasDeEntrada.forEach(function(partidaDeEntrada){
	
		if(IDSPartida.includes(partidaDeEntrada._id.toString()) && !partidaDeEntrada.isEmpty){
			partidas.push(partidaDeEntrada);
		}
	});
	return partidas;
}



module.exports = {
	get, 
	getByID,
	save,
	getSalidasByIDs,
	saveSalidaAutomatica,
	updatePartidasSalidaAPI
}