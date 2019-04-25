'use strict'

const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../controllers/MovimientoInventario');
const MovimientoInventarioModel = require('../models/MovimientoInventario');
const EmbalajesModel = require('../models/Embalaje');
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
		sucursal_id:_idSucursal,
		tipo:_tipo
	};

	if(!_status) //si tiene status entonces su estatus es SIN_POSICIONAR, por lo tanto no se requiere almacen_id
	{
		filter["clienteFiscal_id"] = _idClienteFiscal;
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

async function saveEntradaAutomatica(req,res){
	let bodyParams = req.body;
	let arrIDPedido = bodyParams.arrIDPedido;
	let partidas = await PrePartidaM.find({IDPedido:{$in:arrIDPedido}}).exec();
	let isEntrada = await validaEntradaDuplicado(bodyParams.embarque); //Valida si ya existe

	if(!isEntrada){
		if(partidas && partidas.length>0)
		{

			let nEntrada = new Entrada();

			let arrClientes = await Interfaz_ALM_XD.getIDClienteALM([bodyParams.IDClienteFiscal]);
			let arrSucursales = await Interfaz_ALM_XD.getIDSucursalALM([bodyParams.IDSucursal]);
			//console.log("Arreglo de clientes fiscales in comming");
			//console.log(bodyParams.IDClienteFiscal);
			//console.log(arrClientes);
			//console.log(arrSucursales);
			nEntrada.nombreUsuario = bodyParams.nombreUsuario; //nombreUsuario
			nEntrada.embarque = bodyParams.embarque; //Folio viaje 
			nEntrada.fechaEntrada = new Date(bodyParams.fechaEntrada); 
			nEntrada.tracto = bodyParams.tracto;//Si lo trae
			nEntrada.remolque = bodyParams.remolque;//Si lo trae
			nEntrada.unidad = bodyParams.unidad;//Si lo trae
			nEntrada.transportista = bodyParams.transportista;//Si lo trae
			nEntrada.valor = partidas.map(x=>x.valor).reduce(function(total,valor){
				return total + valor;
			});//Si lo trae
			if(arrClientes.length>0){
				nEntrada.clienteFiscal_id = arrClientes[0];  //Interfaz ALM_XD Clientes	
			}
			nEntrada.sucursal_id = arrSucursales[0]; //Interfaz ALM_XD Sucursales
			nEntrada.status = "SIN_POSICIONAR"; //SIN_POSICION
			nEntrada.tipo = "NORMAL";//NORMAL
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
				//await PrePartidaC.updateToAsignado(partidas);
				
				for(let itemPartida of entrada.partidas){
					
					await MovimientoInventario.saveEntrada(itemPartida,entrada.id);
				}
				res.status(200).send(entrada);
			})
			.catch((error)=>{
				res.status(500).send(error);
			});
		}else{
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
			res.status(400).send({message:"Se intenta generar una entrada sin partidas",error:"No se encontró pre-partidas para los IDs de pedidos indicados"});
		}
	}else{
		console.log("No se puede generar la entrada, esta ya existe");
		res.status(400).send({message:"Se intenta generar una entrada de un T1 que ya generó una entrada",error:"Se intenta generar una entrada de un T1 que ya generó una entrada"});
	}
}
//Valida que la entrada ya existe o no, devolviendo true o false
async function validaEntradaDuplicado(embarque){
	let entradas = await Entrada.find({embarque:embarque}).exec();
	//console.log(entradas);
	if(entradas.length > 0){
		return true;
	}else{
		return false;
	}
}

