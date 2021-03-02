'use strict'

const Producto = require('../models/Producto');
const Entrada = require('../models/Entrada');
const Partida = require('../models/Partida');
const PartidaController = require("./Partida");
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const Helpers = require('../helpers');
const MovimientoInventario = require('../controllers/MovimientoInventario')
const ClienteFiscal = require('../models/ClienteFiscal');
const { mongo } = require('mongoose');
const { Mongoose } = require('mongoose');
const mongoose = require('mongoose');
const { isEmptyEmbalaje } = require('../helpers');

function get(req, res) {
	Producto.find({ statusReg: "ACTIVO" })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		})
		.then((producto) => {
			res.status(200).send(producto);
		})
		.catch((error) => {
			return res.status(500).send(error);
		});
}

async function getExistenciasByAlmacen(req, res) {
	let almacen_id = req.params.almacen_id;
	let producto_id = req.params.producto_id;
	let NullParamsException = {};

	try {
		if (almacen_id == undefined || almacen_id == "") throw NullParamsException;
		if (producto_id == undefined || producto_id == "") throw NullParamsException;

		let producto = await Producto.findOne({ _id: producto_id }).exec();
		let existencias = {};
		for (let x in producto.embalajes) {
			existencias[x] = 0;
		}
		let entradas = await Entrada.find({ almacen_id: almacen_id });
		let entradas_id = entradas.map(x => x._id);
		let partidas = await Partida.find({ entrada_id: { $in: entradas_id }, producto_id: producto_id, isEmpty: false, status: "ASIGNADA" });

		partidas.forEach(function (partida) {
			for (let x in partida.embalajesxSalir) {
				if (existencias[x] == undefined) existencias[x] = 0;

				if (partida.embalajesAlmacen != undefined)
					existencias[x] += partida.embalajesAlmacen[x];
				else
					existencias[x] += partida.embalajesxSalir[x];
			}
		});

		res.status(200).send(existencias);
	}
	catch (error) {
		res.status(500).send(error);
	}
}

async function getPartidasxProductoenExistencia(req, res) {
	let producto_id = req.params.producto_id;
	let NullParamsException = {};

	try {
		if (producto_id == undefined || producto_id == "")
			throw NullParamsException;

		let partidas = await Partida
			.find({ producto_id: producto_id, isEmpty: false })
			.populate({
				path: 'entrada_id',
				model: 'Entrada',
				select: 'stringFolio'
			});

		res.status(200).send(partidas);
	}
	catch (error) {
		res.status(500).send(error);
	}
}

async function getExistenciasAlmacen(almacen_id, producto) {
	let producto_id = producto._id;
	let NullParamsException = {};

	try {
		if (almacen_id == undefined || almacen_id == "") throw NullParamsException;
		if (producto_id == undefined || producto_id == "") throw NullParamsException;

		let existencias = {};
		for (let x in producto.embalajes) {
			existencias[x] = 0;
		}

		let partidas = await Partida
			.find({ producto_id: producto_id, isEmpty: false })
			.populate('entrada_id', 'fechaEntrada clienteFiscal_id sucursal_id almacen_id')
			.exec();

		partidas = partidas.filter(x => x.entrada_id != undefined && x.entrada_id.almacen_id == almacen_id);

		partidas.forEach(function (partida) {
			//console.log(almacen_id +"=="+ partida.entrada_id.almacen_id);
			for (let x in partida.embalajesxSalir) {
				if (existencias[x] == undefined) existencias[x] = 0;

				if (partida.embalajesAlmacen != undefined)
					existencias[x] += partida.embalajesAlmacen[x];
				else
					existencias[x] += partida.embalajesxSalir[x];
			}
		});

		return existencias;
	}
	catch (error) {
		throw error;
	}
}

