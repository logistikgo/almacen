'use strict'

const Salida = require('../models/Salida');
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
		idSucursal:_idSucursal,
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
	console.log('SAVE');

	let nSalida = new Salida();
	nSalida.salida_id = await getNextID();
	nSalida.fechaAlta = new Date();
	nSalida.fechaSalida = new Date(req.body.fechaSalida);
	nSalida.usuarioAlta_id = req.body.usuarioAlta_id;
	nSalida.nombreUsuario = req.body.nombreUsuario;
	nSalida.folio = await getNextID();
	nSalida.partidas = req.body.partidas;	
	nSalida.transportista = req.body.transportista;
	nSalida.placasRemolque = req.body.placasRemolque;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.operador = req.body.operador;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.idClienteFiscal = req.body.idClienteFiscal;
	nSalida.idSucursal = req.body.idSucursal;
	nSalida.sucursal_id = req.body.sucursal_id;
	nSalida.almacen_id = req.body.idAlmacen;
	nSalida.embarco = req.body.embarco;
	nSalida.referencia = req.body.referencia;
	nSalida.valor = req.body.valor;
	nSalida.clienteFiscal_id = req.body.clienteFiscal_id;
	nSalida.item = req.body.item;
	nSalida.tipo = req.body.tipo;
	nSalida.entrada_id = req.body.entrada_id;

	await updatePartidasSalida(nSalida.entrada_id,nSalida.partidas);

	nSalida.save()
	.then(async(salida)=>{
		for(let itemPartida of salida.partidas){
				await MovimientoInventario.saveSalida(itemPartida,salida.id);
		}
		await saveSalidasEnEntrada(salida.entrada_id,salida._id);
		res.status(200).send(salida);
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
	console.log("SE EJECUTA LA FUNCION DE UPDATE PARA LA PARTIDA (API)");
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
		console.log("SE EDITA LA ENTRADA (API)");
	}).catch((error)=>{
		res.status(500).send(error);
	});
	console.log("SE TERMINA LA FUNCION DE UPDATE PARA LA PARTIDA (API)");

}

async function updatePartidasSalida(entrada_id,partidasDeSalida){
	let entrada = await Entrada.findOne({_id:entrada_id}).exec();
	let nuevasPartidas = [];
	console.log("SE EJECUTA LA FUNCION DE UPDATE PARA LA PARTIDA");
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
		console.log("SE EDITA LA ENTRADA");
	}).catch((error)=>{

	});
	console.log("SE EJECUTA LA FUNCION DE UPDATE PARA LA PARTIDA");
}

async function saveSalidasEnEntrada(entrada_id,salida_id){
	let entrada = await Entrada.findOne({_id:entrada_id}).exec();
	entrada.salidas_id.push(salida_id);

	let jEdit = {
		salidas_id:entrada.salidas_id
	};

	Entrada.updateOne({_id:entrada_id},{$set:jEdit})
	.then((data)=>{

	}).catch((error)=>{

	});
}

async function saveSalidaAutomatica(req,res){
	let bodyParams = req.body;
	let arrIDPedido = bodyParams.arrIDPedido;
	let partidas = await PrePartidaM.find({IDPedido:{$in:arrIDPedido}}).exec();
	//console.log(partidas);
	if(partidas && partidas.length>0){
		let entrada = await Entrada.findOne({"partidas._id":partidas[0]._id});
		let entrada1 = await Entrada.findOne({"partidas.clave_partida":partidas[0].clave_partida});
		//console.log(entrada);
		//console.log(entrada1);
		if((entrada && !entrada.isEmpty) || (entrada1 && !entrada1.isEmpty)){
			
			let nSalida = new Salida();
			nSalida.salida_id = await getNextID();
			nSalida.fechaAlta = new Date();
			nSalida.fechaSalida = new Date(req.body.fechaSalida);
			nSalida.usuarioAlta_id = req.body.usuarioAlta_id;
			nSalida.nombreUsuario = req.body.nombreUsuario;
			nSalida.folio = await getNextID();
			nSalida.partidas = getPartidasDeEntrada(entrada.partidasSalida,partidas);	
			nSalida.transportista = req.body.transportista;
			nSalida.placasRemolque = req.body.placasRemolque;
			nSalida.placasTrailer = req.body.placasTrailer;
			nSalida.operador = req.body.operador;
			
			nSalida.idClienteFiscal = entrada.idClienteFiscal;
			nSalida.idSucursal = entrada.idSucursal;
			nSalida.sucursal_id = entrada.sucursal_id;
			nSalida.almacen_id = entrada.almacen_id;
			nSalida.embarco = req.body.embarco;
			nSalida.referencia = entrada.referencia;
			nSalida.valor = entrada.valor;
			nSalida.clienteFiscal_id = entrada.clienteFiscal_id;
			nSalida.item = entrada.item;
			nSalida.tipo = entrada.tipo;//NORMAL
			nSalida.entrada_id = entrada._id;

			
			if(!partidas[0].isSeleccionada){

				console.log("No deberia entrar aqui joven");
				await updatePartidasSalida(nSalida.entrada_id,nSalida.partidas);
			}
			

			nSalida.save()
			.then(async(salida)=>{
				for(let itemPartida of salida.partidas){
						await MovimientoInventario.saveSalida(itemPartida,salida.id);
				}
				await saveSalidasEnEntrada(salida.entrada_id,salida._id);
				res.status(200).send(salida);
			})
			.catch((error)=>{
				res.status(500).send(error);
			});

			
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