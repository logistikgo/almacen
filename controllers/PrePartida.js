'use strict'

const PrePartida = require('../models/PrePartida');
const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const ObjectId = (require('mongoose').Types.ObjectId);

const configSQL = (require('../configSQL'));
const sql = require('mssql');


//Se conecta a la base de datos en SQL conexion global


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

async function save(partida,IDPedido){

	//Conexion local
	const sql_pool = await new sql.ConnectionPool(configSQL).connect();

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
	nPrePartida.clave_partida = IDPedido + "" + partida.clave_partida;
	nPrePartida.isAsignado = false;
	nPrePartida.isSeleccionada = partida.isSeleccionada;
	let queryGetPedido = `SELECT XD_IDPedido,Delivery,FechaPGI,FechaAlta,StatusProceso,IDClienteFiscal FROM XD_Pedidos WHERE XD_IDPedido = ${nPrePartida.IDPedido}`;
	let resultQueryPedido = (await sql_pool.query(queryGetPedido)).recordset;
	sql.close();

	if(resultQueryPedido.length > 0){
		let infoPedido = {
			IDPedido: resultQueryPedido[0].XD_IDPedido,
			Delivery: resultQueryPedido[0].Delivery,
			FechaPGI: resultQueryPedido[0].FechaPGI,
			FechaAlta: resultQueryPedido[0].FechaAlta,
			StatusProceso: resultQueryPedido[0].StatusProceso,
			IDClienteFiscal: resultQueryPedido[0].IDClienteFiscal
		};

		nPrePartida.InfoPedido = infoPedido;
	}

	nPrePartida.save()
	.then((PrePartida)=>{
		
	})
	.catch((error)=>{
		return -1;
	});


	sql.close();
}

function updateToAsignado(arrPartidas){
	let arrIDPartidas = arrPartidas.map(x=>x._id).toArray();
	//console.log(arrIDPartidas);
	PrePartida.Update({_id:{$in:arrIDPartidas}},{$set:{isAsignado:true}})
	.then((updated)=>{
		return 1;
	})
	.catch((error)=>{
		return -1;
	});
}

async function savePartidasPedido(req,res){
	let _arrPartidas = req.body.partidas;
	let IDPedido = req.body.idPedido;
	//let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([req.body.IDClienteFiscal]);
	
	//console.log(_arrPartidas);

	if(_arrPartidas.length>0){
		_arrPartidas.forEach(function(partida){
			save(partida,IDPedido, );
		});
		res.status(201).send(_arrPartidas);
	}
}

async function getPedidosPosicionados(req, res){
	let arrPedidos = req.query.arrPedidos;
	let resPedidos = [];
	let arrPartidasPosicionadas;
	for(let pedido of arrPedidos){
		let arrpartidas = await getPartidas(pedido);
		arrPartidasPosicionadas = arrpartidas.filter(x => x.pasillo_id != undefined && x.posicion_id != undefined && x.nivel != undefined);
		if(arrPartidasPosicionadas.length !== arrpartidas.length)
			resPedidos.push(pedido);
	}
	await res.status(200).send(resPedidos);
}

async function getPartidas(idPedido){
	let arrPartidas = [];
	await PrePartida.find({IDPedido:idPedido})
	.then(async (prePartidas)=>{
		let i = 0;
		for(let prePartida of prePartidas){
			let partida = await getPartida(prePartida._id);
			if(partida != undefined)
				arrPartidas.push(partida);
			i++;
		}
	});
	return arrPartidas;
}

async function getPartida(prepartida){
	let partida;
	await Entrada.findOne({"partidas._id":new ObjectId(prepartida)})
	.then((entrada)=>{
		if(entrada != null)
			partida = entrada.partidas.find(x=>x._id.toString() == prepartida.toString());
		else
			console.log("Error: " + prepartida);
	});
	return partida;
}

module.exports = {
	save,
	get,
	savePartidasPedido,
	getPedidosPosicionados
}