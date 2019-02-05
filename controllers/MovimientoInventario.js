'use strict'

const MovimientoInventario = require('../models/MovimientoInventario');
const Posicion = require('../models/Posicion');
const Producto = require('../models/Producto');
const Entrada = require('../models/Entrada');
const Salida = require('../models/Salida');

async function saveSalida(itemPartida,salida_id) {
	let nMovimiento = new MovimientoInventario();

	let salida = await Salida.findOne({_id:salida_id}).exec();

	nMovimiento.producto_id = itemPartida.producto_id;
	nMovimiento.salida_id = salida_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.pesoBruto = itemPartida.pesoBruto;
	nMovimiento.pesoNeto = itemPartida.pesoNeto;
	nMovimiento.embalajes = itemPartida.embalajes;
	nMovimiento.signo = -1;
	if(salida.tipo!="RECHAZO"){
		nMovimiento.tipo = "SALIDA";
	}else{
		nMovimiento.tipo = "SALIDA_RECHAZO"
	}
	nMovimiento.pasillo = itemPartida.pasillo;
	nMovimiento.pasillo_id = itemPartida.pasillo_id;
	nMovimiento.posicion = itemPartida.posicion;
	nMovimiento.posicion_id = itemPartida.posicion_id;
	nMovimiento.nivel = itemPartida.nivel;
	nMovimiento.idClienteFiscal = salida.idClienteFiscal;
	nMovimiento.clienteFiscal_id = salida.clienteFiscal_id;
	nMovimiento.idSucursal = salida.idSucursal;
	nMovimiento.sucursal_id = salida.sucursal_id;
	nMovimiento.almacen_id = salida.almacen_id;
	nMovimiento.referencia = salida.referencia ? salida.referencia : "";

	await updateExistenciaPosicion(-1, itemPartida);

	await nMovimiento.save()
	.then(async(movimiento)=>{
		if(salida.tipo!="RECHAZO"){
			await updateExistencia(-1,itemPartida,salida.fechaSalida);
		}else{
			await updateExistenciaRechazo(-1,itemPartida,salida.fechaSalida);
		}
		
	})
	.catch((err)=>{
		console.log(err);
	})
}

async function saveEntrada(itemPartida,entrada_id) {
	let nMovimiento = new MovimientoInventario();

	let entrada = await Entrada.findOne({_id:entrada_id}).exec();

	nMovimiento.producto_id = itemPartida.producto_id;
	nMovimiento.entrada_id = entrada_id;
	nMovimiento.idClienteFiscal = entrada.idClienteFiscal;
	nMovimiento.clienteFiscal_id = entrada.clienteFiscal_id;
	nMovimiento.idSucursal = entrada.idSucursal;
	nMovimiento.sucursal_id = entrada.sucursal_id;
	nMovimiento.almacen_id = entrada.almacen_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes= itemPartida.embalajes;
	nMovimiento.pesoBruto = itemPartida.pesoBruto;
	nMovimiento.pesoNeto = itemPartida.pesoNeto;
	nMovimiento.signo = 1;
	if(entrada.tipo!="RECHAZO"){
		nMovimiento.tipo = "ENTRADA";
	}else{
		nMovimiento.tipo = "ENTRADA_RECHAZO"
	}
	nMovimiento.pasillo = itemPartida.pasillo;
	nMovimiento.pasillo_id = itemPartida.pasillo_id;
	nMovimiento.posicion = itemPartida.posicion;
	nMovimiento.posicion_id = itemPartida.posicion_id;
	nMovimiento.nivel = itemPartida.nivel;
	nMovimiento.referencia = entrada.referencia ? entrada.referencia : "";

	await updateExistenciaPosicion(1, itemPartida);

	await nMovimiento.save()
	.then(async(movimiento)=>{
		if(entrada.tipo!="RECHAZO"){
			await updateExistencia(1,itemPartida,entrada.fechaEntrada);
		}else{
			await updateExistenciaRechazo(1,itemPartida,entrada.fechaEntrada);
		}
		
	})
	.catch((err)=>{
		console.log(err);
	});
}

async function saveAjuste(req, res) {
	let bodyParams = req.body;
	console.log(bodyParams);
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = bodyParams.producto_id;
	nMovimiento.idClienteFiscal = bodyParams.idClienteFiscal;
	nMovimiento.sucursal_id = bodyParams.sucursal_id;
	nMovimiento.almacen_id = bodyParams.almacen_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes= bodyParams.embalajes;
	nMovimiento.pesoBruto = bodyParams.pesoBruto;
	nMovimiento.pesoNeto = bodyParams.pesoNeto;
	nMovimiento.signo = bodyParams.signo;
	nMovimiento.tipo = "AJUSTE";
	nMovimiento.posicion = bodyParams.posicion;
	nMovimiento.posicion_id = bodyParams.posicion_id;
	nMovimiento.nivel = bodyParams.nivel;

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
	.then(async(movimiento)=>{
		await updateExistencia(bodyParams.signo, item, nMovimiento.fechaMovimiento);
		res.status(200).send(movimiento);
	})
	.catch((err)=>{
		console.log(err);
		res.status(500).send(err);
	});
}