function getById(req, res) {
	let idProducto = req.query.idProducto;

	Producto.findOne({ _id: idProducto })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		})
		.then((producto) => {
			res.status(200).send(producto);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getByClave(req, res) {
	let _clave = req.params.clave;

	Producto.findOne({ clave: _clave })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		})
		.then((producto) => {
			res.status(200).send(producto);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function getByIDsClientesFiscales(req, res) {

	let _arrClienteFiscales = req.query.arrClientesFiscales;
	//console.log("Yael was here");
	Producto.find({ arrClientesFiscales_id: { $in: _arrClienteFiscales }, "statusReg": "ACTIVO" })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		})
		.then((productos) => {

			res.status(200).send(productos);
		})
		.catch((err) => {
			res.status(500).send({ message: "Error", error: err });
		});
}
/*
function getByIDClienteFiscal(req, res) {
	console.log("Yael was here");
	let _idClienteFiscal = req.params.idClienteFiscal;
	let almacen_id=req.params.almacen_id;
	Producto.find({ arrClientesFiscales_id: { $in: [_idClienteFiscal] },almacen_id:_almacen_id, statusReg: "ACTIVO" })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		})
		.then((producto) => {
			res.status(200).send(producto);
		})
		.catch((error) => {
			return res.status(500).send(error);
		});
}
*/
async function getALM_XD(req, res) {
	let _arrClientesFiscalesXD = req.query.arrClientesFiscales;

	let _arrClientesFiscalesALM = await Interfaz_ALM_XD.getIDClienteALM(_arrClientesFiscalesXD);

	Producto.find({ arrClientesFiscales_id: { $in: _arrClientesFiscalesALM }, "statusReg": "ACTIVO" })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		})
		.then((productos) => {
			res.status(200).send(productos);
		})
		.catch((err) => {
			res.status(500).send({ message: "Error", error: err });
		});
}

function getByIDClienteFiscal(req, res) {
	//console.log("Dennise was here");
	let _idClienteFiscal = req.params.idClienteFiscal !== undefined ?  req.params.idClienteFiscal :"";
	let almacen_id =  req.query.almacen_id !== undefined ? req.query.almacen_id : "";
	//console.log(req.query.almacen_id);

	let arrProd=[];
	Producto.find({ arrClientesFiscales_id: { $in: [_idClienteFiscal] }, statusReg: "ACTIVO" })
		.populate({
			path: 'presentacion_id',
			model: 'Presentacion'
		})
		.populate({
			path: 'clasificacion_id',
			model: 'ClasificacionesProductos'
		}).populate({
            path: "clienteFiscal_id",
            model: "ClienteFiscal"
        })
		.then(async (productos) => {
			//console.log(productos);
			/*  if (almacen_id != undefined && almacen_id != "") {
				await Helpers.asyncForEach(productos, async function (producto) {
					producto.embalajesAlmacen = await getExistenciasAlmacen(almacen_id, producto);
				});
			}  */
			console.log(req.params.idClienteFiscal);
				await Helpers.asyncForEach(productos, async function (producto) {
					
					const { clave } = producto;
					let clienteEmbalaje=""
					if(producto.clienteFiscal_id!=undefined)
					{
	                    clienteEmbalaje = producto.clienteFiscal_id.arrEmbalajes
	                }
	                else
	                {
	                	let clientefiscal = await ClienteFiscal.findOne({ _id: _idClienteFiscal })
	                	clienteEmbalaje=clientefiscal.arrEmbalajes;
	                }
                    let cantidadProductoPartidas = await PartidaController.getInventarioPorPartidas(clave, clienteEmbalaje);

                    if(cantidadProductoPartidas.length !== 0 && clienteEmbalaje!==undefined){
						clienteEmbalaje.split(",").forEach(clienteEmbalaje =>{
                            producto.embalajes[clienteEmbalaje] = cantidadProductoPartidas[clienteEmbalaje]
                        })
                    }

					if(almacen_id !== "")
					{
						if(producto.almacen_id.find(element => element.toString() == almacen_id)){
							//console.log(producto.almacen_id +"==="+almacen_id);
							arrProd.push(producto);
						}
					}
					else
					{
						arrProd.push(producto);
					}
				});
			
			//console.log("test2");
			res.status(200).send(arrProd);
		})
		.catch((error) => {
			console.log(error)
			return res.status(500).send(error);
		});

}


