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
	
	Entrada.find({idClienteFiscal: _idClienteFiscal,idSucursal:_idSucursal,almacen_id:_idAlmacen}).populate({
		path:'partidas.producto_id',
		model:'Producto'
	}).then((entradas)=>{
		res.status(200).send(entradas);
	}).catch((err)=>{
		return res.status(500).send({message:"Error"});
	});
}

function getPartidasByIDs(req,res){
	
	let _idClienteFiscal = req.params.idClienteFiscal;
	let _idSucursal = req.params.idSucursal;
	let _idAlmacen = req.params.idAlmacen;

	Entrada.find({idClienteFiscal: _idClienteFiscal,idSucursal:_idSucursal,almacen_id:_idAlmacen}).populate({
		path:'partidas.producto_id',
		model:'Producto'
	}).then((entradas)=>{
		let infoPartidas = [];
		entradas.forEach(function(entrada){
			let entry = entrada;
			entrada.partidas.forEach(function(partida){
				let json = {
					infoPartida:partida,
					infoEntrada:entry
				}
				infoPartidas.push(json);
			});
		});
		res.status(200).send(infoPartidas);
	}).catch((err)=>{
		return res.status(500).send({message:"Error"});
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

	nEntrada.idClienteFiscal = bodyParams.idClienteFiscal;
	nEntrada.idSucursal = bodyParams.idSucursal;
	nEntrada.almacen_id = bodyParams.almacen_id;
	nEntrada.status = bodyParams.status;
	nEntrada.partidas = bodyParams.partidas;

	nEntrada.fechaAlta = new Date();
	nEntrada.idEntrada = await getNextID();
	nEntrada.folio = await getNextID();

	nEntrada.save()
	.then(async(data)=>{

		if(data.almacen_id != "5bbd218e7dbb370763c8d388"){
			for(let itemPartida of data.partidas){
				await MovimientoInventario.saveEntrada(itemPartida.producto_id, data.id, itemPartida.piezas, itemPartida.cajas, itemPartida.tarimas,
					itemPartida.pesoBruto,itemPartida.pesoNeto,itemPartida.valor,bodyParams.idClienteFiscal,bodyParams.idSucursal,bodyParams.almacen_id, itemPartida.posicion, itemPartida.nivel,bodyParams.strFechaIngreso);
			}
		}
		//await Helper.PDFEntrada(data._id);
		res.status(200).send(data);
	})
	.catch((err)=>{
		console.log(err);
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

module.exports = {
	get,
	getEntradaByID,
	save,
	getEntradasByIDs,
	getPartidasByIDs,
	validaEntrada
}