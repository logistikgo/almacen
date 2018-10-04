'use strict'

const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');

function getNextID(){
	return Helper.getNextID(Entrada,"idEntrada");
}

function get( req,res){
	Entrada.find({}, (error,producto)=>{
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);

	});
};

function getEntradasByIDs(req,res){
	let _idClienteFiscal = req.params.idClienteFiscal;
	let _idSucursal = req.params.idSucursal;
	let _idAlmacen = req.params.idAlmacen;

	Entrada.find({idClienteFiscal: _idClienteFiscal,idSucursal:_idSucursal,idAlmacen:_idAlmacen},(err,entradas)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		res.status(200).send(entradas);
	});
}

function getEntradaByID(req, res) {

	let _idEntrada = req.params.idEntrada;

	Entrada.findOne({idEntrada: _idEntrada})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	})
	.exec(function(err,entrada){
		if(err)
			return res.status(200).send(err);

		res.status(200).send(entrada);		

	});
}

async function save(req, res){
	let bodyParams = req.body;

	let nEntrada = new Entrada();

	nEntrada.fechaAlta = new Date();
	nEntrada.idEntrada = await getNextID();
	nEntrada.folio = await getNextID();
	nEntrada.usuarioEntrada = bodyParams.usuarioEntrada;
	nEntrada.embarque = bodyParams.embarque;
	nEntrada.transportista = bodyParams.transportista;
	nEntrada.remision = bodyParams.remision;
	nEntrada.factura = bodyParams.factura;
	nEntrada.idClienteFiscal = bodyParams.idClienteFiscal;
	nEntrada.idSucursal = bodyParams.idSucursal;
	nEntrada.idAlmacen = bodyParams.idAlmacen;
	nEntrada.partidas = bodyParams.partidas;

	console.log(bodyParams);
	console.log(nEntrada);

	nEntrada.save()
	.then((data)=>{

		for(let itemPartida of data.partidas){
			MovimientoInventario.saveEntrada(itemPartida.producto_id, data.id, itemPartida.piezas,
				bodyParams.idCteFiscal,bodyParams.idSucursal,bodyParams.idAlmacen, itemPartida.posicion, itemPartida.nivel);
		}

		res.status(200).send(data);
	})
	.catch((err)=>{
		console.log(err);
	});

}

module.exports = {
	get,
	getEntradaByID,
	save,
	getEntradasByIDs
}