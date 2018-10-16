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
	let _idClienteFiscal = req.params.idClienteFiscal;
	let _idSucursal = req.params.idSucursal;
	let _idAlmacen = req.params.idAlmacen;

	Salida.find({idClienteFiscal: _idClienteFiscal,idSucursal:_idSucursal,almacen_id:_idAlmacen},(err,salidas)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(salidas);
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
	nSalida.fechaSalida = new Date();
	nSalida.folio = await getNextID();
	nSalida.partidas = req.body.partidas;	
	nSalida.transportista = req.body.transportista;
	nSalida.placasRemolque = req.body.placasRemolque;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.operador = req.body.operador;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.idClienteFiscal = req.body.idClienteFiscal;
	nSalida.idSucursal = req.body.idSucursal;
	nSalida.almacen_id = req.body.idAlmacen;
	nSalida.embarco = req.body.embarco;

	nSalida.save()
	.then((data)=>{
		for(let itemPartida of data.partidas){
			MovimientoInventario.saveSalida(itemPartida.producto_id,nSalida._id,itemPartida.piezas,
				itemPartida.cajas,itemPartida.tarimas,req.body.idClienteFiscal,req.body.idSucursal,req.body.idAlmacen);
		}
		res.status(200).send(data);
	})
	.catch((error)=>{
		console.log(error);
		res.status(500).send(error);
	});
}

module.exports = {
	get, 
	getByID,
	save,
	getSalidasByIDs
}