async function getByIDClienteFiscalAggregate(req, res) {
	
	try {
		
	let _idClienteFiscal = req.params.idClienteFiscal !== undefined ?  req.params.idClienteFiscal :"";
	let almacen_id =  req.query.almacen_id !== undefined ? req.query.almacen_id : "";
	let filter = req.query.filter !== undefined ? true : false;
	let clientesEmbalajes;
	


	let clienteFiscal = await ClienteFiscal.findById(_idClienteFiscal).exec();
	
	//Verificar si existe el almacen y en base a eso, crear el almacenQuery, para obtener los productos
	let almacenQuery = {isEmpty: false, 
		status: "ASIGNADA", 
		"Productos.statusReg": "ACTIVO",
		'Productos.arrClientesFiscales_id': {$in: [mongoose.Types.ObjectId(_idClienteFiscal)]}};

	let productosEnCeroQuery = {arrClientesFiscales_id: { $in: [_idClienteFiscal]},
							   statusReg: "ACTIVO"
	};	


    if(almacen_id !== ""){
		almacenQuery["Productos.almacen_id"] = {$in: [mongoose.Types.ObjectId(almacen_id)]}
		productosEnCeroQuery["almacen_id"] = {$in: [almacen_id]};
	}


	let cantidadEmbalajes = {
		"_id": "$clave",
		"productoDetalle": {$addToSet: "$Productos"},
		"clientesFiscales": {$addToSet: "$ClientesFiscales"},
		"tarimas": {$sum: 1}
	}  
	
	if(clienteFiscal){

		clientesEmbalajes = clienteFiscal.arrEmbalajes.split(",");


		clientesEmbalajes.forEach(embalaje =>{

			if(embalaje !== "tarimas"){
				cantidadEmbalajes[embalaje] = {$sum:`$embalajesxSalir.${embalaje}`};
			}

		})

	let productosInAlmacen = await Producto.find(productosEnCeroQuery).exec();	

	//Obtener todoos los productos del almacen, que todos sus embalajes esten en cero	
	let productosEnCero = productosInAlmacen.filter(producto => (isEmptyEmbalaje(producto.embalajes)));	

	let arrProductos = productosEnCero;
		let productos;

	if(filter){
		
		let fechaInicio = new Date(req.query.fechaInicio).addDays(1);
		let fechaFinal = new Date(req.query.fechaFinal);
		almacenQuery["Entrada.fechaAlta"] = {$lt: fechaInicio};

		productos = Partida.aggregate([

			{$lookup: {"from": "Productos", "localField": "producto_id", "foreignField": "_id", as: "Productos"}},
			{$lookup: {"from": "Entradas", "localField": "entrada_id", "foreignField": "_id", "as": "Entrada"}},
			{$lookup: {"from": "ClientesFiscales", "localField": "Productos.arrClientesFiscales_id", "foreignField": "_id", as: "ClientesFiscales"}},
			
			{$match: almacenQuery}
		,   
			{$group: cantidadEmbalajes}, 
					   
		  { $project: { fromProductos: 0 } }  
		
		])


	}else{

		productos = Partida.aggregate([

			{$lookup: {"from": "Productos", "localField": "producto_id", "foreignField": "_id", as: "Productos"}},
			{$lookup: {"from": "ClientesFiscales", "localField": "Productos.arrClientesFiscales_id", "foreignField": "_id", as: "ClientesFiscales"}},
			
			{$match: almacenQuery}
		,   
			{$group: cantidadEmbalajes}, 
					   
		  { $project: { fromProductos: 0 } }  
		
		])

	}

	productos.then(async productos =>{
		//Obtener el inventario, si no tiene partidas activas
		if(productos.length === 0){
			productos = await Producto.find({arrClientesFiscales_id: { $in: [_idClienteFiscal]},
											 almacen_id: {$in: [almacen_id]},
											 statusReg: "ACTIVO"}).exec()
			
			res.status(200).send(productos);								 
		}else{
			//Inventario con las partidas activas
			productos.forEach(producto =>{
				let productoDetalle = {...producto.productoDetalle[0][0]};
				let clienteFiscal = {...producto.clientesFiscales[0][0]};
				
				let embalajes = clienteFiscal.arrEmbalajes.split(",");
	
				embalajes.forEach(embalaje =>{
					productoDetalle.embalajes[embalaje] = producto[embalaje];
				})
	
				arrProductos.push(productoDetalle);
	
			});
	
	
			res.status(200).send(arrProductos);
			
		}


	}).catch(err =>{
		res.status(500).send(err);
	});

	}

	} catch (error) {
		console.log(error);
	}

	

}


