'use strict'

const MovimientoInventario = require('../models/MovimientoInventario');
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
	nMovimiento.tipo = "SALIDA";
	nMovimiento.posicion = itemPartida.posicion;
	nMovimiento.posicion_id = itemPartida.posicion_id;
	nMovimiento.nivel = itemPartida.nivel;
	nMovimiento.idClienteFiscal = salida.idClienteFiscal;
	nMovimiento.idSucursal = salida.idSucursal;
	nMovimiento.almacen_id = salida.almacen_id;
	nMovimiento.referencia = salida.referencia ? salida.referencia : "";

	await nMovimiento.save()
	.then(async(data)=>{
		await updateExistencia(-1,itemPartida,salida.fechaSalida);
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
	nMovimiento.almacen_id = entrada.almacen_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes= itemPartida.embalajes;
	nMovimiento.pesoBruto = itemPartida.pesoBruto;
	nMovimiento.pesoNeto = itemPartida.pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "ENTRADA";
	nMovimiento.posicion = itemPartida.posicion;
	nMovimiento.posicion_id = itemPartida.posicion_id;
	nMovimiento.nivel = itemPartida.nivel;
	nMovimiento.referencia = entrada.referencia ? entrada.referencia : "";

	await nMovimiento.save()
	.then(async(data)=>{
		await updateExistencia(1,itemPartida,entrada.fechaEntrada);
	})
	.catch((err)=>{
		console.log(err);
	});
}

function saveExistenciaInicial(producto_id, cantidad,cajas,tarimas,pesoBruto,pesoNeto,idClienteFiscal,idSucursal,almacen_id) {
	let nMovimiento = new MovimientoInventario();
	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.embalajes = embalajes;
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL";
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
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

function getByIDs_cte_suc_alm(req, res){
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;


	if(_idClienteFiscal != null && _idSucursal != null && _idAlmacen != null){

		let filtro = {
			clienteFiscal_id:{$in:_arrClientesFiscales},
			idSucursal:_idSucursal,
			almacen_id:_idAlmacen
		};
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
		.catch(err=>console.log(err));

	}
	else{
		res.status(500).send({message:"Error en la petición, parametros incorrectos"});
	}
}


function getByIDs_ctes_suc_alm(req, res){
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;

	if(_arrClientesFiscales != 'null' && _idSucursal != 'null' && _idAlmacen != 'null'){

		MovimientoInventario.find({clienteFiscal_id:{$in:_arrClientesFiscales},idSucursal:_idSucursal,almacen_id:_idAlmacen})
		.populate({
			path:'producto_id'
		})
		.populate({
			path:'clienteFiscal_id'
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
	else{
		res.status(500).send({message:"Error en la petición, parametros incorrectos"});
	}

}


module.exports={
	get,
	getByIDs_cte_suc_alm,
	getByIDs_ctes_suc_alm,
	getByProducto,
	getPosicionesByProducto,
	saveSalida,
	saveEntrada,
	saveExistenciaInicial
}
//linea 169