function update(req, res){
	let bodyParams = req.body;
	let entrada_id = bodyParams.entrada_id;

	let jUpdate ={
		usuarioAlta_id: bodyParams.usuarioAlta_id,
		nombreUsuario: bodyParams.nombreUsuario,
		item: bodyParams.item,
		embarque: bodyParams.embarque,
		referencia: bodyParams.referencia,
		fechaEntrada: new Date(bodyParams.strFechaIngreso),
		acuse: bodyParams.acuse,
		recibio: bodyParams.recibio,
		proveedor: bodyParams.proveedor,
		ordenCompra: bodyParams.ordenCompra,
		factura: bodyParams.factura,
		tracto: bodyParams.tracto,
		remolque: bodyParams.remolque,
		unidad: bodyParams.unidad,
		transportista: bodyParams.transportista,
		valor: bodyParams.valor,
		clienteFiscal_id: bodyParams.clienteFiscal_id,
		idClienteFiscal: bodyParams.idClienteFiscal,
		idSucursal: bodyParams.idSucursal,
		sucursal_id: req.body.sucursal_id,
		almacen_id: bodyParams.almacen_id,
		status: bodyParams.status,
		tipo: bodyParams.tipo,
		partidas: bodyParams.partidas,
		partidasSalida: bodyParams.partidasSalida,
		isEmpty: bodyParams.isEmpty,
		fechaAlta: new Date()
	};

	//Updatea los movimientos de esta entrada, les asigna el campo almacen_id y clienteFiscal_id
	MovimientoInventarioModel.find({entrada_id: entrada_id })
	.then((movimientos)=>{
		movimientos.forEach(function(movimiento){
			movimiento.almacen_id = jUpdate.almacen_id;
			movimiento.clienteFiscal_id = jUpdate.clienteFiscal_id;
			//console.log(movimiento);
			movimiento.save();
		});
	});

	let partidasPosicionadas = (bodyParams.partidas).filter(function (x){
		return x.pasillo_id!=undefined && x.pasillo!=undefined && x.posicion!=undefined && x.posicion_id!=undefined && x.nivel!=undefined;
	});

	if(partidasPosicionadas.length == bodyParams.partidas.length && bodyParams.item != undefined && bodyParams.item != null && bodyParams.item != ""){
		jUpdate.status = "APLICADA";
	}

	Entrada.updateOne(
		{ _id: entrada_id },
		{ $set: jUpdate })
	.then((entrada)=>{
		res.status(200).send(entrada);
	})
	.catch((error)=>{
		res.status(500).send(error);
	})
}

function updatePartida(req,res){
	let bodyParams = req.query;
	let entrada_id = bodyParams.entrada_id;
	let clave_partida = bodyParams.clave_partida;

	Entrada.findOne({_id:entrada_id})
	.then(async(entrada) => {
		let partida = entrada.partidas.find(x=>x.clave_partida == clave_partida);
		let partidaSalida = entrada.partidasSalida.find(x=>x.clave_partida == clave_partida);

		let isEquals = await equalsEmbalajes(partida, bodyParams);
		//console.log(isEquals);
		
		if(partida.pesoBruto == bodyParams.pesoBruto && partida.pesoNeto == bodyParams.pesoNeto && partida.valor == bodyParams.valor && isEquals){
			await updatePartidaPosicion(partida, partidaSalida, bodyParams);
		}
		else{
			if(partida.pesoBruto != bodyParams.pesoBruto)
				await updatePartidaPesoB(partida, partidaSalida, bodyParams);
			if(partida.pesoNeto != bodyParams.pesoNeto)
				await updatePartidaPesoN(partida, partidaSalida, bodyParams);
			if(!isEquals)
				await updatePartidaEmbalajes(partida, partidaSalida, bodyParams);
			if(partida.valor != bodyParams.valor)
				await updatePartidaValor(partida, partidaSalida, bodyParams);
		} 

		let resMovimietno = await updateMovimiento(entrada_id, clave_partida, bodyParams);
		//console.log(resMovimietno);

		let item = {
			partidas: entrada.partidas,
			partidasSalida: entrada.partidasSalida
		};

		await Entrada.updateOne({_id:entrada_id},{$set:item})
		.then((item)=>{
			//console.log("complete");
			res.status(200).send(entrada);
		})
		.catch((error)=>{
			res.status(500).send(entrada);
		});
	});
}

