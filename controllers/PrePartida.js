'use strict'

const PrePartida = require('../models/PrePartida');
const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');

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

	nPrePartida.save()
	.then((PrePartida)=>{
		
	})
	.catch((error)=>{
		return -1;
	});
}

function savePartidasPedido(req,res){
	let _arrPartidas = req.body.partidas;
	let IDPedido = req.body.idPedido;

	if(_arrPartidas.length>0){
		_arrPartidas.forEach(function(partida){
			save(partida,IDPedido);
		});
		res.status(201).send(_arrPartidas);
	}
}

async function saveEntradaAutomatica(req,res){
	let bodyParams = req.body;
	let arrIDPedido = bodyParams.arrIDPedido;
	let partidas = await PrePartida.find({IDPedido:{$in:arrIDPedido}}).exec();
	let nEntrada = new Entrada();

	nEntrada.usuarioAlta_id = bodyParams.usuarioAlta_id; //Diferente usuario
	nEntrada.nombreUsuario = bodyParams.nombreUsuario; //DIferente usuario
	nEntrada.item = bodyParams.item; //Capturar en asignacion de posiciones
	nEntrada.embarque = bodyParams.embarque; //Folio viaje 
	nEntrada.referencia = bodyParams.referencia; //Capturar
	nEntrada.fechaEntrada = new Date(bodyParams.strFechaIngreso); 
	nEntrada.acuse = bodyParams.acuse; //Capturar
	nEntrada.recibio = bodyParams.recibio; //QUien hizo la asignacion de posiciones
	nEntrada.proveedor = bodyParams.proveedor; //Capturar
	nEntrada.ordenCompra = bodyParams.ordenCompra;//Capturar
	nEntrada.factura = bodyParams.factura;//Capturar
	nEntrada.tracto = bodyParams.tracto;//Si lo trae
	nEntrada.remolque = bodyParams.remolque;//Si lo trae
	nEntrada.unidad = bodyParams.unidad;//Si lo trae
	nEntrada.transportista = bodyParams.transportista;//Si lo trae
	nEntrada.valor = bodyParams.valor;//Si lo trae
	nEntrada.clienteFiscal_id = bodyParams.clienteFiscal_id; //Interfaz ClienteALM_XD

	nEntrada.idClienteFiscal = bodyParams.idClienteFiscal; //Ño
	nEntrada.idSucursal = bodyParams.idSucursal;//
	nEntrada.sucursal_id = req.body.sucursal_id;
	nEntrada.almacen_id = bodyParams.almacen_id;
	nEntrada.status = bodyParams.status;
	nEntrada.tipo = bodyParams.tipo;
	nEntrada.partidas = partidas;
	nEntrada.partidasSalida = bodyParams.partidasSalida;
	nEntrada.isEmpty = bodyParams.isEmpty;

	nEntrada.fechaAlta = new Date();
	nEntrada.idEntrada = await getNextID();
	nEntrada.folio = await getNextID();


	nEntrada.save()
	.then(async(entrada)=>{
		for(let itemPartida of entrada.partidas){
			console.log("OK");
			await MovimientoInventario.saveEntrada(itemPartida,entrada.id);
		}
		res.status(200).send(entrada);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});


}



module.exports = {
	save,
	get,
	savePartidasPedido
}