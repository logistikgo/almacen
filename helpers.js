//const PDF = require('pdfkit');
const Entrada = require('./models/Entrada');
const Salida = require('./models/Salida');
const MovimientoInventario = require('./models/MovimientoInventario');
const ClienteFiscal = require('./models/ClienteFiscal');
const fs = require('fs');
const moment = require('moment');
const blobstream = require('blob-stream');

const configSQL = (require('./configSQL'));
const sql = require('mssql');


//sql.close();
//Se conecta a la base de datos en SQL conexion global

async function getPartidasByIDs(req,res){
	
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let _tipo = req.query.tipoMovimiento;
	let fechaI = req.query.fechaInicio;
	let fechaF = req.query.fechaFinal;
	let tipo = req.query.tipo;

	
	if(fechaI==null){
		let infoPartidasGrl = await getPartidas(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,_tipo);
		await res.status(200).send(infoPartidasGrl);
	}else{
		let infoPartidasFiltro = await getPartidasFiltro(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,fechaI,fechaF,tipo,_tipo);
		await res.status(200).send(infoPartidasFiltro);
	}

}

async function getPartidasFiltro(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,fechaI,fechaF,tipo,_tipo){
	let infoPartidasFiltro = [];
	let boolFechas = fechaI==fechaF;
	
	let rango = {
		$gte:new Date(fechaI),
		$lt:new Date(fechaF)
	};

	let filtroEntrada = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};
	let filtroSalida = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};
	if(!boolFechas){
		filtroEntrada["fechaEntrada"] = rango;
		filtroSalida["fechaSalida"] = rango;
	}
	
	if(tipo=="ENTRADA"){
		let partidasEntrada = await getPartidasEntradas(filtroEntrada);
		infoPartidasFiltro = partidasEntrada;
	}else if(tipo == "SALIDA"){
		let partidasSalida = await getPartidasSalidas(filtroSalida);
		infoPartidasFiltro = partidasSalida;
	}else{
		let partidasEntrada = await getPartidasEntradas(filtroEntrada);
		let partidasSalida = await getPartidasSalidas(filtroSalida);
		infoPartidasFiltro = partidasEntrada.concat(partidasSalida);
	}
	
		
	return infoPartidasFiltro;
}

async function getPartidas(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,_tipo){
	let infoPartidasGrl = [];

	let filtro = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};

	let partidasEntrada = await getPartidasEntradas(filtro);
	//console.log(filtro);
	
	//let partidasSalida = await getPartidasSalidas(filtro);

	//infoPartidasGrl = partidasEntrada.concat(partidasSalida);
	//return infoPartidasGrl;
	return partidasEntrada;
}

async function getPartidasEntradas(filtro){
	let infoPartidasEntradas = [];
	
	let entradas = await Entrada.find(filtro)
		.populate({
			path:'partidas.producto_id',
			model:'Producto'
		})
		.populate({
			path:'clienteFiscal_id',
			model:'ClienteFiscal'
		})
		.populate({
			path:'almacen_id',
			model:'Almacen'
		})
		.populate({
			path:'salidas_id',
			model:'Salida'
		})
		.exec();
	//console.log("-------------------------------------------------");
	
	delete filtro.fechaEntrada;
	let salidas = await Salida.find(filtro);
	console.log(filtro);
	//console.log(salidas);
	await entradas.forEach(async function(entrada){
		let entry = entrada;

		
		let partidasDeSalida = salidas.filter(x=> x.entrada_id == entrada._id.toString()).map(x=>x.partidas);
		
		entrada.partidas.forEach(function(partida){
			//--------------------------------
			
			let partidaSalidaDeEntrada = entrada.partidasSalida.find(x=> x.clave_partida == partida.clave_partida);
			//console.log(salidas);
			partida.isEmpty = partidaSalidaDeEntrada.isEmpty;
			let salida = salidas.filter(x=> x.entrada_id == entrada._id.toString() && x.partidas[0]._id.toString() == partidaSalidaDeEntrada._id.toString());
			//console.log("SE IMPRIMEN LAS SALIDAS");
			//console.log(salida);
			let partidasDeSalidas = partidasDeSalida.filter(x=> x[0]._id.toString() == partidaSalidaDeEntrada._id.toString());
			let jsonPartidasSalida = [];
			partidasDeSalidas.forEach(function(partidalocal){
				jsonPartidasSalida.push(partidalocal[0]);
			});
			
			
			//---------------------------------------------------
			let json = {
				infoSalidas: salida,
				infoPartida:partida,
				infoPartidasSalida: jsonPartidasSalida,
				infoEntrada:entry
			}
			infoPartidasEntradas.push(json);
		});
	});

	return infoPartidasEntradas;

}
async function getPartidasSalidas(filtro){
	let infoPartidasSalidas = [];
	let salidas = await Salida.find(filtro)
		.populate({
			path:'partidas.producto_id',
			model:'Producto'
		})
		.populate({
			path:'clienteFiscal_id',
			model:'ClienteFiscal'
		})
		.populate({
			path:'almacen_id',
			model:'Almacen'
		})
		.exec();
		
		
		await salidas.forEach(function(salida){
			let entry = salida;
			salida.partidas.forEach(function(partida){
				let json = {
					infoPartida:partida,
					infoSalida:entry
				}
				infoPartidasSalidas.push(json);
			});
		});
		
		return infoPartidasSalidas;
}