//Campara los embalajes actuales con los nuevos para determinar el signo
// false = diferentes
// true = iguales
async function equalsEmbalajes(partida, bodyParams){
	let embalajes = await getEmbalajes();
	let res = true;
	for(let embalaje of embalajes){
		if(bodyParams.embalajes[embalaje.clave] == undefined)
			bodyParams.embalajes[embalaje.clave] = 0;

		if(partida.embalajes[embalaje.clave] == undefined)
			partida.embalajes[embalaje.clave] = 0;

		if(partida.embalajes[embalaje.clave] != bodyParams.embalajes[embalaje.clave]){
			res = false;
			break;
		}
	}
	return await res;
}

//Updatea los cambios hechos en la partida en su respectivo movimiento
async function updateMovimiento(entrada_id, clave_partida, bodyParams){
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

	await MovimientoInventarioModel.updateOne({entrada_id:entrada_id, clave_partida: clave_partida},{$set:itemMovimiento})
	.then((item)=>{
		return true;
	})
	.catch((error)=>{
		return false;
	});
}

//CASO BASE: Solo se updatean posiciones
async function updatePartidaPosicion(partida, partidaSalida, bodyParams){
	//console.log("Caso base");
	if(partida.pasillo_id != undefined && partida.posicion_id != undefined && partida.nivel != undefined)
		await MovimientoInventario.updateExistenciaPosicion(-1, partida);

	partida.pasillo = bodyParams.pasillo;
	partida.pasillo_id = bodyParams.pasillo_id;
	partida.posicion = bodyParams.posicion;
	partida.posicion_id = bodyParams.posicion_id;
	partida.nivel = bodyParams.nivel;
	partidaSalida.pasillo = bodyParams.pasillo;
	partidaSalida.pasillo_id = bodyParams.pasillo_id;
	partidaSalida.posicion = bodyParams.posicion;
	partidaSalida.posicion_id = bodyParams.posicion_id;
	partidaSalida.nivel = bodyParams.nivel;

	await MovimientoInventario.updateExistenciaPosicion(1, partida);
}

async function updatePartidaPesoB(partida, partidaSalida, bodyParams){
	//console.log("PB");
	let res = bodyParams.pesoBruto - partida.pesoBruto;
	let auxPartida = {
		producto_id: partida.producto_id,
		embalajes: {},
		pesoNeto: 0,
		pesoBruto: res,
		nivel: bodyParams.nivel,
		posicion_id: bodyParams.posicion_id,
		valor: 0
	};

	await MovimientoInventario.updateExistencia(1, auxPartida, new Date());

	await MovimientoInventario.updateExistenciaPosicion(-1, partida);
	partida.pesoBruto = bodyParams.pesoBruto;
	partida.pasillo = bodyParams.pasillo;
	partida.pasillo_id = bodyParams.pasillo_id;
	partida.posicion = bodyParams.posicion;
	partida.posicion_id = bodyParams.posicion_id;
	partida.nivel = bodyParams.nivel;

	partidaSalida.pasillo = bodyParams.pasillo;
	partidaSalida.pasillo_id = bodyParams.pasillo_id;
	partidaSalida.posicion = bodyParams.posicion;
	partidaSalida.posicion_id = bodyParams.posicion_id;
	partidaSalida.nivel = bodyParams.nivel;
	partidaSalida.pesoBruto = bodyParams.pesoBruto;
	await MovimientoInventario.updateExistenciaPosicion(1, partida);
}

async function updatePartidaPesoN(partida, partidaSalida, bodyParams){
	//console.log("PN");
	let res = bodyParams.pesoNeto - partida.pesoNeto;
	let auxPartida = {
		producto_id: partida.producto_id,
		embalajes: {},
		pesoNeto: res,
		pesoBruto: 0,
		nivel: bodyParams.nivel,
		posicion_id: bodyParams.posicion_id,
		valor: 0
	};

	await MovimientoInventario.updateExistencia(1, auxPartida, new Date());

	await MovimientoInventario.updateExistenciaPosicion(-1, partida);
	partida.pesoNeto = bodyParams.pesoNeto;
	partida.pasillo = bodyParams.pasillo;
	partida.pasillo_id = bodyParams.pasillo_id;
	partida.posicion = bodyParams.posicion;
	partida.posicion_id = bodyParams.posicion_id;
	partida.nivel = bodyParams.nivel;

	partidaSalida.pasillo = bodyParams.pasillo;
	partidaSalida.pasillo_id = bodyParams.pasillo_id;
	partidaSalida.posicion = bodyParams.posicion;
	partidaSalida.posicion_id = bodyParams.posicion_id;
	partidaSalida.nivel = bodyParams.nivel;
	partidaSalida.pesoNeto = bodyParams.pesoNeto;
	await MovimientoInventario.updateExistenciaPosicion(1, partida);
}