function saveExistenciaInicial(producto_id, embalajes, pesoBruto,pesoNeto,idClienteFiscal,clienteFiscal_id,sucursal_id,almacen_id) {
	let nMovimiento = new MovimientoInventario();
	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = embalajes;
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL";
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.clienteFiscal_id = clienteFiscal_id;
	nMovimiento.sucursal_id = sucursal_id;
	nMovimiento.almacen_id = almacen_id;

	nMovimiento.save();
}


async function updateExistencia(signo,itemPartida,fechaMovimiento) {
	let producto = await Producto.findOne({_id:itemPartida.producto_id}).exec();
	if(itemPartida.embalajes){
		for(let embajalePartida in itemPartida.embalajes){
			
			if(producto.embalajes[embajalePartida]){
				producto.embalajes[embajalePartida] += (signo*itemPartida.embalajes[embajalePartida]);
			}else if(signo>0){
				producto.embalajes[embajalePartida] = (signo*itemPartida.embalajes[embajalePartida]);
			}
			
		}
	}

	producto.valor += (signo*itemPartida.valor);
	producto.existenciaPesoNeto +=(signo*itemPartida.pesoNeto);
	producto.existenciaPesoBruto +=(signo*itemPartida.pesoBruto);

	if(signo == 1){
		producto.fechaUltimaEntrada = new Date(fechaMovimiento);
	}
	else{
		producto.fechaUltimaSalida = new Date(fechaMovimiento);
	}

	let item = {
		embalajes:producto.embalajes,
		valor:producto.valor,
		fechaUltimaEntrada:producto.fechaUltimaEntrada,
		fechaUltimaSalida:producto.fechaUltimaSalida,
		existenciaPesoBruto:producto.existenciaPesoBruto,
		existenciaPesoNeto:producto.existenciaPesoNeto
	};

	producto.save();

	await Producto.updateOne({_id:itemPartida.producto_id},{$set:item})
	.then((productoUpdated)=>{

	})
	.catch((err)=>{
		
	});
}

async function updateExistenciaPosicion(signo, itemPartida){
	let posicion = await Posicion.findOne({_id:itemPartida.posicion_id}).exec();
	let nivel = posicion.niveles.find(x=>x.nombre==itemPartida.nivel);
	
	if(nivel.productos.length > 0 && nivel.productos.find(x=>x.producto_id.toString() == itemPartida.producto_id.toString()) != undefined){
		let producto = nivel.productos.find(x=>x.producto_id.toString() == itemPartida.producto_id.toString());
		let flagEmbalajes = 0;

		for(let embalaje in itemPartida.embalajes){
			if(producto.embalajes[embalaje] == undefined){
				producto.embalajes[embalaje] = 0;
			}
			producto.embalajes[embalaje] += (signo * itemPartida.embalajes[embalaje]);

			flagEmbalajes = producto.embalajes[embalaje] > 0 ? flagEmbalajes++ : flagEmbalajes;
		}
		if(producto.pesoBruto == undefined){
			producto.pesoBruto = 0;
		}
		producto.pesoBruto += (signo * itemPartida.pesoBruto);
		if(producto.pesoNeto == undefined){
			producto.pesoNeto = 0;
		}
		producto.pesoNeto += (signo * itemPartida.pesoNeto);

		if(producto.pesoBruto == 0 && producto.pesoNeto == 0 && flagEmbalajes == 0){
			// let index = posicion.niveles.productos.indexOf(producto);
			// posicion.niveles.productos.splice(index, 1);
		}
	}
	else{
		nivel.productos.push({
			producto_id: itemPartida.producto_id,
			embalajes: itemPartida.embalajes,
			pesoBruto: itemPartida.pesoBruto,
			pesoNeto: itemPartida.pesoNeto,
		});
	}

	let item={
		niveles: posicion.niveles
	};

	await Posicion.updateOne({_id:itemPartida.posicion_id},{$set:item});
}

async function updateExistenciaRechazo(signo,itemPartida,fechaMovimiento) {
	let producto = await Producto.findOne({_id:itemPartida.producto_id}).exec();
	if(itemPartida.embalajes){
		for(let embajalePartida in itemPartida.embalajes){
			
			if(producto.embalajesRechazo[embajalePartida]){
				producto.embalajesRechazo[embajalePartida] += (signo*itemPartida.embalajes[embajalePartida]);
			}else if(signo>0){
				producto.embalajesRechazo[embajalePartida] = (signo*itemPartida.embalajes[embajalePartida]);
			}
			
		}
	}
	
	producto.pesoNetoRechazo +=(signo*itemPartida.pesoNeto);
	producto.pesoBrutoRechazo +=(signo*itemPartida.pesoBruto);

	if(signo == 1){
		producto.fechaUltimaEntradaRechazo = new Date(fechaMovimiento);
	}
	else{
		producto.fechaUltimaSalidaRechazo = new Date(fechaMovimiento);
	}

	let item = {
		embalajesRechazo:producto.embalajesRechazo,
		fechaUltimaEntradaRechazo:producto.fechaUltimaEntradaRechazo,
		fechaUltimaSalidaRechazo:producto.fechaUltimaSalidaRechazo,
		pesoBrutoRechazo:producto.pesoBrutoRechazo,
		pesoNetoRechazo:producto.pesoNetoRechazo
	};

	producto.save();

	await Producto.updateOne({_id:itemPartida.producto_id},{$set:item})
	.then((productoUpdated)=>{

	})
	.catch((err)=>{
		
	});
}

