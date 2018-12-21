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
	nMovimiento.posicion = itemPartida.posicion;
	nMovimiento.posicion_id = itemPartida.posicion_id;
	nMovimiento.nivel = itemPartida.nivel;
	nMovimiento.idClienteFiscal = salida.idClienteFiscal;
	nMovimiento.idSucursal = salida.idSucursal;
	nMovimiento.sucursal_id = salida.sucursal_id;
	nMovimiento.almacen_id = salida.almacen_id;
	nMovimiento.referencia = salida.referencia ? salida.referencia : "";

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
	nMovimiento.posicion = itemPartida.posicion;
	nMovimiento.posicion_id = itemPartida.posicion_id;
	nMovimiento.nivel = itemPartida.nivel;
	nMovimiento.referencia = entrada.referencia ? entrada.referencia : "";

	let posicion = await Posicion.findOne({_id:itemPartida.posicion_id}).exec();
	console.log(posicion);
	posicion = posicion.find(x=>x.nombre==itemPartida.nivel);
	console.log(posicion);
	if(posicion.productos.find(x=>x.producto_id == itemPartida.producto_id)){
		for(let embalaje in itemPartida.embalajes){
			posicion.productos.embalajes[embalaje] += itemPartida.embalajes[embalaje];
		}
	}
	else{
		posicion.productos.embalajes.push({
			producto_id: itemPartida.producto_id,
			embalajes: itemPartida.embalajes
		});
	}
	console.log(posicion);
	posicion.save();

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

function saveExistenciaInicial(producto_id, embalajes, pesoBruto,pesoNeto,idClienteFiscal,sucursal_id,almacen_id) {
	let nMovimiento = new MovimientoInventario();
	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = embalajes;
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL";
	nMovimiento.idClienteFiscal = idClienteFiscal;
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
	let _producto_id = req.params.producto_id;

	MovimientoInventario.find({producto_id:_producto_id})
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
	let _producto_id = req.params.producto_id;

	MovimientoInventario.find({producto_id:_producto_id, tipo:"ENTRADA"}, {posicion_id:""})
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
			idSucursal:{$in:_arrSucursales},
			almacen_id:{$in:_arrAlmacenes}
		};
		if(tipo!=null && tipo!="TODOS"){
			filtro["tipo"] = tipo;
		}
		let filtroEntrada = {
			clienteFiscal_id:{$in:_arrClientesFiscales},
			idSucursal:{$in:_arrSucursales},
			almacen_id:{$in:_arrAlmacenes}
		};
		let filtroSalida = {
			clienteFiscal_id:{$in:_arrClientesFiscales},
			idSucursal:{$in:_arrSucursales},
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
	saveExistenciaInicial
}