'use strict'

const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');

function saveSalida(producto_id, salida_id, cantidad) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.salida_id = salida_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.signo = -1;

	nMovimiento.save()
	.then((data)=>{
		console.log(data);
	})
	.catch((err)=>{
		console.log(err);
	})
}


function saveEntrada(producto_id, entrada_id, cantidad) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.entrada_id = entrada_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "ENTRADA",

	nMovimiento.save()
	.then((data)=>{
		updateExistencia(producto_id,nMovimiento.signo,cantidad);
	})
	.catch((err)=>{
		console.log(err);
	})
}

async function saveExistenciaInicial(producto_id, cantidad) {
	let nMovimiento = new MovimientoInventario();

	nMovimiento.producto_id = producto_id;
	nMovimiento.fechaMovimiento = new Date();
	nMovimiento.cantidad = cantidad;
	nMovimiento.signo = 1;
	nMovimiento.tipo = "EXISTENCIA_INICIAL",

	await nMovimiento.save();
}

function updateExistencia(producto_id, signo, cantidad) {
	Producto.findOne({_id:producto_id}).then((producto)=>{
		console.log(producto);
		producto.existencia += (signo*cantidad);
		producto.save()
		.then(()=>{console.log('then');})
		.catch(err=>console.log(err));
	});
}

module.exports={
	saveSalida,
	saveEntrada,
	saveExistenciaInicial
}