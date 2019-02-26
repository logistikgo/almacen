'use strict'

const PrePartida = require('../models/PrePartida');
const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');

function get(req,res){
	let _IDPedido = req.query.IDPedido;

	PrePartida.find({IDPedido:_IDPedido})
	.then((prePartidas)=>{
		res.status(200).send(prePartidas);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}


function save(partida,IDPedido){

	let nPrePartida = new PrePartida();
	nPrePartida.IDPedido = IDPedido;
	nPrePartida.fechaAlta = new Date();
	nPrePartida.producto_id = partida.producto_id;
	nPrePartida.clave = partida.clave;
	nPrePartida.descripcion = partida.descripcion;
	nPrePartida.lote = partida.lote;
	nPrePartida.valor = partida.valor;
	nPrePartida.pesoBruto = partida.pesoBruto;
	nPrePartida.pesoNeto = partida.pesoNeto;
	nPrePartida.embalajes = partida.embalajes;
	nPrePartida.isEmpty = false;
	nPrePartida.clave_partida = partida.clave_partida;
	nPrePartida.isAsignado = false;

	nPrePartida.save()
	.then((PrePartida)=>{
		
	})
	.catch((error)=>{
		return -1;
	});
}

function updateToAsignado(arrPartidas){

	let arrIDPartidas = arrPartidas.map(x=>x._id).toArray();

	PrePartida.Update({_id:{$in:arrIDPartidas}},{$set:{isAsignado:true}})
	.then((updated)=>{
		return 1;
	})
	.catch((error)=>{
		return -1;
	});
}

function savePartidasPedido(req,res){
	let _arrPartidas = req.body.partidas;
	let IDPedido = req.body.idPedido;

	console.log(_arrPartidas);

	if(_arrPartidas.length>0){
		_arrPartidas.forEach(function(partida){
			save(partida,IDPedido);
		});
		res.status(201).send(_arrPartidas);
	}
}

module.exports = {
	save,
	get,
	savePartidasPedido
}