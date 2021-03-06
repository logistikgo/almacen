'use strict'

const {Schema, model} = require('mongoose');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');
const Entrada = new Schema(
	{
		idEntrada: Number,
		almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
		sucursal_id: { type: Schema.ObjectId, ref: 'Sucursal' },
		clienteFiscal_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
		folio: String,
		stringFolio: String,
		item: String,
		tipo: String,
		embarque: String,
		referencia: String,
		acuse: String,
		proveedor: String,
		ordenCompra: String,
		factura: String,
		transportista: String,
		operador: String,
		unidad: String,
		tracto: String,
		remolque: String,
		sello: String,
		plantaOrigen: String,
		tiempoDescarga_id: { type: Schema.ObjectId, ref: "TiempoCargaDescarga" },
		fechaEntrada: Date,
		fechaReciboRemision: Date,
		fechaSalidaPlanta: Date,
		fechaEsperada:Date,
		observaciones: String,
		valor: Number,
		partidas: [
			{
				type: Schema.ObjectId,
				ref: 'Partida'
			}
		],
		salidas_id: [
			{
				type: Schema.ObjectId,
				ref: 'Salida'
			}
		],
		recibio: String,
		status: String,
		fechaAlta: { type: Date, default: Date.now },
		usuarioAlta_id: Number,
		nombreUsuario: String,
		usuarioEdita_id: Number,
		//DEPURAR LOS SIGUIENTES CAMPOS (AUN SE USAN?)
		idClienteFiscal: Number,
		idSucursal: Number,
		idAlmacen: Number,
		isEmpty: { type: Boolean, default: false },
        DiasTraslado: Number
		//ATRIBUTOS AUXILIARES
		// done: Boolean,
		// donepartida: Boolean,
		// partidasH : {},
		// partidasI : {},
		// cantPartidas : Number,
		// cantSalidas : Number,
		// partidasSalida: {},
		// partidas : {}
	},
	{
		collection: 'Entradas'
	}
);

Entrada.plugin(aggregatePaginate);

module.exports = model('Entrada', Entrada);