function getByProducto(req, res){
	let _producto_id = req.query.producto_id;
	let _arrTipo = req.query.arrTipo;
	
	MovimientoInventario.find({producto_id:_producto_id,tipo:{$in:_arrTipo}}).sort({fechaMovimiento: -1})
	.populate({
		path:'producto_id'
	})
	.populate({
		path:'entrada_id'
	})
	.populate({
		path:'salida_id'
	})
	.populate({
		path:'posicion_id'
	})
	.then((movimientos)=>{
		res.status(200).send(movimientos);
	})
	.catch(err=>console.log(err));
}

function getPosicionesByProducto(req, res){
	let _producto_id = req.query.producto_id;
	let _almacen_id = req.query.almacen_id;

	MovimientoInventario.find({
		producto_id:_producto_id, 
		almacen_id: _almacen_id, 
		tipo:{$in:["ENTRADA","ENTRADA_RECHAZO"]}
	},{posicion_id:""})
	.populate({
		path:'posicion_id'
	})
	.then((posiciones)=>{
		posiciones = Array.from(new Set(posiciones.map(x=>x.posicion_id)));
		res.status(200).send(posiciones);
	})
	.catch(err=>console.log(err));
}

function get(req, res){

	MovimientoInventario.find({})
	.populate({
		path:'producto_id'
	})
	.populate({
		path:'entrada_id'
	})
	.populate({
		path:'salida_id'
	})
	.populate({
		path:'almacen_id'
	})
	.populate({
		path:'posicion_id'
	})
	.then((movimientos)=>{
		res.status(200).send(movimientos);
	})
	.catch(err=>console.log(err));
}

async function getByIDs_cte_suc_alm(req, res){
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let fechaI = req.query.fechaInicio;
	let fechaF = req.query.fechaFinal;
	let tipo = req.query.tipo;
	
	let boolNull = !_arrClientesFiscales.includes(null) && !_arrSucursales.includes(null) && !_arrAlmacenes.includes(null);
	let boolEmtpy = !_arrClientesFiscales.includes("") && !_arrSucursales.includes("") && !_arrAlmacenes.includes("");

	if(boolEmtpy && boolNull){

		let filtro = {
			clienteFiscal_id:{$in:_arrClientesFiscales},
			sucursal_id:{$in:_arrSucursales},
			almacen_id:{$in:_arrAlmacenes},
			tipo:{$nin:["EXISTENCIA_INICIAL","SALIDA_RECHAZO","ENTRADA_RECHAZO"]}
		};
		if(tipo!=null && tipo!="TODOS"){
			filtro["tipo"] = tipo;
		}
		let filtroEntrada = {
			clienteFiscal_id:{$in:_arrClientesFiscales},
			sucursal_id:{$in:_arrSucursales},
			almacen_id:{$in:_arrAlmacenes}
		};
		let filtroSalida = {
			clienteFiscal_id:{$in:_arrClientesFiscales},
			sucursal_id:{$in:_arrSucursales},
			almacen_id:{$in:_arrAlmacenes}
		};
		if(fechaI!=null && fechaI!=fechaF){
			let rango = {
				$gte:new Date(fechaI), //grater than
				$lt:new Date(fechaF) //less than
			};
			filtroEntrada["fechaEntrada"] = rango;
			filtroSalida["fechaSalida"] = rango;
			
			let entradas = await Entrada.find(filtroEntrada).exec();
			let salidas = await Salida.find(filtroSalida).exec();
			

			let arrEntradas = entradas.map(x=>x._id);
			let arrSalidas = salidas.map(x=>x._id);
			

			if(tipo == "ENTRADA"){
				filtro = {
					entrada_id:{$in:arrEntradas}
				};
			}else if(tipo == "SALIDA"){
				filtro = {
					salida_id:{$in:arrSalidas}
				};
			}else{
				filtro = {
					$or:[
					{entrada_id:{$in:arrEntradas}},
					{salida_id:{$in:arrSalidas}}
					]
				};
			}
		}
		
		MovimientoInventario.find(filtro)
		.populate({
			path:'producto_id'
		})
		.populate({
			path:'entrada_id'
		})
		.populate({
			path:'salida_id'
		})
		.populate({
			path:'almacen_id'
		})
		.populate({
			path:'clienteFiscal_id'
		})
		.populate({
			path:'posicion_id'
		})
		.then((movimientos)=>{
			res.status(200).send(movimientos);
		})
		.catch((err)=>{
			res.status(500).send(err);
		});

	}
}

module.exports={
	get,
	getByIDs_cte_suc_alm,
	getByProducto,
	getPosicionesByProducto,
	saveSalida,
	saveEntrada,
	saveAjuste,
	saveExistenciaInicial,
	updateExistenciaPosicion
}