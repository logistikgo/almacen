'use strict'

const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');

function saveSalida(producto_id, salida_id, cantidad,idCteFiscal,idSucursal,idAlmacen) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.salida_id = salida_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.signo = -1;
	nMovimiento.tipo = "SALIDA";
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
	nMovimiento.idAlmacen = idAlmacen;

	nMovimiento.save()
	.then((data)=>{
		updateExistencia(producto_id,nMovimiento.signo,cantidad);
	})
	.catch((err)=>{
		console.log(err);
	})
}


function saveEntrada(producto_id, entrada_id, cantidad,idCteFiscal,idSucursal,idAlmacen) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.entrada_id = entrada_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "ENTRADA",
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
	nMovimiento.idAlmacen = idAlmacen;

	nMovimiento.save()
	.then((data)=>{
		updateExistencia(producto_id,nMovimiento.signo,cantidad);
	})
	.catch((err)=>{
		console.log(err);
	})
}

async function saveExistenciaInicial(producto_id, cantidad,idCteFiscal,idSucursal,idAlmacen) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL";
	nMovimiento.idClienteFiscal = idClienteFiscal;
	nMovimiento.idSucursal = idSucursal;
	nMovimiento.idAlmacen = idAlmacen;

	await nMovimiento.save();
}

function updateExistencia(producto_id, signo, cantidad) {
	Producto.findOne({_id:producto_id})
	.then((producto)=>{
		
		producto.existencia += (signo*cantidad);

		if(signo == 1){
			producto.fechaUltimaEntrada = new Date();
		}
		else{
			producto.fechaUltimaSalida = new Date();
		}

		producto.save()
		.then(()=>{})
		.catch(err=>console.log(err));
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
	.then((movimientos)=>{
		res.status(200).send(movimientos);
	})
	.catch(err=>console.log(err));
}

function getByIDs_cte_suc_alm(req, res){
	let _idClienteFiscal = req.params.idClienteFiscal;
	let _idSucursal = req.params.idSucursal;
	let _idAlmacen = req.params.idAlmacen;

	MovimientoInventario.find({idClienteFiscal:_idClienteFiscal,idSucursal:_idSucursal,idAlmacen:_idAlmacen})
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


module.exports={
	get,
	getByIDs_cte_suc_alm,
	getByProducto,
	saveSalida,
	saveEntrada,
	saveExistenciaInicial
}