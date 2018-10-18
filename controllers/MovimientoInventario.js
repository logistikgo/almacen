'use strict'

const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');

function saveSalida(producto_id, salida_id, cantidad,cajas,tarimas,pesoBruto,pesoNeto,idClienteFiscal,idSucursal,almacen_id) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.salida_id = salida_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.cajas = cajas;
	nMovimiento.tarimas = tarimas;	
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = -1;
	nMovimiento.tipo = "SALIDA";
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
	nMovimiento.almacen_id = almacen_id;

	nMovimiento.save()
	.then((data)=>{
		updateExistencia(producto_id,nMovimiento.signo,cantidad,tarimas,cajas,pesoBruto,pesoNeto);
	})
	.catch((err)=>{
		console.log(err);
	})
}

async function saveEntrada(producto_id, entrada_id, cantidad, cajas, tarimas,pesoBruto,pesoNeto, idClienteFiscal, idSucursal, almacen_id, posicion, nivel) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.entrada_id = entrada_id;
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
	nMovimiento.almacen_id = almacen_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.cajas = cajas;
	nMovimiento.tarimas = tarimas;
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "ENTRADA";
	nMovimiento.posicion = posicion;
	nMovimiento.nivel = nivel;

	await nMovimiento.save()
	.then(async(data)=>{
		await updateExistencia(producto_id,nMovimiento.signo,cantidad,tarimas,cajas,pesoBruto,pesoNeto);
	})
	.catch((err)=>{
		console.log(err);
	})
}

function saveExistenciaInicial(producto_id, cantidad,cajas,tarimas,pesoBruto,pesoNeto,idClienteFiscal,idSucursal,almacen_id) {
	let nMovimiento = new MovimientoInventario();
	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.tarimas = tarimas;
	nMovimiento.cajas = cajas;
	nMovimiento.pesoBruto = pesoBruto;
	nMovimiento.pesoNeto = pesoNeto;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL";
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
	nMovimiento.almacen_id = almacen_id;

	nMovimiento.save();
}

async function updateExistencia(producto_id, signo, cantidad,cantidadTarimas,cantidadCajas,cantidadPesoBruto,cantidadPesoNeto) {
	let existencia;
	let existenciaTarimas;
	let existenciaCajas;
	let existenciaPesoBruto;
	let existenciaPesoNeto;	
	let producto = await Producto.findOne({_id:producto_id}).exec();

	producto.existencia += (signo*cantidad);
	producto.existenciaTarimas += (signo*cantidadTarimas);
	producto.existenciaCajas += (signo*cantidadCajas);
	producto.existenciaPesoBruto += (signo*cantidadPesoBruto);
	producto.existenciaPesoNeto += (signo*cantidadPesoNeto);

	await producto.save();
	

	/*Producto.findOne({_id:producto_id})
	.then((producto)=>{
		
		producto.existencia += (signo*cantidad);
		producto.existenciaTarimas += (signo*cantidadTarimas);
		producto.existenciaCajas += (signo*cantidadCajas);
		producto.existenciaPesoBruto += (signo*cantidadPesoBruto);
		producto.existenciaPesoNeto += (signo*cantidadPesoNeto);

		console.log(producto.existencia);
		if(signo == 1){
			producto.fechaUltimaEntrada = new Date();
		}
		else{
			producto.fechaUltimaSalida = new Date();
		}

		//producto.save()

		//.then(()=>{})
		//.catch(err=>console.log(err));

	});*/

	
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
	.then((movimientos)=>{
		res.status(200).send(movimientos);
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
	.then((movimientos)=>{
		res.status(200).send(movimientos);
	})
	.catch(err=>console.log(err));
}

function getByIDs_cte_suc_alm(req, res){
	let _idClienteFiscal = req.params.idClienteFiscal;
	let _idSucursal = req.params.idSucursal;
	let _idAlmacen = req.params.idAlmacen;

	if(_idClienteFiscal != 'null' && _idSucursal != 'null' && _idAlmacen != 'null'){

		MovimientoInventario.find({idClienteFiscal:_idClienteFiscal,idSucursal:_idSucursal,almacen_id:_idAlmacen})
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
	getByProducto,
	saveSalida,
	saveEntrada,
	saveExistenciaInicial
}
//linea 169