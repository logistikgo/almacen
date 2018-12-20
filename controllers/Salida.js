'use strict'

const Salida = require('../models/Salida');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const Helper = require('../helpers');

function getNextID(){
	return Helper.getNextID(Salida,"salida_id");
}

function get(req,res) {
	Salida.find({})
	.then((salidas)=>{
		res.status(200).send(salidas);
	})
	.catch(error=>console.log(error));
}

function getSalidasByIDs(req,res){
	let _idClienteFiscal = req.query.idClienteFiscal;
	let _idSucursal = req.query.idSucursal;
	let _idAlmacen = req.query.idAlmacen;
	let _tipo = req.query.tipo;

	let filter = {
		clienteFiscal_id: _idClienteFiscal,
		idSucursal:_idSucursal,
		almacen_id:_idAlmacen,
		tipo:_tipo
	};

	Salida.find(filter)
	.then((salidas)=>{
		res.status(200).send(salidas);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function getByID(req,res) {
	let _salida_id = req.params.salida_id;

	console.log(_salida_id);
	
	Salida.findOne({salida_id:_salida_id})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	})
	.populate({
		path:'clienteFiscal_id',
		model:'ClienteFiscal'
	})		
	.then((data)=>{
		res.status(200).send(data);
	})
	.catch(error=>res.status(500).send(error));
}


async function save(req, res) {
	console.log('SAVE');

	let nSalida = new Salida();
	nSalida.salida_id = await getNextID();
	nSalida.fechaAlta = new Date();
	nSalida.fechaSalida = new Date(req.body.fechaSalida);
	nSalida.usuarioAlta_id = req.body.usuarioAlta_id;
	nSalida.nombreUsuario = req.body.nombreUsuario;
	nSalida.folio = await getNextID();
	nSalida.partidas = req.body.partidas;	
	nSalida.transportista = req.body.transportista;
	nSalida.placasRemolque = req.body.placasRemolque;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.operador = req.body.operador;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.idClienteFiscal = req.body.idClienteFiscal;
	nSalida.idSucursal = req.body.idSucursal;
	nSalida.sucursal_id = req.body.sucursal_id;
	nSalida.almacen_id = req.body.idAlmacen;
	nSalida.embarco = req.body.embarco;
	nSalida.referencia = req.body.referencia;
	nSalida.valor = req.body.valor;
	nSalida.clienteFiscal_id = req.body.clienteFiscal_id;
	nSalida.item = req.body.item;
	nSalida.tipo = req.body.tipo;

	nSalida.save()
	.then(async(salida)=>{
		for(let itemPartida of salida.partidas){
				await MovimientoInventario.saveSalida(itemPartida,salida.id)
		}
		res.status(200).send(salida);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

module.exports = {
	get, 
	getByID,
	save,
	getSalidasByIDs
}