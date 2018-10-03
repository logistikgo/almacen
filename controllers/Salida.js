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
	let _idCteFiscal = req.params.idCteFiscal;
	let _idSucursal = req.params.idSucursal;
	let _idAlmacen = req.params.idAlmacen;

	Salida.find({idCteFiscal: _idCteFiscal,idSucursal:_idSucursal,idAlmacen:_idAlmacen},(err,salidas)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(salidas);
	});
}

function getByID(req,res) {

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
	nSalida.operador = req.body.operador;
	nSalida.placasTrailer = req.body.placasTrailer;
	nSalida.idCteFiscal = req.body.idCteFiscal;
	nSalida.idSucursal = req.body.idSucursal;
	nSalida.idAlmacen = req.body.idAlmacen;

	nSalida.save()
	.then((data)=>{
		for(let itemPartida of data.partidas){
			MovimientoInventario.saveSalida(itemPartida.producto_id,nSalida._id,itemPartida.piezas,
				req.body.idCteFiscal,req.body.idSucursal,req.body.idAlmacen);
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