async function save(req, res) {
	req.body.idProducto = await Helpers.getNextID(Producto, "idProducto");
	req.body.valor = 0;
	req.body.embalajesRechazo = req.body.embalajes;

	//console.log(req.body.presentacion);
	//console.log(req.body.safetystock)
	let nProducto = new Producto(req.body);

	nProducto.save()
		.then((productoStored) => {
			res.status(200).send(productoStored);

			MovimientoInventario.saveExistenciaInicial(productoStored._id, req.body.embalajes,
				req.body.existenciaPesoBruto, req.body.existenciaPesoNeto, req.body.clienteFiscal_id, req.body.sucursal_id, req.body.almacen_id);
		})
		.catch((err) => {
			res.status(500).send(err);
		});
}

function update(req, res) {
	let _id = req.params._id;
	req.body.fechaEdita = new Date();

	Producto.updateOne({ _id: _id }, { $set: req.body })
		.then((producto) => {
			res.status(200).send(producto);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function validaProducto(req, res) {
	let _clave = req.params.clave;

	Producto.find({ clave: _clave, statusReg: "ACTIVO" })
		.then((producto) => {
			if (producto.length === 0) {
				res.status(200).send(true);
			}
			else {
				res.status(200).send(false);
			}
		})
		.catch((err) => {
			res.status(500).send({ message: "Error en validaProducto", "error": err });
		});
}

function _delete(req, res) {
	let _idProducto = req.body.idProducto;

	Producto.updateOne({ _id: _idProducto }, { $set: { statusReg: "BAJA" } })
		.then((producto) => {
			res.status(200).send(producto);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

//Obtener equivalencias por producto por bodega
function getEquivalencias(req, res) {
	let filter = {
		almacen_id: req.query.almacen_id,
		clienteFiscal_id: req.query.clienteFiscal_id,
		sucursal_id: req.query.sucursal_id
	} 

	//Array para guardar equivalencias depuradas
	var equivalenciasRes = [];

	Producto.find(filter)
		.then((productos) => {
			productos.forEach(producto =>{
				if(producto.arrEquivalencias.length > 0) {
					var arrEquivalencias = producto.arrEquivalencias;
					arrEquivalencias.forEach(eq => {
						const found = equivalenciasRes.find(element => element.cantidadEquivalencia == eq.cantidadEquivalencia);
						if(found == null && found == undefined )
							equivalenciasRes.push(eq);
					})
				}
			});
			res.status(200).send(equivalenciasRes);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

module.exports = {
	get,
	getById,
	getByIDClienteFiscal,
	save,
	update,
	_delete,
	validaProducto,
	getByIDsClientesFiscales,
	getByClave,
	getALM_XD,
	getExistenciasByAlmacen,
	getPartidasxProductoenExistencia,
	getEquivalencias,
	getByIDClienteFiscalAggregate
}