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
	Entrada.find(filter)
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	}).then((entradas)=>{
		res.status(200).send(entradas);
	}).catch((error)=>{
		res.status(500).send(error);
	});
}

function getEntradaByID(req, res) {

	let _id = req.query.id;

	Entrada.findOne({_id: _id})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	})
	.populate({
		path:'partidasSalida.producto_id',
		model:'Producto'
	})
	.populate({
		path:'clienteFiscal_id',
		model:'ClienteFiscal'
	})
	.then((entrada)=>{
		res.status(200).send(entrada);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function getPartidaById(req, res) {
	let params = req.query;
	let entrada_id = params.entrada_id;
	let partida_id = params.partida_id;

	Entrada.findOne({_id: entrada_id})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	})
	.populate({
		path:'partidasSalida.producto_id',
		model:'Producto'
	})
	.then((entrada)=>{
		let partida = entrada.partidas.find(x=>x._id==partida_id);

		res.status(200).send(partida);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

async function save(req, res){
	let bodyParams = req.body;

	let nEntrada = new Entrada();

	nEntrada.usuarioAlta_id = bodyParams.usuarioAlta_id;
	nEntrada.nombreUsuario = bodyParams.nombreUsuario;
	nEntrada.item = bodyParams.item;
	nEntrada.embarque = bodyParams.embarque;
	nEntrada.referencia = bodyParams.referencia;
	nEntrada.fechaEntrada = new Date(bodyParams.strFechaIngreso);
	nEntrada.acuse = bodyParams.acuse;
	nEntrada.recibio = bodyParams.recibio;
	nEntrada.proveedor = bodyParams.proveedor;
	nEntrada.ordenCompra = bodyParams.ordenCompra;
	nEntrada.factura = bodyParams.factura;
	nEntrada.tracto = bodyParams.tracto;
	nEntrada.remolque = bodyParams.remolque;
	nEntrada.unidad = bodyParams.unidad;
	nEntrada.transportista = bodyParams.transportista;
	nEntrada.valor = bodyParams.valor;
	nEntrada.clienteFiscal_id = bodyParams.clienteFiscal_id;

	nEntrada.idClienteFiscal = bodyParams.idClienteFiscal;
	nEntrada.idSucursal = bodyParams.idSucursal;
	nEntrada.sucursal_id = req.body.sucursal_id;
	nEntrada.almacen_id = bodyParams.almacen_id;
	nEntrada.status = bodyParams.status;
	nEntrada.tipo = bodyParams.tipo;
	nEntrada.partidas = bodyParams.partidas;
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

async function updatePosicion_Partida(req,res){
	let bodyParams = req.body;
	let _entrada_id = body.idEntrada;
	let _partidas = body.partidas;
	let arrPartidas = [];
	let _entrada = await Entrada.findOne({idEntrada:_entrada_id})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	}).exec();

	_entrada.partidas.forEach((itemPartida)=>{
		let itemBodyPartidas = _partidas.find(async function(itemBodyPartidas){
			if(itemBodyPartidas.producto_id == itemPartida.producto_id._id){
				return itemBodyPartidas;
			}else{
				return null;
			}
		});

		if(itemBodyPartidas!=null){
			let newPartida = {
				_id : itemPartida.id,
				producto_id:itemPartida.producto_id,
				tarimas : itemPartida.tarimas,
				piezas : itemPartida.cantidad,
				cajas : itemPartida.cajas,
				posicion : itemBodyPartidas.posicion,
				nivel : itemBodyPartidas.nivel

			}

			arrPartidas.push(newPartida);
		}
	});

	let cambios = {}

	if(arrPartidas.length>0)
	{
		cambios = {
			partidas : arrPartidas
		}

		Entrada.updateOne({idEntrada:_idEntrada},{$set:cambios},(err,entrada)=>{
			if(err)
				return res.status(500).send({message:"Error"});
			res.status(200).send(entrada);
		});
	}
	else
	{
		res.status(500).send({message:"Error updatePosicion_Partida"});
	}
}

async function validaEntrada(req,res){
	let bodyParams = req.body;
	let _idEntrada = bodyParams.idEntrada;
	let _partidas = bodyParams.partidas;
	var arrPartidas = [];
	let _entrada = await Entrada.findOne({idEntrada:_idEntrada})
	.populate({
		path:'partidas.producto_id',
		model:'Producto'
	}).exec();	

	_entrada.partidas.forEach(function(itemPartida){
		let itemBodyPartidas = _partidas.find(function(itemBodyPartidas){
			return itemBodyPartidas.clave === itemPartida.producto_id.clave;
		});
		if(itemBodyPartidas!=null){
			let newPartida = {
				_id : itemPartida.id,
				producto_id:itemPartida.producto_id,
				tarimas : itemPartida.tarimas,
				piezas : itemBodyPartidas.cantidad,
				cajas : itemPartida.cajas,
				posicion : itemBodyPartidas.posicion,
				nivel : itemBodyPartidas.nivel

			}

			arrPartidas.push(newPartida);
		}
	});
	
	//----------------------------------------------
	if(arrPartidas.length==_entrada.partidas.length)
	{
		let cambios = {
			status : "APLICADA",
			partidas : arrPartidas
		}

		Entrada.updateOne({idEntrada:_idEntrada},{$set:cambios},(err,entrada)=>{
			if(err)
				return res.status(500).send({message:"Error"});
			for(let itemPartida of arrPartidas){
				MovimientoInventario.saveEntrada(itemPartida.producto_id, entrada.id, itemPartida.piezas,itemPartida.cajas,itemPartida.tarimas,
					_entrada.idClienteFiscal,_entrada.idSucursal,_entrada.almacen_id, itemPartida.posicion, itemPartida.nivel);
			}
			res.status(200).send(entrada);
		});

	}else{
		res.status(500).send({message:"Error en Json EndPoint"});
	}	
}

function updatePosicionPartida(req,res){
	let bodyParams = req.body;

	let entrada_id = bodyParams.entrada_id;
	let partida_id = bodyParams.partida_id;

	Entrada.findOne({_id:entrada_id})
	.then(async (entrada) => {
		let partida = entrada.partidas.find(x=>x._id == partida_id);

		await updatePosicion(partida, bodyParams);

		let item = {
			partidas: entrada.partidas
		};

		Entrada.updateOne({_id:entrada_id},{$set:item})
		.then((item)=>{
			res.status(200).send(item);
		})
		.catch((err)=>{
			console.log(err);
			res.status(500).send(err);
		});
	});
}

async function updatePosicion(partida,bodyParams){
	await MovimientoInventario.updateExistenciaPosicion(-1, partida);

	partida.posicion = bodyParams.posicion;
	partida.posicion_id = bodyParams.posicion_id;
	partida.nivel = bodyParams.nivel;

	await MovimientoInventario.updateExistenciaPosicion(1, partida);
}

function updatePosicionEntrada(req,res){
	let bodyParams = req.body;
	let entrada_id = bodyParams.entrada_id;

	Entrada.findOne({_id:entrada_id})
	.then(async (entrada) => {

		for(let itemPartida of entrada.partidas){
			await updatePosicion(itemPartida, bodyParams);
		}

		let item = {
			partidas: entrada.partidas
		};

		Entrada.updateOne({_id:entrada_id},{$set:item})
		.then((item)=>{
			res.status(200).send(item);
		})
		.catch((err)=>{
			console.log(err);
			res.status(500).send(err);
		});
	});
}

module.exports = {
	get,
	getEntradaByID,
	save,
	getEntradasByIDs,
	getPartidaById,
	validaEntrada,
	updatePosicionPartida,
	updatePosicionEntrada
}