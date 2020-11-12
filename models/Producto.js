'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Producto = Schema({
	clave: String,
	descripcion: String,
	clasificacion: String,
	clasificacion_id: { type: Schema.ObjectId, ref: "ClasificacionesProductos" },
	subclasificacion: String,
	subclasificacion_id: Schema.ObjectId,
	presentacion: String,
	presentacion_id: { type: Schema.ObjectId, ref: "Presentacion" },
	arrClientesFiscales_id: [
		{ type: Schema.ObjectId, ref: "ClienteFiscal" }
	],
	isUnidadesMedida: Boolean,
	embalajeBase: String,
	embalajeBase_id: { type: Schema.ObjectId, ref: "Embalaje" },
	arrEquivalencias: [{
		cantidad: Number,
		embalaje: String,
		embalaje_id: { type: Schema.ObjectId, ref: "Embalaje" },
		cantidadEquivalencia: Number,
		embalajeEquivalencia: String,
		embalajeEquivalencia_id: { type: Schema.ObjectId, ref: "Embalaje" },
	}],
	isSeries: Boolean,
	isPedimentos: Boolean,
	isLotes: Boolean,
	sucursal_id: { type: Schema.ObjectId, ref: "Sucursal" },
	almacen_id: [{ type: Schema.ObjectId, ref: "Almacen" }],
	clienteFiscal_id: { type: Schema.ObjectId, ref: "ClienteFiscal" },
	embalajes: {},
	usuarioAlta: String,
	usuarioAlta_id: Number,
	fechaAlta: { type: Date, default: Date.now },
	fechaUltimaEntrada: Date,
	fechaUltimaEntradaRechazo: Date,
	fechaUltimaSalida: Date,
	fechaUltimaSalidaRechazo: Date,
	fechaBaja: Date,
	statusReg: { type: String, default: "ACTIVO" },
	//DEPURAR LOS SIGUIENTES CAMPOS (AUN SE USAN?)
	valor: Number,
	existenciaPesoBruto: Number,
	existenciaPesoNeto: Number,
	idProducto: Number,
	existencia: Number,
	existenciaTarimas: Number,
	existenciaCajas: Number,
	pesoBrutoRechazo: Number,
	pesoNetoRechazo: Number,
	peso: Number,
	embalajesAlmacen: {},
	embalajesRechazo: {},
	idClienteFiscal: Number,
	vidaAnaquel: Number,
	garantiaFrescura: Number,
	alertaAmarilla: Number,
	alertaRoja: Number,
	isSafetyStock: Boolean,
	safetystock: Number,
	familia:{ type: String, default: "NONE" },
	prioridad:{ type: Number, default: 5 },
	isEstiba:{ type: Boolean, default: false },
},
	{ collection: 'Productos' }
);

Producto.post('save', function(doc, next){
	doc.populate('clasificacion_id').execPopulate()
		.then(function(){
			next();
		});
});

module.exports = mongoose.model('Producto', Producto);