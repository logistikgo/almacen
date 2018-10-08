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
	nEntrada.status = bodyParams.status;
	nEntrada.partidas = bodyParams.partidas;

	console.log(bodyParams);
	console.log(nEntrada);

	nEntrada.save()
	.then((data)=>{
		if(data.idAlmacen != 1){
			for(let itemPartida of data.partidas){
				MovimientoInventario.saveEntrada(itemPartida.producto_id, data.id, itemPartida.piezas,
					bodyParams.idClienteFiscal,bodyParams.idSucursal,bodyParams.idAlmacen, itemPartida.posicion, itemPartida.nivel);
			}
		}
			

		res.status(200).send(data);
	})
	.catch((err)=>{
		console.log(err);
	});

}

async function valEntrada(req,res){
	let bodyParams = req.body;
	let _idEntrada = bodyParams.idEntrada;
	let _partidas = bodyParams.partidas;
	var arrPartidas = [];
	let entrada = await Entrada.findOne({idEntrada:_idEntrada})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	}).exec();
	
	for(let itemPartida of entrada.partidas){
		for(let itemParam of _partidas){

			let producto = await Producto.findOne({clave : itemParam.clave}).exec();
			if((itemPartida.producto_id._id).toString() == (producto._id).toString())
			{
				let part = {
					_id : itemPartida.id,
					producto_id:itemPartida.producto_id,
					tarimas : itemPartida.tarimas,
					piezas : itemParam.cantidad,
					cajas : itemPartida.cajas,
					posicion : itemParam.posicion,
					nivel : itemParam.nivel

				}
				
				arrPartidas.push(part);
			}
		}
	}

	let item = {
		status : "APLICADA",
		partidas : arrPartidas
	}
	Entrada.updateOne({idEntrada:_idEntrada},{$set:item},(err,entrada)=>{
		if(err)
			return res.status(500).send({message:"Error"});
		for(let itemPartida of arrPartidas){
			MovimientoInventario.saveEntrada(itemPartida.producto_id, entrada.id, itemPartida.piezas,
				entrada.idClienteFiscal,entrada.idSucursal,entrada.idAlmacen, itemPartida.posicion, itemPartida.nivel);
		}
		res.status(200).send(entrada);
	});
}

module.exports = {
	get,
	getEntradaByID,
	save,
	getEntradasByIDs,
	valEntrada
}