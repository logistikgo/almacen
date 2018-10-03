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
	nMovimiento.idCteFiscal = idCteFiscal;
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
	nMovimiento.idCteFiscal = idCteFiscal;
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
	nMovimiento.idCteFiscal = idCteFiscal;
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

function getByIDs(req, res){
	let _idCteFiscal = req.body.idCteFiscal;
	let _idSucursal = req.body.idSucursal;
	let _idAlmacen = req.body.idAlmacen;

	MovimientoInventario.find({idCteFiscal:_idCteFiscal,idSucursal:_idSucursal,idAlmacen:_idAlmacen},
		(err,movimientos)=>{
			if(err)
				return res.status(500).send({message:"ERROR"});
			res.status(200).send(movimientos);
	});
}


module.exports={
	get,
	getByIDs,
	getByProducto,
	saveSalida,
	saveEntrada,
	saveExistenciaInicial
}