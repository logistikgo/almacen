'use strict'

const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const MovimientoInventarioModel = require('../models/MovimientoInventario');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const PrePartidaM = require('../models/PrePartida'); //modelo 
const PrePartidaC = require('../controllers/PrePartida'); //controller

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
	let _status = req.query.status;

	let filter = {
		clienteFiscal_id: _idClienteFiscal,
		sucursal_id:_idSucursal,
		tipo:_tipo
	};

	if(!_status) //si tiene status entonces su estatus es SIN_POSICIONAR, por lo tanto no se requiere almacen_id
	{
		filter["almacen_id"] = _idAlmacen;
		filter["status"] = "APLICADA";
	}else{
		filter["status"] = _status;
	}
	Entrada.find(filter).sort({fechaEntrada:-1})
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
	let clave_partida = params.clave_partida;

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
		let partida = entrada.partidas.find(x=>x.clave_partida==clave_partida);

		res.status(200).send(partida);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function updatePartida(req,res){
	let bodyParams = req.query;

	let entrada_id = bodyParams.entrada_id;
	let clave_partida = bodyParams.clave_partida;

	Entrada.findOne({_id:entrada_id})
	.then(async(entrada) => {

		let partida = entrada.partidas.find(x=>x.clave_partida == clave_partida);
		let partidaSalida = entrada.partidasSalida.find(x=>x.clave_partida == clave_partida);

		partida.pasillo = bodyParams.pasillo;
		partida.pasillo_id = bodyParams.pasillo_id;
		partida.posicion = bodyParams.posicion;
		partida.posicion_id = bodyParams.posicion_id;
		partida.nivel = bodyParams.nivel;
		partida.valor = bodyParams.valor;
		partida.pesoBruto = bodyParams.pesoBruto;
		partida.pesoNeto = bodyParams.pesoNeto;
		partida.embalajes = bodyParams.embalajes;

		partidaSalida.pasillo = bodyParams.pasillo;
		partidaSalida.pasillo_id = bodyParams.pasillo_id;
		partidaSalida.posicion = bodyParams.posicion;
		partidaSalida.posicion_id = bodyParams.posicion_id;
		partidaSalida.nivel = bodyParams.nivel;
		partidaSalida.valor = bodyParams.valor;
		partidaSalida.pesoBruto = bodyParams.pesoBruto;
		partidaSalida.pesoNeto = bodyParams.pesoNeto;
		partidaSalida.embalajes = bodyParams.embalajes;

		let item = {
			partidas: entrada.partidas,
			partidasSalida: entrada.partidasSalida
		};
		let succefulEntrada = 0;
		await Entrada.updateOne({_id:entrada_id},{$set:item})
		.then((item)=>{
			succefulEntrada = 1;
		});

		let itemMovimiento = {
			embalajes: bodyParams.embalajes,
			pesoBruto: bodyParams.pesoBruto,
			pesoNeto: bodyParams.pesoNeto,
			pasillo: bodyParams.pasillo,
			pasillo_id: bodyParams.pasillo_id,
			posicion: bodyParams.posicion,
			posicion_id: bodyParams.posicion_id,
			nivel: bodyParams.nivel,
		};
		let succefulmovimiento = 0;
		await MovimientoInventarioModel.updateOne({entrada_id:entrada, clave_partida: clave_partida},{$set:itemMovimiento})
		.then((item)=>{
			succefulmovimiento = 1;
		});

		if(succefulEntrada == 1 && succefulmovimiento==1)
			res.status(200).send(entrada);
		else
			res.status(500).send(entrada);
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

function update(req, res){
	let entrada_id = req.body.entrada_id;

	Entrada.updateOne(
		{ _id: entrada_id },
		{ $set: {} },
		{})
	.then((entrada)=>{
			res.status(200).send(entrada);
		})
		.catch((error)=>{
			res.status(500).send(error);
		})
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

	partida.pasillo = bodyParams.pasillo;
	partida.pasillo_id = bodyParams.pasillo_id;
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

async function saveEntradaAutomatica(req,res){
	let bodyParams = req.body;
	let arrIDPedido = bodyParams.arrIDPedido;
	let partidas = await PrePartidaM.find({IDPedido:{$in:arrIDPedido}}).exec();
	
	if(partidas && partidas.length>0)
	{

		let nEntrada = new Entrada();

		let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([bodyParams.IDClienteFiscal]);
		let arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([bodyParams.IDSucursal]);
		console.log(arrClientes);
		console.log(arrSucursales);
		nEntrada.nombreUsuario = bodyParams.nombreUsuario; //nombreUsuario
		nEntrada.embarque = bodyParams.embarque; //Folio viaje 
		nEntrada.fechaEntrada = new Date(bodyParams.fechaEntrada); 
		nEntrada.tracto = bodyParams.tracto;//Si lo trae
		nEntrada.remolque = bodyParams.remolque;//Si lo trae
		nEntrada.unidad = bodyParams.unidad;//Si lo trae
		nEntrada.transportista = bodyParams.transportista;//Si lo trae
		nEntrada.valor = bodyParams.valor;//Si lo trae
		nEntrada.clienteFiscal_id = arrClientes[0];  //Interfaz ALM_XD Clientes
		nEntrada.sucursal_id = arrSucursales[0]; //Interfaz ALM_XD Sucursales

		nEntrada.status = bodyParams.status; //SIN_POSICION
		nEntrada.tipo = bodyParams.tipo;//NORMAL
		nEntrada.partidas = partidas; //Pre partidas
		nEntrada.partidasSalida = partidas; //Pre partidas
		nEntrada.isEmpty = false;

		nEntrada.fechaAlta = new Date();
		nEntrada.idEntrada = await getNextID();
		nEntrada.folio = await getNextID();

		//nEntrada.usuarioAlta_id = bodyParams.usuarioAlta_id; //Diferente usuario Omitir
		
		//nEntrada.item = bodyParams.item; //Capturar en asignacion de posiciones
		
		//nEntrada.referencia = bodyParams.referencia; //Capturar
		
		//nEntrada.acuse = bodyParams.acuse; //Capturar
		//nEntrada.recibio = bodyParams.recibio; //QUien hizo la asignacion de posiciones
		//nEntrada.proveedor = bodyParams.proveedor; //Capturar
		//nEntrada.ordenCompra = bodyParams.ordenCompra;//Capturar
		//nEntrada.factura = bodyParams.factura;//Capturar
		
		//nEntrada.idClienteFiscal = bodyParams.idClienteFiscal; //Ño
		//nEntrada.idSucursal = bodyParams.idSucursal;// 
		
		//nEntrada.almacen_id = bodyParams.almacen_id; //Capturar
		
		nEntrada.save()
		.then(async(entrada)=>{
			await PrePartidaC.updateToAsignado(partidas);

			for(let itemPartida of entrada.partidas){
				
				await MovimientoInventario.saveEntrada(itemPartida,entrada.id);
			}
			res.status(200).send(entrada);
		})
		.catch((error)=>{
			res.status(500).send(error);
		});
	}else{
		res.status(400).send({message:"Se intenta generar una entrada sin partidas",error:"No se encontró pre-partidas para los IDs de pedidos indicados"});
	}

}

module.exports = {
	get,
	getEntradaByID,
	save,
	update,
	getEntradasByIDs,
	getPartidaById,
	updatePartida,
	validaEntrada,
	updatePosicionPartida,
	updatePosicionEntrada,
	saveEntradaAutomatica
}