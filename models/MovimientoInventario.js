'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventario = Schema({
	producto_id: { type: Schema.ObjectId, ref: "Producto" },
	clienteFiscal_id: { type: Schema.ObjectId, ref: "ClienteFiscal" },
	almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
	sucursal_id: { type: Schema.ObjectId, ref: "Sucursal" },
	entrada_id: { type: Schema.ObjectId, ref: "Entrada" },
	salida_id: { type: Schema.ObjectId, ref: "Salida" },
	fechaMovimiento: Date,
	signo: Number,
	tipo: String,
	embalajes: {},
	posiciones: [
		{
			embalajes: {},
			posicion_id: { type: Schema.ObjectId, ref: 'Posicion' },
			posicion: String,
			pasillo_id: { type: Schema.ObjectId, ref: 'Pasillo' },
			pasillo: String,
			nivel_id: { type: Schema.ObjectId },
			nivel: String
		}
	],
	//DEPURACION DE CODIGO
	// idClienteFiscal: Number,
	idSucursal: Number,
	cantidad: Number,
	cajas: Number,
	tarimas: Number,
	pesoBruto: Number,
	pesoNeto: Number,
	referencia: String,
	clave_partida: String
},
	{ collection: "MovimientosInventario" });

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);