'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventario = Schema({
	signo: Number,
	tipo: String,
	//partida_id: { type: Schema.ObjectId, ref: "Partida" },
	// Con partida_id ya no serian necesarios los siguientes atributos
	producto_id: { type: Schema.ObjectId, ref: "Producto" },
	sucursal_id: { type: Schema.ObjectId, ref: "Sucursal" },
	almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
	clienteFiscal_id: { type: Schema.ObjectId, ref: "ClienteFiscal" },
	fechaMovimiento: Date,
	entrada_id: { type: Schema.ObjectId, ref: "Entrada" },
	salida_id: { type: Schema.ObjectId, ref: "Salida" },
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