async function getNextID(dataContext, field){
	let max = 0;
	let lastUser = await dataContext.find().sort([[field,-1]]).exec();
	
	if(lastUser.length > 0)
		max = (lastUser[0])[field];

	console.log(max);

	return max + 1;
}

async function formatPartidasSalida(req,res){
	Entrada.find({})
	.then((entradas)=>{
		entradas.forEach(function(entrada){
			let partidasSalida = entrada.partidas;

		});
	});
}

async function GetDeliveryGroupsEntrada(req,res){

	//Conexion local
	const sql_pool = await new sql.ConnectionPool(configSQL).connect();

	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let _tipo = req.query.tipoMovimiento;

	let filtro = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		sucursal_id:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};

	let partidas = await getPartidasEntradas(filtro);
	
	//console.log(partidas);
	let IDPedidos = await Entrada.find(filtro).distinct("partidas.InfoPedido.IDPedido").exec();
	console.log(IDPedidos);
	//Se obtienen la informacion de los pedidos de la base de datos en SQL Server
	let queryGetPedidos = `SELECT XD_IDPedido,Delivery,FechaAlta,FechaPGI,FinalNombreComercial,FinalMunicipio,Tarimas,Peso,Volumen,Piezas,Cajas,FechaETA,SucursalCrossDock,StatusProceso FROM View_Pedidos WHERE XD_IDPedido in (${IDPedidos})`;
	//console.log(queryGetPedidos);
	let resultQueryPedidos = [];
	if(IDPedidos.length>0){
		resultQueryPedidos = (await sql_pool.query(queryGetPedidos)).recordset;
		//console.log(resultQueryPedidos);
		sql.close();	
	}
	


	//console.log("IDPEDIDOS");
	//console.log(IDPedidos);
	let Pedidos = [];
	IDPedidos.forEach(function(IDPedido){
		let partidasDeIDPedido = partidas.filter(x =>  x.infoPartida.InfoPedido!=undefined ? x.infoPartida.InfoPedido.IDPedido == IDPedido : false);
		
		if(partidasDeIDPedido.length>0){

			let infoPedido = resultQueryPedidos.filter(x=> x.XD_IDPedido == IDPedido);

			let jsonPedido = {
				IDPedido: IDPedido,
				Delivery:  infoPedido[0].Delivery,
				FechaPGI:  infoPedido[0].FechaPGI,
				FechaAlta: infoPedido[0].FechaAlta,
				ClienteDestino: infoPedido[0].FinalNombreComercial,
				CiudadDestino: infoPedido[0].FinalMunicipio,
				T:infoPedido[0].Tarimas !=null ? infoPedido[0].Tarimas : 0,
				Kg:infoPedido[0].Peso !=null ? infoPedido[0].Peso : 0,
				M3:infoPedido[0].Volumen !=null ? infoPedido[0].Volumen : 0,
				Pzs:infoPedido[0].Piezas !=null ? infoPedido[0].Piezas : 0,
				Cjs:infoPedido[0].Cajas !=null ? infoPedido[0].Cajas : 0,
				FechaETA:infoPedido[0].FechaETA,
				CrossDock:infoPedido[0].SucursalCrossDock,
				StatusProceso:infoPedido[0].StatusProceso,
				Partidas: partidasDeIDPedido.map(m=> m.infoPartida),
				FolioEntrada: partidasDeIDPedido.map(m=> m.infoEntrada)[0].folio,
				entrada_id: partidasDeIDPedido.map(m=> m.infoEntrada)[0]._id,
				idEntrada: partidasDeIDPedido.map(m=> m.infoEntrada)[0].idEntrada
			};
			//console.log(jsonPedido);
			Pedidos.push(jsonPedido);
		}
	});

	res.status(200).send(Pedidos);
	//return Pedidos;

}


module.exports = {
	getNextID,
	getPartidasByIDs,
	GetDeliveryGroupsEntrada
}