async function updatePartidaEmbalajes(partida, partidaSalida, bodyParams){
	//console.log("Embalajes");
	let embalajes = await getEmbalajes();

	for(let embalaje of embalajes){
		if(bodyParams.embalajes[embalaje.clave] == undefined)
			bodyParams.embalajes[embalaje.clave] = 0;

		if(partida.embalajes[embalaje.clave] == undefined)
			partida.embalajes[embalaje.clave] = 0;

		let res = bodyParams.embalajes[embalaje.clave] - partida.embalajes[embalaje.clave];

		let auxPartida = {
			producto_id: partida.producto_id,
			embalajes: {},
			pesoNeto: 0,
			pesoBruto: 0,
			nivel: bodyParams.nivel,
			posicion_id: bodyParams.posicion_id,
			valor: 0
		};
		if(auxPartida.embalajes[embalaje.clave] == undefined)
			auxPartida.embalajes[embalaje.clave] = 0;

		auxPartida.embalajes[embalaje.clave] = res;
		await MovimientoInventario.updateExistencia(1, auxPartida, new Date());

		await MovimientoInventario.updateExistenciaPosicion(-1, partida);
		partida.embalajes[embalaje.clave] = bodyParams.embalajes[embalaje.clave];
		partida.pasillo = bodyParams.pasillo;
		partida.pasillo_id = bodyParams.pasillo_id;
		partida.posicion = bodyParams.posicion;
		partida.posicion_id = bodyParams.posicion_id;
		partida.nivel = bodyParams.nivel;

		partidaSalida.pasillo = bodyParams.pasillo;
		partidaSalida.pasillo_id = bodyParams.pasillo_id;
		partidaSalida.posicion = bodyParams.posicion;
		partidaSalida.posicion_id = bodyParams.posicion_id;
		partidaSalida.nivel = bodyParams.nivel;
		partidaSalida.embalajes[embalaje.clave] = bodyParams.embalajes[embalaje.clave];
		await MovimientoInventario.updateExistenciaPosicion(1, partida);
	}
}

async function updatePartidaValor(partida, partidaSalida, bodyParams){
	//console.log("Valor");

	let res = bodyParams.valor - partida.valor;
	let auxPartida = {
		producto_id: partida.producto_id,
		embalajes: {},
		pesoNeto: 0,
		pesoBruto: 0,
		nivel: bodyParams.nivel,
		posicion_id: bodyParams.posicion_id,
		valor: res
	};

	await MovimientoInventario.updateExistencia(1, auxPartida, new Date());

	await MovimientoInventario.updateExistenciaPosicion(-1, partida);
	partida.valor = bodyParams.valor;
	partida.pasillo = bodyParams.pasillo;
	partida.pasillo_id = bodyParams.pasillo_id;
	partida.posicion = bodyParams.posicion;
	partida.posicion_id = bodyParams.posicion_id;
	partida.nivel = bodyParams.nivel;

	partidaSalida.pasillo = bodyParams.pasillo;
	partidaSalida.pasillo_id = bodyParams.pasillo_id;
	partidaSalida.posicion = bodyParams.posicion;
	partidaSalida.posicion_id = bodyParams.posicion_id;
	partidaSalida.nivel = bodyParams.nivel;
	partidaSalida.valor = bodyParams.valor;
	await MovimientoInventario.updateExistenciaPosicion(1, partida);
}

async function getEmbalajes(){
	let res;
	res = await EmbalajesModel.find({status:"ACTIVO"}).exec();
	return res;
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
	saveEntradaAutomatica
}