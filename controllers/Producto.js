'use strict'
const Producto = require('../models/Producto');
const Helpers = require('../helpers');
const MovimientoInventario = require('../controllers/MovimientoInventario')

function get(req, res) {
	
	Producto.find({statusReg:"ACTIVO"}, (error,producto) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);
	});
}

function getByIDsClientesFiscales(req,res){
    let _arrClienteFiscales = req.query.arrClientesFiscales;
    Producto.find({arrClientesFiscales_id:{$in:_arrClienteFiscales}})
    .then((productos)=>{
    	res.status(200).send(productos);
    })
    .catch((err)=>{
    	res.status(500).send({message:"Error", error:err});
    });
    
}

function getByIDClienteFiscal(req, res) {
	let _idClienteFiscal = req.params.idClienteFiscal;
	Producto.find({arrClientesFiscales_id:{$in:[_idClienteFiscal]}, statusReg:"ACTIVO"}, (error,producto) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);
	});	
	
		
}

//async
async function save(req,res) {
	let nProducto = new Producto();

	console.log(req.body);
	
	nProducto.idClienteFiscal = req.body.idClienteFiscal;
	nProducto.arrClientesFiscales_id = req.body.idClientesFiscales;
	nProducto.idProducto = await Helpers.getNextID(Producto, "idProducto");

	nProducto.statusReg = "ACTIVO";
	nProducto.fechaAlta = new Date();
	nProducto.usuarioAlta_id = req.body.usuarioAlta_id;
	nProducto.nombreUsuario = req.body.nombreUsuario;

	nProducto.clave = req.body.clave;
	nProducto.descripcion = req.body.descripcion;

	nProducto.existencia = req.body.existencia ? req.body.existencia : 0;
	nProducto.existenciaTarimas = req.body.existenciaTarimas ? req.body.existenciaTarimas : 0;
	nProducto.existenciaCajas = req.body.existenciaCajas ? req.body.existenciaCajas : 0;
	nProducto.existenciaPesoBruto = req.body.existenciaPesoBruto ? req.body.existenciaPesoBruto : 0;
	nProducto.existenciaPesoNeto = req.body.existenciaPesoNeto ? req.body.existenciaPesoNeto : 0;
	nProducto.valor = req.body.valor ? req.body.valor : 0;

	nProducto.peso = req.body.peso;
	nProducto.embalajes = req.body.embalajes;
	nProducto.stockMaximo = req.body.stockMaximo;
	nProducto.stockMinimo = req.body.stockMinimo;
	nProducto.idSucursal = req.body.idSucursal;
	nProducto.almacen_id = req.body.almacen_id;

	nProducto.presentacion = req.body.presentacion;
	console.log(req.body.presentacion);

	nProducto.save()
	.then((productoStored)=>{		
		MovimientoInventario.saveExistenciaInicial(productoStored._id, productoStored.existencia,
			productoStored.existenciaCajas,productoStored.existenciaTarimas,productoStored.existenciaPesoBruto,productoStored.existenciaPesoNeto,
			req.body.idClienteFiscal,req.body.idSucursal,req.body.almacen_id)
		.then(()=>{
			res.status(200).send({productoStored});
		})
	})
	.catch((err)=>{
		return res.status(500).send({"message":"Error al guardar", "error":err});

	});
}

function validaProducto(req,res){
	let _clave = req.params.clave;

	Producto.find({clave:_clave,statusReg:"ACTIVO"})
	.then((producto)=>{
		console.log(producto.length);
		if(producto.length===0){
			return res.status(200).send(true);
		}
		else
		{
			return res.status(200).send(false);
		}
	})
	.catch((err)=>{
		res.status(500).send({message:"Error en validaProducto","error":err});
	});
}

function _delete(req,res) {
	let _idProducto = req.params.idProducto;

	Producto.findOne({idProducto:_idProducto, statusReg:"ACTIVO"}) 
	.then((producto)=>{
		console.log(producto);
		producto.statusReg = "BAJA";

		producto.save().then(()=>{
			res.status(200).send(producto);
		})
	}).catch((error)=>{
		res.status(500).send(error);
	});

}



module.exports = {
	get,
	getByIDClienteFiscal,
	save,
	_delete,
	validaProducto,
	getByIDsClientesFiscales
}