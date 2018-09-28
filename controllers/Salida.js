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

	nSalida.save()
	.then((data)=>{
		for(let itemPartida of data.partidas){
			MovimientoInventario.saveSalida(itemPartida.producto_id,nSalida._id,itemPartida.piezas);
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
	save
}